-- Fila durável para sincronização automática com Google Sheets.
-- Execute depois das migrações 01 a 05. O MySQL continua sendo a fonte oficial.
CREATE TABLE IF NOT EXISTS integracao_sheets_outbox (
  id_evento BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_profissional INT NOT NULL,
  id_agendamento INT NOT NULL,
  status ENUM('PENDENTE','ENVIADO') NOT NULL DEFAULT 'PENDENTE',
  tentativas INT UNSIGNED NOT NULL DEFAULT 0,
  proxima_tentativa DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_erro TEXT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enviado_em DATETIME NULL,
  PRIMARY KEY (id_evento),
  KEY ix_sheets_pendentes (status, proxima_tentativa, id_evento),
  KEY ix_sheets_profissional (id_profissional, status),
  CONSTRAINT fk_sheets_outbox_profissional
    FOREIGN KEY (id_profissional) REFERENCES profissional(id_profissional)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sheets_outbox_agendamento
    FOREIGN KEY (id_agendamento) REFERENCES agendamento(id_agendamento)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
