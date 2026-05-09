import { BLEND_MODE, BORDER, Defaults } from './constants.js';
import { RenderPass, Binding, Attachment, BlendMode } from './passes.js';

const DRAW_SHADER = `
struct Uniforms {
    particle_size: vec2f,
    scale: vec2f,
    seq_count: u32,
    seq_length: u32,
};

@group(0) @binding(0) var<storage, read> uv_buffer: array<vec2f>;
@group(1) @binding(0) var<uniform> uniforms: Uniforms;
@group(2) @binding(0) var color_map: texture_2d<f32>;
@group(2) @binding(1) var color_sampler: sampler;

struct InterStage {
    @builtin(position) pos: vec4f,
    @location(0) @interpolate(flat) ij: vec2u,
    @location(1) @interpolate(perspective) pt: vec2f,
};

@vertex fn vertex_shader(
    @builtin(vertex_index) vertex_index: u32
) -> InterStage {
    let points = array<vec2f, 6>(
        vec2f(-1.0, -1.0),
        vec2f( 1.0, -1.0),
        vec2f(-1.0,  1.0),
        vec2f(-1.0,  1.0),
        vec2f( 1.0, -1.0),
        vec2f( 1.0,  1.0),
    );
    
    let U = uniforms;
    let particle_index = vertex_index / 6u;
    let k = vertex_index % 6u;
    let i = particle_index / U.seq_length;
    let j = particle_index % U.seq_length;
    let ij = vec2u(i, j);
    let uv = uv_buffer[particle_index];
    let pt = points[k];
    let xy = U.scale * uv + U.particle_size * pt;
    
    var out: InterStage;
    out.pos = vec4f(xy, 0.0, 1.0);
    out.ij = ij;
    out.pt = pt;
    return out;
}

@fragment fn fragment_shader(in: InterStage) -> @location(0) vec4f {
    let U = uniforms;
    let i = in.ij[0];
    let j = in.ij[1];
    let u = f32(i) / f32(U.seq_count - 1u);
    let v = f32(j) / f32(U.seq_length - 1u);
    let uv = vec2f(u, v);
    let color = textureSample(color_map, color_sampler, uv);

    let rad2 = dot(in.pt, in.pt);
    var a = color.a * (1.0 - rad2);
    if a < 0.01 {
        a = 0.0;
        discard;
    }

    return vec4f(color.rgb * a, a);
}
`;

export class ColorMappedDrawingPass extends RenderPass {
    constructor() {
        super('drawing');
        this.uvs = null;
        this.uniformBuffer = null;
        this.colormap = null;
        this.colormapSampler = null;
        this.colorOutput = null;
        this._params = {
            seq_count: Defaults.SEQ_COUNT,
            seq_length: Defaults.SEQ_LENGTH,
            particle_size: Defaults.PARTICLE_SIZE,
        };
    }

    get Parameters() {
        return this._params;
    }

    resources() {
        return [
            Binding([0, 0], 'uv', this.uvs, 'ro'),
            Binding([1, 0], 'uniforms', this.uniformBuffer, 'ro'),
            Binding([2, 0], 'colormap', this.colormap, 'ro'),
            Binding([2, 1], 'colormap sampler', this.colormapSampler, 'ro'),
            Attachment('color output', this.colorOutput, [0, 0, 0, 0], BLEND_MODE, 'clear'),
        ];
    }

    attach_color_output(resource) {
        this.colorOutput = resource;
        return this;
    }

    bind_uvs(buffer) {
        this.uvs = buffer;
        return this;
    }

    bind_colormap(texture) {
        this.colormap = texture;
        return this;
    }

    instantiate(device) {
        const shaderModule = device.createShaderModule({
            label: 'drawing shader',
            code: DRAW_SHADER,
        });

        this.instantiate_pipeline(device, shaderModule, 'vertex_shader', 'fragment_shader');
        this.instantiate_bind_groups(device);
        this.instantiate_pass_descriptor();

        return this;
    }

    execute(device, encoder) {
        const params = this.Parameters;
        const [w, h] = this.colorOutput.current_size();

        function adjustForAspect(x) {
            if (h > w) {
                return [x, x * w / h];
            } else {
                return [x * h / w, x];
            }
        }

        const [psX, psY] = adjustForAspect(params.particle_size / Defaults.CANVAS_SIZE[1]);
        const [scX, scY] = adjustForAspect((1 - BORDER) / 2);

        const buffer = new ArrayBuffer(24);
        const view = new DataView(buffer);
        view.setFloat32(0, psX, true);
        view.setFloat32(4, psY, true);
        view.setFloat32(8, scX, true);
        view.setFloat32(12, scY, true);
        view.setUint32(16, params.seq_count, true);
        view.setUint32(20, params.seq_length, true);
        device.queue.writeBuffer(this.uniformBuffer._buffer, 0, buffer);

        this.pass_descriptor.colorAttachments[0].view = this.colorOutput.current_view();

        const vertexCount = 6 * params.seq_count * params.seq_length;
        this.encode_render_pass_draw(encoder, vertexCount);
    }

    resize_colormap(device, size) {
        this.rebind_group(device, 'colormap');
    }
}
