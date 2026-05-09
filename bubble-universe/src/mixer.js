import { RenderPass, Binding, Attachment } from './passes.js';
import { UniformBuffer, Sampler } from './resources.js';

const MIXER_WGSL = `
    struct Uniforms {
        amount: f32,
    };

    @group(0) @binding(0) var in_color_A: texture_2d<f32>;
    @group(0) @binding(1) var in_sampler_A: sampler;
    @group(0) @binding(2) var in_color_B: texture_2d<f32>;
    @group(0) @binding(3) var in_sampler_B: sampler;

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

        let color_A = textureSample(in_color_A, in_sampler_A, in.texcoord);
        let color_B = textureSample(in_color_B, in_sampler_B, in.texcoord);
        let color = mix(color_A, color_B, U.amount);

        return vec4f(color);
    };
`;

export class MixerPass extends RenderPass {
    constructor(name) {
        super(name || 'mixer');
        this.inputA = null;
        this.inputSamplerA = new Sampler(`${name} input sampler A`, 'nearest', 'nearest');
        this.inputB = null;
        this.inputSamplerB = new Sampler(`${name} input sampler B`, 'nearest', 'nearest');
        this.output = null;
        this.uniformBuffer = new UniformBuffer(`${name} uniforms`, 4);
        this._params = {
            enabled: true,
            amount: 0,
        };
    }

    get Parameters() {
        return this._params;
    }

    resources() {
        return [
            Binding([0, 0], 'input texture A', this.inputA, 'ro'),
            Binding([0, 1], 'input sampler A', this.inputSamplerA, 'ro'),
            Binding([0, 2], 'input texture B', this.inputB, 'ro'),
            Binding([0, 3], 'input sampler B', this.inputSamplerB, 'ro'),
            Binding([1, 0], 'uniforms', this.uniformBuffer, 'ro'),
            Attachment('output', this.output),
        ];
    }

    bind_input_A(texture) {
        this.inputA = texture;
        return this;
    }

    bind_input_B(texture) {
        this.inputB = texture;
        return this;
    }

    attach_output(texture) {
        this.output = texture;
        return this;
    }

    instantiate(device) {
        const shaderModule = device.createShaderModule({
            label: this.make_label('shader'),
            code: MIXER_WGSL,
        });

        this.instantiate_pipeline(device, shaderModule, 'vertex_shader', 'fragment_shader');
        this.instantiate_bind_groups(device);
        this.instantiate_pass_descriptor();

        return this;
    }

    resize(device) {
        this.rebind_group(device, 'input texture A');
        this.rebind_group(device, 'input texture B');
    }

    execute(device, encoder) {
        if (!this._params.enabled) {
            return;
        }

        const currentView = this.output.current_view();
        this.pass_descriptor.colorAttachments[0].view = currentView;

        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setFloat32(0, this._params.amount, true);
        device.queue.writeBuffer(this.uniformBuffer._buffer, 0, buffer);

        this.encode_render_pass_draw(encoder, 3);
    }
}
