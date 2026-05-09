const COLORS_WGSL = `
const INV_PHI: f32 = (sqrt(5f) - 1f) / 2f;
const TAU: f32 = radians(360);

struct Uniforms {
    seq_count: u32,
    seq_length: u32,
    theme: u32,
    t: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct InterStage {
    @builtin(position) position: vec4f,
    @location(0) texcoord: vec2f,
};

@vertex fn vertex_shader(
    @builtin(vertex_index) vertex_index: u32,
) -> InterStage {

    var pos = array<vec2f, 3>(
        vec2f(-1f, -1f),
        vec2f(-1f,  3f),
        vec2f( 3f, -1f),
    );

    let xy = pos[vertex_index];
    var out: InterStage;
    out.position = vec4f(xy, 0f, 1f);
    out.texcoord = xy * vec2f(0.5, -0.5) + vec2f(0.5);
    return out;
}

@fragment fn fragment_shader(
    in: InterStage,
) -> @location(0) vec4f {

    let U = uniforms;

    if U.theme == 7u {
        return triad_color(in);
    }
    if U.theme == 6u {
        return oscope_color(in);
    }
    if U.theme == 5u {
        return bone_color(in);
    }
    if U.theme == 4u {
        return easter_color(in);
    }
    if U.theme == 3u {
        return fiesta_color(in);
    }
    if U.theme == 2u {
        return midnight_color(in);
    }
    if U.theme == 1u {
        return vapor_color(in);
    }
    return classic_color(in);
}

fn classic_color(in: InterStage) -> vec4f {
    let U = uniforms;
    let nf = f32(U.seq_count);
    let mf = f32(U.seq_length);
    let i = u32(in.texcoord.x * nf);
    let j = u32(in.texcoord.y * mf);
    let r = (f32(i) / nf) * (200f / 255f);
    let g = (f32(j) / mf) * (200f / 255f);
    let b = 99f / 255f;
    let a = 1f;
    return vec4f(r, g, b, a);
}

fn vapor_color(in: InterStage) -> vec4f {
    let h = 0.6 + 0.3 * in.texcoord.x;
    let s = 0.8;
    let v = 0.5 + min(0.5, in.texcoord.y) - 0.5 * in.texcoord.x;
    let a = 1f;
    return vec4f(hsv_to_rgb(h, s, v), a);
}

fn midnight_color(in: InterStage) -> vec4f {
    let r = 0.005 * in.texcoord.x * in.texcoord.y;
    let g = 0f;
    let b = 0.2 + 0.6 * in.texcoord.y;
    let a = 1f;
    return vec4f(r, g, b, a);
}

fn fiesta_color(in: InterStage) -> vec4f {
    let U = uniforms;
    let i = u32(in.position.x);
    let h = (INV_PHI * f32(i)) % 1f;
    let s = 1f;
    let v = 1f;
    let a = 1f;
    return vec4f(hsv_to_rgb(h, s, v), a);
}

fn easter_color(in: InterStage) -> vec4f {
    let U = uniforms;

    let grass = in.texcoord.y < 0.2;
    if grass {
        return vec4f(0f, 0.3, 0f, 1f);
    } else {
    let i = u32(in.position.x);
        let h = (INV_PHI * f32(i)) % 1f;
        let s = 0.7;
        let v = 1f;
        let a = 1f;
        return vec4f(hsv_to_rgb(h, s, v), a);
    }
}

fn bone_color(in: InterStage) -> vec4f {
    let h = 0.1 + 0.15 * in.texcoord.x;
    let s = 0.4 * in.texcoord.y;
    let v = 0.6 + 0.3 * in.texcoord.y;
    let a = 1f;
    return vec4f(hsv_to_rgb(h, s, v), a);
}

fn oscope_color(in: InterStage) -> vec4f {
    let r = 0f;
    let g = 0.1875;
    let b = 0.015625;
    let a = 1f;
    return vec4f(r, g, b, a);
}

fn triad_color(in: InterStage) -> vec4f {

    let U = uniforms;

    let HUE_SPREAD = 0.15;
    let SEQ_WIDTH = 0.4;

    let n = U.seq_count;
    let i = u32(in.position.x);

    var h = 1f * U.t / TAU + HUE_SPREAD * in.texcoord.x;
    let band = f32(3 * i / n) / 3f;
    h += band;
    let s = 1f;
    let v = 1f;

    let a_rotor = fract(3f * U.t / TAU + band);

    let b = fract(a_rotor + in.texcoord.y + SEQ_WIDTH / 2f);
    let a0 = select(0f, 1f, b < SEQ_WIDTH);

    let c = fract(a_rotor + in.texcoord.y + 0.5);
    let cc =  2f * min(c, 1f - c);
    let ccc = (cc - 1f) / SEQ_WIDTH + 1f;
    let a1 = max(0f, ccc);

    let d = fract(a_rotor + in.texcoord.y);
    let dd = d * (1f - d) / (SEQ_WIDTH / 2f);
    let a2 = max(0f, 1f - dd);

    let e = fract(a_rotor + in.texcoord.y);
    let ee = smoothstep(1f - SEQ_WIDTH * 0.7, 1f, e);
    let eee = smoothstep(0f, SEQ_WIDTH * 0.7, e);
    let a3 = 1 + ee - eee;

    let keep = i % 4 <= 1;

    let a_split = select(a0, a0, in.texcoord.x > 0.5);

    let a = select(0f, a1, keep);

    return vec4f(hsv_to_rgb(h, s, v), a);
}

fn hsv_to_rgb(h: f32, s: f32, v: f32) -> vec3f {
    if s == 0f {
        return vec3f(v);
    }
    let h6 = 6f * (h - floor(h));
    var i = i32(h6);
    let f = h6 - f32(i);
    let p = v * (1f - s);
    let q = v * (1f - s * f);
    let t = v * (1f - s * (1f - f));
    if i == 0 {
        return vec3f(v, t, p);
    }
    if i == 1 {
        return vec3f(q, v, p);
    }
    if i == 2 {
        return vec3f(p, v, t);
    }
    if i == 3 {
        return vec3f(p, q, v);
    }
    if i == 4 {
        return vec3f(t, p, v);
    }
    if i == 5 {
        return vec3f(v, p, q);
    }
    return vec3f(0f);
}
`;

import { RenderPass, Binding, Attachment } from './passes.js';
import { UniformBuffer } from './resources.js';

export class ColormapPass extends RenderPass {
    constructor(name) {
        super(name || 'colormap');
        this.uniformBuffer = new UniformBuffer(`${name} uniforms`, 16);
        this.output = null;
        this._enabled = true;
        this._params = {
            seq_count: 200,
            seq_length: 100,
            theme: 0,
            t: 0,
        };
    }

    get Parameters() {
        return this._params;
    }

    setParameters(params) {
        if (params) {
            for (const key of Object.keys(params)) {
                this._params[key] = params[key];
            }
        }
    }

    resources() {
        return [
            Binding([0, 0], 'uniforms', this.uniformBuffer, 'ro'),
            Attachment('colormap_output', this.output),
        ];
    }

    attach_output(texture) {
        this.output = texture;
        return this;
    }

    enable() {
        this._enabled = true;
    }

    instantiate(device) {
        const shaderModule = device.createShaderModule({
            label: this.make_label('shader'),
            code: COLORS_WGSL,
        });

        this.instantiate_pipeline(device, shaderModule, 'vertex_shader', 'fragment_shader');
        this.instantiate_bind_groups(device);
        this.instantiate_pass_descriptor();

        return this;
    }

    execute(device, encoder) {
        if (!this._enabled) {
            return;
        }

        const buffer = new ArrayBuffer(16);
        const view = new DataView(buffer);
        view.setUint32(0, this._params.seq_count, true);
        view.setUint32(4, this._params.seq_length, true);
        view.setUint32(8, this._params.theme, true);
        view.setFloat32(12, this._params.t, true);
        device.queue.writeBuffer(this.uniformBuffer._buffer, 0, buffer);

        const currentView = this.output.current_view();
        this.pass_descriptor.colorAttachments[0].view = currentView;

        const vertexCount = 3;
        this.encode_render_pass_draw(encoder, vertexCount);

        // Auto-disable for non-animated themes after first frame
        if (this._params.theme !== 7) {
            this._enabled = false;
        }
    }
}
