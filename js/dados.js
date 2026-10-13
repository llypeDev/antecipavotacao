/*
 * Dados da simulação: 2º turno da eleição para Presidente da República
 * (25 de outubro de 2026).
 *
 * Nomes de urna, partidos e números conforme o registro no TSE.
 * Fotos: divulgação oficial do TSE (DivulgaCandContas), obtidas via minhacolinha.com.
 * Os candidatos aparecem em ordem numérica.
 */
window.DADOS_ELEICAO = {
  turno: '2º turno',
  data: '25 de outubro de 2026',

  cargo: {
    titulo: 'Presidente',
    tituloVice: 'Vice-Presidente',
    digitos: 2
  },

  // Rodapé da tela da urna (mesmos valores fictícios do modo de treinamento do TSE)
  secao: {
    municipio: '99999 - Minha Cidade',
    zona: '9999',
    secao: '9999'
  },

  candidatos: [
    {
      numero: '13',
      nome: 'LULA',
      nomeCompleto: 'Luiz Inácio Lula da Silva',
      partido: 'PT',
      foto: 'img/candidatos/13-lula.jpg',
      vice: {
        nome: 'GERALDO ALCKMIN',
        nomeCompleto: 'Geraldo José Rodrigues Alckmin Filho',
        partido: 'PSB',
        foto: 'img/candidatos/13-vice-geraldo-alckmin.jpg'
      }
    },
    {
      numero: '22',
      nome: 'FLAVIO BOLSONARO',
      nomeCompleto: 'Flávio Nantes Bolsonaro',
      partido: 'PL',
      foto: 'img/candidatos/22-flavio-bolsonaro.jpg',
      vice: {
        nome: 'ALFREDO GASPAR',
        nomeCompleto: 'Alfredo Gaspar de Mendonça Neto',
        partido: 'PL',
        foto: 'img/candidatos/22-vice-alfredo-gaspar.jpg'
      }
    }
  ]
};
