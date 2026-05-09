import { tau, MAX_FPS, MAX_SEQ_COUNT, MAX_SEQ_LENGTH, Defaults, HDR_PIXEL_FORMAT, colorsAnimated, backgroundAnimated } from './constants.js';
import { StorageBuffer, UniformBuffer, Texture, Sampler, CanvasTexture } from './resources.js';
import { RenderGraph } from './rendergraph.js';
import { ParticleMotionPass } from './particle_motion.js';
import { ColorMappedDrawingPass } from './drawer_mapped.js';
import { ToneMapPass } from './tone_map.js';
import { BloomSubgraph } from './bloom.js';
import { TrailerSubgraph } from './trailer.js';
import { ColormapPass } from './colors.js';
import { MixerPass } from './mixer.js';
import { CompositorPass } from './compositor.js';
import { BackgroundPass } from './backgrounds.js';

function smoothstep(e0, e2, x) {
    const sx = Math.max(0, Math.min(1, (x - e0) / (e2 - e0)));
    return -2 * sx * sx * sx + 3 * sx * sx;
}

export class Bubbler {
    constructor(canvas, context, format) {
        this.canvas = canvas;
        this.context = context;
        this.format = format;
        this.device = null;
        this.particlePass = null;
        this.drawingPass = null;
        this.bloomerSubgraph = null;
        this.toneMapPass = null;
        this.uvs = null;
        this.hdrBuffer = null;
        this.bloomedBuffer = null;
        this.time = 0;
        this.speed = Defaults.SPEED;
        this._currentTheme = Defaults.THEME;
        this._currentBgTheme = -1;
    }

    _create_HDR_buffer(name, size) {
        return new Texture(name, HDR_PIXEL_FORMAT, [...size, 4], {
            bindableAsTexture: true,
            renderable: true,
        });
    }

    async init(device) {
        this.device = device;

        const uvByteSize = 2 * MAX_SEQ_COUNT * MAX_SEQ_LENGTH * 4;
        this.uvs = new StorageBuffer('uvs', uvByteSize, true);

        const particleUniformBuffer = new UniformBuffer('particle uniforms', 24);
        const drawingUniformBuffer = new UniformBuffer('drawing uniforms', 24);

        const cmapSize = [Defaults.SEQ_COUNT, Defaults.SEQ_LENGTH];

        this.colormapTextureA = new Texture('colormap A', 'rgba8unorm', [...cmapSize, 4], {
            bindableAsTexture: true,
            renderable: true,
        });
        this.colormapTextureB = new Texture('colormap B', 'rgba8unorm', [...cmapSize, 4], {
            bindableAsTexture: true,
            renderable: true,
        });
        this.colormapTexture = new Texture('colormap', 'rgba8unorm', [...cmapSize, 4], {
            bindableAsTexture: true,
            renderable: true,
        });

        this.colormapSamplerA = new Sampler('colormap sampler A', 'nearest', 'nearest');
        this.colormapSamplerB = new Sampler('colormap sampler B', 'nearest', 'nearest');
        this.colormapSampler = new Sampler('colormap sampler', 'nearest', 'nearest');

        this.colorsAPass = new ColormapPass('colors A');
        this.colorsAPass.Parameters.seq_count = Defaults.SEQ_COUNT;
        this.colorsAPass.Parameters.seq_length = Defaults.SEQ_LENGTH;
        this.colorsAPass.Parameters.theme = this._currentTheme;
        this.colorsAPass.attach_output(this.colormapTextureA);

        this.colorsBPass = new ColormapPass('colors B');
        this.colorsBPass.Parameters.seq_count = Defaults.SEQ_COUNT;
        this.colorsBPass.Parameters.seq_length = Defaults.SEQ_LENGTH;
        this.colorsBPass.Parameters.theme = this._currentTheme;
        this.colorsBPass.attach_output(this.colormapTextureB);

        this.colorMixerPass = new MixerPass('color mixer');
        this.colorMixerPass.bind_input_A(this.colormapTextureA);
        this.colorMixerPass.bind_input_B(this.colormapTextureB);
        this.colorMixerPass.attach_output(this.colormapTexture);

        this._activeColorsPass = this.colorsAPass;
        this._themeRamp = [0];

        const [w, h] = [this.canvas.width, this.canvas.height];
        const renderSize = [w, h];

        this.backgroundTextureA = new Texture('background A', 'rgba8unorm', [...renderSize, 4], {
            bindableAsTexture: true,
            renderable: true,
        });
        this.backgroundTextureB = new Texture('background B', 'rgba8unorm', [...renderSize, 4], {
            bindableAsTexture: true,
            renderable: true,
        });
        this.backgroundTexture = new Texture('background', 'rgba8unorm', [...renderSize, 4], {
            bindableAsTexture: true,
            renderable: true,
        });

        this.backgroundSamplerA = new Sampler('background sampler A', 'linear', 'linear');
        this.backgroundSamplerB = new Sampler('background sampler B', 'linear', 'linear');
        this.backgroundSampler = new Sampler('background sampler', 'linear', 'linear');

        this.backgroundPassA = new BackgroundPass('background A');
        this.backgroundPassA.attach_output(this.backgroundTextureA);

        this.backgroundPassB = new BackgroundPass('background B');
        this.backgroundPassB.attach_output(this.backgroundTextureB);

        this.backgroundMixerPass = new MixerPass('background mixer');
        this.backgroundMixerPass.bind_input_A(this.backgroundTextureA);
        this.backgroundMixerPass.bind_input_B(this.backgroundTextureB);
        this.backgroundMixerPass.attach_output(this.backgroundTexture);

        this._activeBgPass = this.backgroundPassA;
        this._bgThemeRamp = [0];

        this.particlePass = new ParticleMotionPass();
        this.particlePass.uniformBuffer = particleUniformBuffer;
        this.particlePass.bind_uvs(this.uvs);

        this.hdrBuffer = this._create_HDR_buffer('HDR particles', renderSize);
        this.trailsBuffer = this._create_HDR_buffer('HDR trails', renderSize);
        this.compositeBuffer = this._create_HDR_buffer('HDR composite', renderSize);
        this.bloomedBuffer = this._create_HDR_buffer('HDR bloomed', renderSize);

        this.drawingPass = new ColorMappedDrawingPass();
        this.drawingPass.uniformBuffer = drawingUniformBuffer;
        this.drawingPass.bind_uvs(this.uvs);
        this.drawingPass.bind_colormap(this.colormapTexture);
        this.drawingPass.colormapSampler = this.colormapSampler;
        this.drawingPass.attach_color_output(this.hdrBuffer);

        this.bloomerSubgraph = new BloomSubgraph();
        this.bloomerSubgraph.bind_input(this.compositeBuffer);
        this.bloomerSubgraph.attach_output(this.bloomedBuffer);

        this.trailerSubgraph = new TrailerSubgraph();
        this.trailerSubgraph.bind_particles(this.hdrBuffer);
        this.trailerSubgraph.attach_trails(this.trailsBuffer);

        this.compositorPass = new CompositorPass();
        this.compositorPass.bind_background(this.backgroundTexture);
        this.compositorPass.bind_trails(this.trailsBuffer);
        this.compositorPass.bind_particles(this.hdrBuffer);
        this.compositorPass.attach_output(this.compositeBuffer);

        this.toneMapPass = new ToneMapPass();
        this.toneMapPass.bind_input(this.bloomedBuffer);

        const canvasTexture = new CanvasTexture('canvas output', this.context, this.format);
        this.toneMapPass.attach_output(canvasTexture);

        this.renderGraph = new RenderGraph(
            device,
            [this.particlePass, this.colorsAPass, this.colorsBPass, this.colorMixerPass, this.backgroundPassA, this.backgroundPassB, this.backgroundMixerPass, this.drawingPass, this.compositorPass, this.trailerSubgraph, this.bloomerSubgraph, this.toneMapPass],
        );
    }

    resize_seq(seq_count, seq_length) {
        var c = seq_count, l = seq_length;
        if (c == 0) { c = 1; }
        if (l == 0) { l = 1; }
        const cmapSize = [c, l];
        const device = this.device;

        this.colorsAPass.Parameters.seq_count = seq_count;
        this.colorsAPass.Parameters.seq_length = seq_length;
        this.colorsBPass.Parameters.seq_count = seq_count;
        this.colorsBPass.Parameters.seq_length = seq_length;
        this.particlePass.Parameters.seq_count = seq_count;
        this.particlePass.Parameters.seq_length = seq_length;
        this.drawingPass.Parameters.seq_count = seq_count;
        this.drawingPass.Parameters.seq_length = seq_length;

        this.colormapTextureA.resize(device, cmapSize);
        this.colormapTextureB.resize(device, cmapSize);
        this.colormapTexture.resize(device, cmapSize);

        this.colorMixerPass.resize(device, cmapSize);
        this.drawingPass.resize_colormap(device, cmapSize);
        this.colorsAPass.enable();
        this.colorsBPass.enable();
        this.colorMixerPass.Parameters.enabled = true;
    }

    resize(size) {
        const device = this.device;
        this.hdrBuffer.resize(device, size);
        this.trailsBuffer.resize(device, size);
        this.backgroundTextureA.resize(device, size);
        this.backgroundTextureB.resize(device, size);
        this.backgroundTexture.resize(device, size);
        this.compositeBuffer.resize(device, size);
        this.bloomedBuffer.resize(device, size);

        this.backgroundMixerPass.resize(device, size);
        this.backgroundPassA.enable();
        this.backgroundPassB.enable();
        this.backgroundMixerPass.Parameters.enabled = true;
        this.compositorPass.resize(device, size);
        this.trailerSubgraph.resize(device, size);
        this.bloomerSubgraph.resize(device, size);
        this.toneMapPass.resize(device, size);
    }

    changeTheme(themeIndex, fadeFrames) {
        const ramp = [];
        for (let i = 0; i <= fadeFrames; i++) {
            ramp.push(smoothstep(0, fadeFrames, i));
        }

        this._currentTheme = themeIndex;
        this._themeRamp = [];

        if (this._activeColorsPass === this.colorsAPass) {
            this._themeRamp.push(...ramp.slice(1).reverse());
            this._activeColorsPass = this.colorsBPass;
        } else {
            this._themeRamp.push(...ramp.slice(0, -1));
            this._activeColorsPass = this.colorsAPass;
        }

        this.colorsAPass.enable();
        this.colorsBPass.enable();
        this._activeColorsPass.Parameters.theme = themeIndex;

        if (this._currentBgTheme === -1) {
            this._syncBackgroundThemeToParticles(fadeFrames);
        }
    }

    _syncBackgroundThemeToParticles(fadeFrames) {
        const ramp = [];
        for (let i = 0; i <= fadeFrames; i++) {
            ramp.push(smoothstep(0, fadeFrames, i));
        }

        this._bgThemeRamp = [];

        if (this._activeBgPass === this.backgroundPassA) {
            this._bgThemeRamp.push(...ramp.slice(1).reverse());
            this._activeBgPass = this.backgroundPassB;
        } else {
            this._bgThemeRamp.push(...ramp.slice(0, -1));
            this._activeBgPass = this.backgroundPassA;
        }

        this.backgroundPassA.enable();
        this.backgroundPassB.enable();
        this._activeBgPass.Parameters.theme = this._currentTheme;
    }

    changeBackgroundTheme(bgThemeIndex, fadeFrames) {
        const ramp = [];
        for (let i = 0; i <= fadeFrames; i++) {
            ramp.push(smoothstep(0, fadeFrames, i));
        }

        this._currentBgTheme = bgThemeIndex;
        this._bgThemeRamp = [];

        if (this._activeBgPass === this.backgroundPassA) {
            this._bgThemeRamp.push(...ramp.slice(1).reverse());
            this._activeBgPass = this.backgroundPassB;
        } else {
            this._bgThemeRamp.push(...ramp.slice(0, -1));
            this._activeBgPass = this.backgroundPassA;
        }

        this.backgroundPassA.enable();
        this.backgroundPassB.enable();
        this._activeBgPass.Parameters.theme = bgThemeIndex;
    }

    draw_frame(params) {
        this.particlePass.Parameters.t = this.time;

        if (this._themeRamp.length >= 1) {
            const mixAmount = this._themeRamp.pop();
            this.colorMixerPass.Parameters.enabled = true;
            this.colorMixerPass.Parameters.amount = mixAmount;
        } else {
            this._themeRamp = [];
            this.colorMixerPass.Parameters.enabled = colorsAnimated(this._currentTheme);
        }

        this._activeColorsPass.Parameters.theme = this._currentTheme;
        this.colorsAPass.Parameters.t = this.time;
        this.colorsBPass.Parameters.t = this.time;

        const effectiveBgTheme = this._currentBgTheme >= 0 ? this._currentBgTheme : this._currentTheme;

        if (this._bgThemeRamp.length >= 1) {
            const mixAmount = this._bgThemeRamp.pop();
            this.backgroundMixerPass.Parameters.enabled = true;
            this.backgroundMixerPass.Parameters.amount = mixAmount;
        } else {
            this._bgThemeRamp = [];
            this.backgroundMixerPass.Parameters.enabled = backgroundAnimated(effectiveBgTheme);
        }

        this._activeBgPass.Parameters.theme = effectiveBgTheme;
        this.backgroundPassA.Parameters.t = this.time;
        this.backgroundPassB.Parameters.t = this.time;

        if (params) {
            this.bloomerSubgraph.update_parameters({
                bloom_amount: params.bloom_amount,
                bloom_size: params.bloom_size,
            });
        }

        let c = this.colorMixerPass.Parameters.seq_count;
        let l = this.colorMixerPass.Parameters.seq_length;
        let cmapSize = [c, l];
        if (this._prevCmapSize != cmapSize) {
            this._prevCmapSize = cmapSize;
            this.colorMixerPass.Parameters.enabled = true;
        }

        this.renderGraph.execute(this.device);

        this.time += this.speed / MAX_FPS;
    }
}
