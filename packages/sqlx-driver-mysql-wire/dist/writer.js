export class Writer {
    chunks = [];
    u8(v) { this.chunks.push(Buffer.from([v])); return this; }
    u16(v) { const b = Buffer.allocUnsafe(2); b.writeUInt16LE(v); this.chunks.push(b); return this; }
    u24(v) { const b = Buffer.allocUnsafe(3); b.writeUIntLE(v, 0, 3); this.chunks.push(b); return this; }
    u32(v) { const b = Buffer.allocUnsafe(4); b.writeUInt32LE(v); this.chunks.push(b); return this; }
    buf(b) { this.chunks.push(b); return this; }
    str(s) { this.chunks.push(Buffer.from(s, 'utf8')); return this; }
    lenenc(n) {
        if (n < 0xfb)
            return this.u8(n);
        if (n < 0x10000)
            return this.u8(0xfc).u16(n);
        if (n < 0x1000000)
            return this.u8(0xfd).u24(n);
        const b = Buffer.allocUnsafe(8);
        b.writeBigUInt64LE(BigInt(n));
        this.u8(0xfe).buf(b);
        return this;
    }
    build() { return Buffer.concat(this.chunks); }
}
