/*
 * Validação do Cloudflare Turnstile no servidor (siteverify).
 *
 * Exige: success, action "votar", hostname permitido e cdata igual ao id do aparelho.
 * Se a Cloudflare não responder, recusa (falha fechada). Em produção, chaves de teste
 * são recusadas e TURNSTILE_VERIFY_URL é ignorado.
 */
import { ehProducao, hostsTurnstile, type Env } from './config';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SEGREDOS_DE_TESTE = /^[123]x0000000000000000000000000000000A[AB]$/;

export type Verificacao = { ok: true } | { ok: false; motivo: 'antibot' | 'indisponivel' | 'config' };

interface RespostaSiteverify {
  success?: boolean;
  action?: string;
  hostname?: string;
  cdata?: string;
  'error-codes'?: string[];
}

export function segredoDeTeste(segredo: string | undefined): boolean {
  return !!segredo && SEGREDOS_DE_TESTE.test(segredo);
}

/**
 * Stub local (só fora de produção, com TURNSTILE_VERIFY_URL=stub:):
 * "teste.<cdata>" passa; "falha.*" é recusado; "fora.*" simula Cloudflare fora do ar.
 */
function stub(env: Env, token: string): RespostaSiteverify | 'erro' {
  if (token.startsWith('fora.')) return 'erro';
  if (token.startsWith('teste.')) {
    return { success: true, action: 'votar', hostname: hostsTurnstile(env)[0], cdata: token.slice(6) };
  }
  return { success: false, 'error-codes': ['invalid-input-response'] };
}

async function consultar(url: string, corpo: FormData): Promise<RespostaSiteverify | 'erro'> {
  try {
    const r = await fetch(url, { method: 'POST', body: corpo, signal: AbortSignal.timeout(4000) });
    if (r.status >= 500) return 'erro';
    const dados = (await r.json()) as RespostaSiteverify;
    if (dados['error-codes']?.includes('internal-error')) return 'erro';
    return dados;
  } catch {
    return 'erro';
  }
}

export async function verificarTurnstile(
  env: Env,
  args: { token: string; cdata: string; ip: string | null; url?: URL },
): Promise<Verificacao> {
  const producao = ehProducao(env, args.url);
  if (!env.TURNSTILE_SECRET || (producao && segredoDeTeste(env.TURNSTILE_SECRET))) {
    return { ok: false, motivo: 'config' };
  }
  const url = !producao && env.TURNSTILE_VERIFY_URL ? env.TURNSTILE_VERIFY_URL : SITEVERIFY;

  let resposta: RespostaSiteverify | 'erro';
  if (url === 'stub:') {
    resposta = stub(env, args.token);
  } else {
    const idempotencia = crypto.randomUUID();
    const montar = () => {
      const f = new FormData();
      f.append('secret', env.TURNSTILE_SECRET as string);
      f.append('response', args.token);
      if (args.ip) f.append('remoteip', args.ip);
      f.append('idempotency_key', idempotencia);
      return f;
    };
    resposta = await consultar(url, montar());
    if (resposta === 'erro') resposta = await consultar(url, montar()); // 1 nova tentativa, mesma chave
  }

  if (resposta === 'erro') return { ok: false, motivo: 'indisponivel' };
  const ok =
    resposta.success === true &&
    resposta.action === 'votar' &&
    !!resposta.hostname &&
    hostsTurnstile(env).includes(resposta.hostname) &&
    resposta.cdata === args.cdata;
  return ok ? { ok: true } : { ok: false, motivo: 'antibot' };
}
