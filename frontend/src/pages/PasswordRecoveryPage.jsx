import { useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import Button from "../components/ui/Button.jsx";
import FormField from "../components/ui/FormField.jsx";
import PasswordField from "../components/ui/PasswordField.jsx";
import ToothIcon from "../components/icons/ToothIcon.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { forgotPassword, resetPassword } from "../services/api.js";
import { validNewPassword } from "../utils/password.js";

const GENERIC_MESSAGE =
  "Se existir uma conta com esse e-mail, enviaremos as instruções para redefinir a senha.";
const INVALID_LINK = "Link inválido ou expirado. Solicite novas instruções.";

export default function PasswordRecoveryPage({ reset = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { handleLogout, changeAuthMode } = useAuth();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const captured = useRef(false);
  const submitting = useRef(false);
  const sent = useRef(false);

  useLayoutEffect(() => {
    if (!reset || (captured.current && !window.location.hash)) return;
    captured.current = true;
    const match = /^#token=([a-f0-9]{64})$/.exec(window.location.hash);
    // Keep the token exclusively in this mounted screen, never in router state or storage.
    navigate(location.pathname, { replace: true, state: null });
    setToken(match?.[1] || "");
    setError(match ? "" : INVALID_LINK);
    setSuccess(false);
    sent.current = false;
  }, [reset, location.hash, location.key, location.pathname, navigate]);

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || sent.current || (reset && (!token || !validNewPassword(password))))
      return;
    submitting.current = true;
    setLoading(true);
    setError("");
    try {
      if (reset) {
        await resetPassword(token, password);
        setToken("");
        setPassword("");
        await handleLogout();
      } else {
        await forgotPassword(email.trim());
      }
      sent.current = true;
      setSuccess(true);
    } catch (failure) {
      setError(
        failure.status
          ? failure.message.replace(/^Value error,\s*/, "")
          : "Não foi possível conectar. Tente novamente.",
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <section className="w-full max-w-[400px]" aria-labelledby="recovery-title">
        <div className="mb-8 flex items-center gap-3">
          <ToothIcon size={38} className="text-primary" />
          <div>
            <strong className="text-2xl font-semibold tracking-tight">Cadisk</strong>
            <p className="text-xs text-[var(--color-text-muted)]">Laboratório dental</p>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
          <h1 id="recovery-title" className="mb-6 text-xl font-semibold">
            {reset ? "Crie uma nova senha" : "Recupere seu acesso"}
          </h1>
          {success && (
            <p role="status" className="mb-5 text-sm text-[var(--color-success-soft)]">
              {reset ? "Senha redefinida. Faça login com sua nova senha." : GENERIC_MESSAGE}
            </p>
          )}
          {error && (
            <p role="alert" className="mb-5 text-sm text-[var(--color-danger-soft)]">
              {error}
            </p>
          )}
          {(!reset || (!success && token)) && (
            <form onSubmit={submit} aria-busy={loading} className="grid gap-4">
              {reset ? (
                <PasswordField
                  label="Nova senha"
                  creation
                  value={password}
                  disabled={loading}
                  onChange={(event) => setPassword(event.target.value)}
                />
              ) : (
                <FormField label="E-mail">
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={255}
                    required
                    value={email}
                    disabled={loading}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      sent.current = false;
                      setSuccess(false);
                      setError("");
                    }}
                  />
                </FormField>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || success || (reset && !validNewPassword(password))}
              >
                {loading && <LoaderCircle className="animate-spin" />}
                {success ? "Instruções enviadas" : reset ? "Redefinir senha" : "Enviar instruções"}
              </Button>
            </form>
          )}
          {reset && !success && (
            <Link className="mt-4 block text-sm text-primary hover:underline" to="/forgot-password">
              Solicitar novas instruções
            </Link>
          )}
        </div>
        <Link
          className="mt-5 block py-3 text-center text-sm font-semibold text-primary hover:underline"
          to="/"
          onClick={() => changeAuthMode("login")}
        >
          Voltar ao login
        </Link>
      </section>
    </main>
  );
}
