export class Resource {
    constructor(name) {
        this.name = name;
        this._buffer = null;
        this._texture = null;
        this._sampler = null;
    }

    instantiate(device) {
        throw new Error('instantiate not implemented');
    }

    resource_descriptor() {
        throw new Error('resource_descriptor not implemented');
    }

    make_label(tag) {
        return `${this.name} ${tag}`;
    }
}

export class StorageBuffer extends Resource {
    constructor(name, byteSize, writable = false) {
        super(name);
        this.byteSize = byteSize;
        this.writable = writable;
    }

    instantiate(device) {
        if (this._buffer === null) {
            let usage = GPUBufferUsage.STORAGE;
            if (this.writable) {
                usage |= GPUBufferUsage.COPY_DST;
            }
            this._buffer = device.createBuffer({
                label: this.make_label('storage buffer'),
                size: this.byteSize,
                usage: usage,
            });
        }
        return this._buffer;
    }

    resource_descriptor() {
        return this._buffer;
    }

    get buffer() {
        return this._buffer;
    }
}

export class UniformBuffer extends Resource {
    constructor(name, byteSize) {
        super(name);
        this.byteSize = byteSize;
    }

    instantiate(device) {
        if (this._buffer === null) {
            this._buffer = device.createBuffer({
                label: this.make_label('buffer'),
                size: this.byteSize,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
        }
        return this._buffer;
    }

    resource_descriptor() {
        return this._buffer;
    }

    write_buffer(device, data) {
        device.queue.writeBuffer(this._buffer, 0, data);
        return this;
    }
}

export class Texture extends Resource {
    constructor(name, format, shape, {
        bindableAsTexture = true,
        readable = false,
        writable = false,
        renderable = false,
    } = {}) {
        super(name);
        this.format = format;
        this.shape = shape;
        this.bindableAsTexture = bindableAsTexture;
        this.readable = readable;
        this.writable = writable;
        this.renderable = renderable;
    }

    instantiate(device) {
        if (this._texture === null) {
            let usage = 0;
            if (this.bindableAsTexture) {
                usage |= GPUTextureUsage.TEXTURE_BINDING;
            }
            if (this.readable) {
                usage |= GPUTextureUsage.COPY_SRC;
            }
            if (this.writable) {
                usage |= GPUTextureUsage.COPY_DST;
            }
            if (this.renderable) {
                usage |= GPUTextureUsage.RENDER_ATTACHMENT;
            }
            this._texture = device.createTexture({
                label: this.make_label('texture'),
                size: { width: this.shape[0], height: this.shape[1] },
                format: this.format,
                usage: usage,
            });
            this._view = this._texture.createView({
                label: this.make_label('texture view'),
            });
        }
        return this._texture;
    }

    resource_descriptor() {
        return this._view;
    }

    current_texture() {
        return this._texture;
    }

    current_view() {
        return this._view;
    }

    current_size() {
        if (this._texture) {
            return [this._texture.width, this._texture.height];
        }
        return [this.shape[0], this.shape[1]];
    }

    resize(device, newSize) {
        this._texture?.destroy();
        this._texture = null;
        this.shape = [newSize[0], newSize[1], this.shape[2]];
        this.instantiate(device);
    }
}

export class CanvasTexture extends Texture {
    constructor(name, context, format) {
        super(name, format, [context.canvas.width, context.canvas.height, 4], {
            bindableAsTexture: false,
            readable: false,
            writable: false,
            renderable: true,
        });
        this.context = context;
    }

    instantiate(device) {
        return this;
    }

    current_texture() {
        return this.context.getCurrentTexture();
    }

    current_view() {
        return this.context.getCurrentTexture().createView();
    }

    resource_descriptor() {
        return this.current_view();
    }

    current_size() {
        return [this.context.canvas.width, this.context.canvas.height];
    }
}

export class Sampler extends Resource {
    constructor(name, minFilter = 'linear', magFilter = 'linear') {
        super(name);
        this.minFilter = minFilter;
        this.magFilter = magFilter;
    }

    instantiate(device) {
        if (this._sampler === null) {
            this._sampler = device.createSampler({
                label: this.name,
                minFilter: this.minFilter,
                magFilter: this.magFilter,
            });
        }
        return this._sampler;
    }

    resource_descriptor() {
        return this._sampler;
    }
}