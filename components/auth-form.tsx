'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Leaf, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageWrapper } from '@/components/page-wrapper'

const redirectUrl = () => process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`

type PasswordFieldProps = { id: string; name: string; label: string; value: string; onChange: (value: string) => void; autoComplete?: string }

function AuthShell({ children, eyebrow = 'A quieter way forward' }: { children: React.ReactNode; eyebrow?: string }) {
  return <PageWrapper className="auth-shell"><div className="auth-brand"><div className="login-mark"><Leaf /></div><span>Small steps</span></div><p className="eyebrow">{eyebrow}</p>{children}</PageWrapper>
}

function PasswordField({ id, name, label, value, onChange, autoComplete = 'current-password' }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  return <div className="auth-field"><label htmlFor={id}>{label}</label><div className="password-wrap"><input id={id} name={name} type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required minLength={8} /><button type="button" className="password-toggle" onClick={() => setVisible(!visible)} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>{visible ? <EyeOff /> : <Eye />}</button></div></div>
}

export function LoginForm() {
  const supabase = createClient(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [pending, setPending] = useState(false); const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (pending) return; const form = new FormData(event.currentTarget); const nextEmail = String(form.get('email') || '').trim(); const nextPassword = String(form.get('password') || ''); setEmail(nextEmail); setPassword(nextPassword); setError(''); if (!nextEmail || !nextPassword) { setError('Enter your email and password.'); return } setPending(true); const { error: authError } = await supabase.auth.signInWithPassword({ email: nextEmail, password: nextPassword }); setPending(false); if (authError) { setError(authError.message.toLowerCase().includes('confirm') ? 'Please confirm your email before signing in.' : 'That email or password doesn\'t look right.'); return } window.location.assign('/') }
  return <AuthShell><h1>Welcome back</h1><p className="auth-copy">A few quiet minutes can change the shape of a day.</p><form className="auth-form" onSubmit={submit}><div className="auth-field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div><PasswordField id="password" name="password" label="Password" value={password} onChange={setPassword} /><div className="auth-link-row"><Link href="/forgot-password">Forgot password?</Link></div>{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="primary-button" disabled={pending}>{pending && <Loader2 className="spin" />}{pending ? 'Signing in...' : 'Sign in'}</button></form><p className="auth-footer">New here? <Link href="/signup">Create an account</Link></p></AuthShell>
}

export function SignupForm() {
  const supabase = createClient(); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [pending, setPending] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (pending) return; const form = new FormData(event.currentTarget); const nextName = String(form.get('name') || '').trim(); const nextEmail = String(form.get('email') || '').trim(); const nextPassword = String(form.get('password') || ''); const nextConfirm = String(form.get('confirm') || ''); setName(nextName); setEmail(nextEmail); setPassword(nextPassword); setConfirm(nextConfirm); setError(''); if (!nextName || !nextEmail) { setError('Complete all fields.'); return } if (nextPassword.length < 8) { setError('Your password needs at least 8 characters.'); return } if (nextPassword !== nextConfirm) { setError('Your passwords do not match.'); return } setPending(true); const { data, error: authError } = await supabase.auth.signUp({ email: nextEmail, password: nextPassword, options: { emailRedirectTo: redirectUrl(), data: { display_name: nextName } } }); setPending(false); if (authError) { setError(authError.message.toLowerCase().includes('password') ? 'Choose a stronger password.' : 'We could not create your account. Please try again.'); return } if (data.session) window.location.assign('/'); else setDone(true) }
  if (done) return <AuthShell><div className="sent-card"><span>✦</span><h2>Check your email</h2><p>We sent a confirmation link to your inbox. Open it to begin your small steps.</p><Link className="text-button" href="/login">Back to sign in</Link></div></AuthShell>
  return <AuthShell><h1>Start your <em>small steps.</em></h1><p className="auth-copy">Build a gentler rhythm, one day at a time.</p><form className="auth-form" onSubmit={submit}><div className="auth-field"><label htmlFor="name">Display name</label><input id="name" name="name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></div><div className="auth-field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div><PasswordField id="password" name="password" label="Password" value={password} onChange={setPassword} autoComplete="new-password" /><PasswordField id="confirm" name="confirm" label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="primary-button" disabled={pending}>{pending && <Loader2 className="spin" />}{pending ? 'Creating account...' : 'Create account'}</button></form><p className="auth-footer">Already have an account? <Link href="/login">Sign in</Link></p></AuthShell>
}

export function ForgotPasswordForm() {
  const supabase = createClient(); const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (pending) return; const nextEmail = String(new FormData(event.currentTarget).get('email') || '').trim(); setEmail(nextEmail); setError(''); if (!nextEmail) { setError('Enter your email address.'); return } setPending(true); const { error: authError } = await supabase.auth.resetPasswordForEmail(nextEmail, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` }); setPending(false); if (authError) { setError('We could not send that link. Please try again.'); return } setSent(true) }
  return <AuthShell><h1>Reset your password.</h1>{sent ? <div className="sent-card"><span>✦</span><h2>Check your inbox</h2><p>If an account uses that email, a reset link is on its way.</p><Link className="text-button" href="/login">Back to sign in</Link></div> : <><p className="auth-copy">No pressure. We will help you find your way back in.</p><form className="auth-form" onSubmit={submit}><div className="auth-field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div>{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="primary-button" disabled={pending}>{pending ? 'Sending...' : 'Send reset link'}</button></form><p className="auth-footer"><Link href="/login">Back to sign in</Link></p></>}</AuthShell>
}

export function ResetPasswordForm() {
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [pending, setPending] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => { if (active) setHasSession(Boolean(data.session)) })
    const { data } = supabase.auth.onAuthStateChange((event: string, session: unknown) => {
      if (event === 'PASSWORD_RECOVERY') window.location.replace('/reset-password')
      if (active) setHasSession(Boolean(session))
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [supabase])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    const nextPassword = String(form.get('password') || '')
    const nextConfirm = String(form.get('confirm') || '')
    setPassword(nextPassword); setConfirm(nextConfirm); setError('')
    if (nextPassword.length < 8) { setError('Your password needs at least 8 characters.'); return }
    if (nextPassword !== nextConfirm) { setError('Your passwords do not match.'); return }
    setPending(true)
    const { error: authError } = await supabase.auth.updateUser({ password: nextPassword })
    if (authError) { setPending(false); setError('We could not update your password. Please request a new link.'); return }
    setUpdated(true); setPending(false)
    await supabase.auth.signOut()
    window.location.assign('/login?reset=success')
  }

  if (hasSession === false) return <AuthShell><h1>This link has expired.</h1><p className="auth-copy">Request a new password reset link to continue.</p><Link className="primary-button" href="/forgot-password">Request a new one</Link></AuthShell>
  if (hasSession === null) return <AuthShell><p className="auth-copy">Checking your reset link...</p></AuthShell>
  if (updated) return <AuthShell><h1>Password updated</h1></AuthShell>
  return <AuthShell><h1>Choose a new password.</h1><p className="auth-copy">Make it something that feels secure and easy to remember.</p><form className="auth-form" onSubmit={submit}><PasswordField id="password" name="password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" /><PasswordField id="confirm" name="confirm" label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="primary-button" disabled={pending}>{pending ? 'Updating...' : 'Update password'}</button></form></AuthShell>
}

export { AuthShell }
