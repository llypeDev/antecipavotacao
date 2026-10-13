/*
 * Configuração e fases da votação do termômetro.
 *
 * Tudo aqui "falha fechado": variável ausente ou inválida significa votação fechada
 * e placar lacrado. Em produção, o lacre nunca abre antes de 25/10/2026 às 17h (Brasília),
 * mesmo que a configuração diga outra coisa.
 */
import type { Urna } from './do/urna';
import type { Totalizador } from './do/totalizador';
import type { Limitador } from './do/limitador';

export interface Env {
  ASSETS: Fetcher;
  URNA: DurableObjectNamespace<Urna>;
  TOTALIZADOR: DurableObjectNamespace<Totalizador>;
  LIMITADOR: DurableObjectNamespace<Limitador>;
  RL_VOTO: RateLimit;
  RL_DISPOSITIVO: RateLimit;
  METRICAS?: AnalyticsEngineDataset;
  ARQUIVO?: R2Bucket;

  AMBIENTE?: string;
  ABRE_EM?: string;
  FECHA_EM?: string;
  REVELAR_EM?: string;
  VOTACAO_ABERTA?: string;
  COLETA_OPCAO?: string;
  MOSTRAR_UF?: string;
  ORIGENS?: string;
  TURNSTILE_SITEKEY?: string;
  TURNSTILE_HOSTS?: string;
  LIMITES?: string;
  EXPURGAR_OPCOES?: string;

  TURNSTILE_SECRET?: string;
  SEGREDO_DISPOSITIVO?: string;
  SEGREDO_DEDUP?: string;
  SEGREDO_IP?: string;
  SEGREDO_ROTULOS?: string;
  SEGREDO_COMPROMISSO?: string;

  // Só para desenvolvimento e testes; ignorados em produção.
  RELOGIO_FIXO?: string;
  GEO_FIXO?: string;
  TURNSTILE_VERIFY_URL?: string;
}

/** Urnas do 2º turno fecham às 17h de Brasília (20:00 UTC) no país todo. */
export const URNAS_FECHAM = Date.parse('2026-10-25T20:00:00Z');
/** O placar nunca abre antes disso em produção (piso fixo no código). */
export const REVELAR_MINIMO = URNAS_FECHAM;

/** Mudar depois do lançamento quebraria o "1 voto por aparelho". */
export const N_URNAS = 32;
export const N_LIMITADORES = 16;

/** Hosts que sempre seguem as regras de produção, qualquer que seja o AMBIENTE. */
export const HOSTS_PRODUCAO = new Set(['antecipavotacao.com.br', 'www.antecipavotacao.com.br']);

export const UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

export type Fase = 'antes' | 'aberta' | 'pausada' | 'encerrada' | 'revelada';

/** AMBIENTE ausente conta como produção (falha fechada). */
export function ehProducao(env: Env, url?: URL): boolean {
  if (url && HOSTS_PRODUCAO.has(url.hostname)) return true;
  return env.AMBIENTE === undefined || env.AMBIENTE === '' || env.AMBIENTE === 'producao';
}

/** Relógio. O relógio fixo de teste nunca vale em produção nem no domínio de produção. */
export function agora(env: Env, url?: URL): number {
  if (!ehProducao(env, url) && env.RELOGIO_FIXO) {
    const t = Date.parse(env.RELOGIO_FIXO);
    if (Number.isFinite(t)) return t;
  }
  return Date.now();
}

function data(valor: string | undefined): number | null {
  if (!valor) return null;
  const t = Date.parse(valor);
  return Number.isFinite(t) ? t : null;
}

export interface Datas {
  abreEm: number;
  fechaEm: number;
  revelarEm: number;
}

export function datas(env: Env, url?: URL): Datas {
  const producao = ehProducao(env, url);
  const abreEm = data(env.ABRE_EM) ?? Infinity;
  let fechaEm = data(env.FECHA_EM) ?? URNAS_FECHAM;
  let revelarEm = data(env.REVELAR_EM) ?? Infinity;
  if (producao) {
    // a votação nunca passa do fechamento das urnas e o placar nunca abre antes dele
    fechaEm = Math.min(fechaEm, URNAS_FECHAM);
    revelarEm = Math.max(revelarEm, REVELAR_MINIMO);
  }
  return { abreEm, fechaEm, revelarEm };
}

export function fase(env: Env, t: number, url?: URL): Fase {
  const d = datas(env, url);
  if (t >= d.revelarEm && t >= d.fechaEm) return 'revelada';
  if (t >= d.fechaEm) return 'encerrada';
  if (t < d.abreEm) return 'antes';
  if (env.VOTACAO_ABERTA !== 'true') return 'pausada';
  return 'aberta';
}

/** Placar aberto? Mesma regra da fase, usada também dentro do Totalizador. */
export function placarAberto(env: Env, t: number, url?: URL): boolean {
  return fase(env, t, url) === 'revelada';
}

export const coletaOpcao = (env: Env) => env.COLETA_OPCAO === 'true';
export const mostrarUF = (env: Env) => env.MOSTRAR_UF === 'true';

export function origens(env: Env): string[] {
  return (env.ORIGENS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

export function hostsTurnstile(env: Env): string[] {
  return (env.TURNSTILE_HOSTS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

export interface Limites {
  v4Suave: number;
  v4Duro: number;
  v6Suave: number;
  v6Duro: number;
}

const LIMITES_PADRAO: Limites = { v4Suave: 50, v4Duro: 2000, v6Suave: 3, v6Duro: 20 };

export function limites(env: Env): Limites {
  try {
    const l = JSON.parse(env.LIMITES ?? '{}') as Partial<Limites>;
    const n = (v: unknown, p: number) => (typeof v === 'number' && v > 0 ? v : p);
    return {
      v4Suave: n(l.v4Suave, LIMITES_PADRAO.v4Suave),
      v4Duro: n(l.v4Duro, LIMITES_PADRAO.v4Duro),
      v6Suave: n(l.v6Suave, LIMITES_PADRAO.v6Suave),
      v6Duro: n(l.v6Duro, LIMITES_PADRAO.v6Duro),
    };
  } catch {
    return LIMITES_PADRAO;
  }
}

/** Dia em Brasília (UTC-3, sem horário de verão), para os limites diários. */
export function diaBR(t: number): string {
  return new Date(t - 3 * 3600_000).toISOString().slice(0, 10);
}

export const horaDe = (t: number) => Math.floor(t / 3600_000);
export const isoHora = (hora: number) => new Date(hora * 3600_000).toISOString().slice(0, 13) + ':00:00Z';
export const iso = (t: number) => (Number.isFinite(t) ? new Date(t).toISOString() : null);

export function urna(env: Env, indice: number) {
  const nome = 'urna-' + String(indice).padStart(2, '0');
  return env.URNA.get(env.URNA.idFromName(nome), { locationHint: 'sam' });
}

export function totalizador(env: Env) {
  return env.TOTALIZADOR.get(env.TOTALIZADOR.idFromName('totalizador'), { locationHint: 'sam' });
}

export function limitador(env: Env, indice: number) {
  const nome = 'lim-' + String(indice).padStart(2, '0');
  return env.LIMITADOR.get(env.LIMITADOR.idFromName(nome), { locationHint: 'sam' });
}
