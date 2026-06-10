import fs from 'fs';

const data = JSON.parse(fs.readFileSync('c:/Users/hp/Desktop/DigitalDsaV3.1/scratch/pages_map.json', 'utf-8'));

let md = '### Pages and Components Map\n\n';

for (const entry of data) {
  md += `#### Page: [${entry.page.split('/').pop()}](file:///${entry.page})\n`;
  md += `**Path:** \`file:///${entry.page}\`\n\n`;
  if (entry.components.length === 0) {
    md += '*No custom components imported.*\n\n';
  } else {
    md += '| Component | Import Path |\n';
    md += '| --- | --- |\n';
    for (const comp of entry.components) {
      md += `| \`${comp.name}\` | \`${comp.path}\` |\n`;
    }
    md += '\n';
  }
}

fs.writeFileSync('c:/Users/hp/Desktop/DigitalDsaV3.1/scratch/plan_tables.md', md);
console.log('Markdown tables generated successfully.');
