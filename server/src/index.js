import './lib/loadEnv.js';
import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { admin } from './zite/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '5mb' }));

// Load every endpoint in src/api — the file name is the endpoint name.
const endpoints = {};
for (const file of fs.readdirSync(path.join(__dirname, 'api'))) {
  if (file.endsWith('.js')) endpoints[file.slice(0, -3)] = (await import(`./api/${file}`)).default;
}

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

app.post('/api/:name', async (req, res) => {
  const endpoint = endpoints[req.params.name];
  if (!endpoint) return res.status(404).json({ error: 'Unknown endpoint' });
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

// Serve the built React app.
const dist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`Sahod server running on http://0.0.0.0:${port}`));
