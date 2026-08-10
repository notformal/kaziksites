import re

f = r'f:\Kaziksites\server/src/app.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Remove the duplicate catch/}); block  
# Pattern: first occurrence of "} catch (e) { next(e); }\n   });" followed by second identical one
pattern = r'(\s+}\s*catch\s*\(\s*e\s*\)\s*\{\s*next\(e\);\s*\}\s*\n\s+\}\);)\s+\1'

def remove_dup(m):
    return m.group(1)

content = re.sub(pattern, remove_dup, content, flags=re.MULTILINE)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

import re

f = r'f:\Kaziksites\server/src/api/games.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Remove the original "export const ..." lines that were added by line-by-line approach
content = re.sub(r'export const spinRouter = createSpinRoute\(\);\n', '', content)
content = re.sub(r'export const authedRoutes = createAuthedRoutes\(\);\n', '', content)
content = re.sub(r'export const gameListRouter = createGameList\(\);\n', '', content)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Cleaned up duplicate exports")
with open(f, 'r', encoding='utf-8') as fh:
    lines = fh.readlines()
exports = [(i+1, l.strip()) for i, l in enumerate(lines) if 'export' in l]
for num, txt in exports:
    print("  L{0}: {1}".format(num, txt))