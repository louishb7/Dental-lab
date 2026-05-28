import { LogIn, UserPlus } from "lucide-react";
import { PRODUCT_NAME } from "../config/product.js";
import Button from "../components/ui/Button.jsx";
import FormField from "../components/ui/FormField.jsx";

export default function AuthPage({
  authMode,
  setAuthMode,
  loginForm,
  registerForm,
  authLoading,
  authMessage,
  onAuthChange,
  onLogin,
  onRegister,
}) {
  return (
    <main className="auth-shell">
      <section className="panel panel-strong auth-card">
        <div className="panel-body">
          <div className="auth-brand">
            <span className="brand-mark auth-mark">C</span>
            <span className="page-kicker tactical-kicker">Acesso operacional</span>
            <h1>{PRODUCT_NAME}</h1>
            <p className="muted">Entre para abrir a bancada e controlar casos, prazos e saídas.</p>
          </div>

          <div className="segmented">
            <Button
              variant={authMode === "login" ? "primary" : "secondary"}
              onClick={() => setAuthMode("login")}
            >
              <LogIn size={17} />
              Login
            </Button>
            <Button
              variant={authMode === "register" ? "primary" : "secondary"}
              onClick={() => setAuthMode("register")}
            >
              <UserPlus size={17} />
              Cadastro
            </Button>
          </div>

          {authMessage && <p className={`feedback ${authMessage.type}`}>{authMessage.text}</p>}

          {authMode === "login" ? (
            <form className="form-grid" onSubmit={onLogin}>
              <FormField label="Usuário ou email">
                <input
                  name="identifier"
                  value={loginForm.identifier}
                  onChange={(event) => onAuthChange(event, "login")}
                  required
                />
              </FormField>
              <FormField label="Senha">
                <input
                  name="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => onAuthChange(event, "login")}
                  required
                />
              </FormField>
              <Button variant="primary" disabled={authLoading} type="submit">
                <LogIn size={18} />
                Entrar
              </Button>
            </form>
          ) : (
            <form className="form-grid" onSubmit={onRegister}>
              <FormField label="Email">
                <input
                  name="email"
                  type="email"
                  value={registerForm.email}
                  onChange={(event) => onAuthChange(event, "register")}
                  required
                />
              </FormField>
              <FormField label="Usuário">
                <input
                  name="username"
                  value={registerForm.username}
                  onChange={(event) => onAuthChange(event, "register")}
                  required
                />
              </FormField>
              <FormField label="Senha">
                <input
                  name="password"
                  type="password"
                  minLength="6"
                  value={registerForm.password}
                  onChange={(event) => onAuthChange(event, "register")}
                  required
                />
              </FormField>
              <Button variant="primary" disabled={authLoading} type="submit">
                <UserPlus size={18} />
                Criar acesso
              </Button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
