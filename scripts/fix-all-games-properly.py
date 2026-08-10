import re, os, glob

def fix_game(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Step 1: Remove ALL bot-overlay related fragments (broken code)
    html = re.sub(r'setupBotOverlay.*?\n', '', html)
    html = re.sub(r'}\s*import\s*\{.*?\}\s*from\s*["\'].*?bot-overlay.*?["\'];', '', html)
    # Clean up orphaned fragments like "} catch(e)" on their own lines
    html = re.sub(r"\n\s*(?:Setup failed:|', e\.message\);|} catch\(e\)|}\s*import)", '\n', html)
    # Fix double </script> tags left from cleanup  
    while '</script>\n\n</script>' in html:
        html = html.replace('</script>\n\n</script>', '</script>')
    
    # Step 2: Determine container ID for this game
    basename = os.path.basename(os.path.dirname(filepath))
    if basename == 'crash-pro': container_id = '#game-wrap'
    elif any(x in basename for x in ['fruit-shop', 'baccarat-pro', 'blackjack-pro', 'roulette-royale']): container_id = '#bg'  
    elif any(x in basename for x in ['slots-royal', 'pharaohs-treasure', 'lucky-streak', 'lightning-dice', 'super-line', 'wild-west', 'gold-caravan', 'magic-crystal', 'hot-navigator', 'book-of-gold', 'diamond-rush']): container_id = '#game'
    elif any(x in basename for x in ['pragmatic-live', 'crazy-time-pro', 'lightning-roulette-pro']): container_id = '#balance'
    else: container_id = '#app'
    
    # Step 3: Check if there's already a proper module script with bot overlay
    has_proper_bot = re.search(r'<script\s+type=["\']module["\'"]>.*?setupBotOverlay', html, re.DOTALL)
    if has_proper_bot:
        return False
    
    # Step 4: Insert before </body> (or </html>) in a clean <script type="module"> tag
    bot_script = f'''<script type="module">
import {{ setupBotOverlay }} from '../_engine/core/bot-overlay.js';
try {{ setupBotOverlay('{container_id}', {{ gameName: '{basename}', refreshInterval: 3000 }}); }} catch(e) {{ console.warn('[BotOverlay]', e.message); }}
</script>'''
    
    if '</body>' in html:
        html = html.replace('</body>', bot_script + '\n</body>')
    elif '</html>' in html:
        html = html.replace('</html>', bot_script + '\n</html>')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)
    
    return True

games_dir = r'f:\Kaziksites\public\games'
fixed = 0
for html_file in glob.glob(os.path.join(games_dir, '*', 'index.html')):
    basename = os.path.basename(os.path.dirname(html_file))
    if basename.startswith('_'):
        continue
    
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            original = f.read()
        
        if fix_game(html_file):
            fixed += 1
            print(f'  Fixed: {basename}')
    except Exception as e:
        print(f'  Error in {basename}: {e}')

print(f'\nTotal fixed: {fixed} games')
