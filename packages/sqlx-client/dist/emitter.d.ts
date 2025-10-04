import type { ClientEvents, EventName } from './types';
export declare class Emitter {
    private m;
    on<K extends EventName>(name: K, fn: (e: ClientEvents[K]) => void): () => void;
    once<K extends EventName>(name: K, fn: (e: ClientEvents[K]) => void): () => void;
    off<K extends EventName>(name: K, fn: (e: ClientEvents[K]) => void): void;
    emit<K extends EventName>(name: K, payload: ClientEvents[K]): void;
}
