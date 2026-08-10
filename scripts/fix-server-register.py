import re

f = r'f:\Kaziksites\server/src/app.js'
with open(f, 'r', encoding='utf-8') as fh:
    lines = fh.readlines()

# Find the index of "// Authenticated game routes" and "if (!emailOk(email)"
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if '// Authenticated game routes (spin, verify)' in line:
        start_idx = i
    if '      if (!emailOk(email)' in line and start_idx is not None:
        # Found the dangling if - it starts at this line
        # Find the end: look for "} catch (e) { next(e); }" followed by ");"
        for j in range(i, min(i + 30, len(lines))):
            if '} catch (e) { next(e); }' in lines[j] and '});' in lines[j+1]:
                end_idx = j + 2
                break
        break

print(f"Found dangling code from line {start_idx} to {end_idx}")

# Replace the dangling block with a proper route wrapper
dangling_lines = lines[start_idx:end_idx]
header_line = dangling_lines[0].lstrip()  # "   // Authenticated game routes..."
insert_after = start_idx + len(header_split) if (header_split := header_line.split('\n')) else start_idx

# Build replacement text  
new_code = [
    '   app.use(\'/api/games\', auth, gameRoutes);\n',
    '\n',
    '   // Auth: Register\n',
    '   app.post(\'/api/auth/register\', async (req, res, next) => {\n',
    '     try {\n',
]

# The dangling code starts at line after "app.use('/api/games'"
# Find the actual content lines to include
content_start = start_idx + 2  # Skip "// Authenticated" and "app.use(..." 

# Remove all dangling code from content_start to end_idx
new_lines = lines[:content_start]
new_lines.extend(new_code)

# Get the body of the register route (the if statement through res.status(201))
body_start = content_start  # "if (!emailOk(email)..."
body_end = None
for j in range(body_start, min(body_start + 30, len(lines))):
    if '      });' in lines[j] and j > body_start:
        body_end = j + 1
        break

# Add the route body with proper indentation (add 4 spaces to each line)
if body_end:
    indent = '    '
    for k in range(body_start, body_end):
        new_lines.append(indent + lines[k])
    
    # Close try/catch and route
    new_lines.append('     } catch (e) { next(e); }\n')
    new_lines.append('   });\n')
else:
    print("WARNING: Could not find body end")

# Append remaining lines
new_lines.extend(lines[body_end if body_end else len(lines):])

with open(f, 'w', encoding='utf-8') as fh:
    fh.writelines(new_lines)

print("Done! Register route fixed.")