import { ArrowRight, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import PasswordField from "../components/ui/PasswordField.jsx";
import { validNewPassword } from "../utils/password.js";
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
  const isRegister = authMode === "register";

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
          <form
            className="grid gap-4"
            onSubmit={isRegister ? onRegister : onLogin}
            aria-busy={authLoading}
          >
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
                <FormField label="Usuário" errorText={authErrors.username}>
                  <input
                    name="username"
                    maxLength={80}
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
            <PasswordField
              key={authMode}
              creation={isRegister}
              value={isRegister ? registerForm.password : loginForm.password}
              onChange={(event) => onAuthChange(event, authMode)}
              errorText={authErrors.password}
            />
            {!isRegister && (
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Esqueci minha senha
              </Link>
            )}
            <Button
              className="mt-2 w-full"
              variant="primary"
              disabled={authLoading || (isRegister && !validNewPassword(registerForm.password))}
              type="submit"
            >
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
