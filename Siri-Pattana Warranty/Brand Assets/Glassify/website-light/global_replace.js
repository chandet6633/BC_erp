const fs = require('fs');

const files = ['index.html', 'products.html', 'pricing.html', 'technology.html', 'contact.html'];

const replacements = [
  { search: /href="simulation\.html"/g, replace: 'href="pricing.html#simulator"' },
  { search: /PHANTOM/g, replace: 'ULTIMATE' },
  { search: /Phantom/g, replace: 'Ultimate' },
  { search: /SENTINEL/g, replace: 'PRIME' },
  { search: /Sentinel/g, replace: 'Prime' },
  { search: /SPECTRE/g, replace: 'CERAMIC' },
  { search: /Spectre/g, replace: 'Ceramic' },
  { search: /BLACKOUT/g, replace: 'CARBON' },
  { search: /Blackout/g, replace: 'Carbon' },
  { search: /Ultra HD Nano Ceramic/g, replace: 'High-IR Nano Ceramic' }
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Custom fix for pricing.html class names if needed
    if (file === 'pricing.html') {
      content = content.replace(/btn-card-phantom/g, 'btn-card-ultimate');
      content = content.replace(/btn-card-sentinel/g, 'btn-card-prime');
      content = content.replace(/btn-card-spectre/g, 'btn-card-ceramic');
      content = content.replace(/btn-card-blackout/g, 'btn-card-carbon');
    }

    replacements.forEach(r => {
      content = content.replace(r.search, r.replace);
    });

    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }
});

// We should also delete simulation.html
if (fs.existsSync('simulation.html')) {
  fs.unlinkSync('simulation.html');
  console.log('Deleted simulation.html');
}

console.log('All replacements done');
