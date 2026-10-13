/*
 * POST /api/voto — checagens das mais baratas para as mais caras:
 *  1. formato (POST, origem, X-AV, JSON até 4 KB), fase, corpo e consentimento
 *  2. país BR, rede de servidor, token do aparelho
 *  3. limite de rajada por IP (binding) e Turnstile
 *  4. limite diário por IP (só depois do Turnstile, para não punir CGNAT por tentativas falhas)
 *  5. urna: "já participou?" + soma no lote cego da hora
 */
import {
  agora,
  coletaOpcao,
  datas,
  fase,
  horaDe,
  limitador,
  limites,
  N_LIMITADORES,
  N_URNAS,
  urna,
  diaBR,
  type Env,
} from '../config';
import { hmacHex } from '../cripto';
import { lerDispositivo } from '../dispositivo';
import { erro, json, lerCorpo } from '../http';
import { ehOpcao, rotulo, ROTULO_PARTICIPACAO } from '../rotulos';
import { lerSinais, redeDeRetransmissao, redeDeServidor } from '../sinais';
import { verificarTurnstile } from '../turnstile';
import { chaveIp, checarOrigem, metrica } from './comum';

const TOKEN_TURNSTILE = /^[\x21-\x7e]{1,2048}$/;

export async function rotaVoto(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return erro('metodo', 405, { allow: 'POST' });
  const recusa = checarOrigem(request, env);
  if (recusa) return recusa;
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return erro('formato', 415);
  }

  const url = new URL(request.url);
  const t = agora(env, url);
  const f = fase(env, t, url);
  if (f === 'antes') return erro('nao_aberta', 409);
  if (f === 'pausada') return erro('pausada', 503, { 'retry-after': '300' });
  if (f === 'encerrada' || f === 'revelada') return erro('encerrada', 410);

  const texto = await lerCorpo(request, 4096);
  if (texto === null) return erro('grande_demais', 413);
  let corpo: Record<string, unknown>;
  try {
    const lido = JSON.parse(texto) as unknown;
    if (!lido || typeof lido !== 'object' || Array.isArray(lido)) throw new Error();
    corpo = lido as Record<string, unknown>;
  } catch {
    return erro('requisicao_invalida', 400);
  }
  if (corpo.consentimento !== 'v1') return erro('requisicao_invalida', 400);
  if (typeof corpo.turnstile !== 'string' || !TOKEN_TURNSTILE.test(corpo.turnstile)) {
    return erro('requisicao_invalida', 400);
  }
  const coleta = coletaOpcao(env);
  if (coleta ? !ehOpcao(corpo.opcao) : corpo.opcao !== undefined) return erro('requisicao_invalida', 400);

  const sinais = lerSinais(request, env, url);
  if (sinais.pais !== 'BR') {
    metrica(env, 'fora_do_brasil', sinais, '-');
    return erro('fora_do_brasil', 403);
  }
  if (redeDeServidor(sinais)) {
    metrica(env, 'rede_bloqueada', sinais, '-');
    return erro('rede_bloqueada', 403);
  }

  const dispositivo = await lerDispositivo(request, env, t);
  if (!dispositivo) return erro('dispositivo_invalido', 401);

  const ipHash = await chaveIp(env, sinais, t);
  if (!(await env.RL_VOTO.limit({ key: ipHash })).success) {
    metrica(env, 'limite', sinais, '-');
    return erro('limite', 429, { 'retry-after': '60' });
  }

  const v = await verificarTurnstile(env, { token: corpo.turnstile, cdata: dispositivo.id, ip: sinais.ip, url });
  if (!v.ok) {
    metrica(env, v.motivo, sinais, '-');
    if (v.motivo === 'antibot') return erro('antibot', 403);
    return erro('indisponivel', 503, { 'retry-after': '10' });
  }

  const lim = limites(env);
  const indiceLim = parseInt(ipHash.slice(0, 8), 16) % N_LIMITADORES;
  const usados = await limitador(env, indiceLim).consumir(ipHash, diaBR(t));
  const duro = sinais.ipv6 ? lim.v6Duro : lim.v4Duro;
  const suave = sinais.ipv6 ? lim.v6Suave : lim.v4Suave;
  if (usados > duro) {
    metrica(env, 'limite_diario', sinais, '-');
    return erro('limite_diario', 429, { 'retry-after': '3600' });
  }

  const suspeito =
    usados > suave ||
    redeDeRetransmissao(sinais) ||
    sinais.uf === 'ZZ' ||
    sinais.protocolo === 'HTTP/1.1' ||
    sinais.protocolo === 'HTTP/1.0' ||
    t - dispositivo.emitidoEm < 3000;
  const faixa: 'a' | 'b' = suspeito ? 'b' : 'a';

  const chave = await hmacHex(env.SEGREDO_DEDUP, dispositivo.id);
  const shard = parseInt(chave.slice(0, 8), 16) % N_URNAS;
  const rot = coleta && ehOpcao(corpo.opcao) ? await rotulo(env, corpo.opcao) : ROTULO_PARTICIPACAO;

  const status = await urna(env, shard).registrar({
    shard,
    chave,
    rotulo: rot,
    uf: sinais.uf,
    faixa,
    hora: horaDe(t),
    agora: t,
    fechaEm: datas(env, url).fechaEm,
  });
  metrica(env, status, sinais, faixa);

  if (status === 'contado') return json({ status }, 201);
  if (status === 'ja_participou') return json({ status }, 200);
  return erro('encerrada', 410);
}
