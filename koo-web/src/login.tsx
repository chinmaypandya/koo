import { useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { credits, supabase } from './auth';
import './style.css';
import { Cursor, Hatch, Magnetic } from './ui';

type Me = Awaited<ReturnType<typeof credits>>;

function Login() {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [me, setMe] = useState<Me>(null);
  const [msg, setMsg] = useState<{ text: string; err?: boolean }>(supabase ? { text: '' } : { text: 'Sign-in isn’t set up yet: add the Supabase keys to koo-web/.env.', err: true });
  const refresh = () => credits().then(setMe).catch(() => setMe(null));

  useEffect(() => {
    refresh();
    const sub = supabase?.auth.onAuthStateChange((e) => e === 'SIGNED_IN' && refresh()); // e.g. back from Google
    return () => sub?.data.subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) return;
    const f = new FormData(e.currentTarget);
    const creds = { email: String(f.get('email')).trim(), password: String(f.get('password')) };
    setMsg({ text: mode === 'signup' ? 'Creating your account…' : 'Logging in…' });
    const { data, error } = mode === 'signup'
      ? await supabase.auth.signUp({ ...creds, options: { emailRedirectTo: location.href } })
      : await supabase.auth.signInWithPassword(creds);
    if (error) return setMsg({ text: error.message, err: true });
    if (!data.session) return setMsg({ text: 'Check your email to confirm your account, then log in.' });
    setMsg({ text: '' }); refresh();
  };
  const google = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/login.html' } });
    if (error) setMsg({ text: error.message, err: true });
  };
  const logout = async () => { await supabase?.auth.signOut(); setMsg({ text: 'Logged out.' }); setMe(null); };

  return (
    <main className="login">
      <Hatch band={0.5} />
      <a className="brand back" href="/">← Koo</a>
      <div className="card">
        <img className="perched" src="/koo/hero.png" alt="" />
        <h1>Koo credits</h1>
        {me ? (
          <>
            <p className="muted">{me.email}</p>
            <p className="balance">🪙 {me.credits}</p>
            <p className="muted">1 credit = 1 AI request (5 posts)</p>
            <Magnetic><button className="pill" onClick={logout}>Log out</button></Magnetic>
          </>
        ) : (
          <>
            <div className="tabs" role="tablist">
              {(['signup', 'login'] as const).map((m) => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setMsg({ text: '' }); }}>{m === 'signup' ? 'Sign up' : 'Log in'}</button>
              ))}
            </div>
            <form onSubmit={submit}>
              <label>Email<input name="email" type="email" autoComplete="email" required /></label>
              <label>Password<input name="password" type="password" minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>
              <button className="pill solid" type="submit" disabled={!supabase}>{mode === 'signup' ? 'Sign up · get 50 🪙' : 'Log in'}</button>
            </form>
            <p className="muted or">or</p>
            <button className="pill" onClick={google} disabled={!supabase}>Continue with Google</button>
          </>
        )}
        <p className={`msg${msg.err ? ' err' : ''}`} role="status">{msg.text}</p>
      </div>
      <Cursor />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Login />);
