import { type EditorView } from "@codemirror/view";

/**
 * Creates a click handler that selects the clicked element
 */
export default function clickAndSelect(view: EditorView) {
  return (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Get the position of the click
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos) {
      // Select the element that was clicked
      view.dispatch({
        selection: { anchor: pos, head: pos },
      });
      view.focus();
    }
  };
}
