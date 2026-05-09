import { HDR_PIXEL_FORMAT, BLOOM_MIP_LEVELS, Defaults } from './constants.js';
import { RenderPass, Binding, Attachment, BlendMode } from './passes.js';
import { Sampler, Texture, UniformBuffer } from './resources.js';

const BLOOM_SHADER = `
struct DSUniforms {
    viewport_size: vec2f,
};

struct USUniforms {
    filter_radius: vec2f,
};

struct USMUniforms {
    filter_radius: vec2f,
    bloom_strength: f32,
};

@group(0) @binding(0) var in_color: texture_2d<f32>;
@group(0) @binding(1) var in_sampler: sampler;
@group(2) @binding(0) var in_blur: texture_2d<f32>;
@group(2) @binding(1) var in_blur_sampler: sampler;

@group(1) @binding(0) var<uniform> ds_uniforms: DSUniforms;
@group(1) @binding(0) var<uniform> us_uniforms: USUniforms;
@group(1) @binding(0) var<uniform> usm_uniforms: USMUniforms;

struct InterStage {
    @builtin(position) position: vec4f,
    @location(0) texcoord: vec2f,
};

@vertex fn vertex_shader(
    @builtin(vertex_index) vertex_index: u32,
) -> InterStage {

    var pos = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f(-1.0,  3.0),
        vec2f( 3.0, -1.0),
    );

    let xy = pos[vertex_index];
    var out: InterStage;
    out.position = vec4f(xy, 0.0, 1.0);
    out.texcoord = xy * vec2f(0.5, -0.5) + vec2f(0.5);
    return out;
}

@fragment fn downsampler_fragment_shader(
    in: InterStage
) -> @location(0) vec4f {
    let U = ds_uniforms;
    let C = in_color;
    let S = in_sampler;
    let x = in.texcoord.x;
    let y = in.texcoord.y;
    let dx = 1.0 / U.viewport_size[0];
    let dy = 1.0 / U.viewport_size[1];
    let a = textureSample(C, S, vec2f(x - 2. * dx, y + 2. * dy)).rgb;
    let b = textureSample(C, S, vec2f(x,           y + 2. * dy)).rgb;
    let c = textureSample(C, S, vec2f(x + 2. * dx, y + 2. * dy)).rgb;

    let d = textureSample(C, S, vec2f(x - 2. * dx, y          )).rgb;
    let e = textureSample(C, S, vec2f(x,           y          )).rgb;
    let f = textureSample(C, S, vec2f(x + 2. * dx, y          )).rgb;

    let g = textureSample(C, S, vec2f(x - 2. * dx, y - 2. * dy)).rgb;
    let h = textureSample(C, S, vec2f(x,           y - 2. * dy)).rgb;
    let i = textureSample(C, S, vec2f(x + 2. * dx, y - 2. * dy)).rgb;

    let j = textureSample(C, S, vec2f(x -      dx, y +      dy)).rgb;
    let k = textureSample(C, S, vec2f(x +      dx, y +      dy)).rgb;
    let l = textureSample(C, S, vec2f(x -      dx, y -      dy)).rgb;
    let m = textureSample(C, S, vec2f(x +      dx, y -      dy)).rgb;

    var downsample: vec3f = vec3f(0.0);
    downsample += 0.03125 * (a + c + g + i);
    downsample += 0.0625  * (b + d + f + h);
    downsample += 0.125   * (j + k + l + m);
    downsample += 0.125   * e;

    return vec4f(downsample.rgb, 1.0);
}

fn blurred(T: texture_2d<f32>, S: sampler, x: f32, y: f32, dx: f32, dy: f32) -> vec3f {

    let a = textureSample(T, S, vec2f(x - dx, y + dy)).rgb;
    let b = textureSample(T, S, vec2f(x     , y + dy)).rgb;
    let c = textureSample(T, S, vec2f(x + dx, y + dy)).rgb;

    let d = textureSample(T, S, vec2f(x - dx, y     )).rgb;
    let e = textureSample(T, S, vec2f(x     , y     )).rgb;
    let f = textureSample(T, S, vec2f(x + dx, y     )).rgb;

    let g = textureSample(T, S, vec2f(x - dx, y - dy)).rgb;
    let h = textureSample(T, S, vec2f(x     , y - dy)).rgb;
    let i = textureSample(T, S, vec2f(x + dx, y - dy)).rgb;

    var sum: vec3f = vec3f(0.0);
    sum += 0.0625 * (a + c + g + i);
    sum += 0.125  * (b + d + f + h);
    sum += 0.5    * (e);
    return sum;
}

@fragment fn upsampler_fragment_shader(
    in: InterStage
) -> @location(0) vec4f {
    let U = us_uniforms;
    let C = in_color;
    let S = in_sampler;
    let x = in.texcoord.x;
    let y = in.texcoord.y;
    let dx = U.filter_radius.x;
    let dy = U.filter_radius.y;
    let upsample = blurred(C, S, x, y, dx, dy);

    return vec4f(upsample.rgb, 1.0);
}

@fragment fn upsample_mixer_fragment_shader(
    in: InterStage
) -> @location(0) vec4f {
    let U = usm_uniforms;
    let C = in_color;
    let CS = in_sampler;
    let B = in_blur;
    let BS = in_blur_sampler;
    let xy = in.texcoord;
    let x = xy.x;
    let y = xy.y;
    let dx = U.filter_radius.x;
    let dy = U.filter_radius.y;
    let a = textureSample(C, CS, xy);
    let b = blurred(B, BS, x, y, dx, dy);
    var mx = mix(a.rgb, b.rgb, U.bloom_strength);

    return vec4f(mx, 1.0);
}
`;

function mipSize(size, level) {
    return [Math.max(1, size[0] >> level), Math.max(1, size[1] >> level)];
}

function adjustForAspect(x, w, h) {
    if (h > w) {
        return [x, x * w / h];
    } else {
        return [x * h / w, x];
    }
}

export class Downsampler extends RenderPass {
    constructor(label) {
        super(label || 'bloom downsampler');
        this.input = null;
        this.inputSampler = new Sampler(
            'downsampler input sampler',
            'linear',
            'linear'
        );
        this.output = null;
        this.uniformBuffer = null;
        this._dsUniformsSize = 8;
    }

    resources() {
        return [
            Binding([0, 0], 'input', this.input, 'ro'),
            Binding([0, 1], 'input sampler', this.inputSampler, 'ro'),
            Binding([1, 0], 'uniforms', this.uniformBuffer, 'ro'),
            Attachment('output', this.output),
        ];
    }

    bind_input(texture) {
        this.input = texture;
        return this;
    }

    attach_output(texture) {
        this.output = texture;
        return this;
    }

    instantiate(device) {
        const shaderModule = device.createShaderModule({
            label: this.make_label('shader'),
            code: BLOOM_SHADER,
        });

        this.instantiate_pipeline(
            device,
            shaderModule,
            'vertex_shader',
            'downsampler_fragment_shader'
        );
        this.instantiate_bind_groups(device);
        this.instantiate_pass_descriptor();

        return this;
    }

    resize(device, size) {
        this.rebind_group(device, 'input');
    }

    execute(device, encoder) {
        const currentView = this.output.current_view();
        const [srcW, srcH] = this.input.current_size();

        const buffer = new ArrayBuffer(8);
        const dv = new DataView(buffer);
        dv.setFloat32(0, srcW, true);
        dv.setFloat32(4, srcH, true);
        device.queue.writeBuffer(this.uniformBuffer._buffer, 0, buffer);

        this.pass_descriptor.colorAttachments[0].view = currentView;
        this.encode_render_pass_draw(encoder, 3);
    }
}

export class Upsampler extends RenderPass {
    constructor(label) {
        super(label || 'bloom upsampler');
        this.input = null;
        this.inputSampler = new Sampler(
            'upsampler input sampler',
            'linear',
            'linear'
        );
        this.output = null;
        this.uniformBuffer = null;
        this._bloomSize = Defaults.BLOOM_SIZE;
    }

    resources() {
        return [
            Binding([0, 0], 'input', this.input, 'ro'),
            Binding([0, 1], 'input sampler', this.inputSampler, 'ro'),
            Binding([1, 0], 'uniforms', this.uniformBuffer, 'ro'),
            Attachment(
                'output',
                this.output,
                [0, 0, 0, 0],
                BlendMode.ADD,
                'load'
            ),
        ];
    }

    bind_input(texture) {
        this.input = texture;
        return this;
    }

    attach_output(texture) {
        this.output = texture;
        return this;
    }

    instantiate(device) {
        const shaderModule = device.createShaderModule({
            label: this.make_label('shader'),
            code: BLOOM_SHADER,
        });

        this.instantiate_pipeline(
            device,
            shaderModule,
            'vertex_shader',
            'upsampler_fragment_shader'
        );
        this.instantiate_bind_groups(device);
        this.instantiate_pass_descriptor();

        return this;
    }

    resize(device, size) {
        this.rebind_group(device, 'input');
    }

    update_parameters(params) {
        if (params && params.bloom_size !== undefined) {
            this._bloomSize = params.bloom_size;
        }
    }

    execute(device, encoder) {
        const currentSize = this.output.current_size();
        const currentView = this.output.current_view();

        const [dx, dy] = adjustForAspect(
            this._bloomSize,
            currentSize[0],
            currentSize[1]
        );

        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setFloat32(0, dx, true);
        view.setFloat32(4, dy, true);
        device.queue.writeBuffer(this.uniformBuffer._buffer, 0, buffer);

        this.pass_descriptor.colorAttachments[0].view = currentView;

        const vertexCount = 3;
        this.encode_render_pass_draw(encoder, vertexCount);
    }
}

export class UpsampleMixer extends RenderPass {
    constructor() {
        super('bloom upsample mixer');
        this.imageInput = null;
        this.imageSampler = new Sampler('mix input sampler');
        this.bloomInput = null;
        this.bloomSampler = new Sampler(
            'mix bloom sampler',
            'linear',
            'linear'
        );
        this.output = null;
        this.uniformBuffer = null;
        this._bloomSize = Defaults.BLOOM_SIZE;
        this._bloomAmount = Defaults.BLOOM_AMOUNT;
    }

    resources() {
        return [
            Binding([0, 0], 'image input', this.imageInput, 'ro'),
            Binding([0, 1], 'image sampler', this.imageSampler, 'ro'),
            Binding([2, 0], 'bloom input', this.bloomInput, 'ro'),
            Binding([2, 1], 'bloom sampler', this.bloomSampler, 'ro'),
            Binding([1, 0], 'uniforms', this.uniformBuffer, 'ro'),
            Attachment('output', this.output),
        ];
    }

    bind_image_input(texture) {
        this.imageInput = texture;
        return this;
    }

    bind_bloom_input(texture) {
        this.bloomInput = texture;
        return this;
    }

    attach_output(texture) {
        this.output = texture;
        return this;
    }

    instantiate(device) {
        const shaderModule = device.createShaderModule({
            label: this.make_label('shader'),
            code: BLOOM_SHADER,
        });

        this.instantiate_pipeline(
            device,
            shaderModule,
            'vertex_shader',
            'upsample_mixer_fragment_shader'
        );
        this.instantiate_bind_groups(device);
        this.instantiate_pass_descriptor();

        return this;
    }

    resize(device, size) {
        this.rebind_group(device, 'image input');
        this.rebind_group(device, 'bloom input');
    }

    update_parameters(params) {
        if (params) {
            if (params.bloom_size !== undefined) {
                this._bloomSize = params.bloom_size;
            }
            if (params.bloom_amount !== undefined) {
                this._bloomAmount = params.bloom_amount;
            }
        }
    }

    execute(device, encoder) {
        const currentSize = this.output.current_size();
        const currentView = this.output.current_view();

        const [dx, dy] = adjustForAspect(
            this._bloomSize,
            currentSize[0],
            currentSize[1]
        );

        const buffer = new ArrayBuffer(12);
        const view = new DataView(buffer);
        view.setFloat32(0, dx, true);
        view.setFloat32(4, dy, true);
        view.setFloat32(8, this._bloomAmount, true);
        device.queue.writeBuffer(this.uniformBuffer._buffer, 0, buffer);

        this.pass_descriptor.colorAttachments[0].view = currentView;

        const vertexCount = 3;
        this.encode_render_pass_draw(encoder, vertexCount);
    }
}

export class BloomSubgraph {
    constructor() {
        this.name = 'bloomer';
        this.input = null;
        this.output = null;
        this.mipTextures = null;
        this.mipSizes = null;
        this.downsamplers = [];
        this.upsamplers = [];
        this.upsampleMixer = null;
        this._bloomAmount = Defaults.BLOOM_AMOUNT;
        this._bloomSize = Defaults.BLOOM_SIZE;
    }

    bind_input(texture) {
        this.input = texture;
        return this;
    }

    attach_output(texture) {
        this.output = texture;
        return this;
    }

    resources() {
        return [];
    }

    instantiate(device) {
        const size = this.input.current_size();
        this.mipSizes = [];
        for (let i = 1; i <= BLOOM_MIP_LEVELS; i++) {
            this.mipSizes.push(mipSize(size, i));
        }

        this.mipTextures = [];
        for (let i = 0; i < this.mipSizes.length; i++) {
            const tex = new Texture(`bloom mip ${i}`, HDR_PIXEL_FORMAT, [...this.mipSizes[i], 4], {
                bindableAsTexture: true,
                renderable: true,
            });
            tex.instantiate(device);
            this.mipTextures.push(tex);
        }

        this.downsamplers = [];
        for (let i = 0; i < BLOOM_MIP_LEVELS; i++) {
            const dn = new Downsampler('bloom downsampler ' + i);
            const inTex = i === 0 ? this.input : this.mipTextures[i - 1];
            dn.bind_input(inTex);
            dn.attach_output(this.mipTextures[i]);
            dn.uniformBuffer = new UniformBuffer(`dn uniforms ${i}`, 8);
            this.downsamplers.push(dn);
        }

        this.upsamplers = [];
        for (let i = 0; i < BLOOM_MIP_LEVELS - 1; i++) {
            const up = new Upsampler('bloom upsampler ' + i);
            const inTex = this.mipTextures[BLOOM_MIP_LEVELS - 1 - i];
            const outTex = this.mipTextures[BLOOM_MIP_LEVELS - 2 - i];
            up.bind_input(inTex);
            up.attach_output(outTex);
            up.uniformBuffer = new UniformBuffer(`up uniforms ${i}`, 8);
            up._bloomSize = this._bloomSize;
            this.upsamplers.push(up);
        }

        this.upsampleMixer = new UpsampleMixer();
        this.upsampleMixer.bind_image_input(this.input);
        this.upsampleMixer.bind_bloom_input(this.mipTextures[0]);
        this.upsampleMixer.attach_output(this.output);
        this.upsampleMixer.uniformBuffer = new UniformBuffer('mixer uniforms', 16);
        this.upsampleMixer._bloomSize = this._bloomSize;
        this.upsampleMixer._bloomAmount = this._bloomAmount;

        // Collect all resources from all sub-passes
        const allPasses = [...this.downsamplers, ...this.upsamplers, this.upsampleMixer];
        const allResources = new Set();
        for (const pass of allPasses) {
            for (const r of pass.resources()) {
                if (r.isBinding && r.resource) {
                    allResources.add(r.resource);
                }
            }
        }

        // Instantiate all resources (samplers, buffers) first
        for (const resource of allResources) {
            if (typeof resource.instantiate === 'function') {
                resource.instantiate(device);
            }
        }

        // Then instantiate all passes (pipelines, bind groups)
        for (const pass of allPasses) {
            pass.instantiate(device);
        }

        return this;
    }

    resize(device, size) {
        this.mipSizes = [];
        for (let i = 1; i <= BLOOM_MIP_LEVELS; i++) {
            this.mipSizes.push(mipSize(size, i));
        }

        for (let i = 0; i < this.mipTextures.length; i++) {
            this.mipTextures[i].resize(device, this.mipSizes[i]);
        }

        for (let i = 0; i < this.downsamplers.length; i++) {
            this.downsamplers[i].resize(device, this.mipSizes[i]);
        }

        for (let i = 0; i < this.upsamplers.length; i++) {
            this.upsamplers[i].resize(device, this.mipSizes[BLOOM_MIP_LEVELS - 1 - i]);
        }

        this.upsampleMixer.resize(device, size);
    }

    update_parameters(params) {
        if (params) {
            if (params.bloom_amount !== undefined) {
                this._bloomAmount = params.bloom_amount;
            }
            if (params.bloom_size !== undefined) {
                this._bloomSize = params.bloom_size;
            }
        }
    }

    execute(device, encoder) {
        for (const dn of this.downsamplers) {
            dn.execute(device, encoder);
        }

        for (const up of this.upsamplers) {
            up.update_parameters({ bloom_size: this._bloomSize });
            up.execute(device, encoder);
        }

        this.upsampleMixer.update_parameters({
            bloom_amount: this._bloomAmount,
            bloom_size: this._bloomSize,
        });
        this.upsampleMixer.execute(device, encoder);
    }
}
