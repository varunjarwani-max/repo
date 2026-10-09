import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import analyse from './api/analyse.mjs';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');
  if (environment.GEMINI_API_KEY) process.env.GEMINI_API_KEY = environment.GEMINI_API_KEY;
  return {
  plugins: [react(), {
    name: 'gemini-analysis-api',
    configureServer(server) {
      server.middlewares.use('/api/analyse', (req, res) => {
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
  },
  };
});
