import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@cbt/shared';
import { useAuth } from './auth-context';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      await login(values.identifier, values.password);
      navigate('/app', { replace: true });
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      setServerError(
        status === 429 ? 'Too many attempts. Please wait and try again.' : 'Invalid username or password.',
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-ink">CBT Tracker</h1>
          <p className="text-sm text-ink-faint">Private journal — please sign in</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4" noValidate>
          <div>
            <label className="field-label" htmlFor="identifier">
              Username or email
            </label>
            <input
              id="identifier"
              autoComplete="username"
              className="field-input"
              {...register('identifier')}
            />
            {errors.identifier && <p className="field-error">{errors.identifier.message}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="field-input"
              {...register('password')}
            />
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>
          {serverError && <p className="field-error">{serverError}</p>}
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
