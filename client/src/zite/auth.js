// Sign-in via Supabase Auth (email link + Google) with local dev fallback.
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const MOCK_USER = {
  id: 'usr_admin',
  email: 'kimsegarra4@gmail.com',
  name: 'Kim Segarra',
  firstName: 'Kim',
  lastName: 'Segarra',
  image: null,
  emailVerified: true,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date(),
};

function toUser(u) {
  if (!u) return null;
  const meta = u.user_metadata || {};
  const name = meta.full_name || meta.name || u.email;
  const [firstName, ...rest] = String(name).split(' ');
  return { id: u.id, email: u.email, name, firstName, lastName: rest.join(' '), image: meta.avatar_url || null, emailVerified: !!u.email_confirmed_at, createdAt: new Date(u.created_at), updatedAt: new Date(u.updated_at || u.created_at) };
}

export function useAuth() {
  const [state, setState] = useState(() => {
    if (!isSupabaseConfigured) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('sahod_mock_user') : null;
      if (stored === 'guest') return { user: null, isLoading: false };
      return { user: MOCK_USER, isLoading: false };
    }
    return { user: null, isLoading: true };
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
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
  if (!isSupabaseConfigured) {
    if (typeof window !== 'undefined') localStorage.setItem('sahod_mock_user', 'guest');
    window.location.assign('/login');
    return;
  }
  await supabase.auth.signOut();
  window.location.assign('/');
}

export function loginAsAdmin() {
  if (typeof window !== 'undefined') localStorage.removeItem('sahod_mock_user');
  window.location.assign('/');
}

export async function updateProfile(data) {
  if (isSupabaseConfigured) {
    await supabase.auth.updateUser({ data: { full_name: data.name, ...data } });
  }
}
