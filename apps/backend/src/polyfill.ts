import * as crypto from 'crypto';

if (!globalThis.crypto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).crypto = crypto.webcrypto || crypto;
}
