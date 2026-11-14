// A real Postgres for local work, with nothing to install: PGlite (Postgres compiled to WebAssembly) behind a normal Postgres socket.
// Keep it running in its own terminal:   npm run db:dev
// Then put the printed line in .env.local:
//   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres
//   PG_POOL_MAX=1        (PGlite serves one connection at a time)
// The data is kept in data/pg (git-ignored). Delete that folder to start from an empty database.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const dir = process.env.PGLITE_DIR || 'data/pg';
const port = Number(process.env.PGLITE_PORT || 5433);

(async () => {
  const db = await PGlite.create(dir);
  const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 1 });
  await server.start();
  console.log(`PGlite is running, data in ${dir}\n\nDATABASE_URL=postgres://postgres:postgres@127.0.0.1:${port}/postgres\nPG_POOL_MAX=1\n\nCtrl+C stops it.`);
  const stop = async () => { await server.stop(); await db.close(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
})();
