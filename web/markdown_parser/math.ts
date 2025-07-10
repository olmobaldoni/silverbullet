import { type MarkdownConfig, type Line } from "@lezer/markdown";
import { tags as t } from "@lezer/highlight";
import * as ct from "./customtags.ts";

export const Math: MarkdownConfig = {
  defineNodes: [
    {
      name: "InlineMath",
      style: { "InlineMath/...": ct.InlineMathTag },
    },
    {
      name: "BlockMath", 
      style: { "BlockMath/...": ct.BlockMathTag },
      block: true
    },
    {
      name: "MathMark",
      style: t.processingInstruction,
    },
    {
      name: "MathContent",
      style: ct.MathContentTag,
    },
  ],
  parseInline: [
    {
      name: "InlineMath",
      parse(cx, next, pos) {
        // Handle $...$ inline math
        if (next !== 36 /* '$' */) return -1;
        
        // Check if it's display math ($$)
        if (cx.char(pos + 1) === 36) return -1;
        
        // Skip if preceded by backslash (escaped)
        if (pos > 0 && cx.char(pos - 1) === 92 /* '\' */) return -1;
        
        // Look for closing $, but skip if it's at the start (empty math)
        let endPos = pos + 1;
        let foundClose = false;
        
        while (endPos < cx.end) {
          const char = cx.char(endPos);
          
          // Skip escaped characters
          if (char === 92 /* '\' */ && endPos + 1 < cx.end) {
            endPos += 2;
            continue;
          }
          
          // Found closing $
          if (char === 36 /* '$' */) {
            // Make sure it's not escaped and there's content
            if (endPos > pos + 1) {
              foundClose = true;
              break;
            }
          }
          
          // Don't cross line boundaries for inline math
          if (char === 10 /* '\n' */) break;
          
          endPos++;
        }
        
        if (!foundClose || endPos === pos + 1) return -1;
        
        return cx.addElement(
          cx.elt("InlineMath", pos, endPos + 1, [
            cx.elt("MathMark", pos, pos + 1),
            cx.elt("MathContent", pos + 1, endPos),
            cx.elt("MathMark", endPos, endPos + 1),
          ])
        );
      },
      after: "Emphasis",
    },
    {
      name: "InlineMathBrackets",
      parse(cx, next, pos) {
        // Handle \(...\) inline math
        if (next !== 92 /* '\' */ || cx.char(pos + 1) !== 40 /* '(' */) return -1;
        
        // Look for closing \)
        let endPos = pos + 2;
        let foundClose = false;
        
        while (endPos < cx.end - 1) {
          const char = cx.char(endPos);
          
          // Skip escaped characters
          if (char === 92 /* '\' */ && endPos + 1 < cx.end) {
            const nextChar = cx.char(endPos + 1);
            if (nextChar === 41 /* ')' */) {
              // Found closing \)
              foundClose = true;
              break;
            }
            endPos += 2;
            continue;
          }
          
          // Don't cross line boundaries for inline math
          if (char === 10 /* '\n' */) break;
          
          endPos++;
        }
        
        if (!foundClose || endPos === pos + 2) return -1;
        
        return cx.addElement(
          cx.elt("InlineMath", pos, endPos + 2, [
            cx.elt("MathMark", pos, pos + 2),
            cx.elt("MathContent", pos + 2, endPos),
            cx.elt("MathMark", endPos, endPos + 2),
          ])
        );
      },
      after: "Emphasis",
    },
  ],
  parseBlock: [
    {
      name: "BlockMath",
      parse(cx, line: Line) {
        // Handle $$...$$ block math
        if (!line.text.startsWith("$$")) return false;
        
        const startPos = cx.parsedPos;
        const elts = [
          cx.elt("MathMark", startPos, startPos + 2)
        ];
        
        // Check if it's a single line $$content$$
        const singleLineMatch = line.text.match(/^\$\$(.*)\$\$$/);
        if (singleLineMatch) {
          const content = singleLineMatch[1];
          // Don't allow empty math blocks
          if (content.trim().length === 0) return false;
          
          const contentStart = startPos + 2;
          const contentEnd = startPos + 2 + content.length;
          const endPos = startPos + line.text.length;
          
          elts.push(cx.elt("MathContent", contentStart, contentEnd));
          elts.push(cx.elt("MathMark", contentEnd, endPos));
          
          cx.nextLine();
          cx.addElement(cx.elt("BlockMath", startPos, endPos, elts));
          return true;
        }
        
        // Multi-line block math
        const contentStart = startPos + 2;
        let contentLines: string[] = [];
        let currentContent = line.text.slice(2);
        
        // If the first line has content after $$, include it
        if (currentContent.trim()) {
          contentLines.push(currentContent);
        }
        
        cx.nextLine();
        let lastPos = cx.parsedPos;
        let maxLines = 100; // Prevent infinite loops
        let lineCount = 0;
        
        // Look for closing $$
        while (lineCount < maxLines) {
          lineCount++;
          
          // Check for end of document by comparing positions
          if (cx.parsedPos === lastPos) {
            // No progress made, probably end of file
            return false;
          }
          
          // Check if this line ends with $$
          if (line.text.endsWith("$$") && line.text.length >= 2) {
            const lineContent = line.text.slice(0, -2);
            if (lineContent || contentLines.length > 0) {
              contentLines.push(lineContent);
            }
            
            // Only create math block if there's actual content
            const totalContent = contentLines.join('\n').trim();
            if (totalContent.length === 0) return false;
            
            const contentEnd = cx.parsedPos + line.text.length - 2;
            const endPos = cx.parsedPos + line.text.length;
            
            elts.push(cx.elt("MathContent", contentStart, contentEnd));
            elts.push(cx.elt("MathMark", contentEnd, endPos));
            
            cx.nextLine();
            cx.addElement(cx.elt("BlockMath", startPos, endPos, elts));
            return true;
          }
          
          // Add this line to content
          contentLines.push(line.text);
          lastPos = cx.parsedPos;
          cx.nextLine();
        }
        
        return false; // No closing $$ found within reasonable limit
      },
      before: "SetextHeading",
    },
    {
      name: "BlockMathBrackets", 
      parse(cx, line: Line) {
        // Handle \[...\] block math
        if (!line.text.startsWith("\\[")) return false;
        
        const startPos = cx.parsedPos;
        const elts = [
          cx.elt("MathMark", startPos, startPos + 2)
        ];
        
        // Check if it's a single line \[content\]
        const singleLineMatch = line.text.match(/^\\\[(.*)\\\]$/);
        if (singleLineMatch) {
          const content = singleLineMatch[1];
          if (content.trim().length === 0) return false;
          
          const contentStart = startPos + 2;
          const contentEnd = startPos + 2 + content.length;
          const endPos = startPos + line.text.length;
          
          elts.push(cx.elt("MathContent", contentStart, contentEnd));
          elts.push(cx.elt("MathMark", contentEnd, endPos));
          
          cx.nextLine();
          cx.addElement(cx.elt("BlockMath", startPos, endPos, elts));
          return true;
        }
        
        // Multi-line block math with \[...\]
        const contentStart = startPos + 2;
        let contentLines: string[] = [];
        let currentContent = line.text.slice(2);
        
        if (currentContent.trim()) {
          contentLines.push(currentContent);
        }
        
        cx.nextLine();
        let lastPos = cx.parsedPos;
        let maxLines = 100;
        let lineCount = 0;
        
        while (lineCount < maxLines) {
          lineCount++;
          
          // Check for end of document by comparing positions
          if (cx.parsedPos === lastPos) {
            // No progress made, probably end of file
            return false;
          }
          
          if (line.text.endsWith("\\]") && line.text.length >= 2) {
            const lineContent = line.text.slice(0, -2);
            if (lineContent || contentLines.length > 0) {
              contentLines.push(lineContent);
            }
            
            const totalContent = contentLines.join('\n').trim();
            if (totalContent.length === 0) return false;
            
            const contentEnd = cx.parsedPos + line.text.length - 2;
            const endPos = cx.parsedPos + line.text.length;
            
            elts.push(cx.elt("MathContent", contentStart, contentEnd));
            elts.push(cx.elt("MathMark", contentEnd, endPos));
            
            cx.nextLine();
            cx.addElement(cx.elt("BlockMath", startPos, endPos, elts));
            return true;
          }
          
          contentLines.push(line.text);
          lastPos = cx.parsedPos;
          cx.nextLine();
        }
        
        return false;
      },
      before: "SetextHeading",
    }
  ],
};
