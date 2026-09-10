import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Button from "../components/ui/Button.jsx";
import FormField from "../components/ui/FormField.jsx";
import ToothIcon from "../components/icons/ToothIcon.jsx";
import { PRODUCT_NAME } from "../config/product.js";

export default function AuthPage({
  authMode,
  setAuthMode,
  loginForm,
  registerForm,
  authLoading,
  authMessage,
  authErrors,
  onAuthChange,
  onLogin,
  onRegister,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = authMode === "register";
  useEffect(() => {
    setShowPassword(false);
  }, [authMode]);

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <section className="w-full max-w-[400px]" aria-labelledby="auth-title">
        <div className="mb-8 flex items-center gap-3">
          <ToothIcon size={38} className="text-primary" />
          <div>
            <strong className="text-2xl font-semibold tracking-tight">{PRODUCT_NAME}</strong>
            <p className="text-xs text-[var(--color-text-muted)]">Laboratório dental</p>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
          <header className="mb-6">
            <h1 id="auth-title" className="text-xl font-semibold">
              {isRegister ? "Crie sua conta" : "Acesse sua bancada"}
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {isRegister
                ? "Seus trabalhos, do primeiro dente à entrega."
                : "Seu próximo trabalho começa aqui."}
            </p>
          </header>
          {authMessage && (
            <p
              role={authMessage.type === "error" ? "alert" : "status"}
              className={`mb-5 rounded-md border p-3 text-sm ${authMessage.type === "success" ? "border-[var(--color-success)]/25 bg-[var(--color-success)]/5 text-[var(--color-success-soft)]" : "border-destructive/25 bg-destructive/5 text-[var(--color-danger-soft)]"}`}
            >
              {authMessage.text}
            </p>
          )}
          <form className="grid gap-4" onSubmit={isRegister ? onRegister : onLogin} aria-busy={authLoading}>
            {isRegister ? (
              <>
                <FormField label="Email" errorText={authErrors.email}>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={registerForm.email}
                    onChange={(event) => onAuthChange(event, "register")}
                    required
                  />
                </FormField>
                <FormField
                  label="Usuário"
                  helperText="Mínimo 5 caracteres, apenas letras e números."
                  errorText={authErrors.username}
                >
                  <input
                    name="username"
                    autoComplete="username"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={registerForm.username}
                    onChange={(event) => onAuthChange(event, "register")}
                    required
                  />
                </FormField>
              </>
            ) : (
              <FormField label="Usuário ou email" errorText={authErrors.identifier}>
                <input
                  name="identifier"
                  autoComplete="username"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={loginForm.identifier}
                  onChange={(event) => onAuthChange(event, "login")}
                  required
                />
              </FormField>
            )}
            <div className="grid gap-1.5">
              <label htmlFor="auth-password" className="text-xs font-bold text-[var(--color-text-muted)]">
                Senha
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  className="min-h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-input-bg)] py-2 pl-3 pr-12 text-base focus:border-primary focus:ring-2 focus:ring-primary/25 md:text-sm"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  minLength={isRegister ? 6 : undefined}
                  value={isRegister ? registerForm.password : loginForm.password}
                  onChange={(event) => onAuthChange(event, authMode)}
                  aria-invalid={authErrors.password ? true : undefined}
                  aria-describedby={authErrors.password || isRegister ? "password-help" : undefined}
                  required
                />
                <button
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-md text-[var(--color-text-muted)] hover:text-primary"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {(authErrors.password || isRegister) && (
                <small
                  id="password-help"
                  className={`text-xs ${authErrors.password ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"}`}
                >
                  {authErrors.password || "Mínimo 6 caracteres e pelo menos 1 número."}
                </small>
              )}
            </div>
            <Button className="mt-2 w-full" variant="primary" disabled={authLoading} type="submit">
              {authLoading ? <LoaderCircle className="animate-spin" /> : null}
              {isRegister ? "Criar conta" : "Entrar"}
              {!authLoading && <ArrowRight size={16} />}
            </Button>
          </form>
        </div>
        <p className="mt-5 text-center text-sm text-[var(--color-text-muted)]">
          {isRegister ? "Já possui conta?" : "Ainda não possui conta?"}{" "}
          <button
            type="button"
            className="min-h-11 px-1 font-semibold text-primary underline-offset-4 hover:underline"
            onClick={() => setAuthMode(isRegister ? "login" : "register")}
          >
            {isRegister ? "Entrar" : "Criar conta"}
          </button>
        </p>
      </section>
    </main>
  );
}
