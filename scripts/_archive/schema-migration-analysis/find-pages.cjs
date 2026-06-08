const fs = require('fs');
const lap = JSON.parse(fs.readFileSync('src/lib/config/LAP-schema.json', 'utf8'));

console.log('LAP Schema Page-level showWhen conditions:\n');
lap.pages.forEach((page, idx) => {
  if (page.showWhen && JSON.stringify(page.showWhen).includes('loanType')) {
    console.log(`Page ${idx}: ${page.id}`);
    console.log(`  showWhen: ${JSON.stringify(page.showWhen).substring(0, 200)}...`);
  }
});

console.log('\n\nPLOT Schema Page-level showWhen conditions:\n');
const plot = JSON.parse(fs.readFileSync('src/lib/config/plot-loan-schema.json', 'utf8'));
plot.pages.forEach((page, idx) => {
  if (page.showWhen && JSON.stringify(page.showWhen).includes('loanType')) {
    console.log(`Page ${idx}: ${page.id}`);
    console.log(`  showWhen: ${JSON.stringify(page.showWhen).substring(0, 200)}...`);
  }
});
