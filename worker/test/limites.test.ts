import { beforeEach, describe, expect, it } from 'vitest';
import { reset, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { limitador } from '../src/config';
import { prefixo64 } from '../src/sinais';
import { ambiente, DURANTE, descarregarUrnas, novoDispositivo, totalizador, votar } from './ajuda';

beforeEach(async () => {
  await reset();
});

const LIMITES = JSON.stringify({ v4Suave: 1, v4Duro: 2, v6Suave: 1, v6Duro: 2 });

describe('limites por IP', () => {
  it('IPv4: passou do limite suave vai para a faixa B; do duro, é recusado', async () => {
    const e = ambiente({ LIMITES });
    const ip = '177.1.2.3';
    const s1 = (await votar(e, await novoDispositivo(e), undefined, { ip })).status;
    const s2 = (await votar(e, await novoDispositivo(e), undefined, { ip })).status;
    const r3 = await votar(e, await novoDispositivo(e), undefined, { ip });
    expect([s1, s2, r3.status]).toEqual([201, 201, 429]);
    expect(await r3.json()).toEqual({ erro: 'limite_diario' });
    await descarregarUrnas(e);
    const painel = await totalizador(e).painel(Date.parse(DURANTE));
    expect(painel.porFaixa).toEqual({ a: 1, b: 1 });
  });

  it('IPv6: endereços do mesmo /64 contam juntos; outro /64 não', async () => {
    const e = ambiente({ LIMITES });
    const v = (ip: string) => novoDispositivo(e).then((d) => votar(e, d, undefined, { ip }));
    expect((await v('2804:14c:5b:1234::1')).status).toBe(201);
    expect((await v('2804:14c:5b:1234:abcd::2')).status).toBe(201);
    expect((await v('2804:14c:5b:1234:ffff:ffff:ffff:ffff')).status).toBe(429);
    expect((await v('2804:14c:5b:9999::1')).status).toBe(201);
  });

  it('prefixo /64 de IPv6', () => {
    expect(prefixo64('2804:14c:5b:1234::1')).toBe('2804:14c:5b:1234::/64');
    expect(prefixo64('2804:014C:005B:1234:0:0:0:1')).toBe('2804:14c:5b:1234::/64');
    expect(prefixo64('::1')).toBe('0:0:0:0::/64');
    expect(prefixo64('2804:14c::')).toBe('2804:14c:0:0::/64');
    expect(prefixo64('fe80::1%eth0')).toBe('fe80:0:0:0::/64');
  });

  it('o limitador apaga contas com mais de um dia', async () => {
    const e = ambiente();
    const lim = limitador(e, 0);
    await lim.consumir('chave-velha', '2020-01-01');
    await lim.consumir('chave-nova', '2999-01-01');
    await runDurableObjectAlarm(lim);
    const restantes = await runInDurableObject(lim, (_obj, estado) =>
      estado.storage.sql.exec<{ chave: string }>('SELECT chave FROM contas').toArray().map((l) => l.chave),
    );
    expect(restantes).toEqual(['chave-nova']);
  });
});
