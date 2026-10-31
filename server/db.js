import { createClient } from '@libsql/client';

// Importar los handlers nunca abre una conexión. Activación remota explícita.
export function abrirDb(env = process.env) {
  if (env.RURALDATA_REMOTE_ENABLED !== 'true' || !env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    throw new Error('Persistencia remota deshabilitada');
  }
  return createClient({url:env.TURSO_DATABASE_URL, authToken:env.TURSO_AUTH_TOKEN});
}
