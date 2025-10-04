import type { ClientEvents, EventName } from './types';

export class Emitter {
    private m = new Map<string, Set<Function>>();
    on<K extends EventName>(name: K, fn: (e: ClientEvents[K]) => void) {
        if (!this.m.has(name)) this.m.set(name, new Set());
        this.m.get(name)!.add(fn);
        return () => this.off(name, fn);
    }
    once<K extends EventName>(name: K, fn: (e: ClientEvents[K]) => void) {
        const off = this.on(name, (e) => { off(); fn(e); });
        return off;
    }
    off<K extends EventName>(name: K, fn: (e: ClientEvents[K]) => void) {
        this.m.get(name)?.delete(fn);
    }
    emit<K extends EventName>(name: K, payload: ClientEvents[K]) {
        this.m.get(name)?.forEach((fn) => {
            try { (fn as any)(payload); } catch { /* swallow */ }
        });
    }
}
