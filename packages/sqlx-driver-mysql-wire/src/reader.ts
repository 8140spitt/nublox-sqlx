export class Reader {
    private off = 0;
    constructor(private buf: Buffer) { }
    u8() { return this.buf[this.off++]; }
    u16() { const v = this.buf.readUInt16LE(this.off); this.off += 2; return v; }
    u24() { const v = this.buf.readUIntLE(this.off, 3); this.off += 3; return v; }
    u32() { const v = this.buf.readUInt32LE(this.off); this.off += 4; return v; }
    lenenc(): number | null {
        const b = this.u8();
        if (b < 0xfb) return b;
        if (b === 0xfb) return null;
        if (b === 0xfc) { const v = this.buf.readUInt16LE(this.off); this.off += 2; return v; }
        if (b === 0xfd) { const v = this.buf.readUIntLE(this.off, 3); this.off += 3; return v; }
        const v = Number(this.buf.readBigUInt64LE(this.off)); this.off += 8; return v;
    }
    str(len: number) { const s = this.buf.toString('utf8', this.off, this.off + len); this.off += len; return s; }
    nulstr() { const end = this.buf.indexOf(0x00, this.off); const s = this.buf.toString('utf8', this.off, end); this.off = end + 1; return s; }
    slice(n: number) { const s = this.buf.subarray(this.off, this.off + n); this.off += n; return s; }
    get remaining() { return this.buf.length - this.off; }
}
