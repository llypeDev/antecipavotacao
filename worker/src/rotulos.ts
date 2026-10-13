/*
 * Rótulos cegos: as opções nunca são gravadas como "13"/"22"/"branco"/"nulo", e sim como
 * HMAC(SEGREDO_ROTULOS, opção). Só o Totalizador, depois do lacre, converte de volta.
 */
import type { Env } from './config';
import { hmacHex } from './cripto';

export const OPCOES = ['13', '22', 'branco', 'nulo'] as const;
export type Opcao = (typeof OPCOES)[number];
export const ROTULO_PARTICIPACAO = 'participacao';

export const ehOpcao = (v: unknown): v is Opcao => typeof v === 'string' && (OPCOES as readonly string[]).includes(v);

export function rotulo(env: Env, opcao: Opcao): Promise<string> {
  return hmacHex(env.SEGREDO_ROTULOS, 'opcao:' + opcao, 16);
}

export async function mapaRotulos(env: Env): Promise<Map<string, Opcao>> {
  const mapa = new Map<string, Opcao>();
  for (const o of OPCOES) mapa.set(await rotulo(env, o), o);
  return mapa;
}
