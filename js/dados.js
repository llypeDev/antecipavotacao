/*
 * Dados da eleição simulada.
 *
 * TODOS os partidos e candidatos abaixo são FICTÍCIOS e servem apenas para
 * treinar o uso da urna. Para mudar a simulação basta editar este arquivo:
 *
 *  - partidos:  número (2 dígitos) -> { sigla, nome }
 *  - cargos:    título, quantidade de dígitos e lista de candidatos
 *  - turnos:    ordem das telas em cada turno (igual à ordem da urna real)
 *
 * Campos opcionais de cada candidato:
 *  - g:       'f' ou 'm' (usado só para desenhar a foto ilustrativa)
 *  - grisalho: true para cabelo grisalho na foto
 *  - vice / suplentes: nomes exibidos abaixo do nome do candidato
 */
window.DADOS_ELEICAO = {
  titulo: 'Eleições Gerais 2026',

  turnosInfo: {
    1: { nome: '1º turno', data: '4 de outubro de 2026' },
    2: { nome: '2º turno', data: '25 de outubro de 2026' }
  },

  partidos: {
    '24': { sigla: 'PIA', nome: 'Partido do Ipê Amarelo' },
    '31': { sigla: 'PMA', nome: 'Partido Mar Aberto' },
    '37': { sigla: 'PSV', nome: 'Partido Serra Verde' },
    '42': { sigla: 'PRA', nome: 'Partido Rio Azul' },
    '48': { sigla: 'PCN', nome: 'Partido Cerrado Nativo' },
    '53': { sigla: 'PBV', nome: 'Partido Brisa do Vale' },
    '61': { sigla: 'PTF', nome: 'Partido Terra Firme' },
    '68': { sigla: 'PSN', nome: 'Partido Sol Nascente' },
    '74': { sigla: 'PCA', nome: 'Partido Cachoeira Alta' },
    '86': { sigla: 'PLC', nome: 'Partido Lua Cheia' }
  },

  cargos: {
    depFederal: {
      titulo: 'Deputado Federal',
      digitos: 4,
      proporcional: true,
      candidatos: [
        { numero: '2410', nome: 'Professora Alice', g: 'f' },
        { numero: '3100', nome: 'Dr. Ramiro Paiva', g: 'm', grisalho: true },
        { numero: '3737', nome: 'Tião da Feira', g: 'm' },
        { numero: '4242', nome: 'Enfermeira Cida', g: 'f' },
        { numero: '4810', nome: 'Bruno Falcão', g: 'm' },
        { numero: '5300', nome: 'Neide do Bairro', g: 'f', grisalho: true },
        { numero: '6161', nome: 'Bombeiro Mauro', g: 'm' },
        { numero: '6868', nome: 'Camila Rangel', g: 'f' },
        { numero: '7400', nome: 'Motorista Juca', g: 'm' },
        { numero: '8600', nome: 'Yara Nogueira', g: 'f' }
      ]
    },

    depEstadual: {
      titulo: 'Deputado Estadual',
      digitos: 5,
      proporcional: true,
      candidatos: [
        { numero: '24123', nome: 'Rosa Benedetti', g: 'f' },
        { numero: '31555', nome: 'Pedro do Esporte', g: 'm' },
        { numero: '37000', nome: 'Dona Zefinha', g: 'f', grisalho: true },
        { numero: '42420', nome: 'Leandro Viana', g: 'm' },
        { numero: '48888', nome: 'Professor Caio', g: 'm' },
        { numero: '53100', nome: 'Kátia Mendes', g: 'f' },
        { numero: '61234', nome: 'Seu Arlindo', g: 'm', grisalho: true },
        { numero: '68068', nome: 'Dra. Simone Reis', g: 'f' },
        { numero: '74321', nome: 'Murilo Pires', g: 'm' },
        { numero: '86000', nome: 'Tânia da Saúde', g: 'f' }
      ]
    },

    senador: {
      titulo: 'Senador',
      digitos: 3,
      rotulosVice: ['1º Suplente', '2º Suplente'],
      candidatos: [
        { numero: '241', nome: 'Mariana Siqueira', g: 'f', suplentes: ['Tadeu Ramos', 'Vera Lúcia Pinto'] },
        { numero: '377', nome: 'Renata Valadares', g: 'f', suplentes: ['Fábio Moura', 'Glória Teles'] },
        { numero: '422', nome: 'Gilberto Assunção', g: 'm', grisalho: true, suplentes: ['Inês Barreto', 'Wagner Lopes'] },
        { numero: '533', nome: 'Teresa Carvalhal', g: 'f', suplentes: ['Marcos Peixoto', 'Elisa Moreira'] },
        { numero: '618', nome: 'Antônio Lemos', g: 'm', suplentes: ['Rita Caldas', 'Hugo Severo'] },
        { numero: '868', nome: 'Sandra Lobo', g: 'f', grisalho: true, suplentes: ['Ivan Teodoro', 'Celina Braga'] }
      ]
    },

    governador: {
      titulo: 'Governador',
      digitos: 2,
      rotulosVice: ['Vice-Governador'],
      fotoVice: true,
      candidatos: [
        { numero: '31', nome: 'Rafael Antunes', g: 'm', vice: { nome: 'Sônia Albuquerque', g: 'f' } },
        { numero: '48', nome: 'Patrícia Gouveia', g: 'f', vice: { nome: 'Henrique Sales', g: 'm', grisalho: true } },
        { numero: '53', nome: 'Eduardo Brandão', g: 'm', grisalho: true, vice: { nome: 'Lúcia Fontes', g: 'f' } },
        { numero: '74', nome: 'Fernanda Cavalcanti', g: 'f', vice: { nome: 'Jorge Amaral', g: 'm' } }
      ]
    },

    presidente: {
      titulo: 'Presidente',
      digitos: 2,
      rotulosVice: ['Vice-Presidente'],
      fotoVice: true,
      candidatos: [
        { numero: '24', nome: 'Helena Duarte', g: 'f', vice: { nome: 'Rogério Matos', g: 'm', grisalho: true } },
        { numero: '37', nome: 'Augusto Ferraz', g: 'm', grisalho: true, vice: { nome: 'Cláudia Rezende', g: 'f' } },
        { numero: '42', nome: 'Beatriz Quintela', g: 'f', vice: { nome: 'Otávio Nunes', g: 'm' } },
        { numero: '61', nome: 'Carlos Menezes', g: 'm', vice: { nome: 'Luíza Prado', g: 'f', grisalho: true } },
        { numero: '86', nome: 'Joana Bittencourt', g: 'f', vice: { nome: 'Sérgio Valença', g: 'm' } }
      ]
    }
  },

  /*
   * Ordem das telas. Em 2026 são eleitos dois senadores por estado, por isso
   * o 1º turno tem duas telas de Senador (1ª e 2ª vaga).
   * "somente" limita os candidatos que aparecem (usado no 2º turno).
   */
  turnos: {
    1: [
      { cargo: 'depFederal' },
      { cargo: 'depEstadual' },
      { cargo: 'senador', vaga: 1 },
      { cargo: 'senador', vaga: 2 },
      { cargo: 'governador' },
      { cargo: 'presidente' }
    ],
    2: [
      { cargo: 'governador', somente: ['31', '48'] },
      { cargo: 'presidente', somente: ['24', '37'] }
    ]
  }
};
