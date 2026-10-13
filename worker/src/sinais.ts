/*
 * Sinais da requisição: país, UF, rede (ASN), protocolo e a chave do IP para limites.
 * Nada disso é guardado junto com o voto.
 */
import { ASN_HOSPEDAGEM, ASN_RETRANSMISSAO } from './asn';
import { ehProducao, UFS, type Env } from './config';

export interface Sinais {
  pais: string;
  uf: string; // "ZZ" quando desconhecida
  asn: number;
  colo: string;
  protocolo: string;
  ip: string | null;
  /** IPv4 inteiro ou o prefixo /64 do IPv6. */
  ipChave: string | null;
  ipv6: boolean;
}

interface CfLido {
  country?: string;
  regionCode?: string;
  asn?: number;
  colo?: string;
  httpProtocol?: string;
}

export function lerSinais(request: Request, env: Env, url?: URL): Sinais {
  let cf = (request.cf ?? {}) as CfLido;
  if (!ehProducao(env, url) && env.GEO_FIXO) {
    try {
      cf = { ...cf, ...(JSON.parse(env.GEO_FIXO) as CfLido) };
    } catch {
      /* GEO_FIXO inválido: segue com request.cf */
    }
  }
  const pais = typeof cf.country === 'string' ? cf.country.toUpperCase() : 'XX';
  const regiao = typeof cf.regionCode === 'string' ? cf.regionCode.toUpperCase() : '';
  const ip = request.headers.get('cf-connecting-ip');
  const ipv6 = !!ip && ip.includes(':');
  return {
    pais,
    uf: pais === 'BR' && UFS.has(regiao) ? regiao : 'ZZ',
    asn: Number(cf.asn ?? 0) || 0,
    colo: typeof cf.colo === 'string' ? cf.colo : '',
    protocolo: typeof cf.httpProtocol === 'string' ? cf.httpProtocol : '',
    ip,
    ipChave: ip ? (ipv6 ? prefixo64(ip) : ip.trim()) : null,
    ipv6,
  };
}

/** Primeiros 4 grupos (64 bits) de um IPv6, expandindo o "::". */
export function prefixo64(ip: string): string {
  const semZona = ip.split('%')[0].toLowerCase();
  const [cabeca, cauda] = semZona.split('::');
  const a = cabeca ? cabeca.split(':') : [];
  const b = cauda !== undefined && cauda !== '' ? cauda.split(':') : [];
  const zeros = cauda !== undefined ? Array(Math.max(0, 8 - a.length - b.length)).fill('0') : [];
  const grupos = [...a, ...zeros, ...b].slice(0, 4).map((g) => (g || '0').replace(/^0+(?=.)/, ''));
  while (grupos.length < 4) grupos.push('0');
  return grupos.join(':') + '::/64';
}

export const redeDeServidor = (s: Sinais) => ASN_HOSPEDAGEM.has(s.asn);
export const redeDeRetransmissao = (s: Sinais) => ASN_RETRANSMISSAO.has(s.asn);
