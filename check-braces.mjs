const fs = await import('fs');
const { execSync } = await import('child_process');

function countBraces(code) {
  let bc = 0, pc = 0;
  let inString = false, stringChar = '';
  
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = true; stringChar = ch; continue;
    }
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === stringChar) inString = false;
      continue;
    }
    
    if (ch === '/' && code[i+1] === '/') break;
    
    if (ch === '{') bc++;
    else if (ch === '}') bc--;
    else if (ch === '(') pc++;
    else if (ch === ')') pc--;
  }
  
  return { bracesBalanced: bc === 0, braceDiff: bc, parensBalanced: pc === 0, parenDiff: pc };
}

try {
  const origCode = execSync('git show HEAD:server/src/api/game-gateway.js', { encoding: 'utf8' });
  console.log('ORIGINAL:', JSON.stringify(countBraces(origCode)));

  const curCode = fs.readFileSync('./server/src/api/game-gateway.js', 'utf8');
  console.log('CURRENT:', JSON.stringify(countBraces(curCode)));
  
  // Find the line with extra brace in current file
  let depth = 0;
  const lines = curCode.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    if (depth < 0) { console.log(`Extra } on line ${i+1}: ${lines[i].trim().substring(0,80)}`); break; }
  }
  console.log('Final depth:', depth);
} catch(e) {
  console.error('Error:', e.message);
}
