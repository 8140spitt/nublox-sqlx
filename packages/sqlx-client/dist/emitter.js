export class Emitter {
    m = new Map();
    on(name, fn) {
        if (!this.m.has(name))
            this.m.set(name, new Set());
        this.m.get(name).add(fn);
        return () => this.off(name, fn);
    }
    once(name, fn) {
        const off = this.on(name, (e) => { off(); fn(e); });
        return off;
    }
    off(name, fn) {
        this.m.get(name)?.delete(fn);
    }
    emit(name, payload) {
        this.m.get(name)?.forEach((fn) => {
            try {
                fn(payload);
            }
            catch { /* swallow */ }
        });
    }
}
