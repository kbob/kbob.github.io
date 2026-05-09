import { Defaults, WORKGROUP_SIZE } from './constants.js';
import { ComputePass, Binding, Access } from './passes.js';

const PARTICLE_SHADER = `
struct Uniforms {
    seq_count: u32,
    seq_length: u32,
    s_blocks: u32,
    r: f32,
    s: f32,
    t: f32,
};

@group(0) @binding(0) var<storage, read_write> uvs: array<vec2f>;
@group(1) @binding(0) var<uniform> uniforms: Uniforms;

@compute @workgroup_size(64)
fn compute_shader(@builtin(global_invocation_id) id: vec3u) {
    let U = uniforms;
    let i = id.x;
    if i < U.seq_count && U.seq_length != 0 {
        let fi = f32(i);
        let b_size = U.seq_count / U.s_blocks;
        let r = U.r * U.s;
        let s = U.s + f32(i / b_size * b_size);
        let tau = 6.283185307179586;
        let alpha = vec2f(0.7548776662466927, 0.5698402909980532);
        
        let init = (U.t / tau + alpha * U.s * fi) % 1.0;
        let rad = 2.0 * sqrt(init[0]);
        let theta = tau * init[1];
        
        var u = rad * sin(theta);
        var v = rad * cos(theta);
        var x = u + U.t;
        
        u = sin(s * fi + v) + sin(r * fi + x);
        v = cos(s * fi + v) + cos(r * fi + x);
        x = u + U.t;
        
        uvs[i * U.seq_length] = vec2f(u, -v);
        for (var j = 1u; j < U.seq_length; j++) {
            u = sin(s * fi + v) + sin(r * fi + x);
            v = cos(s * fi + v) + cos(r * fi + x);
            x = u + U.t;
            uvs[i * U.seq_length + j] = vec2f(u, -v);
        }
    }
}
`;

export class ParticleMotionPass extends ComputePass {
    constructor() {
        super('particle motion');
        this.uvs = null;
        this.uniformBuffer = null;
        this._params = {
            seq_count: Defaults.SEQ_COUNT,
            seq_length: Defaults.SEQ_LENGTH,
            s_blocks: Defaults.S_BLOCKS,
            r: Defaults.R,
            s: Defaults.S,
            t: 0,
        };
    }

    get Parameters() {
        return this._params;
    }

    resources() {
        return [
            Binding([0, 0], 'uv', this.uvs, Access.WO),
            Binding([1, 0], 'uniforms', this.uniformBuffer, Access.RO),
        ];
    }

    bind_uvs(buffer) {
        this.uvs = buffer;
        return this;
    }

    instantiate(device) {
        const shaderModule = device.createShaderModule({
            label: 'particle shader',
            code: PARTICLE_SHADER,
        });

        this.pipeline = device.createComputePipeline({
            label: 'particle motion pipeline',
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'compute_shader' },
        });

        this.instantiate_bind_groups(device);

        this.passDescriptor = { label: 'particle compute pass' };
        return this;
    }

    execute(device, encoder) {
        const params = this.Parameters;
        if (params.seq_count == 0 || params.seq_length == 0) {
            return;
        }
        const buffer = new ArrayBuffer(24);
        const view = new DataView(buffer);
        view.setUint32(0, params.seq_count, true);
        view.setUint32(4, params.seq_length, true);
        view.setUint32(8, params.s_blocks, true);
        view.setFloat32(12, params.r, true);
        view.setFloat32(16, params.s, true);
        view.setFloat32(20, params.t, true);
        device.queue.writeBuffer(this.uniformBuffer._buffer, 0, buffer);

        const workgroupCount = Math.ceil(params.seq_count / WORKGROUP_SIZE);
        const cpass = encoder.beginComputePass(this.passDescriptor);
        cpass.setPipeline(this.pipeline);
        cpass.setBindGroup(0, this.bind_groups[0]);
        cpass.setBindGroup(1, this.bind_groups[1]);
        cpass.dispatchWorkgroups(workgroupCount);
        cpass.end();
    }
}
