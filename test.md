# Test File for Bulleted Markdown Plugin

## Standard Bullets

- link_xxx
  - comment A
  - "follow-up comment B, or starting with double quote implies quote
  - ![[screenshot.png]] -> this is full size - too big, ideally I want to render it simpler
    - deeper level 1
      - deeper level n

## Numbered Bullets

1- first_entry
  - some comment here
  - another comment
  - ![[image1.png]] image comment

2- second_entry
  - "quoted text in numbered item
  - normal text
    - nested under second entry

## Mixed Content

- github_repo
  - "This is a quote from the repo
  - Feature list:
    - feature 1
    - feature 2
  - ![[demo.gif]] demo animation

## Regular List (should still work normally)

- simple item 1
- simple item 2
- simple item 3

## Deep Nesting

- root_item
  - level 1
    - level 2
      - level 3
        - level 4
  - back to level 1
