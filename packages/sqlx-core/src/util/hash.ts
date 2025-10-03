import * as crypto from 'crypto';

export const sha256 = (s: string | Buffer) =>
    crypto.createHash('sha256').update(s).digest('hex');
