import { describe, expect, it } from 'vitest';
import { emitir, verificar } from '../src/dispositivo';
import { ambiente, cabecalhosPost, chamar } from './ajuda';

const T = Date.parse('2026-10-20T15:00:00Z');

describe('token do aparelho', () => {
  it('emite e verifica', async () => {
    const e = ambiente();
    const d = await emitir(e, T);
    expect(d.token).toMatch(/^v1\.[A-Za-z0-9_-]{22}\.[0-9a-z]+\.[A-Za-z0-9_-]{43}$/);
    expect(await verificar(e, d.token, T)).toMatchObject({ id: d.id });
  });

  it('recusa assinatura adulterada, outro segredo e versão errada', async () => {
    const e = ambiente();
    const d = await emitir(e, T);
    const ultimo = d.token.at(-1) === 'A' ? 'B' : 'A';
    expect(await verificar(e, d.token.slice(0, -1) + ultimo, T)).toBeNull();
    expect(await verificar(ambiente({ SEGREDO_DISPOSITIVO: 'outro' }), d.token, T)).toBeNull();
    expect(await verificar(e, 'v2' + d.token.slice(2), T)).toBeNull();
    expect(await verificar(e, '', T)).toBeNull();
    expect(await verificar(e, 'x'.repeat(500), T)).toBeNull();
  });

  it('recusa token expirado (mais de 60 dias) e emitido no futuro', async () => {
    const e = ambiente();
    const d = await emitir(e, T);
    expect(await verificar(e, d.token, T + 61 * 24 * 3600_000)).toBeNull();
    expect(await verificar(e, d.token, T - 10 * 60_000)).toBeNull();
  });

  it('a rota devolve cookie __Host- HttpOnly, Secure e SameSite=Strict', async () => {
    const r = await chamar(ambiente(), '/api/dispositivo', { method: 'POST', headers: cabecalhosPost() });
    expect(r.status).toBe(200);
    const cookie = r.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/^__Host-av=v1\./);
    for (const parte of ['Path=/', 'HttpOnly', 'Secure', 'SameSite=Strict']) expect(cookie).toContain(parte);
    expect(cookie).not.toMatch(/Domain=/i);
  });

  it('a rota devolve o mesmo token quando o cookie é válido', async () => {
    const e = ambiente();
    const d = await emitir(e, T - 60_000);
    const r = await chamar(e, '/api/dispositivo', {
      method: 'POST',
      headers: cabecalhosPost({ cookie: `outro=1; __Host-av=${d.token}` }),
    });
    expect(((await r.json()) as { dispositivo: string }).dispositivo).toBe(d.token);
  });

  it('a rota exige a origem do site e o cabeçalho X-AV', async () => {
    const e = ambiente();
    expect((await chamar(e, '/api/dispositivo', { method: 'POST', headers: { 'x-av': '1' } })).status).toBe(403);
    expect(
      (await chamar(e, '/api/dispositivo', { method: 'POST', headers: { origin: 'https://golpe.example', 'x-av': '1' } }))
        .status,
    ).toBe(403);
    expect((await chamar(e, '/api/dispositivo', { method: 'POST', headers: { origin: 'https://teste.local' } })).status).toBe(400);
    expect((await chamar(e, '/api/dispositivo', { method: 'GET' })).status).toBe(405);
  });
});
