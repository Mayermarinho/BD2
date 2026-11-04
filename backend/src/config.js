import 'dotenv/config';

const int = (valor, padrao) => {
  const n = Number.parseInt(valor, 10);
  return Number.isFinite(n) ? n : padrao;
};

export const config = {
  port: int(process.env.PORT, 3001),
  databaseUrl: process.env.DATABASE_URL,
  dbSsl: process.env.DB_SSL === 'true',
  modoDemo: process.env.MODO_DEMO === 'true' || process.argv.includes('--demo'),
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  statusInicial: process.env.STATUS_INICIAL === 'PENDENTE' ? 'PENDENTE' : 'CONFIRMADO',
  passoMinutos: int(process.env.PASSO_MINUTOS, 30),
  antecedenciaMinutos: int(process.env.ANTECEDENCIA_MINUTOS, 60),
  googleSheetsSpreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  googleServiceAccountPrivateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  googleSheetsIntervaloMs: int(process.env.GOOGLE_SHEETS_SYNC_INTERVAL_MS, 30000),
  googleSheetsHabilitado: Boolean(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  ),
  fusoHorario: 'America/Sao_Paulo',
};
