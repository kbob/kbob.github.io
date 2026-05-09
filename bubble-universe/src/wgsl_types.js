export class f32 extends Number {
    static bytes = 4;
    static align = 4;
}

export class i32 extends Number {
    static bytes = 4;
    static align = 4;
}

export class u32 extends Number {
    static bytes = 4;
    static align = 4;
}

export class vec2f extends Array {
    constructor(...args) {
        super(2);
        this[0] = f32(args[0] ?? 0);
        this[1] = f32(args[1] ?? 0);
    }
    static bytes = 8;
    static align = 8;
}

export class vec3f extends Array {
    constructor(...args) {
        super(3);
        this[0] = f32(args[0] ?? 0);
        this[1] = f32(args[1] ?? 0);
        this[2] = f32(args[2] ?? 0);
    }
    static bytes = 12;
    static align = 16;
}

export class vec4f extends Array {
    constructor(...args) {
        super(4);
        this[0] = f32(args[0] ?? 0);
        this[1] = f32(args[1] ?? 0);
        this[2] = f32(args[2] ?? 0);
        this[3] = f32(args[3] ?? 0);
    }
    static bytes = 16;
    static align = 16;
}

export class vec2i extends Array {
    constructor(...args) {
        super(2);
        this[0] = i32(args[0] ?? 0);
        this[1] = i32(args[1] ?? 0);
    }
    static bytes = 8;
    static align = 8;
}

export class vec3i extends Array {
    constructor(...args) {
        super(3);
        this[0] = i32(args[0] ?? 0);
        this[1] = i32(args[1] ?? 0);
        this[2] = i32(args[2] ?? 0);
    }
    static bytes = 12;
    static align = 16;
}

export class vec4i extends Array {
    constructor(...args) {
        super(4);
        this[0] = i32(args[0] ?? 0);
        this[1] = i32(args[1] ?? 0);
        this[2] = i32(args[2] ?? 0);
        this[3] = i32(args[3] ?? 0);
    }
    static bytes = 16;
    static align = 16;
}

export class vec2u extends Array {
    constructor(...args) {
        super(2);
        this[0] = u32(args[0] ?? 0);
        this[1] = u32(args[1] ?? 0);
    }
    static bytes = 8;
    static align = 8;
}

export class vec3u extends Array {
    constructor(...args) {
        super(3);
        this[0] = u32(args[0] ?? 0);
        this[1] = u32(args[1] ?? 0);
        this[2] = u32(args[2] ?? 0);
    }
    static bytes = 12;
    static align = 16;
}

export class vec4u extends Array {
    constructor(...args) {
        super(4);
        this[0] = u32(args[0] ?? 0);
        this[1] = u32(args[1] ?? 0);
        this[2] = u32(args[2] ?? 0);
        this[3] = u32(args[3] ?? 0);
    }
    static bytes = 16;
    static align = 16;
}