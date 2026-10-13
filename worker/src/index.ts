/*
 * Antecipa Votação — Worker.
 * Os arquivos do site (public/) são servidos direto pela borda; só /api/* chega aqui.
 */
import { agora, totalizador, type Env } from './config';
import { erro } from './http';
import { rotaDispositivo } from './rotas/dispositivo';
import { rotaResultado } from './rotas/resultado';
import { rotaTermometro } from './rotas/termometro';
import { rotaVoto } from './rotas/voto';

export { Urna } from './do/urna';
export { Totalizador } from './do/totalizador';
export { Limitador } from './do/limitador';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      switch (url.pathname) {
        case '/api/voto':
          return await rotaVoto(request, env);
        case '/api/dispositivo':
          return await rotaDispositivo(request, env);
        case '/api/termometro':
          return await rotaTermometro(request, env, ctx);
        case '/api/resultado':
          return await rotaResultado(request, env, ctx);
        default:
          return erro('nao_encontrado', 404);
      }
    } catch (e) {
      // sem dados da requisição no log: só o tipo do erro
      console.error('erro_api', url.pathname, e instanceof Error ? e.message : 'desconhecido');
      return erro('indisponivel', 503, { 'retry-after': '5' });
    }
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(totalizador(env).tique(agora(env)));
  },
} satisfies ExportedHandler<Env>;
