import { type EditorState, type Range } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { Decoration, type WidgetType } from "@codemirror/view";
import { type SyntaxNode, type SyntaxNodeRef } from "@lezer/common";
import {
  decoratorStateField,
  isCursorInRange,
  shouldRenderWidgets,
} from "./util.ts";

/**
 * Creates a CodeMirror extension that renders block widgets based on syntax nodes
 */
export function renderBlockWidgets<T extends WidgetType>(
  shouldHandleNode: (node: SyntaxNodeRef) => boolean,
  createWidget: (state: EditorState, node: SyntaxNodeRef) => T | undefined
) {
  return decoratorStateField((state: EditorState) => {
    const widgets: Range<Decoration>[] = [];
    
    syntaxTree(state).iterate({
      enter(nodeRef) {
        if (!shouldHandleNode(nodeRef)) {
          return true;
        }

        // Don't render if cursor is in the node
        if (isCursorInRange(state, [nodeRef.from, nodeRef.to])) {
          return true;
        }

        // Create the widget
        const widget = createWidget(state, nodeRef);
        if (widget) {
          widgets.push(
            Decoration.widget({
              widget,
              side: 1,
            }).range(nodeRef.from)
          );
        }

        return true;
      },
    });

    return Decoration.set(widgets);
  });
}
