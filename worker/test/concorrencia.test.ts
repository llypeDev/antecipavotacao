import { beforeEach, describe, expect, it } from 'vitest';
import { reset } from 'cloudflare:test';
import { ambiente, descarregarUrnas, lerTermometro, novoDispositivo, votar } from './ajuda';

beforeEach(async () => {
  await reset();
});

describe('concorrência', () => {
  it('50 votos simultâneos do mesmo aparelho contam uma vez só', async () => {
    const e = ambiente();
    const d = await novoDispositivo(e);
    const respostas = await Promise.all(Array.from({ length: 50 }, () => votar(e, d)));
    const status = respostas.map((r) => r.status);
    expect(status.filter((s) => s === 201)).toHaveLength(1);
    expect(status.filter((s) => s === 200)).toHaveLength(49);
    await descarregarUrnas(e);
    expect((await lerTermometro(e)).dados.participacoes).toBe(1);
  });

  it('200 aparelhos diferentes ao mesmo tempo: todos contam, nenhum se perde', async () => {
    const e = ambiente();
    const aparelhos = await Promise.all(Array.from({ length: 200 }, () => novoDispositivo(e)));
    const respostas = await Promise.all(aparelhos.map((d, i) => votar(e, d, { opcao: i % 2 ? '13' : '22', turnstile: 'teste.' + d.id, consentimento: 'v1' })));
    expect(respostas.every((r) => r.status === 201)).toBe(true);
    await descarregarUrnas(e);
    expect((await lerTermometro(e)).dados.participacoes).toBe(200);
  });
});
