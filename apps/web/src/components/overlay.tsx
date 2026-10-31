"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";

type Variant = "sheet" | "drawer" | "lightbox";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string;
  /** "sheet": bottom sheet on phones, centred modal from md. "drawer": bottom sheet on phones, right-hand drawer from md. "lightbox": full-screen media. */
  variant: Variant;
  /** Let the content manage its own scrolling (e.g. a fixed photo above scrolling details). */
  contentScroll?: boolean;
  panelClassName?: string;
  children: React.ReactNode;
};

const layout: Record<Variant, { wrap: string; panel: string }> = {
  sheet: {
    wrap: "flex h-full items-end md:items-center md:justify-center md:p-6",
    panel: "overlay-sheet max-h-[92dvh] w-full rounded-t-3xl bg-paper md:max-h-[88dvh] md:max-w-4xl md:rounded-3xl",
  },
  drawer: {
    wrap: "flex h-full items-end md:items-stretch md:justify-end",
    panel: "overlay-drawer flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-cream shadow-2xl md:h-full md:max-w-md md:rounded-none",
  },
  lightbox: {
    wrap: "flex h-full items-center justify-center bg-ink/90 p-3 sm:p-8",
    panel: "animate-zoom-in relative flex h-full w-full max-w-5xl flex-col",
  },
};

/** Exit motion mirrors the entrance: on phones sheets and the cart drop back down; on desktop the drawer slides right, the modal fades. */
function exitKeyframes(variant: Variant): Keyframe[] {
  const desktop = window.matchMedia("(min-width: 768px)").matches;
  if (variant === "drawer" && desktop) return [{ transform: "translateX(0)" }, { transform: "translateX(100%)" }];
  if (variant !== "lightbox" && !desktop) return [{ transform: "translateY(0)" }, { transform: "translateY(100%)" }];
  return [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(12px)" }];
}

const CloseContext = createContext<(() => Promise<void>) | null>(null);

/** Modal built on <dialog>: native focus trap and focus return, animated open/close, page (and Lenis) scroll locked while open. */
export function Overlay({ open, onClose, label, variant, contentScroll = false, panelClassName = "", children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  // Animate out, then close the dialog; its "close" event reports back through onClose.
  const requestClose = useCallback(async () => {
    const dialog = ref.current;
    if (!dialog?.open || closing.current) return;
    closing.current = true;
    const panel = panelRef.current;
    if (panel && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      await panel.animate(exitKeyframes(variant), { duration: 220, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" }).finished.catch(() => {});
    }
    dialog.close();
    closing.current = false;
  }, [variant]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
      window.__lenis?.stop();
    } else if (!open && dialog.open) {
      void requestClose();
    }
  }, [open, requestClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onDialogClose = () => {
      document.documentElement.style.overflow = "";
      window.__lenis?.start();
      onClose();
    };
    // Esc: run the exit animation instead of the instant native close.
    const onCancel = (e: Event) => {
      e.preventDefault();
      void requestClose();
    };
    dialog.addEventListener("close", onDialogClose);
    dialog.addEventListener("cancel", onCancel);
    return () => {
      dialog.removeEventListener("close", onDialogClose);
      dialog.removeEventListener("cancel", onCancel);
    };
  }, [onClose, requestClose]);

  return (
    <dialog ref={ref} aria-label={label} className="overlay">
      {open && (
        <CloseContext.Provider value={requestClose}>
          <div className={`${layout[variant].wrap} overflow-clip`} onClick={(e) => e.target === e.currentTarget && void requestClose()}>
            <div
              ref={panelRef}
              data-lenis-prevent
              className={`${layout[variant].panel} ${variant === "sheet" ? (contentScroll ? "flex flex-col overflow-hidden" : "overflow-y-auto overscroll-contain") : ""} ${panelClassName}`}
            >
              {children}
            </div>
          </div>
        </CloseContext.Provider>
      )}
    </dialog>
  );
}

/** Close button; inside an Overlay it plays the exit animation first. */
export function CloseButton({ onClick, label = "Close", tone = "light", className = "" }: { onClick?: () => void; label?: string; tone?: "light" | "dark"; className?: string }) {
  const close = useContext(CloseContext);
  const colours = tone === "dark" ? "bg-paper/10 text-paper hover:bg-paper/20" : "bg-paper/90 text-ink shadow-sm hover:bg-surface";
  return (
    <button
      type="button"
      onClick={() => (close ? void close() : onClick?.())}
      aria-label={label}
      className={`grid h-11 w-11 place-items-center rounded-full backdrop-blur transition active:scale-95 ${colours} ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

/** Close the surrounding Overlay with its exit animation (no-op outside one). */
export function useOverlayClose() {
  return useContext(CloseContext);
}
