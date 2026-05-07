// Client-side AES-GCM encryption helpers for the password vault.
// The master password is never stored — only a PBKDF2 verifier hash is kept.

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function randomSalt(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(16)));
}

async function deriveKey(password: string, saltB64: string, iterations = 200_000): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(saltB64), iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function makeVerifier(password: string, saltB64: string): Promise<string> {
  // Verifier = PBKDF2(password, salt + 'verify') -> hex; separate from encryption key
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password + '|verify'), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromB64(saltB64), iterations: 200_000, hash: 'SHA-256' },
    baseKey,
    256
  );
  return toB64(bits);
}

export async function verifyPassword(password: string, saltB64: string, verifier: string): Promise<boolean> {
  const v = await makeVerifier(password, saltB64);
  return v === verifier;
}

export interface VaultSession {
  key: CryptoKey;
}

export async function openVault(password: string, saltB64: string): Promise<VaultSession> {
  return { key: await deriveKey(password, saltB64) };
}

export async function encryptText(session: VaultSession, plaintext: string): Promise<{ ct: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, session.key, enc.encode(plaintext));
  return { ct: toB64(ct), iv: toB64(iv) };
}

export async function decryptText(session: VaultSession, ct: string, iv: string): Promise<string> {
  const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, session.key, fromB64(ct));
  return dec.decode(buf);
}
