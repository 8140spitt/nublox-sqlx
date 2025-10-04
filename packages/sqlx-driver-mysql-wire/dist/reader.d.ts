export declare class Reader {
    private buf;
    private off;
    constructor(buf: Buffer);
    u8(): number;
    u16(): number;
    u24(): number;
    u32(): number;
    lenenc(): number | null;
    str(len: number): string;
    nulstr(): string;
    slice(n: number): Buffer<ArrayBufferLike>;
    get remaining(): number;
}
