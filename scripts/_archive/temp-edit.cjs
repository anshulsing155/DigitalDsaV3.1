const fs = require('fs');
const path = 'src/lib/config/wizardSections/professionalLoan.ts';
let content = fs.readFileSync(path, 'utf8');

// We need to remove the professional-profile subsection object from the subsections array
// Find the chunk between 'professional-profile' and 'amount-terms'
const lines = content.split('\n');
let inProfProfile = false;
let braceDepth = 0;
let removeStart = -1;
let removeEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("id: 'professional-profile'")) {
    // Go back to find the opening { for this object
    for (let j = i; j >= 0; j--) {
      if (lines[j].trim().startsWith('{')) {
        removeStart = j;
        break;
      }
    }
    inProfProfile = true;
    braceDepth = 0;
  }
  
  if (inProfProfile) {
    for (const ch of lines[i]) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }
    if (braceDepth <= 0 && removeStart >= 0) {
      removeEnd = i;
      break;
    }
  }
}

if (removeStart >= 0 && removeEnd >= 0) {
  // Also remove the trailing comma if present
  if (lines[removeEnd + 1] && lines[removeEnd + 1].trim() === '') {
    removeEnd++;
  }
  
  console.log(`Removing lines ${removeStart + 1} to ${removeEnd + 1}`);
  const newLines = [...lines.slice(0, removeStart), ...lines.slice(removeEnd + 1)];
  fs.writeFileSync(path, newLines.join('\n'));
  console.log('Done');
} else {
  console.log('Could not find professional-profile block', removeStart, removeEnd);
}
