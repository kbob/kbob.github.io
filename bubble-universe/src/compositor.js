import { RenderPass, Binding, Attachment } from './passes.js';
import { Sampler, UniformBuffer } from './resources.js';
import { Defaults } from './constants.js';

const COMPOSITOR_WGSL = `
    struct Uniforms {
        background_amount: f32,
        trails_amount: f32,
        particles_amount: f32,
    };

    @group(0) @binding(0) var background_tex: texture_2d<f32>;
    @group(0) @binding(1) var trails_tex: texture_2d<f32>;
    @group(0) @binding(2) var particles_tex: texture_2d<f32>;
    @group(0) @binding(3) var all_sampler: sampler;
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

    @fragment fn fragment_shader(
        in: InterStage
    ) -> @location(0) vec4f {

        let U = uniforms;

        let bg = textureSample(background_tex, all_sampler, in.texcoord);
        let trails = textureSample(trails_tex, all_sampler, in.texcoord);
        let particles = textureSample(particles_tex, all_sampler, in.texcoord);

        var rgb = U.background_amount * bg.rgb;

        let ta = U.trails_amount * clamp(trails.a, 0.0, 1.0);
        rgb = mix(rgb, trails.rgb, ta);

        let pa = U.particles_amount * clamp(particles.a, 0.0, 1.0);
        rgb = mix(rgb, particles.rgb, pa);

        let color = vec4f(rgb, 1.0);
        return color;
    };
`;

export class CompositorPass extends RenderPass {
    constructor(name) {
        super(name || 'compositor');
        this.background = null;
        this.trails = null;
        this.particles = null;
        this.sampler = new Sampler(`${name || 'compositor'} sampler`);
        this.output = null;
        this.uniformBuffer = new UniformBuffer(`${name || 'compositor'} uniforms`, 12);
        this._params = {
            background_amount: Defaults.BACKGROUND_BRIGHTNESS,
            trails_amount: Defaults.TRAILS_BRIGHTNESS,
            particles_amount: Defaults.PARTICLES_BRIGHTNESS,
        };
    }

    get Parameters() {
        return this._params;
    }

    resources() {
        return [
            Binding([0, 0], 'background', this.background, 'ro'),
            Binding([0, 1], 'trails', this.trails, 'ro'),
            Binding([0, 2], 'particles', this.particles, 'ro'),
            Binding([0, 3], 'sampler', this.sampler, 'ro'),
            Binding([1, 0], 'uniforms', this.uniformBuffer, 'ro'),
            Attachment('output', this.output),
        ];
    }

    bind_background(tex) {
        this.background = tex;
        return this;
    }

    bind_trails(tex) {
        this.trails = tex;
        return this;
    }

    bind_particles(tex) {
        this.particles = tex;
        return this;
    }

    attach_output(tex) {
        this.output = tex;
        return this;
    }

    instantiate(device) {
        const shaderModule = device.createShaderModule({
            label: this.make_label('shader'),
            code: COMPOSITOR_WGSL,
        });

        this.instantiate_pipeline(device, shaderModule, 'vertex_shader', 'fragment_shader');
        this.instantiate_bind_groups(device);
        this.instantiate_pass_descriptor();

        return this;
    }

    resize(device, size) {
        this.rebind_group(device, 'background');
        this.rebind_group(device, 'trails');
        this.rebind_group(device, 'particles');
    }

    execute(device, encoder) {
        const currentView = this.output.current_view();
        this.pass_descriptor.colorAttachments[0].view = currentView;

        const buffer = new ArrayBuffer(12);
        const view = new DataView(buffer);
        view.setFloat32(0, this._params.background_amount, true);
        view.setFloat32(4, this._params.trails_amount, true);
        view.setFloat32(8, this._params.particles_amount, true);
        device.queue.writeBuffer(this.uniformBuffer._buffer, 0, buffer);

        this.encode_render_pass_draw(encoder, 3);
    }
}
