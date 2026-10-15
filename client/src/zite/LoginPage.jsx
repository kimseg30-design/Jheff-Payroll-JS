import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { loginAsAdmin } from './auth';
import { ShieldCheck, Mail, Lock, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState('password'); // 'password' | 'magic-link'
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
  const redirectTo = window.location.origin + redirect;

  const handlePasswordAuth = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (signUpErr) throw signUpErr;
        if (data?.session) {
          window.location.assign(redirect);
        } else {
          setMessage('Account created! If email confirmation is enabled on your Supabase project, check your inbox.');
        }
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) throw signInErr;
        if (data?.session) {
          window.location.assign(redirect);
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      });
      if (otpErr) throw otpErr;
      setMessage(`Sign-in link sent to ${email}. Please check your inbox.`);
    } catch (err) {
      setError(err.message || 'Could not send sign-in link.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (oauthErr) throw oauthErr;
    } catch (err) {
      setError(err.message || 'Google authentication is not configured in your Supabase dashboard.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sahod — PH Payroll</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage employees, attendance, and payroll.
          </p>
        </div>

        {/* Quick Instant Sign-In as Admin */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Instant Access
            </span>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
              Admin
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Continue immediately as primary system administrator (Kim Segarra).
          </p>
          <Button
            type="button"
            className="w-full font-semibold shadow-sm"
            onClick={loginAsAdmin}
          >
            Continue as Administrator
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 text-muted-foreground font-medium">
              Or sign in with Supabase
            </span>
          </div>
        </div>

        {/* Tabs for Auth mode */}
        <div className="flex rounded-lg border bg-muted/50 p-1 text-xs font-medium">
          <button
            type="button"
            className={`flex-1 py-1.5 rounded-md transition-colors ${
              mode === 'password'
                ? 'bg-background shadow-sm text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => { setMode('password'); setError(''); setMessage(''); }}
          >
            Email & Password
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 rounded-md transition-colors ${
              mode === 'magic-link'
                ? 'bg-background shadow-sm text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => { setMode('magic-link'); setError(''); setMessage(''); }}
          >
            Magic Link (OTP)
          </button>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {message && (
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1">{message}</div>
          </div>
        )}

        {/* Password Form */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordAuth} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !email || !password}>
              {loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In with Password'}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              {isSignUp ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => { setIsSignUp(false); setError(''); }}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => { setIsSignUp(true); setError(''); }}
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </form>
        )}

        {/* Magic Link Form */}
        {mode === 'magic-link' && (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="otp-email" className="text-xs font-medium">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="otp-email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !email}>
              {loading ? 'Sending link…' : 'Send Magic Link'}
            </Button>
          </form>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full text-xs"
          onClick={handleGoogle}
        >
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
