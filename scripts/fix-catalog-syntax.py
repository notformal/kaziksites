import re, sys

f = r'f:\Kaziksites\src\catalog.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Fix pattern: missing "}," between game entries
# The broken pattern is: "popular: true,\n  {" or "new: false,\n  {" 
# Should be: "popular: true,\n  },\n  {"

broken_count = len(re.findall(r'(?:featured|popular|new):\s*(?:true|false),\n\s+\{', content))
print(f"Found {broken_count} broken entries")

if broken_count > 0:
    # Replace pattern - add "},\n" before each new entry that starts with just "{"
    fixed = re.sub(
        r'((?:featured|popular|new):\s*(?:true|false),)\n(\s+\{\s*\n\s+id:)',
        r'\1\n  },\n\2',
        content
    )
    
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(fixed)
    
    # Verify
    ob = fixed.count('{')
    cb = fixed.count('}')
    print(f"After fix - Braces: {{{ob} }}{cb}")
    if ob == cb:
        print("SUCCESS! Braces balanced")
    else:
        print(f"WARNING: Still unbalanced (diff={ob-cb})")
else:
    print("No broken pattern found!")
