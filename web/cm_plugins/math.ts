import type { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { Decoration, WidgetType } from "@codemirror/view";
import {
  decoratorStateField,
  isCursorInRange,
} from "./util.ts";
import { getKaTeX, renderMath, createFallbackElement } from "../math_utils.ts";

class MathWidget extends WidgetType {
  private static katexPromise: Promise<any> | null = null;

  constructor(
    readonly content: string,
    readonly isBlock: boolean,
  ) {
    super();
  }

  toDOM() {
    const element = document.createElement(this.isBlock ? "div" : "span");
    element.className = this.isBlock ? "sb-math-block" : "sb-math-inline";
    
    // Set data attributes for debugging and CSS targeting
    element.setAttribute('data-math-content', this.content);
    element.setAttribute('data-math-mode', this.isBlock ? 'block' : 'inline');
    
    // Show loading state initially
    element.classList.add('math-loading');
    element.textContent = this.isBlock ? `$$${this.content}$$` : `$${this.content}$`;
    
    // Attempt to render with KaTeX asynchronously
    this.renderAsync(element);
    
    return element;
  }

  private async renderAsync(element: HTMLElement) {
    try {
      // Use cached promise or create new one
      if (!MathWidget.katexPromise) {
        MathWidget.katexPromise = getKaTeX();
      }
      
      const katex = await MathWidget.katexPromise;
      element.classList.remove('math-loading');
      
      if (katex && renderMath(this.content, element, this.isBlock, katex)) {
        element.classList.add('katex-rendered');
      } else {
        // Fallback rendering
        this.renderFallback(element);
      }
    } catch (error) {
      console.warn('Math rendering error:', error);
      element.classList.remove('math-loading');
      this.renderError(element, error);
    }
  }

  private renderFallback(element: HTMLElement) {
    const fallback = createFallbackElement(this.content, this.isBlock);
    element.className = fallback.className;
    element.textContent = fallback.textContent;
    element.classList.add('math-fallback');
  }

  private renderError(element: HTMLElement, error: any) {
    const errorElement = createFallbackElement(this.content, this.isBlock, true);
    element.className = errorElement.className;
    element.textContent = errorElement.textContent;
    element.title = `Math rendering error: ${error.message || error}`;
  }

  override eq(other: MathWidget) {
    return other.content === this.content && other.isBlock === this.isBlock;
  }
}

export function mathPlugin() {
  return decoratorStateField((state: EditorState) => {
    const widgets: any[] = [];
    const doc = state.doc;
    
    // Performance optimization: only process visible range for large documents
    const shouldProcessRange = (from: number, to: number) => {
      // Always process if document is small
      if (doc.length < 10000) return true;
      
      // For large documents, only process a reasonable range around the cursor
      const sel = state.selection.main;
      const bufferSize = 5000;
      return (to >= sel.from - bufferSize && from <= sel.to + bufferSize);
    };

    try {
      syntaxTree(state).iterate({
        enter: ({ type, from, to, node }) => {
          // Skip if cursor is in range (show raw LaTeX when editing)
          if (isCursorInRange(state, [from, to])) return;
          
          // Performance check
          if (!shouldProcessRange(from, to)) return;
          
          if (type.name === "InlineMath" || type.name === "BlockMath") {
            const isBlock = type.name === "BlockMath";
            
            // Find the MathContent node
            let mathContent = "";
            let contentFound = false;
            
            try {
              const cursor = node.cursor();
              cursor.iterate((childNode) => {
                if (childNode.type.name === "MathContent") {
                  mathContent = state.doc.sliceString(childNode.from, childNode.to);
                  contentFound = true;
                  return false; // Stop iteration
                }
                return true;
              });
            } catch (error) {
              console.warn('Error iterating math node:', error);
              return;
            }

            // Only create widget if we found content and it's not empty
            if (contentFound && mathContent.trim()) {
              try {
                widgets.push(
                  Decoration.replace({
                    widget: new MathWidget(mathContent, isBlock),
                    inclusive: true,
                    block: isBlock,
                  }).range(from, to)
                );
              } catch (error) {
                console.warn('Error creating math widget:', error);
              }
            }
          }
        },
      });
    } catch (error) {
      console.error('Error in math plugin:', error);
      // Return empty decoration set on error to prevent editor crashes
      return Decoration.set([], true);
    }

    return Decoration.set(widgets, true);
  });
}
