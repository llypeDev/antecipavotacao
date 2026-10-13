/*
 * Redes (ASN) usadas para classificar a origem do voto.
 *
 * Hospedagem/nuvem: gente de verdade não navega a partir de servidores; votos dessas redes
 * são recusados ("rede_bloqueada"). Retransmissão (VPN/relay de privacidade): pode ser gente
 * de verdade, então o voto conta, mas vai para a faixa B (auditável).
 */

export const ASN_HOSPEDAGEM = new Set<number>([
  16509, 14618, 8987, // Amazon / AWS
  15169, 396982, 19527, // Google / Google Cloud
  8075, // Microsoft Azure
  31898, // Oracle Cloud
  14061, // DigitalOcean
  16276, // OVH
  24940, 213230, // Hetzner
  63949, // Akamai Connected Cloud (Linode)
  20473, // Vultr (Choopa)
  51167, 40021, // Contabo
  12876, // Scaleway
  60781, 28753, 59253, // Leaseweb
  9009, // M247 (muitas saídas de VPN)
  212238, // Datacamp
  62240, // Clouvider
  46562, // Performive
  45102, // Alibaba Cloud
  132203, // Tencent Cloud
  135377, // UCloud
  36352, // ColoCrossing
  53667, // FranTech / BuyVM
  47583, // Hostinger
  27715, // Locaweb
  262287, // Latitude.sh (ex-Maxihost)
  52925, // Ascenty (data centers)
]);

export const ASN_RETRANSMISSAO = new Set<number>([
  13335, // Cloudflare (WARP / 1.1.1.1)
  36183, // Akamai (iCloud Private Relay)
  54113, // Fastly (iCloud Private Relay)
]);
