import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { SEO } from '../components/SEO';
import { useSettings } from '../contexts/SettingsContext';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const logo = settings?.site_logo?.trim();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const slug = new URLSearchParams(window.location.search).get('store')
      || localStorage.getItem('current_store_slug');
    const { data: allowed, error: checkError } = await supabase.rpc('can_sign_in_to_store', { p_slug: slug });
    if (checkError || allowed !== true) {
      await supabase.auth.signOut();
      toast.error('এই স্টোরে আপনার কোনো অ্যাকাউন্ট নেই। অনুগ্রহ করে সাইন আপ করুন।');
    } else {
      toast.success('Successfully signed in!');
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fbff_0%,#eef5ff_42%,#ffffff_100%)] text-slate-950">
      <SEO title="Sign In" />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1fr_460px]">
          <div className="hidden lg:block">
            {logo && (
              <Link to="/" className="inline-flex items-center">
                <img
                  src={logo}
                  alt="Site logo"
                  width={180}
                  height={48}
                  className="h-12 w-auto max-w-[220px] object-contain"
                />
              </Link>
            )}
            <div className="mt-14 max-w-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Account access</p>
              <h1 className="mt-4 text-5xl font-black leading-tight text-slate-950">Welcome back.</h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Sign in to continue your shopping, orders, and account details in one polished place.
              </p>
            </div>
          </div>

          <div className="w-full">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 flex justify-center lg:hidden">
                {logo && (
                  <Link to="/" className="inline-flex items-center">
                    <img
                      src={logo}
                      alt="Site logo"
                      width={170}
                      height={46}
                      className="h-11 w-auto max-w-[210px] object-contain"
                    />
                  </Link>
                )}
              </div>

              <div className="rounded-lg border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-black text-slate-950">Sign in to your account</h2>
                  <p className="mt-3 text-sm text-slate-600">
                    Or{' '}
                    <Link to="/signup" className="font-semibold text-primary transition hover:text-primary-hover">
                      create a new account
                    </Link>
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSignIn}>
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-slate-800">
                      Email address
                    </label>
                    <div className="relative mt-2">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Mail className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block h-12 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm text-slate-950 shadow-inner shadow-slate-200/40 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-slate-800">
                      Password
                    </label>
                    <div className="relative mt-2">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block h-12 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm text-slate-950 shadow-inner shadow-slate-200/40 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                        placeholder="********"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-slate-700">
                        Remember me
                      </label>
                    </div>

                    <div className="text-sm">
                      <a href="#" className="font-semibold text-primary transition hover:text-primary-hover">
                        Forgot your password?
                      </a>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,102,255,0.28)] transition hover:bg-primary-hover focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? 'Signing in...' : 'Sign in'}
                      {!loading && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
