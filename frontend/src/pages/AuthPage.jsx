import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Button from "../components/ui/Button.jsx";
import FormField from "../components/ui/FormField.jsx";

const AUTH_PRODUCT_NAME = "Dental Lab";

/**
 * Renderiza a tela compacta de login e cadastro do Cadista.
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
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <header className="auth-header">
          <div>
            <h1 id="auth-title">{AUTH_PRODUCT_NAME}</h1>
            <p>Acesse sua bancada de casos.</p>
          </div>
        </header>

        <div className="auth-tabs" role="tablist" aria-label="Modo de autenticação">
          <button
            className={authMode === "login" ? "auth-tab active" : "auth-tab"}
            type="button"
            role="tab"
            aria-selected={authMode === "login"}
            onClick={() => setAuthMode("login")}
          >
            Entrar
          </button>
          <button
            className={authMode === "register" ? "auth-tab active" : "auth-tab"}
            type="button"
            role="tab"
            aria-selected={authMode === "register"}
            onClick={() => setAuthMode("register")}
          >
            Criar conta
          </button>
        </div>

        {authMessage && <p className={`feedback auth-feedback ${authMessage.type}`}>{authMessage.text}</p>}

        {isRegisterMode ? (
          <form className="auth-form" onSubmit={onRegister}>
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
              <div className="auth-password-field">
                <input
                  name="password"
                  type={passwordInputType}
                  autoComplete="new-password"
                  minLength="6"
                  value={registerForm.password}
                  onChange={(event) => onAuthChange(event, "register")}
                  required
                />
                <button
                  className="auth-password-toggle"
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

            <Button className="auth-submit" variant="primary" disabled={authLoading} type="submit">
              Criar conta
            </Button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={onLogin}>
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
              <div className="auth-password-field">
                <input
                  name="password"
                  type={passwordInputType}
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(event) => onAuthChange(event, "login")}
                  required
                />
                <button
                  className="auth-password-toggle"
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

            <Button className="auth-submit" variant="primary" disabled={authLoading} type="submit">
              Entrar
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
