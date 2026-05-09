export class ParameterizedMixIn {
    constructor() {
        const P = this.constructor.Parameters;
        this._parameters = new P();
    }

    update_parameters(**kwargs) {
        const P = this.constructor.Parameters;
        for (const [k, v] of Object.entries(kwargs)) {
            if (!(k in P)) {
                throw new TypeError(`${P.name} has no field ${k}`);
            }
            this._parameters[k] = v;
        }
        return this;
    }
}