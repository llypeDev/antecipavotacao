/*
 * Limitador (16 instâncias): conta tentativas aceitas por IP por dia.
 * Guarda só HMAC(SEGREDO_IP, dia|ip) e apaga tudo com mais de um dia (no máximo ~48 h).
 */
import { DurableObject } from 'cloudflare:workers';
import { diaBR, type Env } from '../config';

const LIMPEZA = 6 * 3600_000;

export class Limitador extends DurableObject<Env> {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS contas (
      dia TEXT NOT NULL, chave TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (dia, chave)
    ) WITHOUT ROWID;`);
  }

  async consumir(chave: string, dia: string): Promise<number> {
    const n = this.sql
      .exec<{ n: number }>(
        `INSERT INTO contas (dia, chave, n) VALUES (?, ?, 1)
         ON CONFLICT (dia, chave) DO UPDATE SET n = n + 1 RETURNING n`,
        dia, chave,
      )
      .one().n;
    if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(Date.now() + LIMPEZA);
    return n;
  }

  async alarm(): Promise<void> {
    const ontem = diaBR(Date.now() - 24 * 3600_000);
    this.sql.exec('DELETE FROM contas WHERE dia < ?', ontem);
    const resto = this.sql.exec<{ c: number }>('SELECT COUNT(*) AS c FROM contas').one().c;
    if (resto > 0) await this.ctx.storage.setAlarm(Date.now() + LIMPEZA);
  }
}
