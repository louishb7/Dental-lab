import { createContext, useContext, useEffect, useState } from "react";
import {
  clearSession,
  getCurrentUser,
  getStoredSession,
  login,
  register,
} from "../services/api.js";
import { EMPTY_LOGIN, EMPTY_REGISTER } from "../utils/forms.js";

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

function createEmptyAuthErrors() {
  return {
    identifier: "",
    email: "",
    username: "",
    password: "",
    general: "",
  };
}

function normalizeValidationMessage(message) {
  return message.replace(/^Value error,\s*/, "");
}

function buildAuthErrors(details) {
  const errors = createEmptyAuthErrors();

  for (const item of details) {
    const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : null;
    const message = normalizeValidationMessage(String(item?.msg || "Campo inválido"));

    if (field && Object.prototype.hasOwnProperty.call(errors, field)) {
      errors[field] = message;
    } else {
      errors.general = errors.general || message;
    }
  }

  return errors;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession());
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN);
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState(null);
  const [authErrors, setAuthErrors] = useState(createEmptyAuthErrors());

  useEffect(() => {
    if (!session) return;

    getCurrentUser()
      .then((user) => {
        setSession({ username: user.username, email: user.email });
      })
      .catch(() => {
        handleAuthExpired();
      });
  }, [session?.username]);

  function changeAuthMode(mode) {
    setAuthMode(mode);
    setAuthMessage(null);
    setAuthErrors(createEmptyAuthErrors());
  }

  function handleAuthChange(event, mode) {
    const { name, value } = event.target;
    const setter = mode === "login" ? setLoginForm : setRegisterForm;
    setter((current) => ({ ...current, [name]: value }));
    setAuthErrors((current) => ({ ...current, [name]: "" }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);
    setAuthErrors(createEmptyAuthErrors());
    try {
      const user = await login({
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
      });
      setSession(user);
      setLoginForm(EMPTY_LOGIN);
    } catch (error) {
      setAuthMessage({ type: "error", text: error.message });
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);
    setAuthErrors(createEmptyAuthErrors());
    try {
      const user = await register({
        email: registerForm.email.trim(),
        username: registerForm.username.trim(),
        password: registerForm.password,
      });
      setSession(user);
      setRegisterForm(EMPTY_REGISTER);
    } catch (error) {
      if (error.status === 422 && Array.isArray(error.details)) {
        setAuthErrors(buildAuthErrors(error.details));
        setAuthMessage({
          type: "error",
          text: "Corrija os campos destacados para continuar.",
        });
      } else {
        setAuthMessage({ type: "error", text: error.message });
      }
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setAuthMessage(null);
  }

  function handleAuthExpired(messageText = "Sessão expirada. Faça login novamente.") {
    clearSession();
    setSession(null);
    setAuthMessage({ type: "error", text: messageText });
  }

  const value = {
    session,
    authMode,
    loginForm,
    registerForm,
    authLoading,
    authMessage,
    authErrors,
    changeAuthMode,
    handleAuthChange,
    handleLogin,
    handleRegister,
    handleLogout,
    handleAuthExpired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
