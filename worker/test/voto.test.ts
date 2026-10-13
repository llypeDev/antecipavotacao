import { beforeEach, describe, expect, it } from 'vitest';
import { reset } from 'cloudflare:test';
import {
  ambiente,
  ANTES_DE_ABRIR,
  cabecalhosPost,
  chamar,
  DEPOIS_DO_FECHAMENTO,
  descarregarUrnas,
  lerTermometro,
  novoDispositivo,
  votar,
} from './ajuda';

beforeEach(async () => {
  await reset();
});

const corpo = (id: string, extras: Record<string, unknown> = {}) => ({
  opcao: '13',
  turnstile: 'teste.' + id,
  consentimento: 'v1',
  ...extras,
});

describe('POST /api/voto', () => {
  it('conta o primeiro voto (201); o segundo do mesmo aparelho vira "já participou" (200)', async () => {
    const e = ambiente();
    const d = await novoDispositivo(e);
    const r1 = await votar(e, d);
    expect(r1.status).toBe(201);
    expect(await r1.json()).toEqual({ status: 'contado' });
    const r2 = await votar(e, d, corpo(d.id, { opcao: '22' }));
    expect(r2.status).toBe(200);
    expect(await r2.json()).toEqual({ status: 'ja_participou' });
    await descarregarUrnas(e);
    expect((await lerTermometro(e)).dados.participacoes).toBe(1);
  });

  it('reconhece o aparelho pelo cookie mesmo sem o cabeçalho', async () => {
    const e = ambiente();
    const d = await novoDispositivo(e);
    expect((await votar(e, d)).status).toBe(201);
    const r = await chamar(e, '/api/voto', {
      method: 'POST',
      headers: cabecalhosPost({ cookie: '__Host-av=' + d.token }),
      body: JSON.stringify(corpo(d.id)),
    });
    expect(r.status).toBe(200);
  });

  it.each([['14'], ['13 '], [13], ['__proto__'], [null], ['BRANCO'], [['13']]])('recusa a opção %j', async (opcao) => {
    const e = ambiente();
    const d = await novoDispositivo(e);
    const r = await votar(e, d, corpo(d.id, { opcao }));
    expect(r.status).toBe(400);
  });

  it('exige consentimento "v1" e um token do Turnstile válido', async () => {
    const e = ambiente();
    const d = await novoDispositivo(e);
    expect((await votar(e, d, { opcao: '13', turnstile: 'teste.' + d.id })).status).toBe(400);
    expect((await votar(e, d, corpo(d.id, { consentimento: true }))).status).toBe(400);
    expect((await votar(e, d, corpo(d.id, { turnstile: '' }))).status).toBe(400);
    expect((await votar(e, d, corpo(d.id, { turnstile: 'a b' }))).status).toBe(400);
    expect((await votar(e, d, '[1,2]')).status).toBe(400);
    expect((await votar(e, d, 'não é json')).status).toBe(400);
  });

  it('recusa origem errada, sem X-AV, Sec-Fetch-Site de outro site, formato errado e corpo grande', async () => {
    const e = ambiente();
    const d = await novoDispositivo(e);
    expect((await votar(e, d, undefined, { headers: { origin: 'https://golpe.example' } })).status).toBe(403);
    expect((await votar(e, d, undefined, { headers: { 'x-av': '0' } })).status).toBe(400);
    expect((await votar(e, d, undefined, { headers: { 'sec-fetch-site': 'cross-site' } })).status).toBe(403);
    expect((await votar(e, d, undefined, { headers: { 'content-type': 'text/plain' } })).status).toBe(415);
    expect((await votar(e, d, JSON.stringify(corpo(d.id, { lixo: 'x'.repeat(5000) })))).status).toBe(413);
  });

  it('recusa fora do Brasil, rede de servidor e aparelho inválido', async () => {
    const d = await novoDispositivo(ambiente());
    const geo = (extras: Record<string, unknown>) =>
      ambiente({ GEO_FIXO: JSON.stringify({ country: 'BR', regionCode: 'SP', asn: 28573, httpProtocol: 'HTTP/2', ...extras }) });
    const r1 = await votar(geo({ country: 'US' }), d);
    expect(r1.status).toBe(403);
    expect(await r1.json()).toEqual({ erro: 'fora_do_brasil' });
    const r2 = await votar(geo({ asn: 16509 }), d);
    expect(r2.status).toBe(403);
    expect(await r2.json()).toEqual({ erro: 'rede_bloqueada' });
    const r3 = await votar(ambiente(), { token: 'v1.xxxxxxxxxxxxxxxxxxxxxx.abc.' + 'y'.repeat(43), id: 'x' });
    expect(r3.status).toBe(401);
  });

  it('recusa Turnstile inválido ou de outro aparelho, e falha fechada se a Cloudflare não responde', async () => {
    const e = ambiente();
    const d = await novoDispositivo(e);
    const outro = await novoDispositivo(e);
    expect((await votar(e, d, corpo(d.id, { turnstile: 'falha.x' }))).status).toBe(403);
    expect((await votar(e, d, corpo(d.id, { turnstile: 'teste.' + outro.id }))).status).toBe(403);
    const r = await votar(e, d, corpo(d.id, { turnstile: 'fora.x' }));
    expect(r.status).toBe(503);
    await descarregarUrnas(e);
    expect((await lerTermometro(e)).dados.participacoes).toBe(0);
  });

  it('respeita as fases: antes de abrir (409), pausada (503), encerrada (410)', async () => {
    const d = await novoDispositivo(ambiente());
    expect((await votar(ambiente({ RELOGIO_FIXO: ANTES_DE_ABRIR }), d)).status).toBe(409);
    expect((await votar(ambiente({ VOTACAO_ABERTA: 'false' }), d)).status).toBe(503);
    expect((await votar(ambiente({ VOTACAO_ABERTA: 'qualquer' }), d)).status).toBe(503);
    expect((await votar(ambiente({ RELOGIO_FIXO: DEPOIS_DO_FECHAMENTO }), d)).status).toBe(410);
    expect((await votar(ambiente({ ABRE_EM: 'data inválida' }), d)).status).toBe(409);
  });

  it('modo B (só participação): recusa opção e conta sem opção', async () => {
    const e = ambiente({ COLETA_OPCAO: 'false' });
    const d = await novoDispositivo(e);
    expect((await votar(e, d)).status).toBe(400);
    expect((await votar(e, d, { turnstile: 'teste.' + d.id, consentimento: 'v1' })).status).toBe(201);
    await descarregarUrnas(e);
    expect((await lerTermometro(e)).dados.participacoes).toBe(1);
  });

  it('produção: ignora relógio e geolocalização de teste e recusa chave de teste do Turnstile', async () => {
    const prod = ambiente({ AMBIENTE: 'producao', ABRE_EM: '2026-01-01T00:00:00Z' });
    const d = await novoDispositivo(prod); // em produção o token sai com o relógio real
    // GEO_FIXO é ignorado: sem request.cf do Brasil, o voto é recusado
    expect((await votar(prod, d)).status).toBe(403);
    // com request.cf do Brasil, chega ao Turnstile, que recusa a chave de teste (falha fechada)
    const r = await votar(prod, d, undefined, { cf: { country: 'BR', regionCode: 'RJ', asn: 28573, httpProtocol: 'HTTP/2' } });
    expect(r.status).toBe(503);
  });

  it('só aceita POST', async () => {
    expect((await chamar(ambiente(), '/api/voto')).status).toBe(405);
  });
});
