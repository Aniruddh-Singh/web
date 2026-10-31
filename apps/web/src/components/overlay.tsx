"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string;
  /** "sheet": bottom sheet on phones, centred modal from md. "drawer": slides in from the right. "lightbox": full-screen media. */
  variant: "sheet" | "drawer" | "lightbox";
  panelClassName?: string;
  children: React.ReactNode;
};

const layout = {
  sheet: {
    wrap: "flex h-full items-end md:items-center md:justify-center md:p-6",
    panel: "animate-sheet-up md:animate-zoom-in max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-paper md:max-w-4xl md:rounded-3xl",
  },
  drawer: {
    wrap: "flex h-full justify-end",
    panel: "animate-drawer-in flex h-full w-full max-w-md flex-col bg-cream shadow-2xl",
  },
  lightbox: {
    wrap: "flex h-full items-center justify-center bg-ink/90 p-3 sm:p-8",
    panel: "animate-zoom-in relative flex h-full w-full max-w-5xl flex-col",
  },
};

/** Modal built on <dialog>: native focus trap, Esc to close and focus return. Locks page (and Lenis) scroll while open. */
export function Overlay({ open, onClose, label, variant, panelClassName = "", children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
      window.__lenis?.stop();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onDialogClose = () => {
      document.documentElement.style.overflow = "";
      window.__lenis?.start();
      onClose();
    };
    dialog.addEventListener("close", onDialogClose);
    return () => dialog.removeEventListener("close", onDialogClose);
  }, [onClose]);

  return (
    <dialog ref={ref} aria-label={label} className="overlay">
      {open && (
        <div className={layout[variant].wrap} onClick={(e) => e.target === e.currentTarget && ref.current?.close()}>
          <div data-lenis-prevent className={`${layout[variant].panel} ${panelClassName}`}>
            {children}
          </div>
        </div>
      )}
    </dialog>
  );
}

export function CloseButton({ onClick, label = "Close", tone = "light", className = "" }: { onClick: () => void; label?: string; tone?: "light" | "dark"; className?: string }) {
  const colours = tone === "dark" ? "bg-paper/10 text-paper hover:bg-paper/20" : "bg-paper/90 text-ink shadow-sm hover:bg-surface";
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`grid h-11 w-11 place-items-center rounded-full transition active:scale-95 ${colours} ${className}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}
