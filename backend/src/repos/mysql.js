// Acesso ao MySQL. Toda a SQL do sistema fica neste arquivo.
// Tabelas: ver database/mysql/*.sql
import { ConflitoError } from '../erros.js';

const DIAS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']; // ENUM de horario_disponivel
const HORA = (c) => `TIME_FORMAT(${c}, '%H:%i')`;
const SO_DIGITOS = (c) => `REGEXP_REPLACE(${c}, '[^0-9]', '')`;

// O trigger do banco usa SIGNAL SQLSTATE '45000' (errno 1644) quando há conflito de horário.
const ehConflito = (e) => e?.errno === 1644 || e?.sqlState === '45000';
const ehDuplicado = (e) => e?.errno === 1062;   // ER_DUP_ENTRY
const ehEmUso = (e) => e?.errno === 1451;       // ER_ROW_IS_REFERENCED_2 (FK)
const paraServico = (r) => (r ? { ...r, ativo: Boolean(r.ativo) } : null);

function consultas(ex) {
  const q = async (sql, params = []) => (await ex.query(sql, params))[0];
  return {
    async ping() { await q('SELECT 1'); },

    listarServicos: () => q(
      `SELECT s.id_servico, s.nome, s.descricao, s.preco, s.duracao_minutos,
              c.id_categoria, c.nome AS categoria
         FROM servico s LEFT JOIN categoria_servico c ON c.id_categoria = s.id_categoria
        WHERE s.ativo = TRUE
        ORDER BY c.nome IS NULL, c.nome, s.nome`),

    async obterServicoAtivo(id) {
      const rows = await q(
        'SELECT id_servico, id_profissional, duracao_minutos, preco FROM servico WHERE id_servico = ? AND ativo = TRUE', [id]);
      return rows[0] ?? null;
    },

    async bloqueioNoDia(idProfissional, data) {
      const rows = await q(
        `SELECT motivo FROM bloqueio_agenda
          WHERE id_profissional = ? AND ? BETWEEN data_inicio AND data_fim LIMIT 1`, [idProfissional, data]);
      return rows[0] ?? null;
    },

    janelasDoDia: (idProfissional, diaSemana) => q(
      `SELECT ${HORA('hora_inicio')} AS hora_inicio, ${HORA('hora_fim')} AS hora_fim
         FROM horario_disponivel WHERE id_profissional = ? AND dia_semana = ?
        ORDER BY horario_disponivel.hora_inicio`, [idProfissional, DIAS[diaSemana]]),

    ocupadosDoDia: (idProfissional, data, ignorarId = null) => q(
      `SELECT ${HORA('hora_inicio')} AS hora_inicio, ${HORA('hora_fim')} AS hora_fim
         FROM agendamento
        WHERE id_profissional = ? AND data_agendamento = ? AND status <> 'CANCELADO'
          AND id_agendamento <> ?`, [idProfissional, data, ignorarId ?? 0]),

    async cancelarPeloCliente({ id, telefone, motivo }) {
      const r = await ex.query(
        `UPDATE agendamento a JOIN cliente c ON c.id_cliente = a.id_cliente
            SET a.status = 'CANCELADO', a.motivo_cancelamento = ?, a.data_cancelamento = NOW()
          WHERE a.id_agendamento = ? AND ${SO_DIGITOS('c.telefone')} = ?
            AND a.status IN ('PENDENTE','CONFIRMADO')`, [motivo, id, telefone]);
      return r[0].affectedRows > 0;
    },


    // ===== Conta de cliente (opcional) — exige database/mysql/04_conta_cliente.sql =====
    async buscarContaPorEmail(email) {
      const rows = await q(
        `SELECT k.id_conta, k.id_cliente, c.nome, c.telefone, k.email, k.senha_hash
           FROM conta_cliente k JOIN cliente c ON c.id_cliente = k.id_cliente WHERE k.email = ?`, [email]);
      return rows[0] ?? null;
    },

    async criarConta({ nome, telefone, email, senha_hash }) {
      const c = await ex.query('INSERT INTO cliente (nome, telefone, email) VALUES (?, ?, ?)', [nome, telefone, email]);
      try {
        const k = await ex.query('INSERT INTO conta_cliente (id_cliente, email, senha_hash) VALUES (?, ?, ?)', [c[0].insertId, email, senha_hash]);
        return { id_conta: k[0].insertId, id_cliente: c[0].insertId, nome, telefone, email };
      } catch (e) {
        if (ehDuplicado(e)) throw new ConflitoError('Já existe uma conta com este e-mail.');
        throw e;
      }
    },

    async obterPerfilCliente(idCliente) {
      const rows = await q(
        `SELECT c.id_cliente, c.nome, c.telefone, k.email
           FROM cliente c JOIN conta_cliente k ON k.id_cliente = c.id_cliente WHERE c.id_cliente = ?`, [idCliente]);
      return rows[0] ?? null;
    },

    agendamentosDoCliente: (idCliente) => q(
      `SELECT a.id_agendamento, a.data_agendamento, ${HORA('a.hora_inicio')} AS hora_inicio,
              ${HORA('a.hora_fim')} AS hora_fim, a.status, s.id_servico, s.nome AS servico,
              COALESCE(a.preco_cobrado, s.preco) AS preco
         FROM agendamento a JOIN servico s ON s.id_servico = a.id_servico
        WHERE a.id_cliente = ? ORDER BY a.data_agendamento DESC, a.hora_inicio DESC`, [idCliente]),

    async cancelarDoCliente({ id, idCliente, motivo }) {
      const r = await ex.query(
        `UPDATE agendamento SET status = 'CANCELADO', motivo_cancelamento = ?, data_cancelamento = NOW()
          WHERE id_agendamento = ? AND id_cliente = ? AND status IN ('PENDENTE','CONFIRMADO')`, [motivo, id, idCliente]);
      return r[0].affectedRows > 0;
    },

    // Remarcar: dados do agendamento (com a duração do serviço). Quem chama confere se tem direito a ele.
    async obterAgendamentoParaRemarcar(id) {
      const rows = await q(
        `SELECT a.id_agendamento, a.id_cliente, a.id_profissional, a.id_servico, a.data_agendamento,
                ${HORA('a.hora_inicio')} AS hora_inicio, ${HORA('a.hora_fim')} AS hora_fim, a.status,
                s.nome AS servico, s.duracao_minutos, s.ativo, c.nome AS cliente, c.telefone AS telefone_cliente
           FROM agendamento a JOIN servico s ON s.id_servico = a.id_servico
           JOIN cliente c ON c.id_cliente = a.id_cliente
          WHERE a.id_agendamento = ?`, [id]);
      return rows[0] ? { ...rows[0], ativo: Boolean(rows[0].ativo) } : null;
    },

    async buscarUsuarioPorEmail(email) {
      const rows = await q(
        `SELECT id_usuario, id_profissional, nome, email, senha_hash, perfil
           FROM usuario WHERE LOWER(email) = ?`, [email]);
      return rows[0] ?? null;
    },

    agendaDoPeriodo: (idProfissional, inicio, fim) => q(
      `SELECT a.id_agendamento, a.data_agendamento, ${HORA('a.hora_inicio')} AS hora_inicio,
              ${HORA('a.hora_fim')} AS hora_fim, a.status, a.observacao,
              c.id_cliente, c.nome AS cliente, c.telefone AS telefone_cliente,
              s.id_servico, s.nome AS servico, COALESCE(a.preco_cobrado, s.preco) AS preco
         FROM agendamento a
         JOIN cliente c ON c.id_cliente = a.id_cliente
         JOIN servico s ON s.id_servico = a.id_servico
        WHERE a.id_profissional = ? AND a.data_agendamento BETWEEN ? AND ?
        ORDER BY a.data_agendamento, a.hora_inicio`, [idProfissional, inicio, fim]),

    // Clientes que já agendaram com a profissional (com ou sem conta)
    async listarClientesDaProfissional(idProfissional) {
      const rows = await q(
        `SELECT c.id_cliente, c.nome, c.telefone, c.email,
                EXISTS (SELECT 1 FROM conta_cliente k WHERE k.id_cliente = c.id_cliente) AS tem_conta
           FROM cliente c
          WHERE EXISTS (SELECT 1 FROM agendamento a WHERE a.id_cliente = c.id_cliente AND a.id_profissional = ?)
          ORDER BY c.nome`, [idProfissional]);
      return rows.map((r) => ({ ...r, tem_conta: Boolean(r.tem_conta) }));
    },

    async statusDoAgendamento(id, idProfissional) {
      const rows = await q('SELECT status FROM agendamento WHERE id_agendamento = ? AND id_profissional = ?', [id, idProfissional]);
      return rows[0]?.status ?? null;
    },

    async atualizarStatus({ id, status, motivo }) {
      try {
        await q(
          `UPDATE agendamento SET status = ?, motivo_cancelamento = ?,
                  data_cancelamento = CASE WHEN ? = 'CANCELADO' THEN NOW() ELSE NULL END
            WHERE id_agendamento = ?`, [status, motivo, status, id]);
      } catch (e) {
        if (ehConflito(e)) throw new ConflitoError('Conflito de horário ao alterar o agendamento.');
        throw e;
      }
    },

    // ===== Painel: serviços =====
    async listarServicosAdmin(idProfissional) {
      const rows = await q(
        `SELECT s.id_servico, s.id_categoria, c.nome AS categoria, s.nome, s.descricao, s.preco,
                s.duracao_minutos, s.ativo
           FROM servico s LEFT JOIN categoria_servico c ON c.id_categoria = s.id_categoria
          WHERE s.id_profissional = ? ORDER BY s.ativo DESC, s.nome`, [idProfissional]);
      return rows.map(paraServico);
    },

    async obterServicoAdmin(id, idProfissional) {
      const rows = await q(
        `SELECT s.id_servico, s.id_categoria, c.nome AS categoria, s.nome, s.descricao, s.preco,
                s.duracao_minutos, s.ativo
           FROM servico s LEFT JOIN categoria_servico c ON c.id_categoria = s.id_categoria
          WHERE s.id_servico = ? AND s.id_profissional = ?`, [id, idProfissional]);
      return paraServico(rows[0]);
    },

    async criarServico(idProfissional, d) {
      const r = await ex.query(
        `INSERT INTO servico (id_profissional, id_categoria, nome, descricao, preco, duracao_minutos, ativo)
         VALUES (?,?,?,?,?,?,?)`,
        [idProfissional, d.id_categoria, d.nome, d.descricao, d.preco, d.duracao_minutos, d.ativo]);
      return this.obterServicoAdmin(r[0].insertId, idProfissional);
    },

    async atualizarServico(id, idProfissional, d) {
      if (!(await this.obterServicoAdmin(id, idProfissional))) return null;
      await q(
        `UPDATE servico SET id_categoria = ?, nome = ?, descricao = ?, preco = ?, duracao_minutos = ?, ativo = ?
          WHERE id_servico = ? AND id_profissional = ?`,
        [d.id_categoria, d.nome, d.descricao, d.preco, d.duracao_minutos, d.ativo, id, idProfissional]);
      return this.obterServicoAdmin(id, idProfissional);
    },

    async excluirServico(id, idProfissional) {
      try {
        const r = await ex.query('DELETE FROM servico WHERE id_servico = ? AND id_profissional = ?', [id, idProfissional]);
        return r[0].affectedRows > 0;
      } catch (e) {
        if (ehEmUso(e)) throw new ConflitoError('Este serviço já tem agendamentos. Desative-o em vez de excluir.');
        throw e;
      }
    },

    // ===== Painel: categorias =====
    listarCategorias: () => q(
      `SELECT c.id_categoria, c.nome, COUNT(s.id_servico) AS qtd_servicos
         FROM categoria_servico c LEFT JOIN servico s ON s.id_categoria = c.id_categoria
        GROUP BY c.id_categoria, c.nome ORDER BY c.nome`),

    async categoriaExiste(id) {
      return (await q('SELECT 1 AS ok FROM categoria_servico WHERE id_categoria = ?', [id])).length > 0;
    },

    async criarCategoria(nome) {
      try {
        const r = await ex.query('INSERT INTO categoria_servico (nome) VALUES (?)', [nome]);
        return { id_categoria: r[0].insertId, nome, qtd_servicos: 0 };
      } catch (e) {
        if (ehDuplicado(e)) throw new ConflitoError('Já existe uma categoria com esse nome.');
        throw e;
      }
    },

    async atualizarCategoria(id, nome) {
      if (!(await this.categoriaExiste(id))) return null;
      try { await q('UPDATE categoria_servico SET nome = ? WHERE id_categoria = ?', [nome, id]); }
      catch (e) {
        if (ehDuplicado(e)) throw new ConflitoError('Já existe uma categoria com esse nome.');
        throw e;
      }
      return { id_categoria: id, nome };
    },

    async excluirCategoria(id) {
      const r = await ex.query('DELETE FROM categoria_servico WHERE id_categoria = ?', [id]); // serviços ficam sem categoria (SET NULL)
      return r[0].affectedRows > 0;
    },

    // ===== Painel: horários de atendimento =====
    async listarHorarios(idProfissional) {
      const rows = await q(
        `SELECT id_horario, dia_semana, ${HORA('hora_inicio')} AS hora_inicio, ${HORA('hora_fim')} AS hora_fim
           FROM horario_disponivel WHERE id_profissional = ?
          ORDER BY FIELD(dia_semana,'Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'), horario_disponivel.hora_inicio`,
        [idProfissional]);
      return rows.map((r) => ({ ...r, dia_semana: DIAS.indexOf(r.dia_semana) }));
    },

    async criarHorario(idProfissional, { dia_semana, hora_inicio, hora_fim }) {
      const r = await ex.query(
        'INSERT INTO horario_disponivel (id_profissional, dia_semana, hora_inicio, hora_fim) VALUES (?,?,?,?)',
        [idProfissional, DIAS[dia_semana], hora_inicio, hora_fim]);
      return { id_horario: r[0].insertId, dia_semana, hora_inicio, hora_fim };
    },

    async excluirHorario(id, idProfissional) {
      const r = await ex.query('DELETE FROM horario_disponivel WHERE id_horario = ? AND id_profissional = ?', [id, idProfissional]);
      return r[0].affectedRows > 0;
    },

    // ===== Painel: folgas e feriados =====
    listarBloqueios: (idProfissional, aPartirDe) => q(
      `SELECT id_bloqueio, data_inicio, data_fim, motivo FROM bloqueio_agenda
        WHERE id_profissional = ? AND data_fim >= ? ORDER BY data_inicio`, [idProfissional, aPartirDe]),

    async criarBloqueio(idProfissional, { data_inicio, data_fim, motivo }) {
      const r = await ex.query(
        'INSERT INTO bloqueio_agenda (id_profissional, data_inicio, data_fim, motivo) VALUES (?,?,?,?)',
        [idProfissional, data_inicio, data_fim, motivo]);
      return { id_bloqueio: r[0].insertId, data_inicio, data_fim, motivo };
    },

    async excluirBloqueio(id, idProfissional) {
      const r = await ex.query('DELETE FROM bloqueio_agenda WHERE id_bloqueio = ? AND id_profissional = ?', [id, idProfissional]);
      return r[0].affectedRows > 0;
    },

    async contarAgendamentosAtivos(idProfissional, inicio, fim) {
      const rows = await q(
        `SELECT COUNT(*) AS n FROM agendamento
          WHERE id_profissional = ? AND data_agendamento BETWEEN ? AND ? AND status IN ('PENDENTE','CONFIRMADO')`,
        [idProfissional, inicio, fim]);
      return Number(rows[0].n);
    },

    // --- usados somente dentro de transacao() ---
    async travarProfissional(id) {
      // Serializa as reservas da mesma profissional (o trigger sozinho não é seguro contra concorrência).
      await q('SELECT id_profissional FROM profissional WHERE id_profissional = ? FOR UPDATE', [id]);
    },

    async upsertCliente({ nome, telefone, email }) {
      // clientes com conta (tabela conta_cliente) nunca são reaproveitados por agendamentos sem conta
      const rows = await q(
        `SELECT id_cliente FROM cliente
          WHERE ${SO_DIGITOS('telefone')} = ?
            AND NOT EXISTS (SELECT 1 FROM conta_cliente k WHERE k.id_cliente = cliente.id_cliente) LIMIT 1`, [telefone]);
      if (rows.length) {
        if (email) await q('UPDATE cliente SET email = COALESCE(email, ?) WHERE id_cliente = ?', [email, rows[0].id_cliente]);
        return rows[0].id_cliente;
      }
      const r = await ex.query('INSERT INTO cliente (nome, telefone, email) VALUES (?, ?, ?)', [nome, telefone, email]);
      return r[0].insertId;
    },

    async remarcarAgendamento({ id, data, hora_inicio, hora_fim, status }) {
      try {
        await q(
          `UPDATE agendamento SET data_agendamento = ?, hora_inicio = ?, hora_fim = ?, status = ?
            WHERE id_agendamento = ? AND status IN ('PENDENTE','CONFIRMADO')`, [data, hora_inicio, hora_fim, status, id]);
      } catch (e) {
        if (ehConflito(e)) throw new ConflitoError(); // trigger trg_impede_conflito_horario_update
        throw e;
      }
      const rows = await q(
        `SELECT id_agendamento, data_agendamento, ${HORA('hora_inicio')} AS hora_inicio,
                ${HORA('hora_fim')} AS hora_fim, status
           FROM agendamento WHERE id_agendamento = ?`, [id]);
      return rows[0];
    },

    async inserirAgendamento(a) {
      let id;
      try {
        const r = await ex.query(
          `INSERT INTO agendamento
             (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim,
              preco_cobrado, status, observacao)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [a.id_cliente, a.id_servico, a.id_profissional, a.data, a.hora_inicio, a.hora_fim,
           a.preco_cobrado, a.status, a.observacao]);
        id = r[0].insertId;
      } catch (e) {
        if (ehConflito(e)) throw new ConflitoError();
        throw e;
      }
      const rows = await q(
        `SELECT id_agendamento, data_agendamento, ${HORA('hora_inicio')} AS hora_inicio,
                ${HORA('hora_fim')} AS hora_fim, status, preco_cobrado
           FROM agendamento WHERE id_agendamento = ?`, [id]);
      return rows[0];
    },
  };
}

export function criarRepoMysql(pool) {
  return {
    ...consultas(pool),
    async transacao(fn) {
      const conn = await pool.getConnection();
      try {
        // READ COMMITTED é essencial: no padrão (REPEATABLE READ) a leitura feita antes do FOR UPDATE
        // fixaria um "retrato" antigo do banco, e o trigger anti-conflito não enxergaria a reserva
        // que acabou de ser confirmada por outra requisição.
        await conn.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
        await conn.beginTransaction();
        const resultado = await fn(consultas(conn));
        await conn.commit();
        return resultado;
      } catch (e) {
        await conn.rollback().catch(() => {});
        throw e;
      } finally {
        conn.release();
      }
    },
  };
}
