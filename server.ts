import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

dotenv.config({ path: ['.env.local', '.env'] });

const { default: app } = await import('./api/index.ts');

const isProduction = process.env.NODE_ENV === 'production';
const distPath = path.resolve('dist');

if (isProduction && fs.existsSync(distPath)) {
  const express = (await import('express')).default;
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
} else {
  const express = (await import('express')).default;
  app.use(express.static(path.resolve('public')));
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Smart Library: http://localhost:${PORT}`));
