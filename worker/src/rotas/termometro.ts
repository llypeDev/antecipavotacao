/* GET /api/termometro: fase, datas e participação (nunca opções). */
import { agora, coletaOpcao, datas, fase, iso, mostrarUF, totalizador, type Env } from '../config';
import { comCache } from '../cache';
import { erro, json } from '../http';

export async function rotaTermometro(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return erro('metodo', 405, { allow: 'GET, HEAD' });
  const url = new URL(request.url);
  const t = agora(env, url);
  const d = datas(env, url);
  const dados = await comCache(request, ctx, 'termometro-v1', 5_000, 10, () => totalizador(env).termometro(t));
  return json(
    {
      v: 1,
      agora: iso(t),
      fase: fase(env, t, url),
      abreEm: iso(d.abreEm),
      fechaEm: iso(d.fechaEm),
      revelarEm: iso(d.revelarEm),
      coletaOpcao: coletaOpcao(env),
      mostrarUF: mostrarUF(env),
      turnstileSitekey: env.TURNSTILE_SITEKEY ?? null,
      dados: JSON.parse(dados),
    },
    200,
    undefined,
    'public, max-age=10',
  );
}
