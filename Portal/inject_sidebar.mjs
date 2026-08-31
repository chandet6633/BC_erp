import fs from 'fs';
import path from 'path';

function findHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findHtmlFiles(filePath, fileList);
        } else if (filePath.endsWith('.html')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const pagesDir = 'w:/Works/Portal/src/pages';
const htmlFiles = findHtmlFiles(pagesDir);

console.log(`Found ${htmlFiles.length} HTML files. Injecting app-shell...`);

let injectedCount = 0;

for (const file of htmlFiles) {
    if (file.includes('main\\\\index.html') || file.includes('main/index.html')) {
        // Main menu already has it and manages its own layout carefully, skip or let it be
        continue;
    }

    let content = fs.readFileSync(file, 'utf8');

    // Calculate relative path to assets
    const relativeDepth = path.relative(pagesDir, path.dirname(file)).split(path.sep).filter(p => p !== '').length;

    let prefix = '../'.repeat(relativeDepth + 1);
    // +1 because it's inside src/pages/CATEGORY/file.html relative to src/assets
    if (relativeDepth === 0) prefix = '../';

    const jsPath = `${prefix}assets/js/app-shell.js`;
    const cssPath = `${prefix}assets/css/app-shell.css`;
    const designSysPath = `${prefix}assets/css/design-system.css`;

    let modified = false;

    // Inject CSS if missing
    if (!content.includes('app-shell.css')) {
        const cssLink = `\\n    <link rel="stylesheet" href="${cssPath}" />`;
        content = content.replace('</head>', `${cssLink}\\n</head>`);
        modified = true;
    }

    if (!content.includes('design-system.css')) {
        const sysLink = `\\n    <link rel="stylesheet" href="${designSysPath}" />`;
        content = content.replace('</head>', `${sysLink}\\n</head>`);
        modified = true;
    }

    // Inject JS if missing
    if (!content.includes('app-shell.js')) {
        const jsScript = `\\n    <script type="module" src="${jsPath}"></script>`;
        content = content.replace('</body>', `${jsScript}\\n</body>`);
        modified = true;
    }

    // Some pages might not have </body> explicitly at the end but they should. Let's assume standard HTML.

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Injected app-shell into: ${path.relative(pagesDir, file)} using prefix ${prefix}`);
        injectedCount++;
    }
}

console.log(`Modification complete. Injected into ${injectedCount} files.`);
