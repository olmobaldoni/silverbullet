import { type EditorView } from "@codemirror/view";

/**
 * Shows a context menu for equations
 */
export function equationMenu(
  view: EditorView,
  equation: string,
  position: { x: number; y: number }
) {
  // For now, just copy the equation to clipboard
  navigator.clipboard.writeText(equation).then(() => {
    console.log("Equation copied to clipboard:", equation);
  }).catch((err) => {
    console.error("Failed to copy equation:", err);
  });
}
