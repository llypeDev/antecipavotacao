/* Checagens comuns às rotas POST e métricas (nunca com opção, IP ou token). */
import { diaBR, origens, type Env } from '../config';
import { hmacHex } from '../cripto';
import { erro } from '../http';
import type { Sinais } from '../sinais';

/** Só aceita POST do próprio site: Origin na lista, Sec-Fetch-Site same-origin e cabeçalho X-AV. */
export function checarOrigem(request: Request, env: Env): Response | null {
  const origem = request.headers.get('origin');
  if (!origem || !origens(env).includes(origem)) return erro('origem', 403);
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return erro('origem', 403);
  if (request.headers.get('x-av') !== '1') return erro('requisicao_invalida', 400);
  return null;
}

/** HMAC diário do IP (IPv4 inteiro ou prefixo /64 do IPv6). Nunca o IP em claro. */
export function chaveIp(env: Env, sinais: Sinais, t: number): Promise<string> {
  return hmacHex(env.SEGREDO_IP, diaBR(t) + '|' + (sinais.ipChave ?? 'sem-ip'), 32);
}

export function metrica(
  env: Env,
  status: string,
  sinais: Sinais,
  faixa: string,
): void {
  try {
    env.METRICAS?.writeDataPoint({
      blobs: [status, sinais.uf, String(sinais.asn), sinais.colo, faixa, sinais.protocolo, env.AMBIENTE ?? ''],
      doubles: [1],
      indexes: [status],
    });
  } catch {
    /* métrica nunca derruba a requisição */
  }
}
