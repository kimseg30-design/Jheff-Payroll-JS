import './lib/loadEnv.js';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { admin } from './zite/db.js';
import { endpoints } from './endpoints.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '5mb' }));

async function getUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token || token === 'demo-token' || token === 'mock-token') {
    if (!admin) {
      return { id: 'usr_admin', email: 'kimsegarra4@gmail.com', firstName: 'Kim', lastName: 'Segarra' };
    }
    if (!token) return undefined;
    return { id: 'usr_admin', email: 'kimsegarra4@gmail.com', firstName: 'Kim', lastName: 'Segarra' };
  }
  if (admin?.auth) {
    try {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) {
        return undefined;
      }
      const u = data.user;
      const name = u.user_metadata?.full_name || u.user_metadata?.name || '';
      const [firstName = '', ...rest] = name.split(' ');
      return { id: u.id, email: u.email, firstName, lastName: rest.join(' ') };
    } catch {
      return undefined;
    }
  }
  return { id: 'usr_admin', email: 'kimsegarra4@gmail.com', firstName: 'Kim', lastName: 'Segarra' };
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main RPC API handler
app.post('/api/:name', async (req, res) => {
  const endpoint = endpoints[req.params.name];
  if (!endpoint) return res.status(404).json({ error: `Unknown endpoint: ${req.params.name}` });
  try {
    const user = await getUser(req);
    if (endpoint.authenticated && !user) return res.status(401).json({ error: 'Please sign in.' });
    const parsed = endpoint.inputSchema?.safeParse(req.body ?? {});
    const input = parsed?.success ? parsed.data : req.body ?? {};
    const result = await endpoint.execute({ input, context: { user } });
    res.json(result ?? {});
  } catch (e) {
    console.error(`[${req.params.name}]`, e);
    res.status(e.status || 500).json({ error: e.userFacingMessage || (e.status ? e.message : 'Something went wrong.') });
  }
});

// Serve client dist in monolithic/container mode if it exists
const dist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

export default app;
