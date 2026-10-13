/*
 * Leitura com dois níveis de cache: memória do isolate (alguns segundos) e Cache API da borda.
 * Assim, mesmo com milhares de leituras por segundo, o Totalizador recebe poucas chamadas.
 * (O Cache API só funciona no domínio próprio; em *.workers.dev fica só a memória.)
 */
const memoria = new Map<string, { em: number; valor: string }>();

export async function comCache(
  request: Request,
  ctx: ExecutionContext,
  chave: string,
  ttlMemoriaMs: number,
  ttlBordaS: number,
  gerar: () => Promise<string>,
): Promise<string> {
  const m = memoria.get(chave);
  if (m && Date.now() - m.em < ttlMemoriaMs) return m.valor;

  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  const chaveBorda = new Request(new URL('/__cache/' + chave, request.url).toString());
  let valor: string | null = null;
  if (cache) {
    try {
      const r = await cache.match(chaveBorda);
      if (r) valor = await r.text();
    } catch {
      valor = null;
    }
  }
  if (valor === null) {
    valor = await gerar();
    if (cache) {
      const resposta = new Response(valor, {
        headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${ttlBordaS}` },
      });
      ctx.waitUntil(cache.put(chaveBorda, resposta).catch(() => undefined));
    }
  }
  memoria.set(chave, { em: Date.now(), valor });
  return valor;
}

/** Só para testes. */
export function limparMemoria(): void {
  memoria.clear();
}
