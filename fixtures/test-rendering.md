# BMD Plugin Test

## Test Case 1: URL + Quote (from your example)

- https://www.viktorcessan.com/the-economics-of-software-teams/ #hiddengem 
  - on Annual cost €1,040,000: "Choosing to spend three weeks on a feature that serves 2% of users is a €60,000 decision. Delaying an operational improvement for a quarter is a decision with a calculable daily price tag. **Rebuilding a platform because the current one feels embarrassing, rather than because customers are leaving, is a capital allocation choice** that would look very different if the people making it were spending their own money"
    - "Liability Hiding as an Asset"
      - I think this is right
      - ![[screenshot.png]]
  - ![[screenshot2.png]]

## Test Case 2: Simple URL + Text

- https://www.youtube.com/shorts/K8ecFeMlUrM "she loves hot shower"

## Test Case 3: URL + Long Quote

- https://vnexpress.net/su-thay-pha-gioi-luat-cho-108-phu-nu-sinh-con-trong-chua-5066732.html "Ông triệu tập 40 tăng sĩ cùng 30 cư sĩ trong chùa, nói: 'Thấy chết không cứu là điều kiêng kỵ lớn nhất của ngườ xuất gia, các quy tắc khác lúc này không còn quan trọng'." 

## Test Case 4: Multiple Top Level

- https://news.ycombinator.com/item?id=47892074 Interesting discussion about AI coding assistants
  - "The key insight is that context window management is the bottleneck
  - ![[screenshot.png]] HN thread screenshot
    - deeper level 1
      - deeper level n

## Test Case 5: No Children (Single Line)

- https://example.com/some-article "Just a link with a short note"

## Test Case 6: Deep Nesting

- https://github.com/obsidianmd/obsidian-api
  - Core API documentation
    - Plugin lifecycle
      - onload() method
        - Register commands
        - Register events
        - Register extensions
      - onunload() cleanup
    - Settings API
  - TypeScript definitions

## Test Case 7: Image Only Child

- https://example.com/gallery
  - ![[image1.png]]
  - ![[image2.png]]
  - Some descriptive text

## Test Case 8: Numbered Items

1- First priority
  - "This is the most important thing
  - Details here
    - Sub detail

2- Second priority
  - Another comment
  - ![[priority2.png]]

## Regular List (Should NOT render as BMD)

- simple item 1
- simple item 2
- simple item 3

## Plain Paragraph (Should NOT be affected)

This is just regular text content that should render normally without any BMD styling applied to it.

## Mixed Content Test

- https://example.com/start
  - First child with text
  - Second child with more text
    - Nested under second
    - Another nested item
  - Third child

Some regular text between blocks.

- https://example.com/end
  - Final child
