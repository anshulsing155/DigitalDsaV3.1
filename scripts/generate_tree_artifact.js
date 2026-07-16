import fs from 'fs';
import path from 'path';

const projectDir = 'C:\\Users\\hp\\Desktop\\DigitalDsaV3.1';
const artifactPath = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\d015a0b7-c549-4717-a5c9-a7c4227d2185\\project_structure.md';

const ignoreList = [
	'node_modules',
	'.git',
	'.svelte-kit',
	'build',
	'.pnpm',
	'.gemini',
	'dist',
	'coverage'
];

function getFileTree(dir, prefix = '') {
	let output = '';
	try {
		const items = fs.readdirSync(dir);
		const sortedItems = items.sort((a, b) => {
			const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
			const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
			if (aIsDir && !bIsDir) return -1;
			if (!aIsDir && bIsDir) return 1;
			return a.localeCompare(b);
		});

		sortedItems.forEach((item, index) => {
			if (ignoreList.includes(item)) return;
			const isLast = index === sortedItems.length - 1;
			const itemPath = path.join(dir, item);
			const isDir = fs.statSync(itemPath).isDirectory();
			const marker = isLast ? '└── ' : '├── ';

			output += `${prefix}${marker}${item}${isDir ? '/' : ''}\n`;
			if (isDir) {
				const nextPrefix = prefix + (isLast ? '    ' : '│   ');
				output += getFileTree(itemPath, nextPrefix);
			}
		});
	} catch (err) {
		console.error(`Error reading directory ${dir}:`, err);
	}
	return output;
}

console.log('Generating complete file tree...');
const tree = getFileTree(projectDir);

const mdContent = `# Exact Project File Structure

Below is the complete, exact file tree of the **DigitalDsaV3.1** project scanned directly from the filesystem.

\`\`\`text
DigitalDsaV3.1/
${tree}\`\`\`
`;

fs.writeFileSync(artifactPath, mdContent, 'utf8');
console.log('Artifact updated successfully!');
