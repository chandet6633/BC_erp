const fs = require('fs');
const path = require('path');

function fixMojibake(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test for Mojibake
    if (content.includes('à¸') || content.includes('Ã')) {
        console.log(`Fixing ${filePath}...`);

        // Node's 'latin1' encoding converts the lower 8 bits of every character into a byte.
        // This effectively reverses the incorrect decode from Windows-1252.
        let buf = Buffer.from(content, 'latin1');
        let recovered = buf.toString('utf8');

        // Double check
        if (recovered.includes('à¸') || recovered.includes('Ã')) {
            console.log(`  -> Double mojibake detected, reversing twice...`);
            let buf2 = Buffer.from(recovered, 'latin1');
            recovered = buf2.toString('utf8');
        }

        if (recovered.includes('à¸')) {
            console.log(`  -> Warning: Still contains mojibake!`);
        }

        fs.writeFileSync(filePath, recovered, 'utf8');
        console.log(`  -> Success.`);
    } else {
        console.log(`Skipping ${path.basename(filePath)}, no mojibake detected.`);
    }
}

// Recursively find all HTML files
function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.html')) {
            fixMojibake(fullPath);
        }
    }
}

processDirectory(path.join(__dirname, '../src/pages'));
