import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import analyse from './api/analyse.mjs';
import developerApi from './backend/developer-api.mjs';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');
  for (const name of ['GEMINI_API_KEY', 'GEMINI_API_KEY_BACKUP', 'GEMINI_MODEL', 'ECO_ADMIN_SECRET']) {
    if (environment[name]) process.env[name] = environment[name];
  }
  return {
  plugins: [react(), {
    name: 'gemini-analysis-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        let pathname: string;
        try { pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname); }
        catch { res.statusCode = 400; res.end('Invalid URL'); return; }
        if (pathname.startsWith('/data/') || pathname.startsWith('/backend/') || pathname === '/server.js' || /^\/api\/.*\.(mjs|js)$/.test(pathname)) {
          res.statusCode = 404; res.end('Not found'); return;
        }
        if (req.url?.startsWith('/api/keys') || req.url?.startsWith('/api/v1/classify-external')) {
          const liveEnv = loadEnv(mode, process.cwd(), '');
          for (const name of ['GEMINI_API_KEY', 'GEMINI_API_KEY_BACKUP', 'GEMINI_MODEL', 'ECO_ADMIN_SECRET']) {
            if (liveEnv[name]) process.env[name] = liveEnv[name];
          }
          developerApi(req, res, next);
        } else next();
      });
      server.middlewares.use('/api/analyse', (req, res) => {
        const liveEnv = loadEnv(mode, process.cwd(), '');
        for (const name of ['GEMINI_API_KEY', 'GEMINI_API_KEY_BACKUP', 'GEMINI_MODEL', 'ECO_ADMIN_SECRET']) {
          if (liveEnv[name]) process.env[name] = liveEnv[name];
        }
        void analyse(req, res).catch(() => {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Analysis server unavailable. Please retry.' }));
          }
        });
      });
    },
  }],
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['.vercel.run'],
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', `${process.cwd().replace(/\\/g, '/')}/data/**`, '**/backend/**', '**/server.js', '**/api/**'] },
  },
  };
});
