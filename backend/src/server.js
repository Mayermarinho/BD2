import { criarApp } from './app.js';
import { config } from './config.js';
import { criarPool } from './db.js';
import { criarRepoMemoria } from './repos/memoria.js';
import { criarRepoMysql } from './repos/mysql.js';
import { iniciarSincronizacaoSheets } from './services/sheetsSync.js';

let repo;
if (config.modoDemo) {
  // Sem banco: dados fictícios em memória, para desenvolver/demonstrar o front-end.
  repo = criarRepoMemoria({ fuso: config.fusoHorario });
  config.jwtSecret ||= 'segredo-somente-para-demo-1234567890';
  console.log('MODO DEMO: dados em memória (login admin@mariana.com / admin123). Nada é gravado no MySQL.');
} else {
  repo = criarRepoMysql(criarPool(config.databaseUrl, { ssl: config.dbSsl }));
}

const pararSincronizacaoSheets = iniciarSincronizacaoSheets(repo, config);
const app = criarApp(repo, config);

process.on('SIGTERM', () => pararSincronizacaoSheets());
process.on('SIGINT', () => pararSincronizacaoSheets());
app.listen(config.port, '0.0.0.0', () => {
  console.log(`API no ar: http://localhost:${config.port}/api/saude`);
});
