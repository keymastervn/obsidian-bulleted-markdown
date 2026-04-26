#!/usr/bin/env node
/**
 * BMD Markdown to HTML Preview Converter
 * 
 * Usage: node fixtures/convert-to-html.js
 * 
 * This script reads fixtures/test-rendering.md and generates
 * fixtures/test-preview.html with BMD-style rendering.
 */

const fs = require('fs');
const path = require('path');

// Parse bullet blocks from markdown text
function parseBulletBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  const stack = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\s*)(-|\d+-)\s+(.*)$/);
    
    if (match) {
      const indent = match[1].length;
      const prefix = match[2];
      const content = match[3];
      const isNumbered = /^\d+-/.test(prefix);
      const numberValue = isNumbered ? parseInt(prefix) : undefined;
      
      const block = {
        indent,
        content,
        children: [],
        isNumbered,
        numberValue,
        lineIndex: i,
        prefixLength: prefix.length + 1 // prefix + space
      };
      
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        const closed = stack.pop();
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(closed);
        } else {
          blocks.push(closed);
        }
      }
      
      stack.push(block);
    } else if (stack.length > 0 && line.trim() !== '') {
      // Non-bullet line that's indented (continuation)
      stack[stack.length - 1].content += ' ' + line.trim();
    }
    // Empty lines don't close blocks - blocks extend across them (match plugin behavior)
  }
  
  // Close remaining stack
  while (stack.length > 0) {
    const closed = stack.pop();
    if (stack.length > 0) {
      stack[stack.length - 1].children.push(closed);
    } else {
      blocks.push(closed);
    }
  }
  
  return blocks;
}

function extractUrl(content) {
  const urlMatch = content.match(/^(https?:\/\/\S+|!\[\[.*?\]\]|\[\[.*?\]\]|!\[.*?\]\(.*?\))/);
  if (urlMatch) {
    const url = urlMatch[0];
    const rest = content.slice(url.length).trimStart();
    return { url, rest };
  }
  return { url: null, rest: content };
}

function isImageOnly(content) {
  const trimmed = content.trim();
  return /^!\[\[.*?\]\]$/.test(trimmed) || /^!\[.*?\]\(.*?\)$/.test(trimmed);
}

function isQuotedText(content) {
  return content.trimStart().startsWith('"');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderUrl(url) {
  if (url.startsWith('http')) {
    return `<a href="${url}">${url}</a>`;
  }
  return escapeHtml(url);
}

function renderBlock(block, depth = 0, isFirst = true, isLast = true, blockId = 0) {
  const lines = [];
  const allBlockLines = [];
  
  // Collect all lines in this block
  function collectLines(b, d) {
    allBlockLines.push({ block: b, depth: d, isParent: d === 0 });
    b.children.forEach(child => collectLines(child, d + 1));
  }
  collectLines(block, depth);
  
  const totalLines = allBlockLines.length;
  
  allBlockLines.forEach((lineInfo, index) => {
    const b = lineInfo.block;
    const d = lineInfo.depth;
    const isLineFirst = index === 0;
    const isLineLast = index === totalLines - 1;
    
    let lineClass = 'bmd-line';
    if (isLineFirst) lineClass += ' bmd-first';
    if (isLineLast) lineClass += ' bmd-last';
    if (d > 1) lineClass += ` bmd-deep-${d}`;
    
    let leftContent = '';
    let rightContent = '';
    
    if (lineInfo.isParent) {
      const { url, rest } = extractUrl(b.content);
      
      if (b.isNumbered && b.numberValue) {
        leftContent = `<span style="position:absolute;top:-10px;left:-10px;background:#0969da;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:0.8em;font-weight:700;z-index:10">${b.numberValue}</span>`;
      }
      
      if (url) {
        leftContent += renderUrl(url);
        if (rest && b.children.length === 0) {
          rightContent = escapeHtml(rest);
        }
      } else {
        leftContent += escapeHtml(b.content);
      }
    } else {
      const content = b.content;
      if (isImageOnly(content)) {
        rightContent = `<span class="bmd-image-placeholder">${escapeHtml(content)}</span>`;
      } else if (isQuotedText(content)) {
        rightContent = escapeHtml(content);
      } else {
        rightContent = escapeHtml(content);
      }
    }
    
    let lineHtml = `    <div class="${lineClass}">`;
    lineHtml += `\n      <div class="bmd-url">${leftContent}</div>`;
    
    if (rightContent) {
      let rightClass = 'bmd-text';
      if (!lineInfo.isParent) {
        if (isImageOnly(b.content)) {
          rightClass = 'bmd-image';
        } else if (isQuotedText(b.content)) {
          rightClass = 'bmd-quote';
        } else {
          rightClass = 'bmd-right';
          if (b.content.includes('![[') || b.content.includes('![')) {
            rightClass += ' bmd-has-image';
          }
        }
      }
      lineHtml += `\n      <div class="${rightClass}">${rightContent}</div>`;
    }
    
    lineHtml += '\n    </div>';
    lines.push(lineHtml);
  });
  
  return lines.join('\n');
}

function convertMarkdownToHtml(markdownText) {
  const lines = markdownText.split('\n');
  const htmlParts = [];
  let currentSection = [];
  let inBulletSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/^(#{1,6})\s+(.+)$/)) {
      // Heading
      if (currentSection.length > 0) {
        htmlParts.push(processSection(currentSection));
        currentSection = [];
      }
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      const level = match[1].length;
      const text = match[2];
      htmlParts.push(`\n  <h${level}>${escapeHtml(text)}</h${level}>`);
    } else if (line.match(/^\s*(-|\d+-)\s+/)) {
      // Bullet line
      currentSection.push(line);
      inBulletSection = true;
    } else if (line.trim() === '' && inBulletSection) {
      // Empty line after bullets
      if (currentSection.length > 0) {
        htmlParts.push(processSection(currentSection));
        currentSection = [];
      }
      inBulletSection = false;
    } else if (line.trim() === '') {
      // Regular empty line
      if (currentSection.length > 0) {
        htmlParts.push(processSection(currentSection));
        currentSection = [];
      }
    } else {
      // Regular text
      if (!inBulletSection) {
        currentSection.push(line);
      }
    }
  }
  
  // Process remaining section
  if (currentSection.length > 0) {
    htmlParts.push(processSection(currentSection));
  }
  
  return htmlParts.join('\n');
}

function processSection(lines) {
  const text = lines.join('\n');
  
  // Check if this is a bullet section
  if (lines.some(line => line.match(/^\s*(-|\d+-)\s+/))) {
    const blocks = parseBulletBlocks(text);
    if (blocks.length > 0) {
      return blocks.map((block, index) => renderBlock(block, 0, true, true, index + 1)).join('\n');
    }
  }
  
  // Regular text section
  return `\n  <div class="regular-content">\n    <p>${escapeHtml(text)}</p>\n  </div>`;
}

// Main execution
const fixturesDir = path.join(__dirname);
const inputFile = path.join(fixturesDir, 'test-rendering.md');
const outputFile = path.join(fixturesDir, 'test-preview.html');

console.log(`Reading ${inputFile}...`);
const markdownContent = fs.readFileSync(inputFile, 'utf-8');

console.log('Converting to HTML...');
const bodyContent = convertMarkdownToHtml(markdownContent);

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BMD Plugin Rendering Preview</title>
    <style>
        :root {
            --background-primary: #ffffff;
            --background-secondary: #f6f8fa;
            --background-modifier-border: #d0d7de;
            --text-normal: #333333;
            --text-muted: #656d76;
            --text-accent: #0969da;
            --link-color: #0969da;
            --color-green: #1a7f37;
            --bmd-left-width: 200px;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --background-primary: #0d1117;
                --background-secondary: #161b22;
                --background-modifier-border: #30363d;
                --text-normal: #e6edf3;
                --text-muted: #848d97;
                --text-accent: #2f81f7;
                --link-color: #2f81f7;
            }
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            max-width: 900px;
            margin: 40px auto;
            padding: 0 20px;
            background: var(--background-primary);
            color: var(--text-normal);
            line-height: 1.6;
        }

        h1 { color: var(--text-normal); }
        h2 { color: var(--text-muted); margin-top: 40px; }

        .bmd-line {
            display: grid !important;
            grid-template-columns: var(--bmd-left-width) 1fr;
            margin: 0;
            padding: 0;
            min-height: 40px;
            border-left: 1px dashed var(--background-modifier-border);
            border-right: 1px dashed var(--background-modifier-border);
        }

        .bmd-line:hover {
            background-color: var(--background-secondary);
        }

        .bmd-line.bmd-first {
            border-top: 1px dashed var(--background-modifier-border);
            border-radius: 8px 8px 0 0;
            margin-top: 16px;
        }

        .bmd-line.bmd-last {
            border-bottom: 1px dashed var(--background-modifier-border);
            border-radius: 0 0 8px 8px;
            margin-bottom: 16px;
        }

        .bmd-line.bmd-first.bmd-last {
            border: 1px dashed var(--background-modifier-border);
            border-radius: 8px;
            margin-top: 16px;
            margin-bottom: 16px;
        }

        .bmd-url {
            grid-column: 1;
            padding: 12px;
            border-right: 2px solid var(--text-normal);
            font-weight: 500;
            word-break: break-word;
            display: flex;
            align-items: center;
            color: var(--text-normal);
            position: relative;
        }

        .bmd-url a {
            color: var(--link-color);
            text-decoration: none;
        }

        .bmd-url a:hover {
            text-decoration: underline;
        }

        .bmd-text {
            grid-column: 2;
            padding: 12px;
            display: flex;
            align-items: center;
        }

        .bmd-right {
            grid-column: 2;
            padding: 12px;
            display: flex;
            align-items: center;
            max-height: 96px;
            overflow: hidden;
        }

        .bmd-has-image {
            max-height: none;
            align-items: flex-start;
        }

        .bmd-image {
            grid-column: 2;
            padding: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .bmd-image-placeholder {
            max-height: 400px;
            width: auto;
            max-width: 100%;
            border-radius: 4px;
            border: 2px dashed var(--color-green);
            padding: 20px 40px;
            background: var(--background-secondary);
            color: var(--color-green);
            font-style: italic;
        }

        .bmd-right img, .bmd-text img {
            max-height: 96px;
            width: auto;
            border-radius: 4px;
            vertical-align: middle;
        }

        .bmd-quote {
            grid-column: 2;
            padding: 12px;
            border-left: 3px solid var(--text-accent);
            margin-left: 8px;
            font-style: italic;
            color: var(--text-muted);
            display: flex;
            align-items: center;
        }

        .bmd-deep-2 .bmd-right,
        .bmd-deep-2 .bmd-quote,
        .bmd-deep-2 .bmd-image,
        .bmd-deep-2 .bmd-text {
            margin-left: 20px;
            padding-left: 16px;
            border-left: 2px dotted var(--background-modifier-border);
        }

        .bmd-deep-3 .bmd-right,
        .bmd-deep-3 .bmd-quote,
        .bmd-deep-3 .bmd-image,
        .bmd-deep-3 .bmd-text {
            margin-left: 40px;
            padding-left: 16px;
            border-left: 2px dotted var(--background-modifier-border);
        }

        .bmd-deep-4 .bmd-right,
        .bmd-deep-4 .bmd-quote,
        .bmd-deep-4 .bmd-image,
        .bmd-deep-4 .bmd-text {
            margin-left: 60px;
            padding-left: 16px;
            border-left: 2px dotted var(--background-modifier-border);
        }

        .bmd-number-badge {
            position: absolute;
            top: -10px;
            left: -10px;
            background: var(--text-accent);
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8em;
            font-weight: 700;
            z-index: 10;
        }

        .regular-content {
            margin: 16px 0;
            padding: 12px;
            border-left: 3px solid var(--background-modifier-border);
        }

        .test-info {
            background: var(--background-secondary);
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 32px;
            border: 1px solid var(--background-modifier-border);
        }

        .test-info code {
            background: rgba(175, 184, 193, 0.2);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <h1>BMD Plugin Rendering Preview</h1>
    
    <div class="test-info">
        <p><strong>Generated from test-rendering.md</strong></p>
        <p>Run: <code>node fixtures/convert-to-html.js</code> to regenerate</p>
        <p>Last updated: ${new Date().toLocaleString()}</p>
    </div>

${bodyContent}

</body>
</html>`;

fs.writeFileSync(outputFile, htmlTemplate);
console.log(`✅ Generated ${outputFile}`);
console.log(`Open this file in your browser to preview the rendering`);
