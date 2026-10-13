/* Utilitários dos testes do Worker. */
import { createExecutionContext, runDurableObjectAlarm, waitOnExecutionContext } from 'cloudflare:test';
import { env as envBase } from 'cloudflare:workers';
import worker from '../src/index';
import { limparMemoria } from '../src/cache';
import { N_URNAS, totalizador, urna, type Env } from '../src/config';

export const BASE = 'https://teste.local';
export const ANTES_DE_ABRIR = '2026-09-30T12:00:00Z';
export const DURANTE = '2026-10-20T15:00:00Z';
export const DEPOIS_DO_FECHAMENTO = '2026-10-25T20:30:00Z';

export function ambiente(extras: Partial<Env> = {}): Env {
  return { ...(envBase as unknown as Env), ...extras };
}

let contadorIp = 0;
export function ipNovo(): string {
  contadorIp += 1;
  return `177.${(contadorIp >> 16) & 255}.${(contadorIp >> 8) & 255}.${contadorIp & 255}`;
}

export async function chamar(e: Env, caminho: string, init: RequestInit & { ip?: string; cf?: Record<string, unknown> } = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has('cf-connecting-ip')) headers.set('cf-connecting-ip', init.ip ?? '177.10.20.30');
  const req = new Request(caminho.startsWith('http') ? caminho : BASE + caminho, {
    ...init,
    headers,
    ...(init.cf ? { cf: init.cf } : {}),
  } as RequestInit);
  const ctx = createExecutionContext();
  const resp = await worker.fetch(req, e, ctx);
  await waitOnExecutionContext(ctx);
  return resp;
}

export const cabecalhosPost = (extras: Record<string, string> = {}) => ({
  origin: BASE,
  'x-av': '1',
  'content-type': 'application/json',
  ...extras,
});

/** Emite um token "um minuto antes" do relógio do teste (token novo demais cai na faixa B). */
export async function novoDispositivo(e: Env, ip = ipNovo()): Promise<{ token: string; id: string }> {
  const antes = e.RELOGIO_FIXO ? { ...e, RELOGIO_FIXO: new Date(Date.parse(e.RELOGIO_FIXO) - 60_000).toISOString() } : e;
  const r = await chamar(antes, '/api/dispositivo', { method: 'POST', headers: cabecalhosPost(), ip });
  if (r.status !== 200) throw new Error('dispositivo ' + r.status);
  const { dispositivo } = (await r.json()) as { dispositivo: string };
  return { token: dispositivo, id: dispositivo.split('.')[1] };
}

export async function votar(
  e: Env,
  disp: { token: string; id: string },
  corpo: Record<string, unknown> | string | undefined = undefined,
  opcoes: { ip?: string; headers?: Record<string, string>; cf?: Record<string, unknown> } = {},
) {
  const body =
    typeof corpo === 'string'
      ? corpo
      : JSON.stringify(corpo ?? { opcao: '13', turnstile: 'teste.' + disp.id, consentimento: 'v1' });
  return chamar(e, '/api/voto', {
    method: 'POST',
    headers: cabecalhosPost({ 'x-av-dispositivo': disp.token, ...opcoes.headers }),
    body,
    ip: opcoes.ip ?? ipNovo(),
    cf: opcoes.cf,
  });
}

/** Dispara os alarmes de todas as urnas (envio dos lotes ao Totalizador). */
export async function descarregarUrnas(e: Env = ambiente()): Promise<void> {
  for (let i = 0; i < N_URNAS; i++) await runDurableObjectAlarm(urna(e, i));
}

export async function lerTermometro(e: Env) {
  limparMemoria();
  await caches.default.delete(new Request(BASE + '/__cache/termometro-v1'));
  const r = await chamar(e, '/api/termometro');
  return (await r.json()) as {
    fase: string;
    coletaOpcao: boolean;
    dados: { participacoes: number; porHora: [string, number][]; porUF: unknown; compromisso: unknown };
  };
}

export async function lerResultado(e: Env) {
  limparMemoria();
  await caches.default.delete(new Request(BASE + '/__cache/resultado-v1'));
  return chamar(e, '/api/resultado');
}

export { totalizador, urna };
