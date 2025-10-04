export declare class Writer {
    private chunks;
    u8(v: number): this;
    u16(v: number): this;
    u24(v: number): this;
    u32(v: number): this;
    buf(b: Buffer): this;
    str(s: string): this;
    lenenc(n: number): this;
    build(): Buffer<ArrayBuffer>;
}
