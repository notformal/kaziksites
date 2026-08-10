/** FRONTEND AUDIT & FIX — CJS format */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const RED='\x1b[31m',GREEN='\x1b[32m',YELLOW='\x1b[33m',BLUE='\x1b[34m',CYAN='\x1b[36m',RESET='\x1b[0m';
const log=(msg,c='')=>process.stdout.write(`${c}${msg}${RESET}`);
let issues=[],fixes=0;

log('\n=== catalog.js ===\n',BLUE);
try{
  const cp=path.join(ROOT,'src','catalog.js');
  let raw=fs.readFileSync(cp,'utf8');
  const orphans=raw.match(/,\s*,\n\s+new:\s*false,\n\s+\},/g);
  if(orphans&&orphans.length>0){
    log(`Found ${orphans.length} orphaned block(s)\n`,YELLOW);
    raw=raw.replace(/\s*,\s*,\n\s+new:\s*false,\n\s+\},/g,'');
    raw=raw.replace(/(\}\s*),{2,}/g,'$1');
    fs.writeFileSync(cp,raw);
    log('Fixed catalog.js orphan entries\n',GREEN);
    fixes++;
  }else log('catalog.js syntax OK\n',GREEN);
}catch(e){log(`catalog.js error: ${e.message}\n`,RED);issues.push('catalog.js: '+e.message);}

log('\n=== main.jsx ===\n',BLUE);
try{
  const mp=path.join(ROOT,'src','main.jsx');
  const raw=fs.readFileSync(mp,'utf8');
  const OB=(raw.match(/{/g)||[]).length,CB=(raw.match(/}/g)||[]).length;
  const OP=(raw.match(/\(/g)||[]).length,CP=(raw.match(/\)/g)||[]).length;
  if(OB!==CB){log(`Braces: {${OB} }${CB}\n`,YELLOW);issues.push('main.jsx brace mismatch');}else log(`Braces balanced (${OB})\n`,GREEN);
  if(OP!==CP){log(`Parens: (${OP} )${CP}\n`,YELLOW);issues.push('main.jsx paren mismatch');}else log(`Parens balanced (${OP})\n`,GREEN);
  if(/export\s+default/.test(raw))log('Default export OK\n',GREEN);else{log('No default export\n',YELLOW);issues.push('No default export');}
  if(/function\s+App\s*\(\)/.test(raw))log('App component found\n',GREEN);else{log('No App component\n',RED);issues.push('Missing App');}
}catch(e){log(`main.jsx: ${e.message}\n`,RED);issues.push('main.jsx: '+e.message);}

log('\n=== API Files ===\n',BLUE);
['api.js','game-api.js'].forEach(f=>{
  try{const raw=fs.readFileSync(path.join(ROOT,'src',f),'utf8');const eps=[...raw.matchAll(/['"](\/[^"']+?)['"]/g)].map(m=>m[1]);log(`${f}: ${eps.length} endpoints\n`,GREEN);}catch(e){log(`${f} error: ${e.message}\n`,RED);issues.push(f+': '+e.message);}
});

log('\n=== i18n ===\n',BLUE);
try{
  const raw=fs.readFileSync(path.join(ROOT,'src','i18n.js'),'utf8');
  const langs=[...raw.matchAll(/code:\s*'([^']+)'/g)].map(m=>m[1]);
  log(`Languages: ${langs.join(', ')}\n`,CYAN);
  for(const code of langs){const idx=raw.indexOf(code+': {');if(idx>=0){const ei=raw.indexOf(`},`,idx);if(ei>0){const s=raw.slice(idx,ei),k=[...s.matchAll(/\w+:\s*'/g)].length;log(`${code}: ${k} keys\n`,GREEN);}}}
}catch(e){log(`i18n error: ${e.message}\n`,RED);issues.push('i18n: '+e.message);}

log('\n=== Themes ===\n',BLUE);
try{
  const raw=fs.readFileSync(path.join(ROOT,'src','themes.js'),'utf8');
  ['aurora','ember','royale'].forEach(b=>{if(/accent:\s*#/.test(raw))log(`${b}: accent OK\n`,GREEN);else{log(`${b}: missing accent\n`,YELLOW);issues.push(b+': no accent');}});
}catch(e){log(`themes error: ${e.message}\n`,RED);issues.push('themes: '+e.message);}

log('\n=== Games ===\n',BLUE);
try{
  const gd=path.join(ROOT,'public','games');
  if(!fs.existsSync(gd))throw new Error('Games dir not found');
  const dirs=fs.readdirSync(gd).filter(d=>!d.startsWith('_'));
  let wi=0,wb=0;
  for(const d of dirs){const ip=path.join(gd,d,'index.html');if(fs.existsSync(ip)){wi++;if(/setupBotOverlay|bot-overlay/.test(fs.readFileSync(ip,'utf8')))wb++;}}
  log('Games: '+dirs.length+' total\n',CYAN);
  log('With index.html: '+wi+'/'+dirs+'\n',wi===dirs?GREEN:YELLOW);
  log('With bot overlay: '+wb+'/'+dirs+'\n',wb>=68?GREEN:YELLOW);
  const missing=dirs.filter(d=>!fs.existsSync(path.join(gd,d,'index.html')));
  if(missing.length>0){log('Missing index.html ('+missing.length+'): '+missing.slice(0,5).join(', ')+'\n',RED);issues.push(missing.length+' games missing index');}
}catch(e){log('Games error: '+e.message+'\n',RED);issues.push('games: '+e.message);}

log('\n=== Engine Files ===\n',BLUE);
try{
  const ed=path.join(ROOT,'public','games','_engine');
  if(fs.existsSync(ed)){
    const files=fs.readdirSync(ed).filter(f=>f.endsWith('.js'));
    log('Engine core: '+files.length+' files\n',GREEN);
    for(const f of files.slice(0,8))log('  - '+f+'\n',CYAN);
    const bf=path.join(ed,'core','bot-overlay.js');
    if(fs.existsSync(bf)){const c=fs.readFileSync(bf,'utf8');if(/setupBotOverlay/.test(c))log('bot-overlay.js: OK\n',GREEN);else{log('bot-overlay.js: NO setupBotOverlay\n',RED);issues.push('bot-overlay missing function');}}
    else{log('bot-overlay.js NOT FOUND\n',RED);issues.push('bot-overlay.js missing');}
  }
}catch(e){log('Engine check: '+e.message+'\n',YELLOW);}

log('\n=== Landing Pages ===\n',BLUE);
try{
  ['aurora','ember','royale'].forEach(b=>{const fp=path.join(ROOT,'landing',b,'index.html');if(fs.existsSync(fp)){log(b+': '+fs.statSync(fp).size+' bytes OK\n',GREEN);}else{log(b+': MISSING\n',RED);issues.push(b+' landing missing');}});
}catch(e){log('Landing error: '+e.message+'\n',YELLOW);}

log('\n'+ '='.repeat(50),CYAN);
if(issues.length>0){log('ISSUES FOUND: '+issues.length+'\n',RED);issues.forEach(i=>log('  - '+i+'\n',YELLOW));}else log('ALL CHECKS PASSED\n',GREEN);
log('FIXES APPLIED: '+fixes+'\n',CYAN);
log('AUDIT COMPLETE\n',GREEN);
log('='.repeat(50)+'\n',CYAN);
