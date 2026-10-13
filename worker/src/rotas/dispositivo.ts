/* POST /api/dispositivo: emite (ou devolve) o token assinado do aparelho. */
import { agora, type Env } from '../config';
import { cookieDispositivo, emitir, lerDispositivo } from '../dispositivo';
import { erro, json } from '../http';
import { lerSinais } from '../sinais';
import { chaveIp, checarOrigem } from './comum';

export async function rotaDispositivo(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return erro('metodo', 405, { allow: 'POST' });
  const recusa = checarOrigem(request, env);
  if (recusa) return recusa;

  const url = new URL(request.url);
  const t = agora(env, url);
  const sinais = lerSinais(request, env, url);
  const chave = await chaveIp(env, sinais, t);
  if (!(await env.RL_DISPOSITIVO.limit({ key: chave })).success) {
    return erro('limite', 429, { 'retry-after': '60' });
  }

  const d = (await lerDispositivo(request, env, t)) ?? (await emitir(env, t));
  return json({ dispositivo: d.token }, 200, { 'set-cookie': cookieDispositivo(d.token) });
}
