import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

function readViteExampleVars(): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const file of ['.env.example', '.env']) {
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const parsed = dotenv.parse(fs.readFileSync(fullPath));
      for (const [k, v] of Object.entries(parsed)) {
        if (k.startsWith('VITE_') && typeof v === 'string' && v.trim() !== '') {
          merged[k] = v.trim();
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('VITE_') && typeof v === 'string' && v.trim() !== '') {
      merged[k] = v.trim();
    }
  }
  return merged;
}

const viteVars = readViteExampleVars();

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_ENABLE_GOOGLE_LOGIN': JSON.stringify(
      viteVars.VITE_ENABLE_GOOGLE_LOGIN ?? 'false'
    ),
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(
      viteVars.VITE_GOOGLE_CLIENT_ID ?? ''
    ),
    'import.meta.env.VITE_GOOGLE_LOGIN_CODE': JSON.stringify(
      viteVars.VITE_GOOGLE_LOGIN_CODE ?? ''
    ),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
