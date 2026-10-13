/*
 * Totalizador (instância única): soma os lotes das 32 urnas e guarda o placar LACRADO.
 *
 * - aplicar(): recebe totais acumulados de cada urna; aplica só a diferença (reenviar não duplica)
 *   e ignora envios fora de ordem (versão menor ou igual à última).
 * - termometro(): só participação (total e por hora; por UF se MOSTRAR_UF). Nunca opções.
 * - resultado(): lança erro antes da hora de abrir o placar (mesma regra das rotas).
 * - tique() (cron, 1/min): fechamento às 17h de 25/10, compromisso de hash por hora, painel no R2.
 */
import { DurableObject } from 'cloudflare:workers';
import {
  datas,
  ehProducao,
  horaDe,
  iso,
  isoHora,
  mostrarUF,
  N_URNAS,
  placarAberto,
  UFS,
  urna,
  type Env,
} from '../config';
import { hmacHex, sha256Hex } from '../cripto';
import { mapaRotulos, ROTULO_PARTICIPACAO } from '../rotulos';
import quarentena from '../quarentena.json';
import type { Linha } from './urna';

interface RegraQuarentena {
  id: string;
  hora?: string; // ISO da hora (ex.: "2026-10-20T14:00:00Z")
  uf?: string;
  faixa?: string;
  motivo: string;
  decididoEm: string;
}

type Contagem = { '13': number; '22': number; branco: number; nulo: number; participacao: number };
const vazia = (): Contagem => ({ '13': 0, '22': 0, branco: 0, nulo: 0, participacao: 0 });

export const AVISO_RESULTADO =
  'Participação espontânea, sem plano amostral nem método científico: não é pesquisa eleitoral e não representa o eleitorado.';

function linhaValida(l: unknown): l is Linha {
  if (!l || typeof l !== 'object') return false;
  const x = l as Record<string, unknown>;
  return (
    Number.isInteger(x.hora) &&
    typeof x.uf === 'string' && (UFS.has(x.uf) || x.uf === 'ZZ') &&
    (x.faixa === 'a' || x.faixa === 'b') &&
    typeof x.rotulo === 'string' && x.rotulo.length > 0 && x.rotulo.length <= 32 &&
    Number.isInteger(x.n) && (x.n as number) >= 0
  );
}

export class Totalizador extends DurableObject<Env> {
  private sql: SqlStorage;
  private cache: { json: string; em: number } | null = null;
  private sujo = true;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS lotes_shard (
        shard INTEGER NOT NULL, hora INTEGER NOT NULL, uf TEXT NOT NULL, faixa TEXT NOT NULL, rotulo TEXT NOT NULL,
        n INTEGER NOT NULL, PRIMARY KEY (shard, hora, uf, faixa, rotulo)
      ) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS lotes_total (
        hora INTEGER NOT NULL, uf TEXT NOT NULL, faixa TEXT NOT NULL, rotulo TEXT NOT NULL,
        n INTEGER NOT NULL, PRIMARY KEY (hora, uf, faixa, rotulo)
      ) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS shards (shard INTEGER PRIMARY KEY, versao INTEGER NOT NULL, em INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS compromissos (
        seq INTEGER PRIMARY KEY, em INTEGER NOT NULL, hora INTEGER NOT NULL,
        hash TEXT NOT NULL, hash_instantaneo TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL) WITHOUT ROWID;
    `);
  }

  private meta(k: string): string | null {
    const l = this.sql.exec<{ v: string }>('SELECT v FROM meta WHERE k = ?', k).toArray()[0];
    return l ? l.v : null;
  }

  private gravarMeta(k: string, v: string): void {
    this.sql.exec('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v', k, v);
  }

  /** Em produção o relógio é sempre o do próprio objeto (não confia no que chega). */
  private relogio(t: number): number {
    return ehProducao(this.env) ? Date.now() : t;
  }

  async aplicar(shard: number, versao: number, linhas: Linha[]): Promise<'ok' | 'antiga' | 'invalida'> {
    if (!Number.isInteger(shard) || shard < 0 || shard >= N_URNAS) return 'invalida';
    if (!Number.isInteger(versao) || versao < 1) return 'invalida';
    if (!Array.isArray(linhas) || linhas.length > 100_000 || !linhas.every(linhaValida)) return 'invalida';

    let resultado: 'ok' | 'antiga' = 'ok';
    this.ctx.storage.transactionSync(() => {
      const atual = this.sql.exec<{ versao: number }>('SELECT versao FROM shards WHERE shard = ?', shard).toArray()[0];
      if (atual && atual.versao >= versao) {
        resultado = 'antiga';
        return;
      }
      for (const l of linhas) {
        const anterior =
          this.sql
            .exec<{ n: number }>(
              'SELECT n FROM lotes_shard WHERE shard = ? AND hora = ? AND uf = ? AND faixa = ? AND rotulo = ?',
              shard, l.hora, l.uf, l.faixa, l.rotulo,
            )
            .toArray()[0]?.n ?? 0;
        const delta = l.n - anterior;
        if (delta <= 0) continue; // acumulado nunca diminui; repetido ou antigo
        this.sql.exec(
          `INSERT INTO lotes_shard (shard, hora, uf, faixa, rotulo, n) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (shard, hora, uf, faixa, rotulo) DO UPDATE SET n = excluded.n`,
          shard, l.hora, l.uf, l.faixa, l.rotulo, l.n,
        );
        this.sql.exec(
          `INSERT INTO lotes_total (hora, uf, faixa, rotulo, n) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (hora, uf, faixa, rotulo) DO UPDATE SET n = n + excluded.n`,
          l.hora, l.uf, l.faixa, l.rotulo, delta,
        );
      }
      this.sql.exec(
        `INSERT INTO shards (shard, versao, em) VALUES (?, ?, ?)
         ON CONFLICT (shard) DO UPDATE SET versao = excluded.versao, em = excluded.em`,
        shard, versao, Date.now(),
      );
    });
    if (resultado === 'ok') this.sujo = true;
    return resultado;
  }

  /** Dados públicos do termômetro: SOMENTE participação. */
  async termometro(t: number): Promise<string> {
    const agora = this.relogio(t);
    if (!this.sujo && this.cache && agora - this.cache.em < 10_000) return this.cache.json;

    const porHora = this.sql
      .exec<{ hora: number; n: number }>('SELECT hora, SUM(n) AS n FROM lotes_total GROUP BY hora ORDER BY hora')
      .toArray();
    const participacoes = porHora.reduce((s, l) => s + l.n, 0);
    let porUF: Record<string, number> | null = null;
    if (mostrarUF(this.env)) {
      porUF = {};
      for (const l of this.sql.exec<{ uf: string; n: number }>('SELECT uf, SUM(n) AS n FROM lotes_total GROUP BY uf').toArray()) {
        porUF[l.uf] = l.n;
      }
    }
    const c = this.sql
      .exec<{ seq: number; hash: string }>('SELECT seq, hash FROM compromissos ORDER BY seq DESC LIMIT 1')
      .toArray()[0];
    const json = JSON.stringify({
      geradoEm: iso(agora),
      participacoes,
      porHora: porHora.map((l) => [isoHora(l.hora), l.n]),
      porUF,
      compromisso: c ? { seq: c.seq, hash: c.hash } : null,
    });
    this.cache = { json, em: agora };
    this.sujo = false;
    return json;
  }

  /** Placar completo. Lança erro antes da hora de abrir. */
  async resultado(t: number): Promise<string> {
    const agora = this.relogio(t);
    if (!placarAberto(this.env, agora)) throw new Error('lacrado');

    const mapa = await mapaRotulos(this.env);
    const regras = (quarentena as RegraQuarentena[]).map((r) => ({
      ...r,
      horaN: r.hora ? horaDe(Date.parse(r.hora)) : null,
    }));
    const principal = vazia();
    const comQuarentena = vazia();
    const excluidos = vazia();
    const faixas = { a: vazia(), b: vazia() };
    const porHora = new Map<number, { c13: number; c22: number }>();

    const linhas = this.sql
      .exec<Linha>('SELECT hora, uf, faixa, rotulo, n FROM lotes_total ORDER BY hora')
      .toArray();
    for (const l of linhas) {
      const opcao = mapa.get(l.rotulo) ?? (l.rotulo === ROTULO_PARTICIPACAO ? 'participacao' : null);
      if (!opcao) continue;
      comQuarentena[opcao] += l.n;
      const emQuarentena = regras.some(
        (r) => (r.horaN === null || r.horaN === l.hora) && (!r.uf || r.uf === l.uf) && (!r.faixa || r.faixa === l.faixa),
      );
      if (emQuarentena) {
        excluidos[opcao] += l.n;
        continue;
      }
      principal[opcao] += l.n;
      faixas[l.faixa === 'b' ? 'b' : 'a'][opcao] += l.n;
      if (opcao === '13' || opcao === '22') {
        const h = porHora.get(l.hora) ?? { c13: 0, c22: 0 };
        if (opcao === '13') h.c13 += l.n;
        else h.c22 += l.n;
        porHora.set(l.hora, h);
      }
    }

    let a13 = 0;
    let a22 = 0;
    const serie = [...porHora.entries()]
      .sort((x, y) => x[0] - y[0])
      .map(([hora, h]) => {
        a13 += h.c13;
        a22 += h.c22;
        return [isoHora(hora), a13, a22];
      });

    const soma = (c: Contagem) => c['13'] + c['22'] + c.branco + c.nulo + c.participacao;
    return JSON.stringify({
      v: 1,
      final: this.meta('final') === '1',
      geradoEm: iso(agora),
      coletaOpcao: principal['13'] + principal['22'] + principal.branco + principal.nulo > 0,
      principal: { '13': principal['13'], '22': principal['22'], branco: principal.branco, nulo: principal.nulo },
      validos: principal['13'] + principal['22'],
      participacoes: soma(principal),
      serie,
      faixas,
      quarentena: {
        regras: regras.map(({ id, hora, uf, faixa, motivo, decididoEm }) => ({ id, hora, uf, faixa, motivo, decididoEm })),
        excluidos,
      },
      comQuarentena,
      compromissos: await this.compromissosAbertos(),
      aviso: AVISO_RESULTADO,
    });
  }

  /** Depois do lacre, publica os segredos de cada compromisso (para conferência pública). */
  private async compromissosAbertos() {
    const lista = this.sql
      .exec<{ seq: number; em: number; hora: number; hash: string; hash_instantaneo: string }>(
        'SELECT seq, em, hora, hash, hash_instantaneo FROM compromissos ORDER BY seq',
      )
      .toArray();
    const saida = [];
    for (const c of lista) {
      saida.push({
        seq: c.seq,
        em: iso(c.em),
        hora: isoHora(c.hora),
        hash: c.hash,
        hashInstantaneo: c.hash_instantaneo,
        segredo: await hmacHex(this.env.SEGREDO_COMPROMISSO, 'seq:' + c.seq),
      });
    }
    return saida;
  }

  /** Cron (1/min). */
  async tique(t: number): Promise<void> {
    const agora = this.relogio(t);
    const d = datas(this.env);

    if (this.env.EXPURGAR_OPCOES === 'true' && this.meta('expurgado') !== '1') await this.expurgarOpcoes();
    if (agora >= d.fechaEm && this.meta('final') !== '1') await this.fechar(agora);
    await this.compromissoDaHora(agora);

    if (this.env.ARQUIVO) {
      await this.env.ARQUIVO.put('painel/atual.json', JSON.stringify(this.painel(agora)), {
        httpMetadata: { contentType: 'application/json' },
      });
    }
  }

  /** Fechamento: cada urna empurra o que falta; confere aparelhos × lotes. */
  private async fechar(agora: number): Promise<void> {
    let pendentes = 0;
    let aparelhos = 0;
    for (let i = 0; i < N_URNAS; i++) {
      try {
        const r = await urna(this.env, i).fechar();
        pendentes += r.pendentes;
        aparelhos += r.total;
      } catch {
        pendentes += 1;
      }
    }
    if (pendentes > 0) return; // tenta de novo no próximo minuto
    const lotes = this.sql.exec<{ n: number | null }>('SELECT SUM(n) AS n FROM lotes_total').one().n ?? 0;
    this.gravarMeta('conferencia', JSON.stringify({ aparelhos, lotes, em: iso(agora) }));
    this.gravarMeta('final', '1');
    this.gravarMeta('finalEm', String(agora));
    this.sujo = true;
  }

  /** Compromisso por hora: hash encadeado do instantâneo cego dos lotes. */
  private async compromissoDaHora(agora: number): Promise<void> {
    const hora = horaDe(agora);
    if (hora <= Number(this.meta('compromissoHora') ?? '-1')) return;
    const lotes = this.sql
      .exec<Linha>('SELECT hora, uf, faixa, rotulo, n FROM lotes_total ORDER BY hora, uf, faixa, rotulo')
      .toArray()
      .map((l) => [l.hora, l.uf, l.faixa, l.rotulo, l.n]);
    if (!lotes.length) {
      this.gravarMeta('compromissoHora', String(hora));
      return;
    }
    const ultimo = this.sql
      .exec<{ seq: number; hash: string }>('SELECT seq, hash FROM compromissos ORDER BY seq DESC LIMIT 1')
      .toArray()[0];
    const seq = (ultimo?.seq ?? 0) + 1;
    const anterior = ultimo?.hash ?? '0'.repeat(64);
    const instantaneo = JSON.stringify(lotes);
    const hashInstantaneo = await sha256Hex(instantaneo);
    const segredo = await hmacHex(this.env.SEGREDO_COMPROMISSO, 'seq:' + seq);
    const hash = await sha256Hex(`${anterior}|${hashInstantaneo}|${segredo}`);
    this.ctx.storage.transactionSync(() => {
      this.sql.exec(
        'INSERT INTO compromissos (seq, em, hora, hash, hash_instantaneo) VALUES (?, ?, ?, ?, ?)',
        seq, agora, hora, hash, hashInstantaneo,
      );
      this.gravarMeta('compromissoHora', String(hora));
    });
    this.sujo = true;
    if (this.env.ARQUIVO) {
      await this.env.ARQUIVO.put(
        `exportacoes/${isoHora(hora).slice(0, 13)}.json`,
        JSON.stringify({ seq, em: iso(agora), anterior, hash, hashInstantaneo, lotes }),
        { httpMetadata: { contentType: 'application/json' } },
      );
    }
  }

  /** Painel do operador (R2): só participação, sem rótulos. */
  painel(agora: number) {
    const porHora = this.sql
      .exec<{ hora: number; n: number }>('SELECT hora, SUM(n) AS n FROM lotes_total GROUP BY hora ORDER BY hora')
      .toArray();
    const porUF: Record<string, number> = {};
    for (const l of this.sql.exec<{ uf: string; n: number }>('SELECT uf, SUM(n) AS n FROM lotes_total GROUP BY uf').toArray()) {
      porUF[l.uf] = l.n;
    }
    const porFaixa: Record<string, number> = {};
    for (const l of this.sql.exec<{ faixa: string; n: number }>('SELECT faixa, SUM(n) AS n FROM lotes_total GROUP BY faixa').toArray()) {
      porFaixa[l.faixa] = l.n;
    }
    return {
      geradoEm: iso(agora),
      participacoes: porHora.reduce((s, l) => s + l.n, 0),
      porHora: porHora.map((l) => [isoHora(l.hora), l.n]),
      porUF,
      porFaixa,
      shards: this.sql.exec('SELECT shard, versao, em FROM shards ORDER BY shard').toArray(),
      final: this.meta('final') === '1',
      conferencia: this.meta('conferencia') ? JSON.parse(this.meta('conferencia') as string) : null,
    };
  }

  /** Expurgo legal (EXPURGAR_OPCOES=true): junta todas as opções em "participacao". */
  private async expurgarOpcoes(): Promise<void> {
    for (let i = 0; i < N_URNAS; i++) await urna(this.env, i).descartarOpcoes();
    this.ctx.storage.transactionSync(() => {
      const total = this.sql
        .exec<{ hora: number; uf: string; faixa: string; n: number }>(
          'SELECT hora, uf, faixa, SUM(n) AS n FROM lotes_total GROUP BY hora, uf, faixa',
        )
        .toArray();
      const porShard = this.sql
        .exec<{ shard: number; hora: number; uf: string; faixa: string; n: number }>(
          'SELECT shard, hora, uf, faixa, SUM(n) AS n FROM lotes_shard GROUP BY shard, hora, uf, faixa',
        )
        .toArray();
      this.sql.exec('DELETE FROM lotes_total');
      this.sql.exec('DELETE FROM lotes_shard');
      for (const l of total) {
        this.sql.exec(
          "INSERT INTO lotes_total (hora, uf, faixa, rotulo, n) VALUES (?, ?, ?, 'participacao', ?)",
          l.hora, l.uf, l.faixa, l.n,
        );
      }
      for (const l of porShard) {
        this.sql.exec(
          "INSERT INTO lotes_shard (shard, hora, uf, faixa, rotulo, n) VALUES (?, ?, ?, ?, 'participacao', ?)",
          l.shard, l.hora, l.uf, l.faixa, l.n,
        );
      }
      this.gravarMeta('expurgado', '1');
    });
    this.sujo = true;
  }
}
