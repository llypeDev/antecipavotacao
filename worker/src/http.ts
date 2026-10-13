/* Respostas JSON da API: sem cache por padrão, sem CORS, com cabeçalhos de segurança. */

export function json(dados: unknown, status = 200, extras?: Record<string, string>, cache = 'no-store'): Response {
  const h = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': cache,
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'cross-origin-resource-policy': 'same-origin',
  });
  if (extras) for (const [k, v] of Object.entries(extras)) h.set(k, v);
  return new Response(JSON.stringify(dados), { status, headers: h });
}

export function erro(codigo: string, status: number, extras?: Record<string, string>): Response {
  return json({ erro: codigo }, status, extras);
}

/** Lê o corpo com limite de tamanho (sem confiar só no Content-Length). */
export async function lerCorpo(request: Request, limite: number): Promise<string | null> {
  const declarado = Number(request.headers.get('content-length') ?? '0');
  if (declarado > limite) return null;
  if (!request.body) return '';
  const leitor = request.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > limite) {
      await leitor.cancel();
      return null;
    }
    partes.push(value);
  }
  const tudo = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    tudo.set(p, pos);
    pos += p.byteLength;
  }
  return new TextDecoder().decode(tudo);
}
