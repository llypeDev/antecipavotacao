/*
 * Urna (32 instâncias, "urna-00" a "urna-31", escolhidas por HMAC do id do aparelho).
 *
 * - votantes: só o hash do aparelho, sem opção e sem horário ("já participou").
 * - lotes: contagem por (hora, UF, faixa, rótulo cego). Nada liga um lote a um aparelho.
 * Um alarme envia ao Totalizador os totais ACUMULADOS dos lotes alterados (reenviar não duplica).
 */
import { DurableObject } from 'cloudflare:workers';
import { totalizador, type Env } from '../config';

export interface RegistroUrna {
  shard: number;
  chave: string; // HMAC(SEGREDO_DEDUP, id do aparelho)
  rotulo: string; // HMAC da opção, ou "participacao" no modo B
  uf: string;
  faixa: 'a' | 'b';
  hora: number; // horas desde 1970 (UTC)
  agora: number;
  fechaEm: number;
}

export type StatusRegistro = 'contado' | 'ja_participou' | 'encerrada';

export type Linha = {
  hora: number;
  uf: string;
  faixa: string;
  rotulo: string;
  n: number;
};

const ATRASO_ENVIO = 10_000;

export class Urna extends DurableObject<Env> {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS votantes (h TEXT PRIMARY KEY) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS lotes (
        hora INTEGER NOT NULL, uf TEXT NOT NULL, faixa TEXT NOT NULL, rotulo TEXT NOT NULL,
        n INTEGER NOT NULL, sujo INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (hora, uf, faixa, rotulo)
      ) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL) WITHOUT ROWID;
    `);
  }

  async registrar(r: RegistroUrna): Promise<StatusRegistro> {
    if (r.agora >= r.fechaEm) return 'encerrada';
    let status = 'ja_participou' as StatusRegistro;
    this.ctx.storage.transactionSync(() => {
      const novo = this.sql.exec('INSERT INTO votantes (h) VALUES (?) ON CONFLICT DO NOTHING RETURNING h', r.chave).toArray();
      if (novo.length === 0) return;
      this.sql.exec(
        `INSERT INTO lotes (hora, uf, faixa, rotulo, n, sujo) VALUES (?, ?, ?, ?, 1, 1)
         ON CONFLICT (hora, uf, faixa, rotulo) DO UPDATE SET n = n + 1, sujo = 1`,
        r.hora, r.uf, r.faixa, r.rotulo,
      );
      this.sql.exec("INSERT INTO meta (k, v) VALUES ('shard', ?) ON CONFLICT (k) DO NOTHING", String(r.shard));
      status = 'contado';
    });
    if (status === 'contado' && (await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(Date.now() + ATRASO_ENVIO);
    }
    return status;
  }

  async alarm(): Promise<void> {
    await this.enviar();
  }

  private meta(k: string): string | null {
    const linha = this.sql.exec<{ v: string }>('SELECT v FROM meta WHERE k = ?', k).toArray()[0];
    return linha ? linha.v : null;
  }

  /** Envia ao Totalizador os lotes alterados; limpa a marca só do que não mudou no meio do envio. */
  private async enviar(): Promise<{ pendentes: number }> {
    const linhas = this.sql
      .exec<{ hora: number; uf: string; faixa: string; rotulo: string; n: number }>(
        'SELECT hora, uf, faixa, rotulo, n FROM lotes WHERE sujo = 1',
      )
      .toArray()
      .map((l) => ({ hora: l.hora, uf: l.uf, faixa: l.faixa, rotulo: l.rotulo, n: l.n }));
    if (!linhas.length) return { pendentes: 0 };

    let versao = 0;
    this.ctx.storage.transactionSync(() => {
      versao = Number(this.meta('versao') ?? '0') + 1;
      this.sql.exec(
        "INSERT INTO meta (k, v) VALUES ('versao', ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v",
        String(versao),
      );
    });
    const shard = Number(this.meta('shard') ?? '-1');

    try {
      await totalizador(this.env).aplicar(shard, versao, linhas);
    } catch {
      await this.ctx.storage.setAlarm(Date.now() + ATRASO_ENVIO);
      return { pendentes: linhas.length };
    }

    this.ctx.storage.transactionSync(() => {
      for (const l of linhas) {
        this.sql.exec(
          'UPDATE lotes SET sujo = 0 WHERE hora = ? AND uf = ? AND faixa = ? AND rotulo = ? AND n = ?',
          l.hora, l.uf, l.faixa, l.rotulo, l.n,
        );
      }
    });
    const pendentes = this.sql.exec<{ c: number }>('SELECT COUNT(*) AS c FROM lotes WHERE sujo = 1').one().c;
    if (pendentes > 0 && (await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(Date.now() + ATRASO_ENVIO);
    }
    return { pendentes };
  }

  /** Fechamento: empurra tudo o que falta e devolve o total de aparelhos que participaram. */
  async fechar(): Promise<{ pendentes: number; total: number }> {
    const { pendentes } = await this.enviar();
    const total = this.sql.exec<{ c: number }>('SELECT COUNT(*) AS c FROM votantes').one().c;
    return { pendentes, total };
  }

  /** Ressincronização: reenviar tudo (o Totalizador ignora o que já tem). */
  async reenviarTudo(): Promise<{ pendentes: number }> {
    this.sql.exec('UPDATE lotes SET sujo = 1');
    return this.enviar();
  }

  /** Expurgo legal: junta todas as opções em "participacao" (irreversível). */
  async descartarOpcoes(): Promise<void> {
    this.ctx.storage.transactionSync(() => {
      const juntos = this.sql
        .exec<{ hora: number; uf: string; faixa: string; n: number }>(
          'SELECT hora, uf, faixa, SUM(n) AS n FROM lotes GROUP BY hora, uf, faixa',
        )
        .toArray();
      this.sql.exec('DELETE FROM lotes');
      for (const l of juntos) {
        this.sql.exec(
          "INSERT INTO lotes (hora, uf, faixa, rotulo, n, sujo) VALUES (?, ?, ?, 'participacao', ?, 1)",
          l.hora, l.uf, l.faixa, l.n,
        );
      }
    });
  }

  async saude(): Promise<{ total: number; pendentes: number }> {
    return {
      total: this.sql.exec<{ c: number }>('SELECT COUNT(*) AS c FROM votantes').one().c,
      pendentes: this.sql.exec<{ c: number }>('SELECT COUNT(*) AS c FROM lotes WHERE sujo = 1').one().c,
    };
  }

  /** Depois da eleição: apaga os hashes de "já participou" (retenção mínima). */
  async apagarVotantes(agora: number, fechaEm: number): Promise<boolean> {
    if (agora < fechaEm + 24 * 3600_000) return false;
    this.sql.exec('DELETE FROM votantes');
    return true;
  }
}
