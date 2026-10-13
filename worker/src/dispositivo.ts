/*
 * Token do aparelho ("1 voto por aparelho").
 *
 * Formato: v1.<id 22>.<emitidoEm base36>.<HMAC-SHA256 base64url 43>
 * Vai no cookie __Host-av (HttpOnly) e também no localStorage do site, enviado no cabeçalho
 * X-AV-Dispositivo quando o cookie some. O servidor nunca guarda o id: só HMAC(SEGREDO_DEDUP, id).
 */
import type { Env } from './config';
import { deB64url, hmacB64url, hmacConfere, idAleatorio } from './cripto';

export const VALIDADE_S = 60 * 24 * 3600;
const FORMATO = /^v1\.([A-Za-z0-9_-]{22})\.([0-9a-z]{1,9})\.([A-Za-z0-9_-]{43})$/;

export interface Dispositivo {
  token: string;
  id: string;
  emitidoEm: number; // ms
}

export async function emitir(env: Env, t: number): Promise<Dispositivo> {
  const id = idAleatorio();
  const iat = Math.floor(t / 1000).toString(36);
  const corpo = `v1.${id}.${iat}`;
  const token = `${corpo}.${await hmacB64url(env.SEGREDO_DISPOSITIVO, corpo)}`;
  return { token, id, emitidoEm: Math.floor(t / 1000) * 1000 };
}

export async function verificar(env: Env, token: string | null | undefined, t: number): Promise<Dispositivo | null> {
  if (!token || token.length > 100) return null;
  const m = FORMATO.exec(token);
  if (!m) return null;
  const [, id, iat36, mac] = m;
  const emitidoEm = parseInt(iat36, 36) * 1000;
  if (!Number.isFinite(emitidoEm)) return null;
  if (emitidoEm > t + 5 * 60_000) return null; // do futuro
  if (t - emitidoEm > VALIDADE_S * 1000) return null; // expirado
  const assinatura = deB64url(mac);
  if (!assinatura || assinatura.length !== 32) return null;
  const ok = await hmacConfere(env.SEGREDO_DISPOSITIVO, `v1.${id}.${iat36}`, assinatura);
  return ok ? { token, id, emitidoEm } : null;
}

function lerCookie(request: Request, nome: string): string | null {
  const cookies = request.headers.get('cookie');
  if (!cookies) return null;
  for (const parte of cookies.split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim();
  }
  return null;
}

/** Cookie primeiro; se ele não for válido, o cabeçalho (cópia do localStorage). */
export async function lerDispositivo(request: Request, env: Env, t: number): Promise<Dispositivo | null> {
  return (
    (await verificar(env, lerCookie(request, '__Host-av'), t)) ??
    (await verificar(env, request.headers.get('x-av-dispositivo'), t))
  );
}

export function cookieDispositivo(token: string): string {
  return `__Host-av=${token}; Path=/; Max-Age=${VALIDADE_S}; HttpOnly; Secure; SameSite=Strict`;
}
