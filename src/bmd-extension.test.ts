import { parseBulletBlocks, extractUrl, isImageOnly, isQuotedText } from './bmd-extension';

describe('parseBulletBlocks', () => {
  it('should parse simple top-level bullet', () => {
    const text = '- https://example.com';
    const blocks = parseBulletBlocks(text);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].indent).toBe(0);
    expect(blocks[0].content).toBe('https://example.com');
    expect(blocks[0].children).toHaveLength(0);
  });

  it('should parse bullet with children', () => {
    const text = `- https://example.com
  - child 1
  - child 2`;
    const blocks = parseBulletBlocks(text);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toBe('https://example.com');
    expect(blocks[0].children).toHaveLength(2);
    expect(blocks[0].children[0].content).toBe('child 1');
    expect(blocks[0].children[1].content).toBe('child 2');
  });

  it('should parse multiple top-level bullets', () => {
    const text = `- https://example.com
  - child
- https://another.com`;
    const blocks = parseBulletBlocks(text);
    
    expect(blocks).toHaveLength(2);
    expect(blocks[0].content).toBe('https://example.com');
    expect(blocks[1].content).toBe('https://another.com');
  });

  it('should parse deep nesting', () => {
    const text = `- https://example.com
  - level 1
    - level 2
      - level 3`;
    const blocks = parseBulletBlocks(text);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].children).toHaveLength(1);
    expect(blocks[0].children[0].children).toHaveLength(1);
    expect(blocks[0].children[0].children[0].children).toHaveLength(1);
    expect(blocks[0].children[0].children[0].children[0].content).toBe('level 3');
  });

  it('should parse numbered bullets', () => {
    const text = '1- https://example.com';
    const blocks = parseBulletBlocks(text);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].isNumbered).toBe(true);
    expect(blocks[0].numberValue).toBe(1);
  });

  it('should handle empty lines between bullets', () => {
    const text = `- https://example.com

  - child after empty line`;
    const blocks = parseBulletBlocks(text);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].children).toHaveLength(1);
    expect(blocks[0].children[0].content).toBe('child after empty line');
  });

  it('should handle complex real-world example', () => {
    const text = `- https://www.youtube.com/shorts/K8ecFeMlUrM "she loves hot shower"
- https://www.viktorcessan.com/the-economics-of-software-teams/ #hiddengem 
        - on Annual cost: "Choosing to spend three weeks..."
        - "Liability Hiding as an Asset" 
          - I think this is right
          - ![[screenshot]]!
      - ![[screenshot2]]!`;
    
    const blocks = parseBulletBlocks(text);
    expect(blocks).toHaveLength(2);
    
    // First block: no children
    expect(blocks[0].content).toBe('https://www.youtube.com/shorts/K8ecFeMlUrM "she loves hot shower"');
    expect(blocks[0].children).toHaveLength(0);
    
    // Second block: has children
    expect(blocks[1].content).toBe('https://www.viktorcessan.com/the-economics-of-software-teams/ #hiddengem ');
    expect(blocks[1].children.length).toBeGreaterThan(0);
  });
});

describe('extractUrl', () => {
  it('should extract HTTP URL', () => {
    const result = extractUrl('https://example.com some text');
    expect(result.url).toBe('https://example.com');
    expect(result.rest).toBe('some text');
  });

  it('should extract wiki link', () => {
    const result = extractUrl('[[My Note]] some text');
    expect(result.url).toBe('[[My Note]]');
    expect(result.rest).toBe('some text');
  });

  it('should extract image embed', () => {
    const result = extractUrl('![[screenshot.png]] some text');
    expect(result.url).toBe('![[screenshot.png]]');
    expect(result.rest).toBe('some text');
  });

  it('should return null when no URL', () => {
    const result = extractUrl('just some text');
    expect(result.url).toBeNull();
    expect(result.rest).toBe('just some text');
  });

  it('should extract markdown image', () => {
    const result = extractUrl('![alt text](https://example.com/img.png) some text');
    expect(result.url).toBe('![alt text](https://example.com/img.png)');
    expect(result.rest).toBe('some text');
  });
});

describe('isImageOnly', () => {
  it('should match wiki image embed', () => {
    expect(isImageOnly('![[screenshot.png]]')).toBe(true);
  });

  it('should match markdown image', () => {
    expect(isImageOnly('![alt](https://example.com/img.png)')).toBe(true);
  });

  it('should not match text with image', () => {
    expect(isImageOnly('some text ![[img.png]]')).toBe(false);
  });

  it('should not match plain text', () => {
    expect(isImageOnly('just text')).toBe(false);
  });
});

describe('isQuotedText', () => {
  it('should match text starting with quote', () => {
    expect(isQuotedText('"hello world')).toBe(true);
  });

  it('should match text with leading spaces and quote', () => {
    expect(isQuotedText('  "hello world')).toBe(true);
  });

  it('should not match plain text', () => {
    expect(isQuotedText('hello world')).toBe(false);
  });
});
