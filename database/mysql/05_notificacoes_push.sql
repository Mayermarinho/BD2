-- Inscrições Web Push do proprietário.
-- Execute uma vez no MySQL de produção depois das migrações 01 a 04.
-- Não contém dados fictícios nem credenciais: cada celular registra sua própria inscrição.
CREATE TABLE IF NOT EXISTS assinatura_push (
  id_assinatura BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_profissional INT NOT NULL,
  endpoint TEXT NOT NULL,
  endpoint_hash CHAR(64) NOT NULL,
  chave_p256dh VARCHAR(255) NOT NULL,
  chave_auth VARCHAR(255) NOT NULL,
  user_agent VARCHAR(500) NULL,
  criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_assinatura),
  UNIQUE KEY uq_assinatura_push_endpoint (endpoint_hash),
  KEY ix_assinatura_push_profissional (id_profissional),
  CONSTRAINT fk_assinatura_push_profissional
    FOREIGN KEY (id_profissional) REFERENCES profissional(id_profissional)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
