const navigationKeys = new Set([
  "Tab",
  "Enter",
  " ",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

/** Keep pointer-driven and programmatic menu focus quiet until keyboard navigation resumes. */
export function installFocusInputMode(document: Document): () => void {
  const root = document.documentElement;
  const setMode = (mode: "pointer" | "keyboard") => {
    if (root.dataset.focusInput !== mode) root.dataset.focusInput = mode;
  };
  const onPointerDown = () => setMode("pointer");
  const onKeyDown = (event: KeyboardEvent) => {
    if (!event.metaKey && !event.ctrlKey && !event.altKey && navigationKeys.has(event.key)) {
      setMode("keyboard");
    }
  };
  const controller = new AbortController();
  const options = { capture: true, signal: controller.signal };
  setMode("keyboard");
  document.addEventListener("pointerdown", onPointerDown, options);
  document.addEventListener("keydown", onKeyDown, options);
  return () => {
    controller.abort();
    delete root.dataset.focusInput;
  };
}
