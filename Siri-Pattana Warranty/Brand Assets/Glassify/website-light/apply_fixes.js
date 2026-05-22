const fs = require('fs');

const files = ['index.html', 'products.html', 'pricing.html', 'technology.html', 'contact.html'];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // 1. Phone number
    content = content.replace(/080-000-0000/g, '089-821-6222');
    content = content.replace(/href="tel:080-000-0000"/g, 'href="tel:089-821-6222"');

    // 2. LINE ID
    content = content.replace(/>@glassify</g, '>glassify<');

    // 3. Select Elite to เลือกแพ็คเกจ
    content = content.replace(/Select Elite/g, 'เลือกแพ็คเกจ');

    // 4. Hide social icons
    content = content.replace(/<div class="footer-socials">/g, '<div class="footer-socials" style="display:none">');

    // 5. Favicon
    if (!content.includes('favicon.png')) {
        content = content.replace('</head>', '    <link rel="icon" type="image/png" href="images/favicon.png" />\n</head>');
    }

    // 6. Hamburger Menu CSS
    if (!content.includes('nav-links.mobile-open')) {
        const css = `
    <style>
        @media (max-width: 768px) {
            .nav-links.mobile-open {
                display: flex !important;
                flex-direction: column;
                position: absolute;
                top: 100%;
                left: 0;
                width: 100%;
                background: var(--glass-card);
                padding: 16px;
                border-radius: 16px;
                margin-top: 12px;
                border: 1px solid var(--glass-border);
                box-shadow: var(--glass-shadow);
                backdrop-filter: var(--glass-blur);
                z-index: 1000;
            }
        }
    </style>
`;
        content = content.replace('</head>', css + '</head>');
    }

    // 7. Hamburger Menu JS
    if (!content.includes("classList.toggle('mobile-open')")) {
        const js = `
<script>
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.querySelector('.nav-menu-btn');
    const mobileNavLinks = document.querySelector('.nav-links');
    if (mobileMenuBtn && mobileNavLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileNavLinks.classList.toggle('mobile-open');
        });
    }
});
</script>
`;
        content = content.replace('</body>', js + '</body>');
    }

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
console.log('Done');
