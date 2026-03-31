# Bible Hover Obsidian Plugin
> Note: This project is heavily vibe-coded 

Hover over Bible references (e.g., `John 3:16`, `요 3:16`) to display the verse in a popover. Click on the reference to navigate directly to the verse in your Bible file. Works fully offline.

성경 구절(예: `마태복음 11:12`, `John 3:16`) 위에 마우스를 올리면 팝업창에 해당 구절이 표시됩니다. 구절을 클릭하면 성경 파일의 해당 위치로 바로 이동합니다. 완전히 오프라인으로 작동합니다.

## Latest Updates
- **No Brackets Required:** Automatically detects Bible references in plain text. You no longer need to wrap them in `[[ ]]`.
- **Smart Language Detection:** Automatically switches to the Korean Bible (KRV) for Korean references and uses the default Bible for English.
- **Smart Positioning:** Hover popovers stay within the window boundaries and flip position if they would go off-screen.
- **Verse Ranges:** Full support for ranges like `John 3:16-17` or `1 Peter 2:9-10` with various dash types.
- **Clean UI:** Minimalist hover interface focused purely on the scripture text with uniform padding.

![Demo](./demo.gif)

## How it works
The project follows a BYOB (Bring Your Own Bible) approach. 
If you have your bible in Zefania XML format, you can convert to md using [this python program](https://gist.github.com/npc203/565e32a68dcf190976d621b098614486) OR [this online tool](https://npc203.github.io/zefania2md/). Else, follow the below format.

## Setup
1. Create bible markdowns in the following format.
```markdown
# Genesis
## Chapter 1
1. In the beginning God created the heavens and the earth.
2. Now the earth was formless and empty, darkness was over the surface of the deep...

## Chapter 2
1. Thus the heavens and the earth were completed in all their vast array...
```
2. Place the bible md files inside your vault.
3. Under the bible-hover plugin settings, add your bibles.
