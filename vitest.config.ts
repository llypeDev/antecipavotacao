import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// Os testes rodam dentro do runtime dos Workers (Miniflare), com Durable Objects locais.
// Valores só de teste: nada aqui vale em produção.
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          AMBIENTE: 'teste',
          ABRE_EM: '2026-10-01T00:00:00Z',
          FECHA_EM: '2026-10-25T20:00:00Z',
          REVELAR_EM: '2026-10-25T20:00:00Z',
          VOTACAO_ABERTA: 'true',
          COLETA_OPCAO: 'true',
          MOSTRAR_UF: 'false',
          ORIGENS: 'https://teste.local',
          TURNSTILE_SITEKEY: '1x00000000000000000000AA',
          TURNSTILE_HOSTS: 'teste.local',
          TURNSTILE_VERIFY_URL: 'stub:',
          TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
          SEGREDO_DISPOSITIVO: 'teste-dispositivo',
          SEGREDO_DEDUP: 'teste-dedup',
          SEGREDO_IP: 'teste-ip',
          SEGREDO_ROTULOS: 'teste-rotulos',
          SEGREDO_COMPROMISSO: 'teste-compromisso',
          GEO_FIXO: JSON.stringify({ country: 'BR', regionCode: 'SP', asn: 28573, colo: 'GRU', httpProtocol: 'HTTP/2' }),
          LIMITES: JSON.stringify({ v4Suave: 50, v4Duro: 2000, v6Suave: 3, v6Duro: 20 }),
          RELOGIO_FIXO: '2026-10-20T15:00:00Z',
        },
      },
    }),
  ],
  test: {
    include: ['worker/test/**/*.test.ts'],
    // o cache de módulos em disco do Vitest 5 não é lido de dentro do runtime dos Workers
    fsModuleCache: false,
  },
});
