f = r'f:\Kaziksites\server/src/api/games.js'
with open(f, 'r', encoding='utf-8') as fh:
    lines = fh.readlines()

# Find and remove "export const" lines, add variable definitions before combinedRouter
new_lines = []
skipped_export_const = False

for i, line in enumerate(lines):
    stripped = line.strip()
    
    # Skip the old export const lines  
    if stripped.startswith('export const spinRouter') or \
       stripped.startswith('export const authedRoutes') or \
       stripped.startswith('export const gameListRouter'):
        skipped_export_const = True
        continue
    
    new_lines.append(line)

# Now find where to insert variable definitions (before combinedRouter)
final_lines = []
for i, line in enumerate(new_lines):
    if 'const combinedRouter = express.Router()' in line:
        # Insert the variable definitions before this
        final_lines.append('\n')
        final_lines.append('// Exports\n')
        final_lines.append('const spinRouter = createSpinRoute();\n')
        final_lines.append('const authedRoutes = createAuthedRoutes();\n')
        final_lines.append('const gameListRouter = createGameList();\n')
        final_lines.append('\n')
    final_lines.append(line)

with open(f, 'w', encoding='utf-8') as fh:
    fh.writelines(final_lines)

# Verify
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()
exports = [l.strip() for l in content.split('\n') if 'export' in l and not l.strip().startswith('//')]
print("Export statements:")
for e in exports:
    print("  " + e)

spin_refs = content.count('createSpinRoute()')
auth_refs = content.count('createAuthedRoutes()')
game_refs = content.count('createGameList()')
print(f"\nFunction calls: spin={spin_refs}, authed={auth_refs}, gameList={game_refs}")