-- ==========================================================================
-- TESTE DO TRIGGER DE CONFLITO DE HORÁRIO (não faz parte da criação do banco)
-- Rode DEPOIS dos scripts 01 a 04. Use o banco de desenvolvimento.
--
-- COMO RODAR: execute UM COMANDO POR VEZ (cursor no comando e Ctrl+Enter no
-- DBeaver ou no Workbench). NÃO use "executar script inteiro" (Alt+X): o script
-- pararia no primeiro erro, e os erros aqui são propositais.
-- Tire um print do resultado de cada teste para o Relatório.
--
-- Agendamentos que já existem (script 01), profissional 1, dia 2026-10-06:
--     id 1  10:00 - 11:00  (Corte feminino, Ana Paula)
--     id 2  11:30 - 12:15  (Escova, Juliana)
-- Regra: dois agendamentos NÃO CANCELADOS da mesma profissional, no mesmo dia, não
-- podem se sobrepor. Terminar exatamente quando o outro começa NÃO é conflito.
-- ==========================================================================
USE sistema_agendamento;

-- Situação inicial (deve mostrar os 2 agendamentos do script 01)
SELECT id_agendamento, data_agendamento, hora_inicio, hora_fim, status
  FROM agendamento
 WHERE data_agendamento = '2026-10-06'
 ORDER BY hora_inicio;

-- ---------- PARTE A: devem DAR ERRO (o trigger bloqueia) ----------
-- Erro esperado em todos: Error Code: 1644. ERRO: Conflito de horário! Esta profissional já possui agendamento neste intervalo.

-- A1. Mesmo horário do agendamento 1 (10:00-11:00)
INSERT INTO agendamento (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim, status)
VALUES (3, 1, 1, '2026-10-06', '10:00', '11:00', 'CONFIRMADO');

-- A2. Começa antes e termina dentro do agendamento 1 (09:30-10:30)
INSERT INTO agendamento (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim, status)
VALUES (3, 1, 1, '2026-10-06', '09:30', '10:30', 'CONFIRMADO');

-- A3. Começa dentro do agendamento 1 e termina depois dele (10:30-11:30)
INSERT INTO agendamento (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim, status)
VALUES (3, 1, 1, '2026-10-06', '10:30', '11:30', 'CONFIRMADO');

-- A4. Totalmente dentro do agendamento 1 (10:15-10:45)
INSERT INTO agendamento (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim, status)
VALUES (3, 4, 1, '2026-10-06', '10:15', '10:45', 'CONFIRMADO');

-- A5. Cobre o agendamento 2 por inteiro (11:00-12:30)
INSERT INTO agendamento (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim, status)
VALUES (3, 1, 1, '2026-10-06', '11:00', '12:30', 'CONFIRMADO');

-- ---------- PARTE B: devem FUNCIONAR (1 row(s) affected) ----------

-- B1. Agendamento válido em horário livre (14:00-15:00)  <- "Teste 3" do relatório
INSERT INTO agendamento (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim, status, observacao)
VALUES (3, 1, 1, '2026-10-06', '14:00', '15:00', 'CONFIRMADO', '[TESTE-TRIGGER]');
SET @id_valido = LAST_INSERT_ID();

-- B2. Encostado: começa 11:00, exatamente quando o agendamento 1 termina, e termina às 11:30, quando o 2 começa
INSERT INTO agendamento (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim, status, observacao)
VALUES (3, 4, 1, '2026-10-06', '11:00', '11:30', 'CONFIRMADO', '[TESTE-TRIGGER]');

-- B3. Mesmo horário de outro dia (10:00-11:00 em 2026-10-07): conflito é só no mesmo dia
INSERT INTO agendamento (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim, status, observacao)
VALUES (3, 1, 1, '2026-10-07', '10:00', '11:00', 'CONFIRMADO', '[TESTE-TRIGGER]');

-- Confira: devem aparecer os 2 do script 01 + B1 e B2 em 2026-10-06
SELECT id_agendamento, data_agendamento, hora_inicio, hora_fim, status, observacao
  FROM agendamento
 WHERE data_agendamento IN ('2026-10-06', '2026-10-07')
 ORDER BY data_agendamento, hora_inicio;

-- ---------- PARTE C: conflito com o agendamento que acabou de ser criado ----------

-- C1. Sobrepõe o B1 (14:30-15:30). Esperado: erro 1644
INSERT INTO agendamento (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim, status)
VALUES (2, 1, 1, '2026-10-06', '14:30', '15:30', 'CONFIRMADO');

-- ---------- PARTE D: trigger de ALTERAÇÃO (UPDATE) ----------

-- D1. Tentar mover o B1 para cima do agendamento 1 (10:00-11:00).
-- Esperado: Error Code: 1644. ERRO: Conflito de horário ao tentar alterar!
UPDATE agendamento
   SET hora_inicio = '10:00', hora_fim = '11:00'
 WHERE id_agendamento = @id_valido;

-- D2. Mover o B1 para outro horário livre (16:00-17:00). Esperado: 1 row(s) affected
UPDATE agendamento
   SET hora_inicio = '16:00', hora_fim = '17:00'
 WHERE id_agendamento = @id_valido;

-- ---------- PARTE E: agendamento CANCELADO não bloqueia o horário ----------

-- E1. Cancelar o agendamento 1 (10:00-11:00). Esperado: 1 row(s) affected
UPDATE agendamento SET status = 'CANCELADO', motivo_cancelamento = '[TESTE-TRIGGER]' WHERE id_agendamento = 1;

-- E2. Agora o horário 10:00-11:00 está livre: este INSERT deve FUNCIONAR
INSERT INTO agendamento (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim, status, observacao)
VALUES (3, 1, 1, '2026-10-06', '10:00', '11:00', 'CONFIRMADO', '[TESTE-TRIGGER]');

-- ---------- LIMPEZA (volta ao estado do script 01) ----------
DELETE FROM agendamento WHERE id_agendamento > 0 AND observacao = '[TESTE-TRIGGER]';
UPDATE agendamento SET status = 'CONFIRMADO', motivo_cancelamento = NULL, data_cancelamento = NULL WHERE id_agendamento = 1;

-- Deve voltar a mostrar só os 2 agendamentos originais, ambos CONFIRMADO
SELECT id_agendamento, data_agendamento, hora_inicio, hora_fim, status
  FROM agendamento
 WHERE data_agendamento = '2026-10-06'
 ORDER BY hora_inicio;
