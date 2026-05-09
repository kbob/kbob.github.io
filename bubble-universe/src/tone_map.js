import { RenderPass, Binding, Attachment } from './passes.js';
import { Sampler, UniformBuffer } from './resources.js';
import { Defaults } from './constants.js';

const TONE_MAP_SHADER = `
@group(0) @binding(0) var in_color: texture_2d<f32>;
@group(0) @binding(1) var in_sampler: sampler;

struct Uniforms {
    boost: f32,
    white: f32,
};

@group(1) @binding(0) var<uniform> uniforms: Uniforms;

struct InterStage {
    @builtin(position) position: vec4f,
    @location(0) texcoord: vec2f,
};

@vertex fn vertex_shader(
    @builtin(vertex_index) vertex_index: u32,
) -> InterStage {

    let pos: array<vec2f, 3> = array<vec2f, 3>(
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

const luminance_weights = vec3f(0.2126, 0.7152, 0.0722);

fn luminance(c: vec3f) -> f32 {
    return dot(c, luminance_weights);
}

fn saturation(c: vec3f) -> f32 {
    let mn = min(min(c.r, c.g), c.b);
    let mx = max(max(c.r, c.g), c.b);
    if mx == 0.0 {
        return 0.0;
    }
    return (mx - mn) / mx;
}

fn reinhard_luminance_tone_map(c: vec3f) -> vec3f {
    let l = luminance(c);
    if l == 0.0 {
        return c;
    }
    let numerator = l * (1.0 + (l * (1.0 / (uniforms.white * uniforms.white))));
    let denominator = l + (1.0 / uniforms.boost);
    return c * (numerator / denominator);
}

fn saturation_luminance_tone_map(c: vec3f) -> vec3f {
    let l = luminance(c);
    let s = saturation(c);
    let rhl = reinhard_luminance_tone_map(c);

    return mix(rhl, c, 0.5 * s);
}

fn inverse_srgb_scalar(r: f32) -> f32 {
    if r <= 0.0031308 {
        return 12.92 * r;
    } else {
        return 1.055 * pow(r, 1.0 / 2.4) - 0.055;
    }
}

fn inverse_srgb(c: vec3f) -> vec3f {
    return vec3f(
        inverse_srgb_scalar(c.r),
        inverse_srgb_scalar(c.g),
        inverse_srgb_scalar(c.b),
    );
}

@fragment fn fragment_shader(
    in: InterStage
) -> @location(0) vec4f {
    var pixel = textureSample(in_color, in_sampler, in.texcoord);

    let unmapped_rgb = pixel.rgb;
    let mapped_rgb = saturation_luminance_tone_map(unmapped_rgb);
    let ungamma_rgb = inverse_srgb(mapped_rgb);
    return vec4f(ungamma_rgb, pixel.a);
}
`;

export class ToneMapPass extends RenderPass {
    constructor() {
        super('tone mapping');
        this.input = null;
        this.inputSampler = new Sampler('input sampler');
        this.output = null;
        this.uniformBuffer = new UniformBuffer('tone map uniforms', 8);
        this._params = {
            boost: Defaults.TONE_MAP_BOOST,
            white: Defaults.TONE_MAP_WHITE,
        };
    }

    get Parameters() {
        return this._params;
    }

    resources() {
        return [
            Binding([0, 0], 'input texture', this.input, 'ro'),
            Binding([0, 1], 'input sampler', this.inputSampler, 'ro'),
            Binding([1, 0], 'uniforms', this.uniformBuffer, 'ro'),
            Attachment('output', this.output),
        ];
    }

    bind_input(tex) {
        this.input = tex;
        return this;
    }

    attach_output(tex) {
        this.output = tex;
        return this;
    }

    instantiate(device) {
        const shaderModule = device.createShaderModule({
            label: this.make_label('shader'),
            code: TONE_MAP_SHADER,
        });

        this.instantiate_pipeline(device, shaderModule, 'vertex_shader', 'fragment_shader');
        this.instantiate_bind_groups(device);
        this.instantiate_pass_descriptor();

        return this;
    }

    resize(device, size) {
        const currentView = this.output.current_view();
        this.rebind_group(device, 'input texture');
        this.pass_descriptor.colorAttachments[0].view = currentView;
    }

    execute(device, encoder) {
        const currentView = this.output.current_view();
        this.pass_descriptor.colorAttachments[0].view = currentView;

        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setFloat32(0, this._params.boost, true);
        view.setFloat32(4, this._params.white, true);
        device.queue.writeBuffer(this.uniformBuffer._buffer, 0, buffer);

        this.encode_render_pass_draw(encoder, 3);
    }
}
