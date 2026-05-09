export function Access(name) {
    return name;
}
Access.RO = 'ro';
Access.RW = 'rw';
Access.WO = 'wo';

export function BlendMode(name) {
    return name;
}
BlendMode.ADD = 'add';
BlendMode.BLEND = 'blend';
BlendMode.COPY = 'copy';

function getBlendState(mode) {
    if (mode === 'add') {
        return {
            color: {
                operation: 'add',
                srcFactor: 'one',
                dstFactor: 'one',
            },
            alpha: {
                operation: 'add',
                srcFactor: 'one',
                dstFactor: 'one',
            },
        };
    }
    if (mode === 'blend') {
        return {
            color: {
                operation: 'add',
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
            },
            alpha: {
                operation: 'add',
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
            },
        };
    }
    if (mode === 'copy') {
        return null;
    }
    throw new Error(`no blend mode defined for ${mode}`);
}

export function Binding(groupBinding, name, resource, access = 'ro') {
    return {
        groupBinding,
        name,
        resource,
        access,
        isBinding: true,
        get group() { return groupBinding[0]; },
        get binding() { return groupBinding[1]; },
    };
}

export function Attachment(name, resource, clearValue = [0, 0, 0, 1], blend = 'copy', loadOp = 'clear') {
    return { name, resource, clearValue, blend, loadOp, isAttachment: true };
}

export class Pass {
    constructor(name) {
        this.name = name;
        this.bind_groups = null;
        this.pipeline = null;
    }

    resources() {
        throw new Error('resources not implemented');
    }

    instantiate(device) {
        throw new Error('instantiate not implemented');
    }

    execute(device, encoder) {
        throw new Error('execute not implemented');
    }

    resize(device, newSize) {
        console.log(`resize not handled by pass ${this.name}`);
    }

    instantiate_bind_groups(device) {
        const bindings = this.resources().filter(r => r && r.isBinding);
        const groups = bindings.map(b => b.group);
        const groupCount = groups.length > 0 ? Math.max(...groups) + 1 : 0;

        this.bind_groups = [];
        for (let i = 0; i < groupCount; i++) {
            const groupBindings = bindings.filter(b => b.group === i);
            this.bind_groups.push(this._create_bind_group(device, groupBindings));
        }
        return this;
    }

    rebind_group(device, name) {
        const bindings = this.resources().filter(r => r && r.isBinding);
        const binding = bindings.find(b => b.name === name);
        const group = binding.group;
        this.bind_groups[group] = this._create_bind_group(
            device,
            bindings.filter(b => b.group === group)
        );
        return this;
    }

    _create_bind_group(device, bindings) {
        if (bindings.length === 0) {
            return null;
        }
        const group = bindings[0].group;
        if (!bindings.every(b => b.group === group)) {
            throw new Error('inconsistent groups');
        }
        return device.createBindGroup({
            label: this.make_label('bind group'),
            layout: this.pipeline.getBindGroupLayout(group),
            entries: bindings.map(b => ({
                binding: b.binding,
                resource: b.resource.resource_descriptor(),
            })),
        });
    }

    make_label(tag) {
        return `${this.name} ${tag}`;
    }

    read_shader(filename) {
        throw new Error('read_shader not implemented - import directly');
    }
}

export class ComputePass extends Pass {
    constructor(name) {
        super(name);
        this.pass_descriptor = null;
    }

    instantiate_pipeline(device, shaderModule) {
        this.pipeline = device.createComputePipeline({
            label: this.make_label('pipeline'),
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: this.compute_entrypoint || 'main',
            },
        });
        return this;
    }

    instantiate_pass_descriptor() {
        this.pass_descriptor = {
            label: this.make_label('compute pass'),
        };
        return this;
    }

    encode_compute_pass(encoder, workgroupCount) {
        const cpass = encoder.beginComputePass(this.pass_descriptor);
        cpass.setPipeline(this.pipeline);
        for (let i = 0; i < this.bind_groups.length; i++) {
            const bg = this.bind_groups[i];
            if (bg) {
                cpass.setBindGroup(i, bg);
            }
        }
        cpass.dispatchWorkgroups(workgroupCount);
        cpass.end();
        return this;
    }
}

export class RenderPass extends Pass {
    constructor(name) {
        super(name);
        this.pass_descriptor = null;
    }

    instantiate_pipeline(device, shaderModule, vertexEntry, fragmentEntry) {
        this.pipeline = device.createRenderPipeline({
            label: this.make_label('pipeline'),
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: vertexEntry || 'vertex_main',
            },
            fragment: {
                module: shaderModule,
                entryPoint: fragmentEntry || 'fragment_main',
                targets: this._color_targets(),
            },
        });
        return this;
    }

    _color_targets() {
        return this.resources()
            .filter(r => r.isAttachment)
            .map(r => {
                const target = {
                    format: r.resource.format,
                };
                const blend = getBlendState(r.blend);
                if (blend !== null) {
                    target.blend = blend;
                }
                return target;
            });
    }

    instantiate_pass_descriptor() {
        this.pass_descriptor = {
            label: this.make_label('render pass'),
            colorAttachments: this._color_attachments(),
        };
        return this;
    }

    _color_attachments() {
        return this.resources()
            .filter(r => r.isAttachment)
            .map(r => ({
                clearValue: r.clearValue,
                loadOp: r.loadOp,
                storeOp: 'store',
                view: undefined,
            }));
    }

    encode_render_pass_draw(encoder, vertexCount) {
        const rpass = encoder.beginRenderPass(this.pass_descriptor);
        rpass.setPipeline(this.pipeline);
        for (let i = 0; i < this.bind_groups.length; i++) {
            const bg = this.bind_groups[i];
            if (bg) {
                rpass.setBindGroup(i, bg);
            }
        }
        rpass.draw(vertexCount);
        rpass.end();
        return this;
    }
}