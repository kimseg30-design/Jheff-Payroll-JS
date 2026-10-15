import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { loginAsAdmin } from './auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
  const redirectTo = window.location.origin + redirect;

  const sendLink = async (e) => {
    e.preventDefault(); setError('');
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. Use the Demo Login button below.');
      return;
    }
    // Invite-only: never create new accounts from the sign-in screen.
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: false } });
    if (error) setError(error.message); else setSent(true);
  };

  const google = () => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. Use the Demo Login button below.');
      return;
    }
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-bold">Sahod — Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSupabaseConfigured
            ? 'Invite only. Use the email your admin invited.'
            : 'Development / Demo mode active.'}
        </p>

        {!isSupabaseConfigured && (
          <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm font-medium text-primary">Preview Environment</p>
            <p className="mt-1 text-xs text-muted-foreground">Sign in instantly as administrator (Kim Segarra).</p>
            <Button className="mt-3 w-full" onClick={loginAsAdmin}>
              Continue as Admin
            </Button>
          </div>
        )}

        {sent ? <p className="mt-6 text-sm">Check <b>{email}</b> for your sign-in link.</p> : (
          <form onSubmit={sendLink} className="mt-6 space-y-3">
            <Input type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant={isSupabaseConfigured ? 'default' : 'outline'} className="w-full" disabled={!email}>
              Email me a sign-in link
            </Button>
          </form>
        )}
        <Button variant="outline" className="mt-3 w-full" onClick={google}>Continue with Google</Button>
      </div>
    </div>
  );
}
