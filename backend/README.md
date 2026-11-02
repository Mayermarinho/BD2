# Backend — API REST (Node.js + Express + PostgreSQL)

## Como rodar

```bash
cd backend
npm install
cp .env.example .env        # Windows (PowerShell): copy .env.example .env
# edite o .env: DATABASE_URL (MySQL) e JWT_SECRET
npm run dev                 # API em http://localhost:3001/api/saude
npm run demo                # sem banco: dados fictícios em memória
npm test                    # testes (não precisam de banco)
```

> **Nunca** faça commit do `.env` (ele já está no `.gitignore`). O repositório é público e a
> `DATABASE_URL` contém a senha do banco.

Pré-requisitos: Node 18.11+ e o banco criado com `database/mysql/` (scripts 01, 02 e 03 — ver o README de lá).

## Endpoints

### Públicos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/saude` | Verifica API + banco |
| GET | `/api/servicos` | Serviços ativos com categoria |
| GET | `/api/disponibilidade?servico=1&data=2026-10-06` | Horários livres (`["09:00","12:30",...]`) |
| POST | `/api/agendamentos` | Cria agendamento. **409** se o horário não estiver livre |
| POST | `/api/agendamentos/:id/cancelar` | Cliente cancela informando o telefone usado |

Corpo do `POST /api/agendamentos`:
```json
{
  "id_servico": 1,
  "data": "2026-10-06",
  "hora_inicio": "14:00",
  "cliente": { "nome": "Nova Cliente", "telefone": "(18) 95555-1234", "email": "opcional@x.com" },
  "observacao": "opcional"
}
```

### Painel administrativo (header `Authorization: Bearer <token>`)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | `{ "email", "senha" }` → `{ token, usuario }`. **Login único:** `usuario.tipo` é `admin` (profissional) ou `cliente` |
| GET | `/api/admin/agenda?inicio=AAAA-MM-DD&fim=AAAA-MM-DD` | Agenda do período |
| POST | `/api/clientes/cadastro` | Cria conta de cliente (`nome`, `telefone`, `email`, `senha` ≥ 8) e devolve `token` |
| GET | `/api/cliente/perfil` · `/api/cliente/agendamentos` | Área do cliente (token de cliente) |
| POST | `/api/cliente/agendamentos/:id/cancelar` | Cancela sem pedir telefone |
| GET | `/api/admin/resumo` | Dashboard: hoje, 7 dias, pendentes, próximos |
| GET/POST/PUT/DELETE | `/api/admin/servicos[/:id]` | Serviços (inclui inativos) |
| GET/POST/PUT/DELETE | `/api/admin/categorias[/:id]` | Categorias |
| GET/POST/DELETE | `/api/admin/horarios[/:id]` | Janelas de atendimento (`dia_semana` 0–6) |
| GET/POST/DELETE | `/api/admin/bloqueios[/:id]` | Folgas e feriados (POST devolve `agendamentos_afetados`) |
| PATCH | `/api/admin/agendamentos/:id` | `{ "status": "CONFIRMADO\|CONCLUIDO\|CANCELADO", "motivo_cancelamento": "..." }` |

Transições permitidas: `PENDENTE → CONFIRMADO/CANCELADO`, `CONFIRMADO → CONCLUIDO/CANCELADO`.

## Regras implementadas
- Horários calculados a partir de `horario_disponivel`, descontando `bloqueio_agenda` e agendamentos não cancelados; nunca no passado e respeitando a antecedência mínima (hoje).
- Cliente identificado pelo telefone (somente dígitos); o mesmo telefone reaproveita o cadastro.
- Conflitos: a API confere a disponibilidade e o **trigger do banco** é a palavra final (erro 1644 → HTTP 409). Cada reserva roda em transação `READ COMMITTED` com `SELECT ... FOR UPDATE` na profissional, para que reservas simultâneas não passem juntas.
- `preco_cobrado` grava o preço vigente na criação.
- Login com bcrypt + JWT (8 h) e limite de tentativas.

## Configurações (`.env`)
`STATUS_INICIAL` (`CONFIRMADO`/`PENDENTE`), `PASSO_MINUTOS`, `ANTECEDENCIA_MINUTOS`, `CORS_ORIGIN`, `PORT`.

## Arquitetura e verificação
- `src/repos/mysql.js`: **toda** a SQL do sistema (MySQL). `src/repos/memoria.js`: mesma interface, em memória (testes e modo demo).
- Regras (`src/disponibilidade.js`, `src/slots.js`, rotas) não dependem do banco.
- `npm test`: 46 testes — cálculo de horários e a API via HTTP (disponibilidade, criação, conflitos, requisições simultâneas, cancelamento, login, agenda, status, conta de cliente, remarcar, clientes e relatórios).
- ✅ **`repos/mysql.js` verificado contra um MySQL real** (02/11/2026): `npm run verificar` passou nas 22 verificações. Ficaram fora do roteiro automático o dashboard (`/api/admin/resumo`) e o CRUD de categorias: confira pela tela do painel.
