import re

f = r'f:\Kaziksites\public\games\crash-pro\index.html'
with open(f, 'r', encoding='utf-8') as fh: html = fh.read()

# Just remove everything from "// BOT OVERLAY" line to the closing ");" of setTimeout
# Pattern: // [dashed] BOT OVERLAY [dashed] \n setTimeout(() => { \n ...setupBotOverlay... \n }, 500);
html = re.sub(
    r'//\s*[═┐=]+\s*B\s*O\s*T\s+O\s*V\s*E\s*R\s*L\s*A\s*Y\s*\s*[═┐=]+\s*\n\s*setTimeout\s*\(\s*\(\s*\)\s*=>\s*\{\s*\n\s*const\s+overlay\s*=\s*setupBotOverlay\s*\([^)]*\);\s*\n\s*,\s*500\s*\);\s*\n',
    '\n', html)

# If that didn't work, try a simpler multi-line pattern
if 'setupBotOverlay("#game-wrap"' in html:
    # Find and remove the block manually by line
    lines = html.split('\n')
    cleaned = []
    skip_until = -1
    for i, line in enumerate(lines):
        if skip_until > i:
            continue
        if 'BOT OVERLAY' in line:
            # Skip this line and subsequent setTimeout block (3 lines)
            skip_until = min(i + 4, len(lines))
            continue
        cleaned.append(line)
    html = '\n'.join(cleaned)

# Fix orphaned catch on addEventListener  
html = html.replace('window.addEventListener("resize", resizeCanvas); } catch(e) { console.warn(\'[BotOverlay]\', e.message); }', 'window.addEventListener("resize", resizeCanvas);')

# Clean up 4+ consecutive newlines
html = re.sub(r'\n{4,}', '\n\n\n', html)

with open(f, 'w', encoding='utf-8') as fh: fh.write(html)
count = html.count('setupBotOverlay("#game-wrap"')
print(f'Fixed! setupBotOverlay calls remaining: {count}')
# Show final state
for i, line in enumerate(html.split('\n')):
    if 'setupBotOverlay' in line or 'bot-overlay' in line:
        print(f"  Line {i}: {line.strip()[:90]}")

