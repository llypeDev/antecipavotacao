/* HMAC, SHA-256 e base64url com a Web Crypto do runtime. */

const enc = new TextEncoder();
const chaves = new Map<string, Promise<CryptoKey>>();

function chave(segredo: string | undefined): Promise<CryptoKey> {
  if (!segredo) throw new Error('segredo_ausente');
  let k = chaves.get(segredo);
  if (!k) {
    k = crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
      'verify',
    ]);
    chaves.set(segredo, k);
  }
  return k;
}

export async function hmac(segredo: string | undefined, msg: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign('HMAC', await chave(segredo), enc.encode(msg)));
}

export async function hmacHex(segredo: string | undefined, msg: string, tamanho = 64): Promise<string> {
  return hex(await hmac(segredo, msg)).slice(0, tamanho);
}

export async function hmacB64url(segredo: string | undefined, msg: string): Promise<string> {
  return b64url(await hmac(segredo, msg));
}

/** Comparação em tempo constante (crypto.subtle.verify). */
export async function hmacConfere(segredo: string | undefined, msg: string, assinatura: Uint8Array): Promise<boolean> {
  return crypto.subtle.verify('HMAC', await chave(segredo), assinatura, enc.encode(msg));
}

export async function sha256Hex(texto: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(texto))));
}

export function hex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

export function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function deB64url(texto: string): Uint8Array | null {
  try {
    const b = atob(texto.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((texto.length + 3) % 4));
    const out = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** 16 bytes aleatórios em base64url (22 caracteres). */
export function idAleatorio(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(16)));
}
