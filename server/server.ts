import express from 'express';
import cors from 'cors';
import type { Application } from 'express';
import { LOCALPOS_VERSION } from '../shared/constants';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Application {
  const app = express();

  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok', version: LOCALPOS_VERSION }, error: null });
  });

  app.use(errorHandler);

  return app;
}

export function startServer(port: number): void {
  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`[Server] Running on http://localhost:${port}`);
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[Server] Port ${port} already in use, reusing existing server`);
    } else {
      console.error('[Server] Startup error:', err);
    }
  });
}

// Permite ejecutar directamente: tsx server/server.ts
if (require.main === module) {
  const port = Number(process.env['SERVER_PORT']) || 3001;
  startServer(port);
}
