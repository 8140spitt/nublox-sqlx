export class Reader {
    private off = 0;
    constructor(private buf: Buffer) { }
    get remaining() { return this.buf.length - this.off; }
    skip(n: number) { this.off += n; }
    u8() { return this.buf[this.off++]; }
    u16() { const v = this.buf.readUInt16LE(this.off); this.off += 2; return v; }
    u24() { const v = this.buf.readUIntLE(this.off, 3); this.off += 3; return v; }
    u32() { const v = this.buf.readUInt32LE(this.off); this.off += 4; return v; }
    i64() { const v = this.buf.readBigInt64LE(this.off); this.off += 8; return v; }
    u64() { const v = this.buf.readBigUInt64LE(this.off); this.off += 8; return v; }
    str(len: number) { const s = this.buf.toString('utf8', this.off, this.off + len); this.off += len; return s; }
    nulstr() { const end = this.buf.indexOf(0x00, this.off); const s = this.buf.toString('utf8', this.off, end); this.off = end + 1; return s; }
    slice(n: number) { const out = this.buf.subarray(this.off, this.off + n); this.off += n; return out; }
    lenenc(): number | null {
        const f = this.u8();
        if (f < 0xfb) return f;
        if (f === 0xfb) return null;
        if (f === 0xfc) { const v = this.buf.readUInt16LE(this.off); this.off += 2; return v; }
        if (f === 0xfd) { const v = this.buf.readUIntLE(this.off, 3); this.off += 3; return v; }
        const v = Number(this.buf.readBigUInt64LE(this.off)); this.off += 8; return v;
    }
}
