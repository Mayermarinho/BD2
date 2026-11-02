import { NavLink, Outlet } from 'react-router-dom';

const ITENS = [
  { para: '/admin', rotulo: 'Painel', icone: '🏠', fim: true },
  { para: '/admin/agenda', rotulo: 'Agenda', icone: '📅' },
  { para: '/admin/servicos', rotulo: 'Serviços', icone: '✂️' },
  { para: '/admin/horarios', rotulo: 'Horários e folgas', icone: '🕘' },
  { para: '/admin/clientes', rotulo: 'Clientes', icone: '👥' },
  { para: '/admin/relatorios', rotulo: 'Relatórios', icone: '📊' },
];

export default function AdminLayout() {
  return (
    <div className="admin">
      <nav className="admin__menu" aria-label="Painel da profissional">
        <ul>
          {ITENS.map((i) => (
            <li key={i.para}>
              <NavLink to={i.para} end={i.fim} className={({ isActive }) => (isActive ? 'admin__link admin__link--ativo' : 'admin__link')}>
                <span aria-hidden="true">{i.icone}</span> {i.rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="admin__conteudo"><Outlet /></div>
    </div>
  );
}
