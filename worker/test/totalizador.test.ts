import { beforeEach, describe, expect, it } from 'vitest';
import { reset, runInDurableObject } from 'cloudflare:test';
import { sha256Hex } from '../src/cripto';
import { horaDe } from '../src/config';
import {
  ambiente,
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

const T = Date.parse(DURANTE);
const H = horaDe(T);
const lote = (n: number, rotulo = 'r1') => ({ hora: H, uf: 'SP', faixa: 'a', rotulo, n });

describe('Totalizador', () => {
  it('reenviar o mesmo acumulado não duplica; versão antiga é ignorada', async () => {
    const tot = totalizador(ambiente());
    expect(await tot.aplicar(0, 1, [lote(5)])).toBe('ok');
    expect(await tot.aplicar(0, 2, [lote(5)])).toBe('ok');
    expect(await tot.aplicar(0, 2, [lote(9)])).toBe('antiga');
    expect(await tot.aplicar(0, 1, [lote(9)])).toBe('antiga');
    expect(await tot.aplicar(0, 3, [lote(7), lote(2, 'r2')])).toBe('ok');
    expect(await tot.aplicar(1, 1, [lote(4)])).toBe('ok');
    expect((await lerTermometro(ambiente())).dados.participacoes).toBe(7 + 2 + 4);
  });

  it('recusa entradas inválidas', async () => {
    const tot = totalizador(ambiente());
    expect(await tot.aplicar(99, 1, [lote(1)])).toBe('invalida');
    expect(await tot.aplicar(0, 0, [lote(1)])).toBe('invalida');
    expect(await tot.aplicar(0, 1, [{ ...lote(1), uf: 'XX' }])).toBe('invalida');
    expect(await tot.aplicar(0, 1, [{ ...lote(1), faixa: 'c' }])).toBe('invalida');
    expect(await tot.aplicar(0, 1, [{ ...lote(1), n: -1 }])).toBe('invalida');
    expect(await tot.aplicar(0, 1, [{ ...lote(1), rotulo: 'x'.repeat(40) }])).toBe('invalida');
    expect((await lerTermometro(ambiente())).dados.participacoes).toBe(0);
  });

  it('compromisso por hora: cadeia de hashes que confere depois do lacre', async () => {
    const e = ambiente();
    for (const opcao of ['13', '22']) {
      const d = await novoDispositivo(e);
      expect((await votar(e, d, { opcao, turnstile: 'teste.' + d.id, consentimento: 'v1' })).status).toBe(201);
    }
    await descarregarUrnas(e);
    const tot = totalizador(e);
    await tot.tique(T);
    await tot.tique(T + 60_000); // mesma hora: não cria outro
    const d = await novoDispositivo(e);
    await votar(e, d, { opcao: 'nulo', turnstile: 'teste.' + d.id, consentimento: 'v1' });
    await descarregarUrnas(e);
    await tot.tique(T + 3600_000);
    const termometro = await lerTermometro(e);
    expect(termometro.dados.compromisso).toMatchObject({ seq: 2 });

    // o painel do operador vai para o R2 e só tem participação
    const painel = await e.ARQUIVO!.get('painel/atual.json');
    expect(painel).not.toBeNull();
    const textoPainel = await painel!.text();
    expect(textoPainel).not.toMatch(/"(13|22|branco|nulo)"\s*:/);

    await tot.tique(Date.parse(DEPOIS_DO_FECHAMENTO));
    const r = await lerResultado(ambiente({ RELOGIO_FIXO: DEPOIS_DO_FECHAMENTO }));
    const resultado = (await r.json()) as {
      compromissos: { seq: number; hash: string; hashInstantaneo: string; segredo: string }[];
    };
    let anterior = '0'.repeat(64);
    for (const c of resultado.compromissos) {
      expect(await sha256Hex(`${anterior}|${c.hashInstantaneo}|${c.segredo}`)).toBe(c.hash);
      const exportado = await e.ARQUIVO!.list({ prefix: 'exportacoes/' });
      expect(exportado.objects.length).toBeGreaterThanOrEqual(c.seq);
      anterior = c.hash;
    }
    // um por hora com votos: T, T+1h e o do fechamento (outra hora)
    expect(resultado.compromissos.map((c) => c.seq)).toEqual([1, 2, 3]);
  });

  it('fechamento: o cron encerra as urnas e marca o resultado como final', async () => {
    const e = ambiente();
    const d = await novoDispositivo(e);
    await votar(e, d); // fica pendente na urna (sem descarregar)
    const depois = Date.parse(DEPOIS_DO_FECHAMENTO);
    await totalizador(e).tique(depois);
    const painel = await totalizador(e).painel(depois);
    expect(painel.final).toBe(true);
    expect(painel.participacoes).toBe(1);
    expect(painel.conferencia).toMatchObject({ aparelhos: 1, lotes: 1 });
  });

  it('expurgo legal: depois dele não há mais opções, só participação', async () => {
    const e = ambiente();
    for (const opcao of ['13', '22', '22']) {
      const d = await novoDispositivo(e);
      await votar(e, d, { opcao, turnstile: 'teste.' + d.id, consentimento: 'v1' });
    }
    await descarregarUrnas(e);
    // em produção é disparado por EXPURGAR_OPCOES=true no próximo tique do cron
    await runInDurableObject(totalizador(e), (obj) => (obj as unknown as { expurgarOpcoes(): Promise<void> }).expurgarOpcoes());
    const rotulos = await runInDurableObject(totalizador(e), (_o, estado) =>
      estado.storage.sql.exec<{ rotulo: string }>('SELECT DISTINCT rotulo FROM lotes_total').toArray().map((l) => l.rotulo),
    );
    expect(rotulos).toEqual(['participacao']);
    await totalizador(e).tique(Date.parse(DEPOIS_DO_FECHAMENTO));
    const r = await lerResultado(ambiente({ RELOGIO_FIXO: DEPOIS_DO_FECHAMENTO }));
    const p = (await r.json()) as { participacoes: number; validos: number; coletaOpcao: boolean };
    expect(p.participacoes).toBe(3);
    expect(p.validos).toBe(0);
    expect(p.coletaOpcao).toBe(false);
  });
});
