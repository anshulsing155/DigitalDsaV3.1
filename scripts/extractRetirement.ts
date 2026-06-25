import { retirementArticles } from '../src/lib/data/website/retirementData';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname since we are in ES Module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, '../src/lib/data/website/retirement');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (const [category, articles] of Object.entries(retirementArticles)) {
  for (const [slug, data] of Object.entries(articles)) {
    const filePath = path.join(outDir, `${slug}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Wrote ${filePath}`);
  }
}
