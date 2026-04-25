import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { Range } from '@codemirror/state';
import { BMDSettings } from '../main';

interface BulletBlock {
  from: number;
  to: number;
  indent: number;
  content: string;
  children: BulletBlock[];
  lineStart: number;
  lineEnd: number;
  isNumbered: boolean;
  numberValue?: number;
}

function parseBulletBlocks(text: string): BulletBlock[] {
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
        numberValue
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

function createDecorations(view: EditorView, settings: BMDSettings): DecorationSet {
  if (!settings.enabled) return Decoration.none;
  
  const widgets: Range<Decoration>[] = [];
  const text = view.state.doc.toString();
  const blocks = parseBulletBlocks(text);
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    
    // Only process top-level blocks (indent 0)
    if (block.indent > 0) continue;
    
    // Create card container start
    const cardStart = Decoration.widget({
      widget: new CardStartWidget(settings, block.isNumbered, block.numberValue),
      side: -1
    });
    widgets.push(cardStart.range(block.from));
    
    // Create left column marker for the parent bullet
    const leftMarker = Decoration.mark({
      class: 'bmd-left',
      inclusiveStart: false,
      inclusiveEnd: false
    });
    
    // Find the content range (after the bullet marker)
    const line = view.state.doc.lineAt(block.from);
    const contentStart = line.from + block.indent + (block.isNumbered ? String(block.numberValue).length + 2 : 2);
    widgets.push(leftMarker.range(contentStart, line.to));
    
    // Create right column for children
    if (block.children.length > 0) {
      const firstChild = block.children[0];
      const lastChild = block.children[block.children.length - 1];
      
      const rightMarker = Decoration.mark({
        class: 'bmd-right',
        inclusiveStart: false,
        inclusiveEnd: false
      });
      widgets.push(rightMarker.range(firstChild.from, lastChild.to));
      
      // Process nested items
      for (const child of block.children) {
        // Check for quoted text
        if (child.content.startsWith('"')) {
          const quoteMarker = Decoration.mark({
            class: 'bmd-quote',
            inclusiveStart: false,
            inclusiveEnd: false
          });
          const childLine = view.state.doc.lineAt(child.from);
          const childContentStart = childLine.from + child.indent + 2;
          widgets.push(quoteMarker.range(childContentStart, childLine.to));
        }
        
        // Check for images
        if (child.content.includes('![[') || child.content.includes('![')) {
          const imgMarker = Decoration.mark({
            class: 'bmd-image',
            inclusiveStart: false,
            inclusiveEnd: false
          });
          const childLine = view.state.doc.lineAt(child.from);
          widgets.push(imgMarker.range(childLine.from, childLine.to));
        }
        
        // Handle deeper nesting
        if (child.children.length > 0) {
          const deepMarker = Decoration.mark({
            class: 'bmd-deep-nest',
            inclusiveStart: false,
            inclusiveEnd: false
          });
          const firstDeep = child.children[0];
          const lastDeep = child.children[child.children.length - 1];
          widgets.push(deepMarker.range(firstDeep.from, lastDeep.to));
        }
      }
    }
    
    // Create card container end
    const cardEnd = Decoration.widget({
      widget: new CardEndWidget(),
      side: 1
    });
    widgets.push(cardEnd.range(block.to));
  }
  
  return Decoration.set(widgets, true);
}

class CardStartWidget extends WidgetType {
  constructor(
    private settings: BMDSettings,
    private isNumbered: boolean,
    private numberValue?: number
  ) {
    super();
  }
  
  toDOM() {
    const div = document.createElement('div');
    div.className = 'bmd-card';
    div.style.setProperty('--bmd-left-width', `${this.settings.leftColumnWidth}px`);
    div.style.setProperty('--bmd-border-radius', `${this.settings.cardBorderRadius}px`);
    div.style.setProperty('--bmd-image-max-height', `${this.settings.imageMaxHeight}px`);
    
    if (this.isNumbered && this.numberValue) {
      const badge = document.createElement('span');
      badge.className = 'bmd-number-badge';
      badge.textContent = String(this.numberValue);
      div.appendChild(badge);
    }
    
    return div;
  }
  
  eq(other: CardStartWidget): boolean {
    return other.isNumbered === this.isNumbered && 
           other.numberValue === this.numberValue &&
           other.settings.leftColumnWidth === this.settings.leftColumnWidth;
  }
}

class CardEndWidget extends WidgetType {
  toDOM() {
    const div = document.createElement('div');
    div.className = 'bmd-card-end';
    return div;
  }
  
  eq(other: CardEndWidget): boolean {
    return true;
  }
}

export function bmdExtension(settings: BMDSettings) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      
      constructor(view: EditorView) {
        this.decorations = createDecorations(view, settings);
      }
      
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = createDecorations(update.view, settings);
        }
      }
    },
    {
      decorations: v => v.decorations
    }
  );
}
