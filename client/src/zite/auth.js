// Sign-in via Supabase Auth (email link + Google). Same API the pages already use.
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function toUser(u) {
  if (!u) return null;
  const meta = u.user_metadata || {};
  const name = meta.full_name || meta.name || u.email;
  const [firstName, ...rest] = String(name).split(' ');
  return { id: u.id, email: u.email, name, firstName, lastName: rest.join(' '), image: meta.avatar_url || null, emailVerified: !!u.email_confirmed_at, createdAt: new Date(u.created_at), updatedAt: new Date(u.updated_at || u.created_at) };
}

export function useAuth() {
  const [state, setState] = useState({ user: null, isLoading: true });
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ user: toUser(data.session?.user), isLoading: false }));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setState({ user: toUser(session?.user), isLoading: false }));
    return () => sub.subscription.unsubscribe();
  }, []);
  return state;
}

export function loginWithRedirect({ redirectUrl } = {}) {
  const back = redirectUrl || window.location.pathname + window.location.search;
  window.location.assign(`/login?redirect=${encodeURIComponent(back)}`);
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.assign('/');
}

export async function updateProfile(data) {
  await supabase.auth.updateUser({ data: { full_name: data.name, ...data } });
}
