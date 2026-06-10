import fs from 'fs';
import path from 'path';

const routesDir = 'c:/Users/hp/Desktop/DigitalDsaV3.1/src/routes/(main)';

function getPages(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getPages(filePath, fileList);
    } else if (file === '+page.svelte') {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const pageFiles = getPages(routesDir);
console.log(`Found ${pageFiles.length} pages under (main):`);

const pagesAndComponents = [];

for (const pageFile of pageFiles) {
  const content = fs.readFileSync(pageFile, 'utf-8');
  const relativePath = path.relative('c:/Users/hp/Desktop/DigitalDsaV3.1', pageFile).replace(/\\/g, '/');
  
  // Find imports from $lib/components/
  const importRegex = /import\s+([A-Z][A-Za-z0-9_]*)\s+from\s+['"]([^'"]+)['"]/g;
  const components = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const componentName = match[1];
    const importPath = match[2];
    if (importPath.includes('$lib/components/') || importPath.includes('../') || importPath.includes('./')) {
      components.push({ name: componentName, path: importPath });
    }
  }
  
  pagesAndComponents.push({
    page: relativePath,
    components: components
  });
}

console.log(JSON.stringify(pagesAndComponents, null, 2));
fs.writeFileSync('c:/Users/hp/Desktop/DigitalDsaV3.1/scratch/pages_map.json', JSON.stringify(pagesAndComponents, null, 2));
