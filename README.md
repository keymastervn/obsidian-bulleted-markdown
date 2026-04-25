# Bulleted Markdown (BMD) for Obsidian

Renders bullet lists as two-column cards in **Live Preview** while keeping your raw markdown pure and GitHub-compatible.

## What It Does

**Input** (plain markdown):
```markdown
- https://news.ycombinator.com/item?id=47892074
  - Interesting discussion about AI coding assistants
  - "The key insight is that context window management is the bottleneck
  - ![[screenshot.png]] HN thread screenshot
    - deeper level 1
      - deeper level n

1- second_entry
  - another comment
```

**Output** (in Obsidian Live Preview):
- Top-level bullets become **card containers** with a left sidebar and right content area
- Nested bullets stack in the right column
- Quoted text (`"...`) gets a left accent border
- Images render as compact thumbnails
- `1-` prefix shows a numbered badge

## Installation

1. Copy `manifest.json`, `main.js`, and `styles.css` to your Obsidian vault:
   ```
   .obsidian/plugins/obsidian-bulleted-markdown/
   ```
2. Enable the plugin in **Settings → Community Plugins**

## Usage

Just write normal markdown bullet lists. The plugin automatically detects:
- `- ` (standard bullet)
- `1- `, `2- `, etc. (numbered bullet with badge)

All rendering happens in **Live Preview** mode. The underlying `.md` file stays unchanged.

## Features

- **Pure markdown** - No custom syntax, no frontmatter, no HTML in your files
- **GitHub compatible** - Renders as normal bullet lists on GitHub
- **Live Preview** - Updates as you type
- **Settings** - Toggle on/off, adjust column widths, image sizes
- **Mobile responsive** - Stacks to single column on narrow screens

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Enable BMD rendering | Toggle the card layout | `true` |
| Left column width | Width of left sidebar (px) | `200` |
| Card border radius | Border radius of cards (px) | `8` |
| Image max height | Max height of images (px) | `120` |
| Enable on mobile | Allow on mobile devices | `true` |

## Development

```bash
npm install --legacy-peer-deps
npm run build    # Production build
npm run dev      # Watch mode
```

## File Structure

```
obsidian-bulleted-markdown/
├── manifest.json          # Plugin metadata
├── main.ts               # Entry point
├── main.js               # Compiled output (copy to .obsidian/plugins/)
├── styles.css            # Card layout styles
├── src/
│   └── bmd-extension.ts  # CodeMirror 6 extension
├── esbuild.config.mjs    # Build configuration
└── tsconfig.json         # TypeScript config
```

## How It Works

The plugin uses a **CodeMirror 6 ViewPlugin** that:
1. Scans the document for bullet patterns (`/^\s*(-|\d+-)\s/`)
2. Creates **decoration widgets** to inject card container `<div>` elements
3. Applies **mark decorations** to style content into left/right columns
4. Updates decorations on every document change for real-time rendering

The decorations are purely visual - your document text is never modified.

## License

MIT
