/* GET /api/resultado: 423 "lacrado" antes da hora; depois, o placar. */
import { agora, datas, fase, iso, totalizador, type Env } from '../config';
import { comCache } from '../cache';
import { erro, json } from '../http';

export async function rotaResultado(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return erro('metodo', 405, { allow: 'GET, HEAD' });
  const url = new URL(request.url);
  const t = agora(env, url);
  if (fase(env, t, url) !== 'revelada') {
    const d = datas(env, url);
    const faltam = Number.isFinite(d.revelarEm) ? Math.ceil((d.revelarEm - t) / 1000) : 30;
    const maxAge = Math.max(1, Math.min(30, faltam));
    return json({ erro: 'lacrado', revelarEm: iso(d.revelarEm) }, 423, undefined, `public, max-age=${maxAge}`);
  }
  const corpo = await comCache(request, ctx, 'resultado-v1', 10_000, 30, () => totalizador(env).resultado(t));
  const final = (JSON.parse(corpo) as { final?: boolean }).final === true;
  return json(JSON.parse(corpo), 200, undefined, `public, max-age=${final ? 300 : 30}`);
}
