const fs = require('fs');
const schemas = {
  'LAP': JSON.parse(fs.readFileSync('src/lib/config/LAP-schema.json', 'utf8')),
  'PLOT': JSON.parse(fs.readFileSync('src/lib/config/plot-loan-schema.json', 'utf8')),
  'PERSONAL': JSON.parse(fs.readFileSync('src/lib/config/personal-loan-schema.json', 'utf8')),
  'BUSINESS': JSON.parse(fs.readFileSync('src/lib/config/businessLoanSchema.json', 'utf8')),
  'PROF': JSON.parse(fs.readFileSync('src/lib/config/professional-loan-schema.json', 'utf8'))
};

Object.entries(schemas).forEach(([name, schema]) => {
  const allQuestions = schema.pages.flatMap(p => p.questions || []);
  const variantCounts = {};
  let loanTypeQCount = 0;
  allQuestions.forEach(q => {
    const json = JSON.stringify(q);
    if (json.includes('Balance Transfer With Top-up')) variantCounts['BT+Topup'] = (variantCounts['BT+Topup'] || 0) + 1;
    if (json.includes('Balance Transfer Only')) variantCounts['BT-Only'] = (variantCounts['BT-Only'] || 0) + 1;
    if (json.includes('Top-up Only')) variantCounts['Topup-Only'] = (variantCounts['Topup-Only'] || 0) + 1;
    if (json.includes('New Loan')) variantCounts['New-Loan'] = (variantCounts['New-Loan'] || 0) + 1;
    if (json.includes('"var": "loanType"')) loanTypeQCount++;
  });
  console.log(`${name}:`);
  console.log(`  Total pages: ${schema.pages.length}`);
  console.log(`  Questions with loanType conditions: ${loanTypeQCount}`);
  console.log(`  Variant references:`, variantCounts);
  console.log('');
});
