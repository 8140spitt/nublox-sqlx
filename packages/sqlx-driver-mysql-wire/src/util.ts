import { FIELD_TYPES } from './protocol';
import type { BigIntMode } from './types';

export function bigIntToMode(x: bigint, mode: BigIntMode): number | bigint | string {
    if (mode === 'bigint') return x;
    if (mode === 'number') return Number(x); // may lose precision > 2^53-1 (caller chose this)
    return x.toString();
}

export function convertValue(
    type: number,
    raw: string | null,
    opts: { bigIntMode: BigIntMode; dateMode: 'string' | 'jsdate' }
): any {
    if (raw === null) return null;

    switch (type) {
        case FIELD_TYPES.TINY:
        case FIELD_TYPES.SHORT:
        case FIELD_TYPES.LONG:
        case FIELD_TYPES.INT24:
        case FIELD_TYPES.YEAR:
            return Number(raw);

        case FIELD_TYPES.LONGLONG: {
            // treat as bigint then mode-convert
            const bi = BigInt(raw);
            return bigIntToMode(bi, opts.bigIntMode);
        }

        case FIELD_TYPES.FLOAT:
        case FIELD_TYPES.DOUBLE:
        case FIELD_TYPES.NEWDECIMAL:
        case FIELD_TYPES.DECIMAL:
            return Number(raw);

        case FIELD_TYPES.DATE:
        case FIELD_TYPES.DATETIME:
        case FIELD_TYPES.TIMESTAMP:
            return opts.dateMode === 'jsdate' ? new Date(raw.replace(' ', 'T') + 'Z') : raw;

        case FIELD_TYPES.JSON:
            try { return JSON.parse(raw); } catch { return raw; }

        default:
            return raw;
    }
}
