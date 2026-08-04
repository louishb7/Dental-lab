import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Button from "../components/ui/Button.jsx";
import FormField from "../components/ui/FormField.jsx";
import { PRODUCT_NAME } from "../config/product.js";

const PASSWORD_INPUT_CLASS =
  "min-h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]/75 focus:border-primary focus:ring-2 focus:ring-primary/25";

/**
 * Renderiza a tela compacta de login e cadastro do Cadisk.
 *
 * @param {object} props Component props.
 * @param {"login" | "register"} props.authMode Modo de autenticação ativo.
 * @param {(mode: "login" | "register") => void} props.setAuthMode Alterna o modo de autenticação.
 * @param {{identifier: string, password: string}} props.loginForm Estado do formulário de login.
 * @param {{email: string, username: string, password: string}} props.registerForm Estado do formulário de cadastro.
 * @param {boolean} props.authLoading Indica envio em andamento.
 * @param {{type: "error" | "success", text: string} | null} props.authMessage Mensagem global do fluxo.
 * @param {{identifier: string, email: string, username: string, password: string}} props.authErrors Erros por campo.
 * @param {(event: React.ChangeEvent<HTMLInputElement>, mode: "login" | "register") => void} props.onAuthChange Manipulador de campos.
 * @param {(event: React.FormEvent<HTMLFormElement>) => void} props.onLogin Submit de login.
 * @param {(event: React.FormEvent<HTMLFormElement>) => void} props.onRegister Submit de cadastro.
 * @returns {JSX.Element} Tela de autenticação.
 */
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
  const isRegisterMode = authMode === "register";

  useEffect(() => {
    setShowPassword(false);
  }, [authMode]);

  const passwordInputType = showPassword ? "text" : "password";
  const passwordToggleLabel = showPassword ? "Ocultar" : "Mostrar";

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--color-bg)] p-6">
      <section className="grid w-full max-w-[480px] gap-4 rounded-md border border-primary/30 bg-[var(--color-surface)] p-5 text-[var(--color-text)] shadow-[var(--shadow-soft)]" aria-labelledby="auth-title">
        <header className="grid gap-1">
          <div>
            <h1 id="auth-title" className="text-2xl font-bold leading-tight">{PRODUCT_NAME}</h1>
            <p className="mt-1 text-sm leading-snug text-[var(--color-text-muted)]">Acesse sua bancada de casos.</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Modo de autenticação">
          <button
            className={[
              "min-h-10 rounded-md border px-3 text-sm font-extrabold",
              authMode === "login"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-[var(--color-border)] bg-[var(--color-control-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            ].join(" ")}
            type="button"
            role="tab"
            aria-selected={authMode === "login"}
            onClick={() => setAuthMode("login")}
          >
            Entrar
          </button>
          <button
            className={[
              "min-h-10 rounded-md border px-3 text-sm font-extrabold",
              authMode === "register"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-[var(--color-border)] bg-[var(--color-control-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            ].join(" ")}
            type="button"
            role="tab"
            aria-selected={authMode === "register"}
            onClick={() => setAuthMode("register")}
          >
            Criar conta
          </button>
        </div>

        {authMessage && (
          <p
            className={[
              "rounded-md border px-3 py-2 text-sm font-bold",
              authMessage.type === "success"
                ? "border-[color-mix(in_srgb,var(--color-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success-soft)]"
                : "border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger-soft)]",
            ].join(" ")}
          >
            {authMessage.text}
          </p>
        )}

        {isRegisterMode ? (
          <form className="grid gap-3" onSubmit={onRegister}>
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

            <FormField
              label="Senha"
              helperText="Mínimo 6 caracteres e pelo menos 1 número."
              errorText={authErrors.password}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 max-[640px]:grid-cols-1">
                <input
                  className={PASSWORD_INPUT_CLASS}
                  name="password"
                  type={passwordInputType}
                  autoComplete="new-password"
                  minLength="6"
                  value={registerForm.password}
                  onChange={(event) => onAuthChange(event, "register")}
                  required
                />
                <button
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-control-bg)] px-2.5 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-pressed={showPassword}
                  aria-label={`${passwordToggleLabel} senha`}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span>{passwordToggleLabel}</span>
                </button>
              </div>
            </FormField>

            <Button className="mt-1 w-full justify-center" variant="primary" disabled={authLoading} type="submit">
              Criar conta
            </Button>
          </form>
        ) : (
          <form className="grid gap-3" onSubmit={onLogin}>
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

            <FormField label="Senha" errorText={authErrors.password}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 max-[640px]:grid-cols-1">
                <input
                  className={PASSWORD_INPUT_CLASS}
                  name="password"
                  type={passwordInputType}
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(event) => onAuthChange(event, "login")}
                  required
                />
                <button
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-control-bg)] px-2.5 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-pressed={showPassword}
                  aria-label={`${passwordToggleLabel} senha`}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span>{passwordToggleLabel}</span>
                </button>
              </div>
            </FormField>

            <Button className="mt-1 w-full justify-center" variant="primary" disabled={authLoading} type="submit">
              Entrar
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
