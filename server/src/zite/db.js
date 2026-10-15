// App-level tables (roles, invites, rate limits, failure log) stored in Supabase,
// exposed with the same findAll / findOne / create / bulkCreate / delete shape.
import { createClient } from '@supabase/supabase-js';

export const admin = createClient(process.env.ZITE_SUPABASE_URL, process.env.ZITE_API_KEY, { auth: { persistSession: false } });

const COL = { user: 'user_id' };
const snake = (k) => COL[k] || k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
const camel = (k) => (k === 'user_id' ? 'user' : k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()));
const toRow = (r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined).map(([k, v]) => [snake(k), Array.isArray(v) ? v[0] ?? null : v]));
const fromRow = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [camel(k), v]));

function check(error) {
  if (error) throw new Error(error.message);
}

function table(name) {
  const filtered = (filters = {}) => {
    let q = admin.from(name).select('*');
    for (const [k, v] of Object.entries(filters)) q = q.eq(snake(k), Array.isArray(v) ? v[0] : v);
    return q;
  };
  return {
    async findAll({ filters, limit = 500 } = {}) {
      const { data, error } = await filtered(filters).limit(limit); check(error);
      return { records: data.map(fromRow) };
    },
    async findOne({ filters } = {}) {
      const { data, error } = await filtered(filters).limit(1); check(error);
      return data[0] ? fromRow(data[0]) : null;
    },
    async create({ record }) {
      const { data, error } = await admin.from(name).insert(toRow(record)).select().single(); check(error);
      return fromRow(data);
    },
    async bulkCreate({ records, matchOn }) {
      const q = matchOn ? admin.from(name).upsert(records.map(toRow), { onConflict: matchOn.map(snake).join(',') }) : admin.from(name).insert(records.map(toRow));
      const { data, error } = await q.select(); check(error);
      return { records: data.map(fromRow) };
    },
    async delete({ id }) {
      const { error } = await admin.from(name).delete().eq('id', id); check(error);
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
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 }); check(error);
      let users = data.users.map(toAuthUser);
      if (filters.email) users = users.filter((u) => u.email?.toLowerCase() === String(filters.email).toLowerCase());
      users.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      return { records: users.slice(0, limit), total: users.length, hasMore: users.length > limit };
    },
  },
  // Only the System health queries use raw SQL; answer them directly.
  async sql({ query }) {
    if (/COUNT\(\*\)/i.test(query)) {
      const since = new Date(Date.now() - 864e5).toISOString();
      const { count, error } = await admin.from('app_failed_actions').select('id', { count: 'exact', head: true }).gte('occurred_at', since); check(error);
      return { rows: [{ n: count ?? 0 }] };
    }
    const { data, error } = await admin.from('app_failed_actions').select('*').order('occurred_at', { ascending: false }).limit(10); check(error);
    return { rows: data.map(fromRow) };
  },
};
