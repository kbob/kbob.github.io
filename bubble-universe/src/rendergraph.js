import { Pass } from './passes.js';

let frame = 0;

export class RenderGraph {
    constructor(device, passes, externalResources = []) {
        const resourceMap = new Map();

        for (const r of externalResources) {
            resourceMap.set(r, null);
        }

        for (const pass of passes) {
            for (const r of pass.resources()) {
                if (r.isBinding) {
                    const resource = r.resource;
                    if (!resource) {
                        throw new Error(
                            `pass ${pass.name} is missing resource ${r.name}`
                        );
                    }
                    if (!resourceMap.has(resource)) {
                        resourceMap.set(resource, null);
                    }
                }
            }
        }

        for (const [resource] of resourceMap) {
            if (typeof resource.instantiate === 'function') {
                resourceMap.set(resource, resource.instantiate(device));
            }
        }

        this.passes = new Map();
        for (const pass of passes) {
            this.passes.set(pass, pass.instantiate(device));
        }
    }

    execute(device) {
        frame++;

        const encoder = device.createCommandEncoder({
            label: 'rendergraph command encoder',
        });

        for (const pass of this.passes.keys()) {
            pass.execute(device, encoder);
        }

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
    }
}