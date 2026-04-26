import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { Range } from '@codemirror/state';
import { BMDSettings } from '../main';

export interface BulletBlock {
  from: number;
  to: number;
  indent: number;
  content: string;
  children: BulletBlock[];
  lineStart: number;
  lineEnd: number;
  isNumbered: boolean;
  numberValue?: number;
  lineFrom: number;
  lineTo: number;
  prefixLength: number;
}

export function parseBulletBlocks(text: string): BulletBlock[] {
  const lines = text.split('\n');
  const blocks: BulletBlock[] = [];
  const stack: BulletBlock[] = [];
  
  let charOffset = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\s*)(-|\d+-)\s+(.*)$/);
    
    if (match) {
      const indent = match[1].length;
      const prefix = match[2];
      const content = match[3];
      const isNumbered = /^\d+-/.test(prefix);
      const numberValue = isNumbered ? parseInt(prefix) : undefined;
      
      const block: BulletBlock = {
        from: charOffset,
        to: charOffset + line.length,
        indent,
        content,
        children: [],
        lineStart: i,
        lineEnd: i,
        isNumbered,
        numberValue,
        lineFrom: charOffset,
        lineTo: charOffset + line.length,
        prefixLength: prefix.length + 1 // prefix + space
      };
      
      // Pop stack until we find parent with less indent
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        const closed = stack.pop()!;
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(closed);
        } else {
          blocks.push(closed);
        }
      }
      
      stack.push(block);
    } else if (stack.length > 0) {
      // Non-bullet line, extend current block
      stack[stack.length - 1].to = charOffset + line.length;
      stack[stack.length - 1].lineEnd = i;
    }
    
    charOffset += line.length + 1; // +1 for newline
  }
  
  // Close remaining stack
  while (stack.length > 0) {
    const closed = stack.pop()!;
    if (stack.length > 0) {
      stack[stack.length - 1].children.push(closed);
    } else {
      blocks.push(closed);
    }
  }
  
  return blocks;
}

export function extractUrl(content: string): { url: string | null; rest: string } {
  // Match URLs, wiki links, or image embeds at the start
  const urlMatch = content.match(/^(https?:\/\/\S+|!\[\[.*?\]\]|\[\[.*?\]\]|!\[.*?\]\(.*?\))/);
  if (urlMatch) {
    const url = urlMatch[0];
    const rest = content.slice(url.length).trimStart();
    return { url, rest };
  }
  return { url: null, rest: content };
}

export function isImageOnly(content: string): boolean {
  const trimmed = content.trim();
  return /^!\[\[.*?\]\]$/.test(trimmed) || /^!\[.*?\]\(.*?\)$/.test(trimmed);
}

export function isQuotedText(content: string): boolean {
  return content.trimStart().startsWith('"');
}

class NumberBadgeWidget extends WidgetType {
  constructor(private numberValue: number) {
    super();
  }
  
  toDOM() {
    const span = document.createElement('span');
    span.className = 'bmd-number-badge';
    span.textContent = String(this.numberValue);
    return span;
  }
  
  eq(other: NumberBadgeWidget): boolean {
    return other.numberValue === this.numberValue;
  }
}

function createDecorations(view: EditorView, settings: BMDSettings): DecorationSet {
  if (!settings.enabled) return Decoration.none;
  
  const decorations: Range<Decoration>[] = [];
  const text = view.state.doc.toString();
  const blocks = parseBulletBlocks(text);
  let blockId = 0;
  
  for (const block of blocks) {
    // Only process top-level blocks (indent 0)
    if (block.indent > 0) continue;
    
    blockId++;
    const allLines = getAllLinesInBlock(block, view);
    
    // Tag each line in the block
    for (let i = 0; i < allLines.length; i++) {
      const lineInfo = allLines[i];
      const isFirst = i === 0;
      const isLast = i === allLines.length - 1;
      
      let lineClass = `bmd-line bmd-block-${blockId}`;
      if (lineInfo.isParent) lineClass += ' bmd-parent';
      else lineClass += ' bmd-child';
      if (isFirst) lineClass += ' bmd-first';
      if (isLast) lineClass += ' bmd-last';
      if (lineInfo.depth > 1) lineClass += ` bmd-deep-${lineInfo.depth}`;
      
      const lineDeco = Decoration.line({
        attributes: { class: lineClass }
      });
      decorations.push(lineDeco.range(lineInfo.line.from));
      
      // Process content marks
      if (lineInfo.isParent) {
        // Add numbered badge if applicable
        if (lineInfo.block.isNumbered && lineInfo.block.numberValue) {
          const badge = Decoration.widget({
            widget: new NumberBadgeWidget(lineInfo.block.numberValue),
            side: -1
          });
          decorations.push(badge.range(lineInfo.line.from));
        }
        
        // Parent line: split URL and text
        const { url, rest } = extractUrl(lineInfo.block.content);
        const line = lineInfo.line;
        const contentStart = line.from + lineInfo.block.indent + lineInfo.block.prefixLength;
        
        if (url) {
          const urlStart = contentStart;
          const urlEnd = urlStart + url.length;
          
          // Mark URL in left column
          decorations.push(Decoration.mark({
            class: 'bmd-url',
            inclusiveStart: false,
            inclusiveEnd: false
          }).range(urlStart, urlEnd));
          
          // Mark remaining text in right column (if no children)
          if (rest && lineInfo.block.children.length === 0) {
            const restStart = urlEnd + (lineInfo.block.content.charAt(url.length) === ' ' ? 1 : 0);
            decorations.push(Decoration.mark({
              class: 'bmd-text',
              inclusiveStart: false,
              inclusiveEnd: false
            }).range(restStart, line.to));
          }
        } else {
          // No URL found, put entire content in left column
          decorations.push(Decoration.mark({
            class: 'bmd-url',
            inclusiveStart: false,
            inclusiveEnd: false
          }).range(contentStart, line.to));
        }
      } else {
        // Child line: put content in right column
        const line = lineInfo.line;
        const contentStart = line.from + lineInfo.block.indent + lineInfo.block.prefixLength;
        const content = lineInfo.block.content;
        
        if (isImageOnly(content)) {
          // Single image
          decorations.push(Decoration.mark({
            class: 'bmd-image',
            inclusiveStart: false,
            inclusiveEnd: false
          }).range(contentStart, line.to));
        } else if (isQuotedText(content)) {
          // Quoted text
          decorations.push(Decoration.mark({
            class: 'bmd-quote',
            inclusiveStart: false,
            inclusiveEnd: false
          }).range(contentStart, line.to));
        } else {
          // Regular text
          const hasImage = content.includes('![[') || content.includes('![');
          const markClass = hasImage ? 'bmd-right bmd-has-image' : 'bmd-right';
          decorations.push(Decoration.mark({
            class: markClass,
            inclusiveStart: false,
            inclusiveEnd: false
          }).range(contentStart, line.to));
        }
      }
    }
  }
  
  return Decoration.set(decorations, true);
}

interface LineInfo {
  line: { from: number; to: number; text: string };
  block: BulletBlock;
  isParent: boolean;
  depth: number;
}

function getAllLinesInBlock(block: BulletBlock, view: EditorView): LineInfo[] {
  const lines: LineInfo[] = [];
  
  // Add parent line
  const parentLine = view.state.doc.lineAt(block.from);
  lines.push({
    line: { from: parentLine.from, to: parentLine.to, text: parentLine.text },
    block,
    isParent: true,
    depth: 0
  });
  
  // Add child lines recursively
  function addChildren(children: BulletBlock[], depth: number) {
    for (const child of children) {
      const childLine = view.state.doc.lineAt(child.from);
      lines.push({
        line: { from: childLine.from, to: childLine.to, text: childLine.text },
        block: child,
        isParent: false,
        depth
      });
      
      if (child.children.length > 0) {
        addChildren(child.children, depth + 1);
      }
    }
  }
  
  addChildren(block.children, 1);
  return lines;
}

export function bmdExtension(settings: BMDSettings) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      prevEnabled: boolean;
      
      constructor(view: EditorView) {
        this.prevEnabled = settings.enabled;
        this.decorations = createDecorations(view, settings);
      }
      
      update(update: ViewUpdate) {
        const enabledChanged = settings.enabled !== this.prevEnabled;
        if (update.docChanged || update.viewportChanged || enabledChanged) {
          this.prevEnabled = settings.enabled;
          this.decorations = createDecorations(update.view, settings);
        }
      }
    },
    {
      decorations: v => v.decorations
    }
  );
}
