// App-level tables (roles, invites, rate limits, failure log) stored in Supabase,
// exposed with the same findAll / findOne / create / bulkCreate / delete shape.
// Automatically falls back to in-memory store if Supabase is not connected.
import '../lib/loadEnv.js';
import { createClient } from '@supabase/supabase-js';
import { memoryDb } from '../lib/memoryStore.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.ZITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.ZITE_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const isConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('placeholder')
);

export const admin = isConfigured
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null;

const COL = { user: 'user_id' };
const snake = (k) => COL[k] || k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
const camel = (k) => (k === 'user_id' ? 'user' : k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()));
const toRow = (r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined).map(([k, v]) => [snake(k), Array.isArray(v) ? v[0] ?? null : v]));
const fromRow = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [camel(k), v]));

function check(error) {
  if (error) throw new Error(error.message);
}

function table(name) {
  return {
    async findAll({ filters = {}, limit = 500 } = {}) {
      if (admin) {
        try {
          let q = admin.from(name).select('*');
          for (const [k, v] of Object.entries(filters)) q = q.eq(snake(k), Array.isArray(v) ? v[0] : v);
          const { data, error } = await q.limit(limit);
          check(error);
          return { records: data.map(fromRow) };
        } catch (e) {
          console.warn(`[db] Fallback to in-memory for ${name}.findAll:`, e.message);
        }
      }
      let list = memoryDb[name] || [];
      for (const [k, v] of Object.entries(filters)) {
        list = list.filter((item) => String(item[k]) === String(Array.isArray(v) ? v[0] : v));
      }
      return { records: list.slice(0, limit) };
    },

    async findOne({ filters = {} } = {}) {
      if (admin) {
        try {
          let q = admin.from(name).select('*');
          for (const [k, v] of Object.entries(filters)) q = q.eq(snake(k), Array.isArray(v) ? v[0] : v);
          const { data, error } = await q.limit(1);
          check(error);
          return data[0] ? fromRow(data[0]) : null;
        } catch (e) {
          console.warn(`[db] Fallback to in-memory for ${name}.findOne:`, e.message);
        }
      }
      const list = memoryDb[name] || [];
      const item = list.find((it) => {
        return Object.entries(filters).every(([k, v]) => String(it[k]) === String(Array.isArray(v) ? v[0] : v));
      });
      return item || null;
    },

    async create({ record }) {
      if (admin) {
        try {
          const { data, error } = await admin.from(name).insert(toRow(record)).select().single();
          check(error);
          return fromRow(data);
        } catch (e) {
          console.warn(`[db] Fallback to in-memory for ${name}.create:`, e.message);
        }
      }
      const created = { id: record.id || crypto.randomUUID(), ...record, createdAt: new Date().toISOString() };
      if (!memoryDb[name]) memoryDb[name] = [];
      memoryDb[name].push(created);
      return created;
    },

    async bulkCreate({ records, matchOn }) {
      if (admin) {
        try {
          const q = matchOn
            ? admin.from(name).upsert(records.map(toRow), { onConflict: matchOn.map(snake).join(',') })
            : admin.from(name).insert(records.map(toRow));
          const { data, error } = await q.select();
          check(error);
          return { records: data.map(fromRow) };
        } catch (e) {
          console.warn(`[db] Fallback to in-memory for ${name}.bulkCreate:`, e.message);
        }
      }
      if (!memoryDb[name]) memoryDb[name] = [];
      const out = [];
      for (const rec of records) {
        const item = { id: rec.id || crypto.randomUUID(), ...rec, createdAt: new Date().toISOString() };
        if (matchOn && matchOn.length) {
          const idx = memoryDb[name].findIndex((existing) => matchOn.every((k) => existing[k] === item[k]));
          if (idx >= 0) {
            memoryDb[name][idx] = { ...memoryDb[name][idx], ...item };
            out.push(memoryDb[name][idx]);
            continue;
          }
        }
        memoryDb[name].push(item);
        out.push(item);
      }
      return { records: out };
    },

    async delete({ id }) {
      if (admin) {
        try {
          const { error } = await admin.from(name).delete().eq('id', id);
          check(error);
          return { id };
        } catch (e) {
          console.warn(`[db] Fallback to in-memory for ${name}.delete:`, e.message);
        }
      }
      if (memoryDb[name]) {
        memoryDb[name] = memoryDb[name].filter((item) => item.id !== id);
      }
      return { id };
    },
  };
}

function toAuthUser(u) {
  const meta = u.user_metadata || {};
  const name = meta.full_name || meta.name || '';
  const [firstName = '', ...rest] = name.split(' ');
  return { id: u.id, email: u.email, name, firstName, lastName: rest.join(' '), image: meta.avatar_url || null };
}

export const zite = {
  userRoles: table('app_user_roles'),
  appInvites: table('app_invites'),
  rateLimitBuckets: table('app_rate_limit_buckets'),
  failedActions: table('app_failed_actions'),
  auth: {
    async findAllUsers({ filters = {}, limit = 500 } = {}) {
      if (admin) {
        try {
          const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
          check(error);
          let users = data.users.map(toAuthUser);
          if (filters.email) users = users.filter((u) => u.email?.toLowerCase() === String(filters.email).toLowerCase());
          users.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
          return { records: users.slice(0, limit), total: users.length, hasMore: users.length > limit };
        } catch (e) {
          console.warn('[db] Fallback to in-memory for auth.findAllUsers:', e.message);
        }
      }
      const users = [
        { id: 'usr_admin', email: 'kimsegarra4@gmail.com', name: 'Kim Segarra', firstName: 'Kim', lastName: 'Segarra', image: null },
        { id: 'usr_admin_orig', email: 'kimsegarra516@gmail.com', name: 'Kim Segarra (Orig)', firstName: 'Kim', lastName: 'Segarra', image: null },
      ];
      let filtered = users;
      if (filters.email) filtered = filtered.filter((u) => u.email?.toLowerCase() === String(filters.email).toLowerCase());
      return { records: filtered.slice(0, limit), total: filtered.length, hasMore: filtered.length > limit };
    },
  },
  async sql({ query }) {
    if (admin) {
      try {
        if (/COUNT\(\*\)/i.test(query)) {
          const since = new Date(Date.now() - 864e5).toISOString();
          const { count, error } = await admin.from('app_failed_actions').select('id', { count: 'exact', head: true }).gte('occurred_at', since);
          check(error);
          return { rows: [{ n: count ?? 0 }] };
        }
        const { data, error } = await admin.from('app_failed_actions').select('*').order('occurred_at', { ascending: false }).limit(10);
        check(error);
        return { rows: data.map(fromRow) };
      } catch (e) {
        console.warn('[db] Fallback to in-memory for sql query:', e.message);
      }
    }
    const actions = memoryDb.app_failed_actions || [];
    if (/COUNT\(\*\)/i.test(query)) {
      return { rows: [{ n: actions.length }] };
    }
    return { rows: actions.slice(-10) };
  },
};
