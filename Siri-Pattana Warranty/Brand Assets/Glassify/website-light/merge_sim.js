const fs = require('fs');
const sim = fs.readFileSync('simulation.html', 'utf8');
const pricing = fs.readFileSync('pricing.html', 'utf8');

const simStart = sim.indexOf('<div class="app-container">');
const simEnd = sim.indexOf('  <script src="simulation/data/films.js"></script>');
let simHtml = sim.substring(simStart, simEnd);

// Don't include the header from simulation.html, we just want the main-content
const mainStart = simHtml.indexOf('<main class="main-content">');
const mainEnd = simHtml.lastIndexOf('</main>') + 7;
const mainContent = simHtml.substring(mainStart, mainEnd);

const injectionPoint = pricing.includes('\r\n') ? '    </div></section>\r\n\r\n    <!-- What\'s Included -->' : '    </div></section>\n\n    <!-- What\'s Included -->';
const injectionHtml = `    </div></section>\n\n    <!-- Simulator Section -->\n    <section id="simulator" class="simulator-section">\n      <div class="container">\n        <div class="section-header">\n          <div class="section-label"><i data-lucide="play" style="width:14px;height:14px;"></i> Simulator</div>\n          <h2>จำลองการติดตั้งฟิล์ม</h2>\n          <p>View your vehicle's performance before real installation</p>\n        </div>\n        <!-- Simulator CSS link -->\n        <link rel="stylesheet" href="simulation/styles.css">\n<!-- INJECTED SIMULATOR HTML -->\n        <div class="app-container simulator-embedded">\n` + mainContent + `\n        </div>\n      </div>\n    </section>\n\n    <!-- What's Included -->`;

let newPricing = pricing.replace(injectionPoint, injectionHtml);

// Also need to remove the top 50px padding from main-content to fit in the section
newPricing = newPricing.replace('<main class="main-content">', '<main class="main-content" style="padding-top: 0; min-height: auto;">');

// add scripts at the end
const scriptInjection = '<script src="simulation/data/films.js"></script>\n<script src="simulation/data/vehicles.js"></script>\n<script src="simulation/app.js"></script>\n</body>';
newPricing = newPricing.replace('</body>', scriptInjection);

// Delete standalone file links from simulation.html nav
fs.writeFileSync('pricing.html', newPricing);
console.log("Merge complete");
