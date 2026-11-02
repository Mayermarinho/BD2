// ============================================================================
// IDENTIDADE DO SITE — edite este arquivo para trocar nome, cores e textos.
// Não precisa mexer em mais nenhum código.
// DEFINITIVOS (decisão do grupo): nome "Studio Aurora", paleta de cores e logo (tesoura + brilho).
// AINDA PLACEHOLDER: endereço, telefone/WhatsApp e Instagram em "contato" (abaixo): troque pelos reais.
// As fotos de public/img são ilustrações geradas por IA (troque por fotos reais do salão, se houver).
// ============================================================================
export const marca = {
  nome: 'Studio Aurora',                         // definitivo — nome do salão
  slogan: 'Cabelo & Estética',
  titulo: 'Beleza com calma, no seu tempo.',
  subtitulo: 'Escolha o serviço, veja os horários livres e agende em poucos cliques — pelo celular ou computador, sem precisar ligar.',

  // Cores (qualquer cor CSS). Mantenha bom contraste entre "primaria" e branco (acessibilidade).
  cores: {
    primaria: '#6b3a5e',
    primariaEscura: '#4f2646',
    fundo: '#edf3fa',
    texto: '#221c20',
    suave: '#62585f',
    borda: '#d6e0ec',
    // tons suaves usados nos cartões e na home (paleta: azul suave + rosa quartzo + ameixa)
    rosa: '#f8e3e6',
    verde: '#e1eedf',
    azul: '#d9e7f6',
    areia: '#f6ebe4',
    traco: '#5d86b3',          // cor dos desenhos de fundo (linhas finas)
  },

  // Fotos (arquivos em frontend/public/img/). Hoje são imagens ILUSTRATIVAS geradas por IA:
  // troque por fotos reais do salão (mesmos nomes de arquivo ou novos caminhos aqui).
  // Sem foto (null), a home usa uma composição de formas coloridas.
  imagemHero: '/img/hero.jpg',
  // Foto de um serviço específico (a chave é o nome do serviço, igual ao cadastrado no painel).
  // Serviço sem foto própria usa a da categoria dele.
  imagensServico: {
    'Coloração': '/img/coloracao.jpg',
    'Corte feminino': '/img/corte.jpg',
    'Escova': '/img/escova.jpg',
  },
  // Foto de cada categoria de serviço (a chave é o nome da categoria cadastrada no painel).
  imagensCategoria: {
    'Cabelo': '/img/cabelo.jpg',
    'Estética': '/img/estetica.jpg',
    'Manicure e Pedicure': '/img/manicure.jpg',
  },
  imagemPadrao: '/img/hero.jpg',          // categorias sem foto própria

  passos: [
    { icone: 'tesoura', titulo: 'Escolha o serviço', texto: 'Veja preços e duração de cada serviço.' },
    { icone: 'calendario', titulo: 'Reserve o horário', texto: 'Só aparecem horários realmente livres.' },
    { icone: 'check', titulo: 'Pronto!', texto: 'Com conta, você acompanha e cancela quando quiser. Sem conta, também dá.' },
  ],

  // PLACEHOLDER — troque pelos dados reais da profissional (aparecem no site)
  contato: {
    endereco: 'Rua Exemplo, 123 — Centro',
    cidade: 'Andradina – SP',
    horario: 'Seg a Sex, 9h às 18h · Sáb, 9h às 13h',
    whatsapp: '(18) 99999-9999',
    instagram: '@studioaurora',
  },
};

/** Aplica cores e título da marca ao documento (chamado uma vez ao iniciar). */
export function aplicarMarca() {
  const c = marca.cores;
  const estilo = document.documentElement.style;
  const mapa = {
    '--cor-primaria': c.primaria, '--cor-primaria-escura': c.primariaEscura, '--cor-fundo': c.fundo,
    '--cor-texto': c.texto, '--cor-suave': c.suave, '--cor-borda': c.borda,
    '--tom-rosa': c.rosa, '--tom-verde': c.verde, '--tom-azul': c.azul, '--tom-areia': c.areia, '--cor-traco': c.traco,
  };
  Object.entries(mapa).forEach(([k, v]) => estilo.setProperty(k, v));
  document.title = `${marca.nome} · Agendamento online`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c.primaria);
}
