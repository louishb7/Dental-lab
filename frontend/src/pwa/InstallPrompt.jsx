import { createContext, useContext, useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";

const InstallContext = createContext(null);

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

function isIphoneSafari() {
  const agent = navigator.userAgent;
  return /iPhone/.test(agent) && /Safari/.test(agent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(agent);
}

export function InstallPromptProvider({ children }) {
  const [standalone, setStandalone] = useState(isStandalone);
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateDisplayMode = () => setStandalone(isStandalone());
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setInstructionsOpen(false);
    };
    displayMode.addEventListener("change", updateDisplayMode);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      displayMode.removeEventListener("change", updateDisplayMode);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const mode =
    !hidden && !standalone && !installed
      ? promptEvent
        ? "prompt"
        : isIphoneSafari()
          ? "ios"
          : null
      : null;

  async function install() {
    if (mode === "ios") {
      setInstructionsOpen(true);
      return;
    }
    if (!promptEvent) return;
    const event = promptEvent;
    setPromptEvent(null); // beforeinstallprompt events can only be used once.
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      // A browser can cancel the native prompt; offer it again only after a full reload.
    } finally {
      setHidden(true);
    }
  }

  return (
    <InstallContext.Provider
      value={{
        mode,
        install,
        dismiss: () => setHidden(true),
        instructionsOpen,
        setInstructionsOpen,
      }}
    >
      {children}
    </InstallContext.Provider>
  );
}

export function InstallPromptBanner() {
  const context = useContext(InstallContext);
  if (!context) throw new Error("InstallPromptBanner requires InstallPromptProvider");
  const { mode, install, dismiss, instructionsOpen, setInstructionsOpen } = context;

  return (
    <>
      {mode && (
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-primary/20 bg-[var(--color-surface)] px-[var(--space-page-x)] py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-[var(--color-text)] shadow-sm">
          <Download size={18} className="shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-xs sm:text-sm">
            <strong className="font-semibold">Instale o Cadisk</strong>
            <span className="ml-1 text-[var(--color-text-muted)]">
              Acesse mais rápido pela tela inicial.
            </span>
          </div>
          <Button size="sm" variant="primary" onClick={() => void install()}>
            Instalar Cadisk
          </Button>
          <Button
            size="sm"
            variant="ghost"
            iconOnly
            aria-label="Fechar sugestão de instalação"
            onClick={dismiss}
          >
            <X size={16} />
          </Button>
        </div>
      )}
      {instructionsOpen && (
        <Modal
          title="Instalar Cadisk"
          onClose={() => setInstructionsOpen(false)}
          className="max-w-sm"
        >
          <ol className="list-inside list-decimal space-y-2 text-sm text-[var(--color-text-soft)]">
            <li>Toque em Compartilhar no Safari.</li>
            <li>Escolha Adicionar à Tela de Início.</li>
            <li>Ative Abrir como App da Web, quando disponível.</li>
            <li>Toque em Adicionar.</li>
          </ol>
        </Modal>
      )}
    </>
  );
}
