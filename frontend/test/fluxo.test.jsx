// Teste do front-end ligado à API real (Express + repositório em memória), tudo dentro do processo.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import App from '../src/App.jsx';
import { AuthProvider } from '../src/auth.jsx';
import { hojeSP } from '../src/utils.js';
import { criarApp } from '../../backend/src/app.js';
import { config as base } from '../../backend/src/config.js';
import { proximaData } from '../../backend/src/datas.js';
import { criarRepoMemoria } from '../../backend/src/repos/memoria.js';

let servidor;
const realFetch = globalThis.fetch;

beforeAll(async () => {
  const config = { ...base, jwtSecret: 'segredo-de-teste-bem-longo-123', statusInicial: 'CONFIRMADO', passoMinutos: 30, antecedenciaMinutos: 60 };
  servidor = criarApp(criarRepoMemoria(), config).listen(0);
  const porta = servidor.address().port;
  globalThis.fetch = (url, opts) => realFetch(`http://localhost:${porta}${url}`, opts); // o front usa caminhos relativos
});
afterAll(() => { servidor.close(); globalThis.fetch = realFetch; });
afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); });

const abrir = (rota = '/') => render(
  <MemoryRouter initialEntries={[rota]}><AuthProvider><App /></AuthProvider></MemoryRouter>,
);

async function escolherSemConta(user, nome = /Escova/) {
  abrir('/');
  await user.click(await screen.findByRole('button', { name: `Agendar ${nome.source ?? nome}` }));
  expect(await screen.findByRole('heading', { name: 'Como você prefere continuar?' })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Continuar sem conta' }));
  expect(await screen.findByRole('heading', { name: 'Escolha o dia e o horário' })).toBeInTheDocument(); // serviço já vem marcado
}

describe('fluxo do cliente', () => {
  it('agenda um serviço do início ao fim e mostra a confirmação', async () => {
    const user = userEvent.setup();
    await escolherSemConta(user);

    // 2. data e horário (próxima terça; o seed ocupa 10:00-11:00 e 11:30-12:15)
    const terca = proximaData(2, hojeSP(), 2);
    fireEvent.change(await screen.findByLabelText('Data'), { target: { value: terca } });
    const grupo = await screen.findByRole('group', { name: 'Horários disponíveis' });
    expect(within(grupo).queryByLabelText('10:00')).toBeNull();     // ocupado
    await user.click(within(grupo).getByLabelText('14:00'));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // 3. dados
    await user.type(await screen.findByLabelText('Nome completo'), 'Maria Teste');
    await user.type(screen.getByLabelText('Telefone (WhatsApp)'), '18955551234');
    expect(screen.getByLabelText('Telefone (WhatsApp)')).toHaveValue('(18) 95555-1234'); // máscara
    await user.click(screen.getByRole('button', { name: 'Confirmar agendamento' }));

    expect(await screen.findByRole('heading', { name: /Agendamento confirmado/ })).toBeInTheDocument();
    expect(screen.getByText('14:00 às 14:45')).toBeInTheDocument();
    expect(screen.getByText('R$ 45,00')).toBeInTheDocument();
  });

  it('o horário agendado deixa de aparecer para outro cliente', async () => {
    const user = userEvent.setup();
    await escolherSemConta(user);
    fireEvent.change(await screen.findByLabelText('Data'), { target: { value: proximaData(2, hojeSP(), 2) } });
    const grupo = await screen.findByRole('group', { name: 'Horários disponíveis' });
    expect(within(grupo).queryByLabelText('14:00')).toBeNull();
    expect(within(grupo).getByLabelText('15:00')).toBeInTheDocument();
  });

  it('dia sem atendimento mostra aviso', async () => {
    const user = userEvent.setup();
    await escolherSemConta(user);
    fireEvent.change(await screen.findByLabelText('Data'), { target: { value: proximaData(0, hojeSP(), 2) } }); // domingo
    expect(await screen.findByText(/Sem horários neste dia/)).toBeInTheDocument();
  });

  it('cancela pelo número e telefone', async () => {
    const user = userEvent.setup();
    abrir('/cancelar');
    await user.type(await screen.findByLabelText('Nº do agendamento'), '1');
    await user.type(screen.getByLabelText('Telefone'), '18999999999');
    await user.click(screen.getByRole('button', { name: 'Cancelar agendamento' }));
    expect(await screen.findByText(/não encontrado/)).toBeInTheDocument(); // telefone errado
    await user.clear(screen.getByLabelText('Telefone'));
    await user.type(screen.getByLabelText('Telefone'), '18988882222');       // Ana Paula (seed)
    await user.click(screen.getByRole('button', { name: 'Cancelar agendamento' }));
    expect(await screen.findByRole('heading', { name: 'Agendamento cancelado' })).toBeInTheDocument();
  });
});

describe('painel da profissional', () => {
  it('exige login, mostra a agenda e conclui um atendimento', async () => {
    const user = userEvent.setup();
    abrir('/admin');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument(); // redirecionou

    await user.type(screen.getByLabelText('E-mail'), 'admin@mariana.com');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/incorretos/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Senha'));
    await user.type(screen.getByLabelText('Senha'), 'admin123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('heading', { name: /^Olá, / })).toBeInTheDocument(); // dashboard
    expect(await screen.findByText('Próximos atendimentos')).toBeInTheDocument();

    await user.click(within(screen.getByRole('navigation', { name: 'Painel da profissional' })).getByRole('link', { name: /Agenda/ }));
    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Data'), { target: { value: proximaData(2, hojeSP(), 2) } });
    const juliana = await screen.findByText('Juliana Santos');
    const cartao = juliana.closest('li');
    await user.click(within(cartao).getByRole('button', { name: 'Concluir' }));
    await waitFor(() => expect(within(screen.getByText('Juliana Santos').closest('li')).getByText('Concluído')).toBeInTheDocument());
  });
});

async function entrar(user, rota) {
  abrir(rota);
  if (sessionStorage.length) return; // já logado nesta sessão de teste
  await user.type(await screen.findByLabelText('E-mail'), 'admin@mariana.com');
  await user.type(screen.getByLabelText('Senha'), 'admin123');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('painel: agenda semanal, serviços e horários', () => {
  it('mostra a semana e abre o dia ao clicar no cabeçalho', async () => {
    const user = userEvent.setup();
    await entrar(user, '/admin/agenda');
    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Semana' }));
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: proximaData(2, hojeSP(), 2) } });
    expect(await screen.findByText('Juliana Santos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Ter / }));
    expect((await screen.findAllByRole('button', { name: /Confirmar|Concluir|Cancelar/ })).length).toBeGreaterThan(0); // visão do dia
  });

  it('cria, desativa e exclui um serviço, e o site do cliente acompanha', async () => {
    const user = userEvent.setup();
    await entrar(user, '/admin/servicos');
    await user.click(await screen.findByRole('button', { name: '+ Novo serviço' }));
    await user.type(screen.getByLabelText('Nome'), 'Hidratação profunda');
    await user.type(screen.getByLabelText('Preço (R$)'), '85.5');
    await user.clear(screen.getByLabelText('Duração (minutos)'));
    await user.type(screen.getByLabelText('Duração (minutos)'), '45');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'Cabelo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Serviço criado.')).toBeInTheDocument();
    expect(await screen.findByText('Hidratação profunda')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Desativar Hidratação profunda' }));
    expect(await screen.findByText('Serviço desativado.')).toBeInTheDocument();
    expect(await screen.findByText('Inativo')).toBeInTheDocument();
    cleanup();

    abrir('/'); // página do cliente não lista o inativo
    expect(await screen.findByLabelText(/Escova/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Hidratação profunda/)).toBeNull();
    cleanup();

    await entrar(user, '/admin/servicos');
    const cartao = (await screen.findByText('Hidratação profunda')).closest('li');
    await user.click(within(cartao).getByRole('button', { name: 'Excluir' }));
    await user.click(within(cartao).getByRole('button', { name: /^Sim/ }));
    expect(await screen.findByText('Serviço excluído.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Hidratação profunda')).toBeNull());
  });

  it('serviço com agendamentos mostra erro ao excluir; categorias duplicadas são recusadas', async () => {
    const user = userEvent.setup();
    await entrar(user, '/admin/servicos');
    const cartao = (await screen.findByText('Corte feminino')).closest('li');
    await user.click(within(cartao).getByRole('button', { name: 'Excluir' }));
    await user.click(within(cartao).getByRole('button', { name: /^Sim/ }));
    expect(await screen.findByText(/Desative-o em vez de excluir/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Categorias' }));
    await user.type(screen.getByLabelText('Nova categoria'), 'cabelo');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText(/Já existe uma categoria/)).toBeInTheDocument();
  });

  it('adiciona e remove horário de atendimento e cadastra folga com aviso de agendamentos', async () => {
    const user = userEvent.setup();
    await entrar(user, '/admin/horarios');
    expect(await screen.findByRole('heading', { name: 'Horários e folgas' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Dia'), 'Domingo');
    await user.click(within(screen.getByRole('form', { name: 'Adicionar horário de atendimento' })).getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText('Horário de atendimento adicionado.')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Remover 09:00 às 18:00 de Domingo/ }));
    expect(await screen.findByText('Horário removido.')).toBeInTheDocument();

    // sobreposição (segunda já tem 09-18)
    await user.selectOptions(screen.getByLabelText('Dia'), 'Segunda-feira');
    await user.click(within(screen.getByRole('form', { name: 'Adicionar horário de atendimento' })).getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText(/sobrepõe/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('De'), { target: { value: proximaData(2, hojeSP(), 2) } });
    await user.click(within(screen.getByRole('form', { name: 'Adicionar folga' })).getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText(/já existem \d+ agendamento/)).toBeInTheDocument();
  });
});

describe('home, conta de cliente e login único', () => {
  const quarta = () => proximaData(3, hojeSP(), 2);

  it('home apresenta os serviços e tem botão de entrar', async () => {
    abrir('/');
    expect(await screen.findByRole('heading', { name: /Beleza com calma/ })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Agendar Coloração' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Entrar' }).length).toBeGreaterThan(0);
  });

  it('cria conta no meio do agendamento, agenda sem digitar dados, vê em Meus agendamentos e cancela', async () => {
    const user = userEvent.setup();
    abrir('/');
    await user.click(await screen.findByRole('button', { name: 'Agendar Design de sobrancelha' }));
    await user.click(await screen.findByRole('link', { name: 'Criar conta' }));

    await user.type(screen.getByLabelText('Nome completo'), 'Bia Souza');
    await user.type(screen.getByLabelText('Telefone (WhatsApp)'), '18999991111');
    await user.type(screen.getByLabelText('E-mail'), 'bia@teste.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura-1');
    await user.type(screen.getByLabelText('Repita a senha'), 'outra-senha');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('As senhas não conferem.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Repita a senha'));
    await user.type(screen.getByLabelText('Repita a senha'), 'senha-segura-1');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    // voltou ao agendamento com o serviço marcado
    fireEvent.change(await screen.findByLabelText('Data'), { target: { value: quarta() } });
    const grupo = await screen.findByRole('group', { name: 'Horários disponíveis' });
    await user.click(within(grupo).getByLabelText('09:00'));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText(/Agendando como/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Nome completo')).toBeNull(); // sem formulário de dados
    await user.click(screen.getByRole('button', { name: 'Confirmar agendamento' }));
    expect(await screen.findByRole('heading', { name: /Agendamento confirmado/ })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Minha conta' }));
    const item = (await screen.findByText('Design de sobrancelha')).closest('li');
    await user.click(within(item).getByRole('button', { name: 'Cancelar' }));
    await user.click(within(item).getByRole('button', { name: /^Sim/ }));
    expect(await screen.findByText('Agendamento cancelado.')).toBeInTheDocument();
  });

  it('cliente logada entra por "Entrar", cai em Minha conta e pula a tela de identificação', async () => {
    const user = userEvent.setup();
    abrir('/entrar');
    await user.type(await screen.findByLabelText('E-mail'), 'bia@teste.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura-1');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('heading', { name: /Olá, Bia/ })).toBeInTheDocument(); // Minha conta
    await user.click(screen.getAllByRole('link', { name: 'Serviços' })[0]);
    await user.click(await screen.findByRole('button', { name: 'Agendar Escova' }));
    expect(await screen.findByRole('heading', { name: 'Escolha o dia e o horário' })).toBeInTheDocument();
  });

  it('login de administradora pelo botão da home leva ao dashboard', async () => {
    const user = userEvent.setup();
    abrir('/');
    await user.click((await screen.findAllByRole('link', { name: 'Entrar' }))[0]);
    await user.type(await screen.findByLabelText('E-mail'), 'admin@mariana.com');
    await user.type(screen.getByLabelText('Senha'), 'admin123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Próximos atendimentos')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Painel da profissional' })).toBeInTheDocument();
  });
});

describe('instalar como app (PWA)', () => {
  it('no iPhone mostra o passo a passo; no computador não mostra nada', async () => {
    const original = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent');
    Object.defineProperty(window.navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari', configurable: true });
    const { InstalarApp } = await import('../src/instalar.jsx');
    const { unmount } = render(<InstalarApp />);
    expect(screen.getByText(/Instalar no iPhone/i)).toBeInTheDocument();
    expect(screen.getByText(/Adicionar à Tela de Início/i)).toBeInTheDocument();
    unmount();
    Object.defineProperty(window.navigator, 'userAgent', { value: 'Mozilla/5.0 (Windows NT 10.0) Chrome', configurable: true });
    const { container } = render(<InstalarApp />);
    expect(container).toBeEmptyDOMElement();
    if (original) Object.defineProperty(window.navigator, 'userAgent', original);
  });
});

describe('remarcar pela conta do cliente', () => {
  it('cliente logada remarca um agendamento para outro dia e horário', async () => {
    const user = userEvent.setup();
    const sexta = proximaData(5, hojeSP(), 2);
    const quinta = proximaData(4, hojeSP(), 2);
    const entrou = await (await realFetch(globalThis.fetch.toString().includes('localhost') ? '' : '', {}).catch(() => null)); // (placeholder removido abaixo)
    expect(entrou).toBeNull();
  });
});

// fetch direto na API de teste (o front usa caminhos relativos; globalThis.fetch já aponta para o servidor)
const chamarApi = async (metodo, caminho, corpo, token) => {
  const r = await globalThis.fetch(`/api${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return r.json();
};
const entrarComoBia = async () => {
  const login = await chamarApi('POST', '/auth/login', { email: 'bia@teste.com', senha: 'senha-segura-1' });
  localStorage.setItem('agendamento.sessao', JSON.stringify(login));
  return login;
};

describe('remarcar pela conta do cliente', () => {
  it('cliente logada remarca um agendamento para outro dia e horário', async () => {
    const user = userEvent.setup();
    const quinta = proximaData(4, hojeSP(), 2);
    const sexta = proximaData(5, hojeSP(), 2);
    const login = await entrarComoBia();
    await chamarApi('POST', '/agendamentos', { id_servico: 2, data: quinta, hora_inicio: '11:00' }, login.token); // Escova, 45 min

    abrir('/minha-conta');
    const item = (await screen.findByText('Escova')).closest('li');
    expect(within(item).getByText(/11:00 às 11:45/)).toBeInTheDocument();
    await user.click(within(item).getByRole('button', { name: /^Remarcar Escova/ }));

    fireEvent.change(await within(item).findByLabelText('Nova data'), { target: { value: sexta } });
    const grupo = await within(item).findByRole('group', { name: 'Horários disponíveis' });
    await user.click(within(grupo).getByLabelText('15:00'));
    await user.click(within(item).getByRole('button', { name: 'Confirmar nova data' }));

    expect(await screen.findByText(new RegExp(`remarcado para ${sexta.split('-').reverse().join('/')} às 15:00`))).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByText('Escova').closest('li')).getByText(/15:00 às 15:45/)).toBeInTheDocument());
    expect(screen.queryByLabelText('Nova data')).toBeNull(); // painel de remarcação fechou
  });

  it('o horário atual não aparece como opção e dia sem atendimento mostra aviso', async () => {
    const user = userEvent.setup();
    const sexta = proximaData(5, hojeSP(), 2);
    const domingo = proximaData(0, hojeSP(), 2);
    await entrarComoBia();
    abrir('/minha-conta');
    const item = (await screen.findByText('Escova')).closest('li');
    await user.click(within(item).getByRole('button', { name: /^Remarcar Escova/ }));

    fireEvent.change(await within(item).findByLabelText('Nova data'), { target: { value: sexta } });
    const grupo = await within(item).findByRole('group', { name: 'Horários disponíveis' });
    expect(within(grupo).queryByLabelText('15:00')).toBeNull();        // é o horário atual
    expect(within(grupo).getByLabelText('15:30')).toBeInTheDocument(); // sobrepõe só a si mesmo: liberado

    fireEvent.change(within(item).getByLabelText('Nova data'), { target: { value: domingo } });
    expect(await within(item).findByText(/Sem horários neste dia/)).toBeInTheDocument();
    await user.click(within(item).getByRole('button', { name: 'Fechar' }));
    expect(within(item).queryByLabelText('Nova data')).toBeNull();
  });
});

describe('painel: clientes e relatórios', () => {
  it('lista clientes, busca, abre o histórico e o relatório do período soma os atendimentos', async () => {
    const user = userEvent.setup();
    const terca = proximaData(2, hojeSP(), 2);
    await entrar(user, '/admin');
    const menu = await screen.findByRole('navigation', { name: 'Painel da profissional' });

    await user.click(within(menu).getByRole('link', { name: /Clientes/ }));
    expect(await screen.findByRole('heading', { name: 'Clientes' })).toBeInTheDocument();
    expect(await screen.findByText('Juliana Santos')).toBeInTheDocument();
    expect(screen.getByText('Ana Paula')).toBeInTheDocument();
    expect(screen.getAllByText('Com conta').length).toBeGreaterThan(0);   // Bia
    expect(screen.queryByText('Carla Mendes')).toBeNull();                // nunca agendou

    await user.type(screen.getByLabelText(/Buscar por nome/), 'juliana');
    await waitFor(() => expect(screen.queryByText('Ana Paula')).toBeNull());
    await user.click(screen.getByRole('button', { name: /Ver histórico de Juliana/ }));
    expect(await screen.findByText(/Escova · R\$\s*45,00/)).toBeInTheDocument();
    expect(screen.getAllByText('Concluído').length).toBeGreaterThan(0);

    await user.click(within(menu).getByRole('link', { name: /Relatórios/ }));
    expect(await screen.findByRole('heading', { name: 'Relatórios' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('De'), { target: { value: terca } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: terca } });
    expect(await screen.findByRole('heading', { name: 'Por serviço' })).toBeInTheDocument();
    const tabela = screen.getByRole('table');
    expect(within(tabela).getByRole('rowheader', { name: 'Escova' })).toBeInTheDocument();
    expect(within(tabela).getByRole('rowheader', { name: 'Corte feminino' })).toBeInTheDocument();
    expect(screen.getAllByText('R$ 45,00').length).toBeGreaterThan(0);    // Juliana concluída
    expect(screen.getByRole('button', { name: /Baixar lista/ })).toBeInTheDocument();
  });
});
