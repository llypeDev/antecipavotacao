/*
 * Dados da eleição simulada: voto para Presidente da República.
 *
 * TODOS os partidos e candidatos abaixo são FICTÍCIOS e servem apenas para
 * treinar o uso da urna. Para mudar a simulação basta editar este arquivo.
 *
 * Campos opcionais de cada candidato (e do vice):
 *  - g:        'f' ou 'm' (usado só para desenhar a foto ilustrativa)
 *  - grisalho: true para cabelo grisalho na foto
 */
window.DADOS_ELEICAO = {
  cargo: {
    titulo: 'Presidente',
    tituloVice: 'Vice-Presidente',
    digitos: 2
  },

  turnosInfo: {
    1: { nome: '1º turno', data: '4 de outubro de 2026' },
    2: { nome: '2º turno', data: '25 de outubro de 2026' }
  },

  partidos: {
    '24': { sigla: 'PIA', nome: 'Partido do Ipê Amarelo' },
    '37': { sigla: 'PSV', nome: 'Partido Serra Verde' },
    '42': { sigla: 'PRA', nome: 'Partido Rio Azul' },
    '61': { sigla: 'PTF', nome: 'Partido Terra Firme' },
    '86': { sigla: 'PLC', nome: 'Partido Lua Cheia' }
  },

  candidatos: [
    { numero: '24', nome: 'Helena Duarte', g: 'f', vice: { nome: 'Rogério Matos', g: 'm', grisalho: true } },
    { numero: '37', nome: 'Augusto Ferraz', g: 'm', grisalho: true, vice: { nome: 'Cláudia Rezende', g: 'f' } },
    { numero: '42', nome: 'Beatriz Quintela', g: 'f', vice: { nome: 'Otávio Nunes', g: 'm' } },
    { numero: '61', nome: 'Carlos Menezes', g: 'm', vice: { nome: 'Luíza Prado', g: 'f', grisalho: true } },
    { numero: '86', nome: 'Joana Bittencourt', g: 'f', vice: { nome: 'Sérgio Valença', g: 'm' } }
  ],

  // Números dos dois candidatos que disputam o 2º turno
  segundoTurno: ['24', '37']
};
