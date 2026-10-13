import { describe, expect, it } from 'vitest';
import { ambiente, chamar, novoDispositivo, votar } from './ajuda';

describe('cabeçalhos da API', () => {
  it('respostas JSON sem cache, nosniff e sem CORS', async () => {
    const e = ambiente();
    const r = await votar(e, await novoDispositivo(e));
    expect(r.headers.get('content-type')).toMatch(/^application\/json/);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('OPTIONS não abre CORS (405)', async () => {
    const r = await chamar(ambiente(), '/api/voto', {
      method: 'OPTIONS',
      headers: { origin: 'https://golpe.example', 'access-control-request-method': 'POST' },
    });
    expect(r.status).toBe(405);
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('rota desconhecida: 404 em JSON', async () => {
    const r = await chamar(ambiente(), '/api/admin');
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado' });
  });

  it('termômetro: nunca traz opções', async () => {
    const r = await chamar(ambiente(), '/api/termometro');
    const texto = await r.text();
    expect(r.status).toBe(200);
    expect(texto).not.toMatch(/"(13|22|branco|nulo)"\s*:/);
    expect(JSON.parse(texto)).toMatchObject({ v: 1, fase: 'aberta', coletaOpcao: true });
  });
});
