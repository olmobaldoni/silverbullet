import { type SyntaxNode, Tree } from '@lezer/common'
import { type LRParser } from '@lezer/lr'
import { type InlineContext, type Element } from '@lezer/markdown'

/**
 * Parses a string using the given parser and returns a syntax tree element
 * that can be embedded in a markdown parse tree.
 */
export function partialParse (
  ctx: InlineContext,
  parser: LRParser,
  text: string,
  startPos: number
): Element {
  // Parse the text with the given parser
  const tree = parser.parse(text)
  
  // Convert the tree to a syntax node at the correct position
  return ctx.elt(tree, startPos)
}
