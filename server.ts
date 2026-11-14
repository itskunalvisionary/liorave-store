import http from 'node:http';
import path from 'node:path';
import express from 'express';
import apiRouter from './src/routes/api.ts';
import { initWebSocketServer } from './src/lib/realtime.ts';
import { getEnvValue } from './src/lib/env.ts';

const app = express();
const PORT = Number(getEnvValue('PORT', '3000')) || 3000;
const isProd = getEnvValue('NODE_ENV') === 'production';

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded product media
app.use('/uploads', express.static(path.resolve(process.cwd(), 'public/uploads')));

// API Routes
app.use('/api', apiRouter);

async function startServer() {
  const httpServer = http.createServer(app);
  initWebSocketServer(httpServer);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
