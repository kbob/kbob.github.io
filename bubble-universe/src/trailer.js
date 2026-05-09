import { HDR_PIXEL_FORMAT, Defaults } from './constants.js';
import { RenderPass, Binding, Attachment } from './passes.js';
import { Sampler, Texture, UniformBuffer } from './resources.js';

const TRAILER_SHADER = `
    struct Uniforms {
        persistence: f32,
        diffusion: f32,
        blur_sample_width: vec2f,
    };

    @group(0) @binding(0) var in_trails: texture_2d<f32>;
    @group(0) @binding(1) var blur_sampler: sampler;
    @group(0) @binding(2) var in_particles: texture_2d<f32>;
    @group(0) @binding(3) var image_sampler: sampler;

    @group(1) @binding(0) var<uniform> uniforms: Uniforms;

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
    };

    @fragment fn pass1_fragment_shader(
        in: InterStage
    ) -> @location(0) vec4f {

        let U = uniforms;

        let delta = vec2f(U.blur_sample_width.x, 0.0);

        let ts = textureSample(in_trails, image_sampler, in.texcoord);
        let ds = blur_1d(ts, in.texcoord, delta);

        let trails = (1.0 - U.diffusion) * ts;
        let diffused = U.diffusion * ds;

        let color = U.persistence * (trails + diffused);

        return color;
    }

    @fragment fn pass2_fragment_shader(
        in: InterStage
    ) -> @location(0) vec4f {

        let U = uniforms;

        let delta = vec2f(0.0, U.blur_sample_width.y);

        let ts = textureSample(in_trails, image_sampler, in.texcoord);
        let ds = blur_1d(ts, in.texcoord, delta);
        let ps = textureSample(in_particles, image_sampler, in.texcoord);

        let trails = (1.0 - U.diffusion) * ts;
        let diffused = U.diffusion * ds;
        let particles = ps;

        let color = U.persistence * (trails + diffused + particles);

        return vec4f(color.rgb, saturate(color.a));
    };

    fn blur_1d(b: vec4f, coord: vec2f, delta: vec2f) -> vec4f {
        let a = textureSample(in_trails, blur_sampler, coord - delta);
        let c = textureSample(in_trails, blur_sampler, coord + delta);

        return
            0.3125 * (a + c) +
            0.375 * b;
    }
`;

export class TrailerPass1 extends RenderPass {
    constructor(label) {
        super(label || 'trailer pass 1');
        this.input = null;
        this.imageSampler = new Sampler(`${this.name} image sampler`, 'linear', 'linear');
        this.blurSampler = new Sampler(`${this.name} blur sampler`, 'linear', 'linear');
        this.output = null;
        this.uniformBuffer = new UniformBuffer(label ? `${label} uniforms` : 'trailer pass 1 uniforms', 16);
        this._persistence = Defaults.TRAIL_PERSISTENCE;
        this._diffusion = Defaults.TRAIL_DIFFUSION;
    }

    resources() {
        return [
            Binding([0, 0], 'input', this.input, 'ro'),
            Binding([0, 1], 'blur sampler', this.blurSampler, 'ro'),
            Binding([0, 3], 'image sampler', this.imageSampler, 'ro'),
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
            code: TRAILER_SHADER,
        });

        this.instantiate_pipeline(
            device,
            shaderModule,
            'vertex_shader',
            'pass1_fragment_shader'
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
        this.pass_descriptor.colorAttachments[0].view = currentView;

        const imageSize = this.output.current_size();
        const blurSampleWidth = [1.4 / imageSize[0], 1.4 / imageSize[1]];

        const buffer = new ArrayBuffer(16);
        const dv = new DataView(buffer);
        dv.setFloat32(0, this._persistence, true);
        dv.setFloat32(4, this._diffusion, true);
        dv.setFloat32(8, blurSampleWidth[0], true);
        dv.setFloat32(12, blurSampleWidth[1], true);
        device.queue.writeBuffer(this.uniformBuffer._buffer, 0, buffer);

        this.encode_render_pass_draw(encoder, 3);
    }
}

export class TrailerPass2 extends RenderPass {
    constructor(label) {
        super(label || 'trailer pass 2');
        this.trails = null;
        this.particles = null;
        this.imageSampler = new Sampler(`${this.name} image sampler`, 'linear', 'linear');
        this.blurSampler = new Sampler(`${this.name} blur sampler`, 'linear', 'linear');
        this.output = null;
        this.uniformBuffer = new UniformBuffer(label ? `${label} uniforms` : 'trailer pass 2 uniforms', 16);
        this._persistence = Defaults.TRAIL_PERSISTENCE;
        this._diffusion = Defaults.TRAIL_DIFFUSION;
    }

    resources() {
        return [
            Binding([0, 0], 'trails', this.trails, 'ro'),
            Binding([0, 1], 'blur sampler', this.blurSampler, 'ro'),
            Binding([0, 2], 'particles', this.particles, 'ro'),
            Binding([0, 3], 'image sampler', this.imageSampler, 'ro'),
            Binding([1, 0], 'uniforms', this.uniformBuffer, 'ro'),
            Attachment('output', this.output),
        ];
    }

    bind_trails(texture) {
        this.trails = texture;
        return this;
    }

    bind_particles(texture) {
        this.particles = texture;
        return this;
    }

    attach_output(texture) {
        this.output = texture;
        return this;
    }

    instantiate(device) {
        const shaderModule = device.createShaderModule({
            label: this.make_label('shader'),
            code: TRAILER_SHADER,
        });

        this.instantiate_pipeline(
            device,
            shaderModule,
            'vertex_shader',
            'pass2_fragment_shader'
        );
        this.instantiate_bind_groups(device);
        this.instantiate_pass_descriptor();

        return this;
    }

    resize(device, size) {
        this.rebind_group(device, 'trails');
        this.rebind_group(device, 'particles');
    }

    execute(device, encoder) {
        const currentView = this.output.current_view();
        this.pass_descriptor.colorAttachments[0].view = currentView;

        const imageSize = this.output.current_size();
        const blurSampleWidth = [1.4 / imageSize[0], 1.4 / imageSize[1]];

        const buffer = new ArrayBuffer(16);
        const dv = new DataView(buffer);
        dv.setFloat32(0, this._persistence, true);
        dv.setFloat32(4, this._diffusion, true);
        dv.setFloat32(8, blurSampleWidth[0], true);
        dv.setFloat32(12, blurSampleWidth[1], true);
        device.queue.writeBuffer(this.uniformBuffer._buffer, 0, buffer);

        this.encode_render_pass_draw(encoder, 3);
    }
}

export class TrailerSubgraph {
    constructor() {
        this.name = 'trailer';
        this.particles = null;
        this.trails = null;
        this.tempImage = null;
        this.pass1 = new TrailerPass1('trailer 1');
        this.pass2 = new TrailerPass2('trailer 2');
        this._params = {
            persistence: Defaults.TRAIL_PERSISTENCE,
            diffusion: Defaults.TRAIL_DIFFUSION,
        };
    }

    get Parameters() {
        return this._params;
    }

    bind_particles(texture) {
        this.particles = texture;
        return this;
    }

    attach_trails(texture) {
        this.trails = texture;
        return this;
    }

    resources() {
        return [];
    }

    instantiate(device) {
        const renderSize = this.trails.current_size();

        this.tempImage = new Texture(
            'trails temp',
            HDR_PIXEL_FORMAT,
            [...renderSize, 4],
            {
                bindableAsTexture: true,
                renderable: true,
            }
        );
        this.tempImage.instantiate(device);

        this.pass1.bind_input(this.trails);
        this.pass1.attach_output(this.tempImage);
        this.pass1._persistence = this._params.persistence;
        this.pass1._diffusion = this._params.diffusion;

        this.pass2.bind_trails(this.tempImage);
        this.pass2.bind_particles(this.particles);
        this.pass2.attach_output(this.trails);
        this.pass2._persistence = this._params.persistence;
        this.pass2._diffusion = this._params.diffusion;

        const allPasses = [this.pass1, this.pass2];
        const allResources = new Set();
        for (const pass of allPasses) {
            for (const r of pass.resources()) {
                if (r.isBinding && r.resource) {
                    allResources.add(r.resource);
                }
            }
        }

        for (const resource of allResources) {
            if (typeof resource.instantiate === 'function') {
                resource.instantiate(device);
            }
        }

        for (const pass of allPasses) {
            pass.instantiate(device);
        }

        return this;
    }

    resize(device, size) {
        this.tempImage.resize(device, size);
        this.pass1.resize(device, size);
        this.pass2.resize(device, size);
    }

    execute(device, encoder) {
        this.pass1._persistence = this._params.persistence;
        this.pass1._diffusion = this._params.diffusion;
        this.pass2._persistence = this._params.persistence;
        this.pass2._diffusion = this._params.diffusion;

        this.pass1.execute(device, encoder);
        this.pass2.execute(device, encoder);
    }
}
