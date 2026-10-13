import { beforeEach, describe, expect, it } from 'vitest';
import { reset, runInDurableObject } from 'cloudflare:test';
import { rotulo } from '../src/rotulos';
import {
  ambiente,
  chamar,
  DEPOIS_DO_FECHAMENTO,
  DURANTE,
  descarregarUrnas,
  lerResultado,
  lerTermometro,
  novoDispositivo,
  totalizador,
  votar,
} from './ajuda';

beforeEach(async () => {
  await reset();
});

async function votos(e: ReturnType<typeof ambiente>, opcoes: string[]) {
  for (const opcao of opcoes) {
    const d = await novoDispositivo(e);
    const r = await votar(e, d, { opcao, turnstile: 'teste.' + d.id, consentimento: 'v1' });
    expect(r.status).toBe(201);
  }
  await descarregarUrnas(e);
}

describe('lacre do placar', () => {
  it('antes da hora: 423 em GET, HEAD e com query string; 405 em POST', async () => {
    const e = ambiente();
    await votos(e, ['13', '22']);
    for (const caminho of ['/api/resultado', '/api/resultado?revelar=1', '/api/resultado?x=' + 'a'.repeat(200)]) {
      const r = await lerResultado(e).then(() => chamar(e, caminho));
      expect(r.status).toBe(423);
      const corpo = (await r.json()) as Record<string, unknown>;
      expect(Object.keys(corpo).sort()).toEqual(['erro', 'revelarEm']);
    }
    expect((await chamar(e, '/api/resultado', { method: 'HEAD' })).status).toBe(423);
    expect((await chamar(e, '/api/resultado', { method: 'POST' })).status).toBe(405);
  });

  it('variações de caminho não abrem o placar', async () => {
    const e = ambiente();
    await votos(e, ['13']);
    for (const caminho of ['/api/resultado/', '/api/%72esultado', '/api//resultado', '/api/resultado.json']) {
      const r = await chamar(e, caminho);
      expect(r.status, caminho).toBe(404);
    }
  });

  it('o Totalizador recusa entregar o placar antes da hora', async () => {
    const e = ambiente();
    await votos(e, ['13']);
    await runInDurableObject(totalizador(e), async (obj) => {
      await expect(obj.resultado(Date.parse(DURANTE))).rejects.toThrow('lacrado');
    });
  });

  it('produção: o piso fixo vale mesmo com REVELAR_EM e FECHA_EM antigos', async () => {
    const prod = ambiente({ AMBIENTE: 'producao', REVELAR_EM: '2026-10-01T00:00:00Z', FECHA_EM: '2026-10-02T00:00:00Z' });
    const r = await chamar(prod, '/api/resultado');
    expect(r.status).toBe(423);
    expect(((await r.json()) as { revelarEm: string }).revelarEm).toBe('2026-10-25T20:00:00.000Z');
  });

  it('o domínio de produção segue o piso e ignora o relógio de teste, qualquer que seja o AMBIENTE', async () => {
    const e = ambiente({ REVELAR_EM: '2026-10-01T00:00:00Z', FECHA_EM: '2026-10-02T00:00:00Z', RELOGIO_FIXO: '2026-12-01T00:00:00Z' });
    const r = await chamar(e, 'https://antecipavotacao.com.br/api/resultado');
    expect(r.status).toBe(423);
  });

  it('ausência de AMBIENTE conta como produção (falha fechada)', async () => {
    const e = ambiente({ AMBIENTE: undefined, RELOGIO_FIXO: '2026-12-01T00:00:00Z', REVELAR_EM: '2026-10-01T00:00:00Z' });
    expect((await chamar(e, '/api/resultado')).status).toBe(423);
  });

  it('teste diferencial: termômetro e painel são idênticos com 3 votos no 13 ou 3 votos no 22', async () => {
    const e = ambiente();
    const capturar = async () => {
      const termometro = (await lerTermometro(e)).dados;
      const painel = (await totalizador(e).painel(Date.parse(DURANTE))) as Record<string, unknown>;
      delete painel.shards; // quais urnas receberam depende do id aleatório do aparelho, não da opção
      return JSON.stringify({ termometro, painel });
    };
    await votos(e, ['13', '13', '13']);
    const a = await capturar();
    await reset();
    await votos(e, ['22', '22', '22']);
    const b = await capturar();
    expect(a).toBe(b);
    // nada que identifique opções aparece nos dados públicos ou do painel
    for (const opcao of ['13', '22', 'branco', 'nulo'] as const) {
      expect(a).not.toContain(await rotulo(e, opcao));
      expect(a).not.toMatch(new RegExp(`"${opcao}"\\s*:`));
    }
  });

  it('depois do fechamento: placar certo, série acumulada e votos novos recusados', async () => {
    const e = ambiente();
    await votos(e, ['13', '13', '13', '22', '22', 'branco', 'nulo']);
    const depois = ambiente({ RELOGIO_FIXO: DEPOIS_DO_FECHAMENTO });
    await totalizador(depois).tique(Date.parse(DEPOIS_DO_FECHAMENTO));
    const r = await lerResultado(depois);
    expect(r.status).toBe(200);
    const p = (await r.json()) as {
      final: boolean;
      principal: Record<string, number>;
      validos: number;
      participacoes: number;
      serie: [string, number, number][];
      aviso: string;
    };
    expect(p.principal).toEqual({ '13': 3, '22': 2, branco: 1, nulo: 1 });
    expect(p.validos).toBe(5);
    expect(p.participacoes).toBe(7);
    expect(p.serie.at(-1)?.slice(1)).toEqual([3, 2]);
    expect(p.final).toBe(true);
    expect(p.aviso).toMatch(/não é pesquisa eleitoral/);
    const d = await novoDispositivo(e);
    expect((await votar(depois, d)).status).toBe(410);
  });
});
