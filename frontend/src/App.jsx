import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { InstalarApp } from './instalar.jsx';
import { marca } from './marca.js';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Agenda from './pages/admin/Agenda.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Horarios from './pages/admin/Horarios.jsx';
import Servicos from './pages/admin/Servicos.jsx';
import Agendar from './pages/Agendar.jsx';
import Cadastro from './pages/Cadastro.jsx';
import CancelarAgendamento from './pages/CancelarAgendamento.jsx';
import Home from './pages/Home.jsx';
import Identificar from './pages/Identificar.jsx';
import Login from './pages/Login.jsx';
import MinhaConta from './pages/MinhaConta.jsx';

function RotaAdmin({ children }) {
  const { sessao, ehAdmin } = useAuth();
  const { pathname } = useLocation();
  if (!sessao) return <Navigate to="/entrar" replace state={{ de: pathname }} />;
  return ehAdmin ? children : <Navigate to="/minha-conta" replace />;
}

function RotaCliente({ children }) {
  const { sessao, ehCliente } = useAuth();
  const { pathname } = useLocation();
  if (!sessao) return <Navigate to="/entrar" replace state={{ de: pathname }} />;
  return ehCliente ? children : <Navigate to="/admin" replace />;
}

export default function App() {
  const { pathname, hash } = useLocation();
  const { sessao, ehAdmin, ehCliente, sair } = useAuth();
  const noPainel = pathname.startsWith('/admin') && ehAdmin;
  const home = pathname === '/';

  // Leitores de tela: avisa a troca de página e leva o foco para o conteúdo (ou para a âncora da home)
  useEffect(() => {
    const alvo = hash ? document.getElementById(hash.slice(1)) : null;
    if (alvo) { alvo.scrollIntoView?.(); alvo.focus?.({ preventScroll: true }); return; }
    document.getElementById('conteudo')?.focus();
    window.scrollTo?.(0, 0);
  }, [pathname, hash]);

  // O painel da profissional usa fundo neutro (sem azul/desenhos), para trabalhar sem distração
  useEffect(() => { document.body.classList.toggle('painel', noPainel); }, [noPainel]);

  const classeMain = noPainel ? 'conteudo conteudo--largo' : home ? 'conteudo conteudo--home' : 'conteudo';

  return (
    <>
      <a className="pular" href="#conteudo">Pular para o conteúdo</a>
      <header className="topo">
        <div className={noPainel ? 'topo__interno topo__interno--largo' : 'topo__interno'}>
          <Link to="/" className="marca"><span className="marca__logo" aria-hidden="true">{marca.nome.charAt(0)}</span>{marca.nome}</Link>
          <nav aria-label="Principal" className="topo__nav">
            {!noPainel && <Link to="/#servicos" className="topo__item">Serviços</Link>}
            {!noPainel && <Link to="/#contato" className="topo__item topo__item--oculto-movel">Contato</Link>}
            {!sessao && <Link to="/entrar" className="btn btn--contorno">Entrar</Link>}
            {ehCliente && <Link to="/minha-conta" className="topo__item">Meus agendamentos</Link>}
            {ehAdmin && !noPainel && <Link to="/admin" className="topo__item">Painel</Link>}
            {sessao && <span className="topo__usuario topo__item--oculto-movel">{sessao.usuario.nome}</span>}
            {sessao && <button type="button" className="btn btn--link" onClick={sair}>Sair</button>}
          </nav>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1} className={classeMain}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agendar/identificar" element={<Identificar />} />
          <Route path="/agendar" element={<Agendar />} />
          <Route path="/cancelar" element={<CancelarAgendamento />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/minha-conta" element={<RotaCliente><MinhaConta /></RotaCliente>} />
          <Route path="/admin/login" element={<Navigate to="/entrar" replace />} />
          <Route path="/admin" element={<RotaAdmin><AdminLayout /></RotaAdmin>}>
            <Route index element={<Dashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="servicos" element={<Servicos />} />
            <Route path="horarios" element={<Horarios />} />
          </Route>
          <Route path="*" element={<p>Página não encontrada. <Link to="/">Voltar ao início</Link></p>} />
        </Routes>
      </main>

      <footer className="rodape">
        <span>© {marca.nome} · {marca.contato.cidade}</span>
        <span className="rodape__sep" aria-hidden="true">·</span>
        <Link to="/cancelar">Cancelar horário sem conta</Link>
        <span className="rodape__sep" aria-hidden="true">·</span>
        <span>Projeto Integrador UNIVESP · Grupo 4</span>
        {!noPainel && <InstalarApp />}
      </footer>
    </>
  );
}
