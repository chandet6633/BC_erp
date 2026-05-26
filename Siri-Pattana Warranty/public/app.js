const app = document.getElementById("app");

let brands = [];
let currentBrand = null;
let activeTab = "generate";
let catalog = { products: [], filmOptions: [], installCenters: [], vehicleModels: [] };
let catalogLoaded = false;
let adminUser = null;
let adminRecordsState = {
  records: [],
  filtered: [],
  selectedId: "",
  status: "",
  printSelectedIds: new Set(),
  glassifyDownloadSelectedIds: new Set()
};
const ADMIN_ROUTES = new Set(["/", "/admin", "/glassify", "/idash", "/kensho"]);
const CERT_REF_W = 1414;
const CERT_REF_H = 2000;
const CERT_Y_SHIFT = -10;
const CERT_FONT_ADD = 10;
const CERT_POS = {
  frontFilm: { x: 221, y: 410, size: 20, align: "center" },
  rearFilm: { x: 852, y: 395, size: 20, align: "center" },
  sideFilm: { x: 1076, y: 665, size: 20, align: "center" },
  installDate: { x: 263, y: 894, size: 25 },
  expiryDate: { x: 810, y: 894, size: 25 },
  customerName: { x: 291, y: 1024, size: 25 },
  brand: { x: 281, y: 1136, size: 25 },
  model: { x: 754, y: 1136, size: 25 },
  plate: { x: 348, y: 1263, size: 25 },
  chassisNo: { x: 373, y: 1387, size: 23, align: "left" },
  installCenter: { x: 452, y: 1500, size: 20 },
  remarks: { x: 326, y: 1733, size: 15, align: "left" },
  warrantyNo: { x: 63, y: 1960, size: 20, weight: "800" }
};
const CERT_TEMPLATES = [
  { value: "sedan", label: "Sedan", url: "/template/size-l.png" },
  { value: "suv", label: "SUV", url: "/template/suv.png" },
  { value: "mpv", label: "MPV / Van", url: "/template/mpv.png" },
  { value: "pick-up", label: "Pick Up", url: "/template/pick-up.png" },
  { value: "ppv", label: "PPV", url: "/template/ppv.png" }
];
const GLASSIFY_FILM_SERIES = [
  { key: "CARBON", label: "CARBON", years: 7, films: ["NANO CARBON SERIES", "NANO CARBON 05", "NANO CARBON 20", "NANO CARBON 35"] },
  { key: "COOL SERIES", label: "COOL SERIES", years: 7, films: ["COOL SERIES NL05", "COOL SERIES NL20", "COOL SERIES NL35"] },
  { key: "EV PLUS", label: "EV PLUS", years: 7, films: ["EV PLUS 30", "EV PLUS 20", "EV PLUS 06"] },
  { key: "NANO CERAMIC", label: "NANO CERAMIC", years: 7, films: ["NANO CERAMIC 05", "NANO CERAMIC 15", "NANO CERAMIC 20", "NANO CERAMIC 30", "NANO CERAMIC 70"] },
  { key: "ULTRA CERAMIC IR", label: "ULTRA CERAMIC IR", years: 7, films: ["ULTRA IR CERAMIC 05", "ULTRA IR CERAMIC 20", "ULTRA IR CERAMIC 35", "ULTRA IR CERAMIC BLUE"] },
  { key: "UV-GN", label: "UV-GN", years: 7, films: ["UV-GN18", "UV-GN03"] },
  { key: "APEX TOP", label: "APEX TOP", years: 7, films: ["APEX TOP 05", "APEX TOP 20", "APEX TOP 35"] },
  { key: "TITAN PRO", label: "TITAN PRO", years: 7, films: ["TITAN PRO 05", "TITAN PRO 15", "TITAN PRO 35"] },
  { key: "PRESTIGE GT", label: "PRESTIGE GT", years: 7, films: ["PRESTIGE GT 05", "PRESTIGE GT 15", "PRESTIGE GT 35"] },
  { key: "STEALTH CC", label: "STEALTH CC", years: 7, films: ["STEALTH CC 35"] }
];
const INSTALL_CENTERS = [
  { name: "F2000 SOUND", location: "Lat Phrao 101, Bangkok" },
  { name: "Muangthong Car Care", location: "Nakhon Ratchasima" },
  { name: "Bancha Pradubyont Samchuk", location: "Suphan Buri" },
  { name: "Bancha Pradubyont Suphan", location: "Suphan Buri" },
  { name: "Siri Pattana HQ", location: "Main office" }
];
const THAI_PROVINCES = [
  "Bangkok / กรุงเทพมหานคร", "Amnat Charoen / อำนาจเจริญ", "Ang Thong / อ่างทอง", "Bueng Kan / บึงกาฬ", "Buriram / บุรีรัมย์",
  "Chachoengsao / ฉะเชิงเทรา", "Chai Nat / ชัยนาท", "Chaiyaphum / ชัยภูมิ", "Chanthaburi / จันทบุรี", "Chiang Mai / เชียงใหม่",
  "Chiang Rai / เชียงราย", "Chonburi / ชลบุรี", "Chumphon / ชุมพร", "Kalasin / กาฬสินธุ์", "Kamphaeng Phet / กำแพงเพชร",
  "Kanchanaburi / กาญจนบุรี", "Khon Kaen / ขอนแก่น", "Krabi / กระบี่", "Lampang / ลำปาง", "Lamphun / ลำพูน",
  "Loei / เลย", "Lopburi / ลพบุรี", "Mae Hong Son / แม่ฮ่องสอน", "Maha Sarakham / มหาสารคาม", "Mukdahan / มุกดาหาร",
  "Nakhon Nayok / นครนายก", "Nakhon Pathom / นครปฐม", "Nakhon Phanom / นครพนม", "Nakhon Ratchasima / นครราชสีมา", "Nakhon Sawan / นครสวรรค์",
  "Nakhon Si Thammarat / นครศรีธรรมราช", "Nan / น่าน", "Narathiwat / นราธิวาส", "Nong Bua Lamphu / หนองบัวลำภู", "Nong Khai / หนองคาย",
  "Nonthaburi / นนทบุรี", "Pathum Thani / ปทุมธานี", "Pattani / ปัตตานี", "Phang Nga / พังงา", "Phatthalung / พัทลุง",
  "Phayao / พะเยา", "Phetchabun / เพชรบูรณ์", "Phetchaburi / เพชรบุรี", "Phichit / พิจิตร", "Phitsanulok / พิษณุโลก",
  "Phra Nakhon Si Ayutthaya / พระนครศรีอยุธยา", "Phrae / แพร่", "Phuket / ภูเก็ต", "Prachinburi / ปราจีนบุรี", "Prachuap Khiri Khan / ประจวบคีรีขันธ์",
  "Ranong / ระนอง", "Ratchaburi / ราชบุรี", "Rayong / ระยอง", "Roi Et / ร้อยเอ็ด", "Sa Kaeo / สระแก้ว",
  "Sakon Nakhon / สกลนคร", "Samut Prakan / สมุทรปราการ", "Samut Sakhon / สมุทรสาคร", "Samut Songkhram / สมุทรสงคราม", "Saraburi / สระบุรี",
  "Satun / สตูล", "Sing Buri / สิงห์บุรี", "Sisaket / ศรีสะเกษ", "Songkhla / สงขลา", "Sukhothai / สุโขทัย",
  "Suphan Buri / สุพรรณบุรี", "Surat Thani / สุราษฎร์ธานี", "Surin / สุรินทร์", "Tak / ตาก", "Trang / ตรัง",
  "Trat / ตราด", "Ubon Ratchathani / อุบลราชธานี", "Udon Thani / อุดรธานี", "Uthai Thani / อุทัยธานี", "Uttaradit / อุตรดิตถ์",
  "Yala / ยะลา", "Yasothon / ยโสธร"
];
const KENSHO_LOGO = "/brand-assets/KENSHO%20Beam/website/img/logo.svg";
const GLASSIFY_LOGO = "/brand-assets/Glassify/glassify_logo_website.svg";
const IDASH_LOGO = "/brand-assets/iDash/idash-static-site/img/main%20logo.png";
const IDASH_HERO = "/brand-assets/iDash/i-dash%20website/hero-product.png";
const IDASH_CARPLAY = "/brand-assets/iDash/i-dash%20website/img/apple%20carplay%20interface%201.png";
const IDASH_CHIP = "/brand-assets/iDash/i-dash%20website/img/snapdragon_icore_mockup.png";
const GLASSIFY_DEFAULT_VEHICLE_VIDEO = "/media/glassify/vehicles/sedan.mp4";
const GLASSIFY_VEHICLE_ASSETS = {
  "sedan": "/media/glassify/vehicles/sedan.mp4",
  "suv": "/media/glassify/vehicles/SUV.mp4",
  "mpv": "/media/glassify/vehicles/MPV.mp4",
  "pick-up": "/media/glassify/vehicles/pickup.mp4",
  "ppv": "/media/glassify/vehicles/PPV.mp4"
};
const TRANSPARENT_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";
const KENSHO_PRODUCT_VISUALS = [
  { key: "lx40", match: /LX-?40|LumiSync/i, series: "LX-40", name: "LumiSync", image: "/brand-assets/KENSHO%20Beam/website/img/products/lx40.png", video: "/media/kensho/lx40-opening-optimized.mp4", beam: "Maximum output adaptive beam" },
  { key: "lx30", match: /LX-?30|HyperBeam/i, series: "LX-30", name: "HyperBeam", image: "/brand-assets/KENSHO%20Beam/website/img/products/lx30.png", video: "/media/kensho/lx30-opening-optimized.mp4", beam: "High-intensity road focus" },
  { key: "lx20", match: /LX-?20|TurboFlux/i, series: "LX-20", name: "TurboFlux", image: "/brand-assets/KENSHO%20Beam/website/img/products/lx20.png", video: "/media/kensho/lx20-opening-optimized.mp4", beam: "Fast response LED core" },
  { key: "lx15", match: /LX-?15|PureLite/i, series: "LX-15", name: "PureLite", image: "/brand-assets/KENSHO%20Beam/website/img/products/lx15.png", video: "/media/kensho/lx15-opening-optimized.mp4", beam: "Clean precision beam" }
];
const imageCache = new Map();

const brandRoutes = {
  "/glassify": "glassify",
  "/idash": "idash",
  "/kensho": "kensho"
};

init();

async function init() {
  document.body.dataset.route = location.pathname.replace("/", "") || "admin";
  const response = await fetch("/api/brands");
  const data = await response.json();
  brands = data.brands || [];
  await loadCatalog();

  if (ADMIN_ROUTES.has(location.pathname)) {
    const ok = await ensureAdmin();
    if (!ok) return;
  } else if (isPublicWarrantyRoute()) {
    hidePublicChrome();
  } else {
    renderChrome(false);
  }

  if (location.pathname === "/" || location.pathname === "/admin") return renderAdmin();
  if (location.pathname === "/v") return renderVerifier();
  if (location.pathname === "/register") return renderScanRegister();
  if (location.pathname === "/details") return renderDetails();

  const brandId = brandRoutes[location.pathname];
  if (!brandId) return renderProblem("Page not found", "Please use the QR code on the warranty card.");
  currentBrand = brands.find((brand) => brand.id === brandId);
  renderBrandPage();
}

async function loadCatalog(all = false) {
  const response = all
    ? await apiFetch("/api/catalog/summary?all=1")
    : await fetch("/api/catalog/summary");
  if (!response.ok) return;
  catalog = await response.json();
  catalogLoaded = true;
}

async function ensureAdmin() {
  const token = localStorage.getItem("spw_admin_token");
  if (!token) {
    renderChrome(false);
    renderLogin();
    return false;
  }
  const response = await apiFetch("/api/auth/session");
  if (!response.ok) {
    localStorage.removeItem("spw_admin_token");
    renderLogin();
    return false;
  }
  const data = await response.json();
  adminUser = data.user;
  await loadCatalog(true);
  renderChrome(true);
  return true;
}

function renderChrome(isAdmin) {
  document.documentElement.classList.remove("public-warranty-flow");
  document.body.classList.remove("public-warranty-flow");
  const topbar = document.querySelector(".topbar");
  if (topbar) topbar.hidden = false;
  const nav = document.querySelector(".topnav");
  if (!nav) return;
  if (!isAdmin) {
    nav.innerHTML = `<span class="customer-note">QR registration only</span>`;
    return;
  }
  nav.innerHTML = `
    <a href="/">Overview</a>
    ${brands.map((brand) => `<a href="/${brand.id}">${escapeHtml(brand.name)}</a>`).join("")}
    <button class="nav-button" type="button" id="logout-button">Sign out</button>
  `;
  document.getElementById("logout-button")?.addEventListener("click", async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("spw_admin_token");
    location.href = "/";
  });
}

function isPublicWarrantyRoute() {
  return ["/v", "/register", "/details"].includes(location.pathname);
}

function hidePublicChrome() {
  document.documentElement.classList.add("public-warranty-flow");
  document.body.classList.add("public-warranty-flow");
  const topbar = document.querySelector(".topbar");
  if (topbar) topbar.hidden = true;
}

function renderLogin() {
  app.innerHTML = `
    <section class="center-state login-state">
      <form id="login-form" class="work-panel login-panel">
        <p class="eyebrow">Admin only</p>
        <h1>Sign in</h1>
        <label>Username
          <input name="username" autocomplete="username" required>
        </label>
        <label>Password
          <input name="password" type="password" autocomplete="current-password" required>
        </label>
        <button class="btn btn-primary" type="submit">Sign in</button>
        <div id="login-status" class="status-line">Customers should use the QR code on their warranty card.</div>
      </form>
    </section>
  `;
  document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("login-status");
    status.textContent = "Signing in...";
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    const data = await response.json();
    if (!response.ok) {
      status.textContent = data.error || "Login failed.";
      return;
    }
    localStorage.setItem("spw_admin_token", data.token);
    location.reload();
  });
}

function apiFetch(url, options = {}) {
  const token = localStorage.getItem("spw_admin_token");
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
}

function renderBrandPage() {
  const brand = currentBrand;
  if (!["generate", "records", "catalog"].includes(activeTab)) activeTab = "generate";
  app.innerHTML = `
    <section class="brand-page workspace-page brand-${brand.id}" style="--brand-accent:${brand.accent};--brand-dark:${brand.dark}">
      ${renderBrandWorkspaceHero(brand)}

      <div class="tabs" role="tablist">
        <button class="tab ${activeTab === "generate" ? "active" : ""}" data-tab="generate">Generate Cards</button>
        <button class="tab ${activeTab === "records" ? "active" : ""}" data-tab="records">Records</button>
        <button class="tab ${activeTab === "catalog" ? "active" : ""}" data-tab="catalog">Catalog</button>
      </div>

      <div id="tab-generate" class="${activeTab === "generate" ? "" : "hidden"}">
        ${renderGenerator(brand.id)}
      </div>
      <div id="tab-records" class="${activeTab === "records" ? "" : "hidden"}">
        ${renderAdminRecords(brand.id)}
      </div>
      <div id="tab-catalog" class="${activeTab === "catalog" ? "" : "hidden"}">
        ${renderCatalogManager(brand)}
      </div>
    </section>
  `;

  bindTabs();
  bindGenerator();
  bindAdminRecords();
  bindCatalogForms();
}

function renderBrandWorkspaceHero(brand) {
  const products = brand.id === "glassify"
    ? catalog.filmOptions.filter((item) => item.brandId === "glassify")
    : catalog.products.filter((item) => item.brandId === brand.id);
  const activeItems = products.filter((item) => item.active !== false).length;
  const coverage = brand.id === "glassify"
    ? "Selected by film option"
    : brand.id === "idash"
      ? "1 year for every product"
      : "2 years for every LED product";
  const cardRule = brand.id === "glassify"
    ? "Physical cards are printed without product. Customer selects film during QR registration."
    : "Physical cards are printed with product already assigned.";
  const logo = brand.logo ? `<img class="workspace-logo" src="${brand.logo}" alt="${brand.name}">` : `<strong>${escapeHtml(brand.name)}</strong>`;
  if (brand.id === "idash") {
    return `
      <header class="workspace-hero idash-admin-hero">
        <div class="workspace-identity idash-admin-identity">
          <img class="workspace-logo idash-admin-logo" src="${IDASH_LOGO}" alt="${brand.name}">
          <div>
            <p class="eyebrow">Pro. Beyond Performance.</p>
            <h1>iDash Warranty Console</h1>
            <p class="lead">Manage QR warranty cards for smart head units with the same black glass, CarPlay-ready character as the iDash website.</p>
            <div class="idash-admin-chips">
              <span>Warranty ID tracking</span>
              <span>1 year coverage</span>
              <span>Install center record</span>
            </div>
          </div>
        </div>
        <div class="idash-admin-visual" aria-label="${escapeHtml(brand.name)} setup summary">
          <img src="${IDASH_HERO}" alt="">
          <div class="idash-admin-stat-row">
            <div><span>Catalog items</span><strong>${activeItems}</strong></div>
            <div><span>Warranty rule</span><strong>${escapeHtml(coverage)}</strong></div>
          </div>
          <p>${escapeHtml(cardRule)}</p>
        </div>
      </header>
    `;
  }
  return `
    <header class="workspace-hero">
      <div class="workspace-identity">
        ${logo}
        <div>
          <p class="eyebrow">Brand workspace</p>
          <h1>${escapeHtml(brand.name)}</h1>
          <p class="lead">${escapeHtml(brand.category)}. Manage card batches, warranty records, and the product catalog for this brand only.</p>
        </div>
      </div>
      <div class="workspace-stats" aria-label="${escapeHtml(brand.name)} setup summary">
        <div><span>Catalog items</span><strong>${activeItems}</strong></div>
        <div><span>Warranty rule</span><strong>${escapeHtml(coverage)}</strong></div>
        <div><span>Card setup</span><strong>${escapeHtml(cardRule)}</strong></div>
      </div>
    </header>
  `;
}

function renderRegisterBySerial() {
  return `
    <div class="work-grid">
      <form id="serial-form" class="work-panel">
        <h2 class="panel-title">Register physical card</h2>
        <p class="status-line">Use this when the customer has a printed warranty card but cannot scan the QR. Enter the serial code to find the pending card.</p>
        <div class="form-grid">
          <label class="full">Warranty serial
            <input name="q" placeholder="Example: GLS-20260518-AB12CD" required>
          </label>
        </div>
        <div class="actions">
          <button class="btn btn-primary" type="submit">Find card</button>
        </div>
        <div id="serial-status" class="status-line">Physical QR scan is the main path.</div>
      </form>
      <aside class="result-panel">
        <h2 class="panel-title">How it works</h2>
        <div class="flow-list">
          <div>1. Staff generates a batch in Admin.</div>
          <div>2. Staff prints physical cards with QR codes.</div>
          <div>3. Customer scans card and registers once.</div>
          <div>4. Future scans show warranty details.</div>
        </div>
      </aside>
    </div>
  `;
}

function renderLookup() {
  return `
    <div class="work-grid">
      <form id="lookup-form" class="work-panel">
        <h2 class="panel-title">Find warranty</h2>
        <div class="form-grid">
          <label class="full">Serial, phone, plate, chassis, or customer name
            <input name="q" required>
          </label>
        </div>
        <div class="actions">
          <button class="btn btn-primary" type="submit">Search</button>
        </div>
        <div id="lookup-status" class="status-line">Enter a search term.</div>
      </form>
      <aside class="result-panel">
        <h2 class="panel-title">Results</h2>
        <div id="lookup-results" class="lookup-results"></div>
      </aside>
    </div>
  `;
}

async function renderVerifier() {
  hidePublicChrome();
  app.innerHTML = `<section class="center-state"><div class="spinner"></div><p>Verifying warranty card...</p></section>`;
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return renderProblem("Invalid QR code", "No warranty ID was found in the QR link.");

  const response = await fetch(`/api/warranties/${encodeURIComponent(id)}`);
  const data = await response.json();
  if (!response.ok) return renderProblem("Warranty card not found", "This physical card has not been generated in the system.");

  const record = data.record;
  if (record.status === "registered") {
    location.replace(`/details?id=${encodeURIComponent(record.uniqueId)}`);
  } else {
    location.replace(`/register?id=${encodeURIComponent(record.uniqueId)}`);
  }
}

async function renderScanRegister() {
  hidePublicChrome();
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return renderProblem("Invalid registration link", "No warranty ID was found.");

  const response = await fetch(`/api/warranties/${encodeURIComponent(id)}`);
  const data = await response.json();
  if (!response.ok) return renderProblem("Warranty card not found", "Please check that this card was generated by staff.");

  const record = data.record;
  if (record.status === "registered") {
    location.replace(`/details?id=${encodeURIComponent(record.uniqueId)}`);
    return;
  }

  currentBrand = brands.find((brand) => brand.id === record.brandId) || brands[0];
  if (currentBrand.id === "kensho") {
    renderKenshoRegister(record);
    return;
  }
  if (currentBrand.id === "glassify") {
    renderGlassifyRegister(record);
    return;
  }
  if (currentBrand.id === "idash") {
    renderIdashRegister(record);
    return;
  }

  app.innerHTML = `
    <section class="brand-page" style="--brand-accent:${currentBrand.accent};--brand-dark:${currentBrand.dark}">
      <div class="hero-panel compact-hero">
        <p class="eyebrow">${currentBrand.name}</p>
        <h1 class="brand-title"><span>Register / \u0e25\u0e07\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19</span> warranty card / \u0e1a\u0e31\u0e15\u0e23\u0e23\u0e31\u0e1a\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19</h1>
        <p class="lead">Serial ${escapeHtml(record.serial)} is ready for customer registration. / \u0e2b\u0e21\u0e32\u0e22\u0e40\u0e25\u0e02\u0e19\u0e35\u0e49\u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e25\u0e07\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32</p>
      </div>
      <div class="work-grid" style="margin-top:20px">
        <form id="register-form" class="work-panel">
          <h2 class="panel-title">Customer and vehicle details / \u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32\u0e41\u0e25\u0e30\u0e23\u0e16</h2>
          ${registrationFields(record)}
          <div class="actions">
            <button class="btn btn-primary" type="submit">Activate warranty / \u0e40\u0e1b\u0e34\u0e14\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19\u0e01\u0e32\u0e23\u0e23\u0e31\u0e1a\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19</button>
          </div>
          <div id="register-status" class="status-line">This card can be registered one time. / \u0e1a\u0e31\u0e15\u0e23\u0e19\u0e35\u0e49\u0e25\u0e07\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e44\u0e14\u0e49\u0e04\u0e23\u0e31\u0e49\u0e07\u0e40\u0e14\u0e35\u0e22\u0e27</div>
        </form>
        <aside class="result-panel">
          <h2 class="panel-title">Card preview / \u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e1a\u0e31\u0e15\u0e23</h2>
          <div id="warranty-preview" class="certificate-preview-wrap"></div>
        </aside>
      </div>
    </section>
  `;
  bindScanRegisterForm(record);
  refreshPreview(record);
}

async function renderDetails() {
  hidePublicChrome();
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return renderProblem("Invalid warranty link", "No warranty ID was found.");

  const response = await fetch(`/api/warranties/${encodeURIComponent(id)}`);
  const data = await response.json();
  if (!response.ok) return renderProblem("Warranty not found", "This warranty record could not be found.");

  const record = data.record;
  if (record.status !== "registered") {
    location.replace(`/v?id=${encodeURIComponent(record.uniqueId)}`);
    return;
  }

  currentBrand = brands.find((brand) => brand.id === record.brandId) || brands[0];
  if (currentBrand.id === "kensho") {
    renderKenshoDetails(record);
    return;
  }
  if (currentBrand.id === "glassify") {
    renderGlassifyDetails(record);
    return;
  }
  if (currentBrand.id === "idash") {
    renderIdashDetails(record);
    return;
  }

  app.innerHTML = `
    <section class="brand-page" style="--brand-accent:${currentBrand.accent};--brand-dark:${currentBrand.dark}">
      <div class="work-grid details-grid">
        <aside class="result-panel">
          <h2 class="panel-title">Warranty details</h2>
          <div id="warranty-preview" class="certificate-preview-wrap"></div>
          <div class="actions">
            <button class="btn btn-dark" type="button" onclick="window.print()">Print / save</button>
          </div>
        </aside>
        <aside class="work-panel">
          <h2 class="panel-title">${escapeHtml(currentBrand.name)}</h2>
          <div class="record">
            ${recordRow("Status", statusLabel(record))}
            ${recordRow("Customer", record.customerName || "-")}
            ${recordRow("Phone", record.phone || "-")}
            ${recordRow("Email", record.email || "-")}
            ${recordRow("Vehicle", [record.vehicleBrand, record.vehicleModel].filter(Boolean).join(" ") || "-")}
            ${recordRow("Plate", [record.plateNo, record.province].filter(Boolean).join(" ") || "-")}
            ${recordRow("Chassis", record.chassisNo || "-")}
            ${recordRow("Install center", record.installCenter || "-")}
            ${recordRow("Notes", record.notes || "-")}
          </div>
        </aside>
      </div>
    </section>
  `;
  refreshPreview(record);
}


function renderGlassifyOpeningOverlay(record) {
  return `
    <section class="glassify-opening" data-glassify-opening>
      <div class="glassify-opening-loader">
        <img src="${GLASSIFY_LOGO}" alt="Glassify">
        <span>Activating Glassify Experience</span>
      </div>
      <video class="glassify-opening-video" data-src="/media/glassify/vehicles/sedan.mp4" preload="metadata" muted playsinline webkit-playsinline loop></video>
      <button class="glassify-opening-play" type="button" data-play-opening>Play Intro</button>
      <button class="glassify-skip" type="button" data-skip-opening>Skip / ข้าม</button>
    </section>
  `;
}

function registrationStep1(record) {
  const vehicleVisuals = {
    sedan: {
      image: "/brand-assets/Glassify/website-light/simulation/assets/vehicle_icons/sedan-m.png",
      sub: "Sedan"
    },
    suv: {
      image: "/brand-assets/Glassify/website-light/simulation/assets/vehicle_icons/suv.png",
      sub: "SUV"
    },
    mpv: {
      image: "/brand-assets/Glassify/website-light/simulation/assets/vehicle_icons/suv.png",
      sub: "MPV / Van"
    },
    "pick-up": {
      image: "/brand-assets/Glassify/website-light/simulation/assets/vehicle_icons/pickup.png",
      sub: "Pick-up"
    },
    ppv: {
      image: "/brand-assets/Glassify/website-light/simulation/assets/vehicle_icons/ppv.png",
      sub: "PPV"
    }
  };
  const vehicleOrder = ["sedan", "pick-up", "suv", "mpv", "ppv"];
  const orderedVehicleTemplates = [
    ...vehicleOrder.map((value) => CERT_TEMPLATES.find((item) => item.value === value)).filter(Boolean),
    ...CERT_TEMPLATES.filter((item) => !vehicleOrder.includes(item.value))
  ];

  return `
    <label class="vehicle-type-label full">Choose Vehicle Type / เลือกประเภทรถ</label>
    <div class="vehicle-character-selector-wrap full">
      <button class="vehicle-scroll-btn left" type="button" data-scroll="left" aria-label="Scroll vehicle types left">
        <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <div class="vehicle-character-selector" id="vehicle-char-selector">
        ${orderedVehicleTemplates.map((item) => {
          const isSelected = item.value === (record.extra?.vehicleTemplate || "sedan");
          const visual = vehicleVisuals[item.value] || vehicleVisuals.sedan;
          const visualMarkup = visual.svg
            ? visual.svg
            : `<img class="vehicle-char-image" src="${escapeHtml(visual.image)}" alt="" loading="lazy">`;
          return `
            <div class="vehicle-char-card ${isSelected ? "selected" : ""}" data-value="${escapeHtml(item.value)}">
              <div class="vehicle-char-badge" aria-hidden="true">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div class="vehicle-char-visual" aria-hidden="true">
                ${visualMarkup}
              </div>
              <div class="vehicle-char-title">${escapeHtml(item.label.split(" ")[0])}</div>
              <div class="vehicle-char-subtitle">${escapeHtml(visual.sub)}</div>
            </div>
          `;
        }).join("")}
      </div>
      <button class="vehicle-scroll-btn right" type="button" data-scroll="right" aria-label="Scroll vehicle types right">
        <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    </div>
    
    <select name="vehicleTemplate" style="display:none;">
      ${orderedVehicleTemplates.map((item) => `<option value="${item.value}" ${item.value === (record.extra?.vehicleTemplate || "sedan") ? "selected" : ""}>${item.label}</option>`).join("")}
    </select>
  `;
}

function registrationStep2(record) {
  return `
    <label>Vehicle brand / ยี่ห้อรถ
      <input name="vehicleBrand" list="vehicle-brand-options" value="${escapeHtml(record.vehicleBrand || "")}" placeholder="Select or type manually" required>
    </label>
    <label>Vehicle model / รุ่นรถ
      <input name="vehicleModel" list="vehicle-model-options" value="${escapeHtml(record.vehicleModel || "")}" placeholder="Select after brand or type manually" required>
    </label>
  `;
}

function registrationStep3(record) {
  return `
    <label>License plate / ทะเบียน
      <input name="plateNo" value="${escapeHtml(record.plateNo || "")}" placeholder="3กข-1245" required>
    </label>
    <label>Province / จังหวัด
      <input name="province" list="province-options" value="${escapeHtml(record.province || "")}" placeholder="Suphan Buri / สุพรรณบุรี" required>
    </label>
  `;
}

function registrationStep4(record) {
  return `
    <label class="full">Chassis number / เลขตัวถัง (Optional / ไม่บังคับสำหรับรถป้ายแดง)
      <input name="chassisNo" placeholder="Specify chassis number / ระบุเลขตัวถัง (ไม่บังคับสำหรับรถป้ายแดง)" value="${escapeHtml(record.chassisNo || "")}">
    </label>
    <label class="full">Install center / ศูนย์ติดตั้ง
      <select name="installCenter" required>
        <option value="">Please select... / กรุณาเลือก</option>
        ${installCenterOptions().map((center) => {
          const value = center.location ? `${center.name} - ${center.location}` : center.name;
          return `<option value="${escapeHtml(value)}" data-store="${escapeHtml(center.name)}" data-location="${escapeHtml(center.location)}" ${value === record.installCenter ? "selected" : ""}>${escapeHtml(value)}</option>`;
        }).join("")}
      </select>
    </label>
  `;
}

function registrationStep5(record) {
  const installDate = today();
  return `
    <label style="display:none;">Warranty No. / เลขรับประกัน
      <input name="serial" value="${escapeHtml(record.serial)}" readonly>
    </label>
    <label style="display:none;">Install date / วันที่ติดตั้ง
      <input name="installDate" type="date" value="${escapeHtml(installDate)}" min="${escapeHtml(installDate)}" max="${escapeHtml(installDate)}" readonly required>
    </label>
    ${renderGlassifyFilmFields(record)}
  `;
}

function registrationStep6(record) {
  return `
    <label class="full">Customer name / ชื่อลูกค้า
      <input name="customerName" autocomplete="name" required placeholder="Full Name / ชื่อ-นามสกุล" value="${escapeHtml(record.customerName || "")}">
    </label>
    <label>Phone / เบอร์โทรศัพท์
      <input name="phone" inputmode="numeric" autocomplete="tel" pattern="[0-9]*" maxlength="15" placeholder="0812345678" required value="${escapeHtml(record.phone || "")}">
    </label>
    <label>Email / อีเมล
      <input name="email" type="email" autocomplete="email" placeholder="example@email.com" value="${escapeHtml(record.email || "")}">
    </label>
    <label class="full">Notes / หมายเหตุ
      <textarea name="notes" placeholder="Optional install notes / หมายเหตุเพิ่มเติม">${escapeHtml(record.notes || "")}</textarea>
    </label>
  `;
}

function renderGlassifyRegister(record) {
  hidePublicChrome();
  app.innerHTML = `
    <section class="glassify-public-page glassify-register-page">
      <div class="glassify-public-hero-compact">
        <div class="hero-compact-left">
          <img src="${GLASSIFY_LOGO}" alt="Glassify" class="hero-compact-logo">
          <span class="hero-compact-divider"></span>
          <span class="hero-compact-title">Activate Warranty</span>
        </div>
        <div class="hero-compact-right">
          <div class="hero-compact-card-id">
            <span class="card-id-label">Card ID</span>
            <span class="card-id-value">${escapeHtml(record.serial)}</span>
          </div>
        </div>
      </div>
      <div class="glassify-public-grid">
        <form id="register-form" class="glassify-form-panel">
          <datalist id="vehicle-brand-options">${vehicleMakes().map((make) => `<option value="${escapeHtml(make)}"></option>`).join("")}</datalist>
          <datalist id="vehicle-model-options">${vehicleModelsForMake(record.vehicleBrand).map((model) => `<option value="${escapeHtml(model)}"></option>`).join("")}</datalist>
          <datalist id="province-options">${THAI_PROVINCES.map((province) => `<option value="${escapeHtml(province)}"></option>`).join("")}</datalist>
          
          <!-- ── Progress Tracker ── -->
          <div class="wizard-progress-track">
            <div class="wizard-progress-bar" id="wizard-progress-bar"></div>
            <div class="wizard-step-node active" data-step-node="1">
              <div class="wizard-step-circle">
                <span>1</span>
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div class="wizard-step-label">Type / ประเภท</div>
            </div>
            <div class="wizard-step-node" data-step-node="2">
              <div class="wizard-step-circle">
                <span>2</span>
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div class="wizard-step-label">Model / รุ่น</div>
            </div>
            <div class="wizard-step-node" data-step-node="3">
              <div class="wizard-step-circle">
                <span>3</span>
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div class="wizard-step-label">Plate / ทะเบียน</div>
            </div>
            <div class="wizard-step-node" data-step-node="4">
              <div class="wizard-step-circle">
                <span>4</span>
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div class="wizard-step-label">Chassis / ตัวถัง</div>
            </div>
            <div class="wizard-step-node" data-step-node="5">
              <div class="wizard-step-circle">
                <span>5</span>
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div class="wizard-step-label">Films / ฟิล์ม</div>
            </div>
            <div class="wizard-step-node" data-step-node="6">
              <div class="wizard-step-circle">
                <span>6</span>
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div class="wizard-step-label">Customer / ลูกค้า</div>
            </div>
          </div>
          
          <!-- ── Step 1 ── -->
          <div class="wizard-step active" data-step="1">
            <h2 class="panel-title">Vehicle Type <span style="font-size:13px;font-weight:500;color:#94a3b8;">/ ประเภทรถ</span></h2>
            <div class="form-grid">
              ${registrationStep1(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn glassify-primary" type="button" data-next-step="1">Next Step &nbsp;/ ถัดไป ›</button>
            </div>
          </div>
          
          <!-- ── Step 2 ── -->
          <div class="wizard-step" data-step="2">
            <h2 class="panel-title">Vehicle Model <span style="font-size:13px;font-weight:500;color:#94a3b8;">/ ยี่ห้อและรุ่นรถ</span></h2>
            <div class="form-grid">
              ${registrationStep2(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn btn-back" type="button" data-prev-step="2">‹ Back / ย้อนกลับ</button>
              <button class="btn glassify-primary" type="button" data-next-step="2">Next Step &nbsp;/ ถัดไป ›</button>
            </div>
          </div>
          
          <!-- ── Step 3 ── -->
          <div class="wizard-step" data-step="3">
            <h2 class="panel-title">Registration Plate <span style="font-size:13px;font-weight:500;color:#94a3b8;">/ ทะเบียนและจังหวัด</span></h2>
            <div class="form-grid">
              ${registrationStep3(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn btn-back" type="button" data-prev-step="3">‹ Back / ย้อนกลับ</button>
              <button class="btn glassify-primary" type="button" data-next-step="3">Next Step &nbsp;/ ถัดไป ›</button>
            </div>
          </div>

          <!-- ── Step 4 ── -->
          <div class="wizard-step" data-step="4">
            <h2 class="panel-title">Chassis & Install Center <span style="font-size:13px;font-weight:500;color:#94a3b8;">/ เลขตัวถังและศูนย์บริการ</span></h2>
            <div class="form-grid">
              ${registrationStep4(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn btn-back" type="button" data-prev-step="4">‹ Back / ย้อนกลับ</button>
              <button class="btn glassify-primary" type="button" data-next-step="4">Next Step &nbsp;/ ถัดไป ›</button>
            </div>
          </div>

          <!-- ── Step 5 ── -->
          <div class="wizard-step" data-step="5">
            <h2 class="panel-title">Film Selection <span style="font-size:13px;font-weight:500;color:#94a3b8;">/ เลือกฟิล์มและวันที่ติดตั้ง</span></h2>
            <div class="form-grid">
              ${registrationStep5(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn btn-back" type="button" data-prev-step="5">‹ Back / ย้อนกลับ</button>
              <button class="btn glassify-primary" type="button" data-next-step="5">Next Step &nbsp;/ ถัดไป ›</button>
            </div>
          </div>
          
          <!-- ── Step 6 ── -->
          <div class="wizard-step" data-step="6">
            <h2 class="panel-title">Customer Information <span style="font-size:13px;font-weight:500;color:#94a3b8;">/ ข้อมูลเจ้าของรถ</span></h2>
            <div class="form-grid">
              ${registrationStep6(record)}
            </div>
            <div class="actions wizard-nav-btns" style="margin-top:24px;">
              <button class="btn btn-back" type="button" data-prev-step="6">‹ Back / ย้อนกลับ</button>
              <button class="btn glassify-primary" type="submit">Activate Warranty &nbsp;/ ยืนยันการรับประกัน</button>
            </div>
          </div>
          
          <div id="register-status" class="status-line">This PVC card can be registered one time. / บัตร PVC นี้ลงทะเบียนได้ครั้งเดียว</div>
        </form>
        
        <aside class="glassify-preview-panel">
          <h2 class="panel-title">Live warranty card <span style="font-size:13px;font-weight:500;color:#94a3b8;">/ ตัวอย่างบัตร</span></h2>
          <div id="warranty-preview"></div>
        </aside>
      </div>
    </section>
    
    <!-- Fullscreen Glass Success Overlay -->
    <div class="glassify-success-overlay" id="glassify-success-overlay">
      <div class="success-celebration-box">
        <div class="success-celebration-circle">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h2 class="success-celebration-title">Warranty Activated!<br>เปิดใช้งานการรับประกันสำเร็จ</h2>
        <p class="success-celebration-desc">Your premium digital warranty has been successfully registered. / บัตรประกันอิเล็กทรอนิกส์ของท่านได้รับการลงทะเบียนแล้ว</p>
      </div>
    </div>
  `;
  bindScanRegisterForm(record);
  refreshPreview(record);
}

function renderGlassifyDetails(record) {
  hidePublicChrome();
  app.innerHTML = `
    <section class="glassify-public-page glassify-details-page">
      <div class="glassify-details-centered">
        <div class="glassify-detail-card-wrap">
          ${renderGlassifyWarrantyCard(record, "details")}
          <div class="actions" style="margin-top:24px; display:flex; flex-direction:column; gap:12px; width:100%; align-items:center;">
            <button class="btn glassify-primary" type="button" id="save-glassify-card" style="width:100%; max-width:380px;">Save image</button>
            <a href="https://glassifyfilms.com/" class="btn btn-back" style="width:100%; max-width:380px; text-decoration:none; display:flex; align-items:center; justify-content:center;">Back to Website / กลับสู่เว็บไซต์</a>
          </div>
        </div>
      </div>
    </section>
  `;
  document.getElementById("save-glassify-card")?.addEventListener("click", () => saveGlassifyCardImage(record));
}

function renderIdashRegister(record) {
  hidePublicChrome();
  app.innerHTML = `
    <section class="idash-public-page idash-register-page">
      <div class="idash-register-hero">
        <div>
          <img src="${IDASH_LOGO}" alt="iDash">
          <span>Activate Warranty</span>
        </div>
        <div class="idash-register-serial">
          <span>Card ID</span>
          <strong>${escapeHtml(record.serial)}</strong>
        </div>
      </div>
      <div class="idash-public-grid">
        <form id="register-form" class="idash-form-panel idash-wizard-panel">
          <datalist id="vehicle-brand-options">${vehicleMakes().map((make) => `<option value="${escapeHtml(make)}"></option>`).join("")}</datalist>
          <datalist id="vehicle-model-options">${vehicleModelsForMake(record.vehicleBrand).map((model) => `<option value="${escapeHtml(model)}"></option>`).join("")}</datalist>
          <datalist id="province-options">${THAI_PROVINCES.map((province) => `<option value="${escapeHtml(province)}"></option>`).join("")}</datalist>

          <div class="wizard-progress-track">
            <div class="wizard-progress-bar" id="wizard-progress-bar"></div>
            ${[
              ["Product", "สินค้า"],
              ["Type", "ประเภทรถ"],
              ["Model", "รุ่นรถ"],
              ["Plate", "ทะเบียน"],
              ["Install", "ติดตั้ง"],
              ["Customer", "ลูกค้า"]
            ].map(([label, thai], index) => `
              <div class="wizard-step-node ${index === 0 ? "active" : ""}" data-step-node="${index + 1}">
                <div class="wizard-step-circle">
                  <span>${index + 1}</span>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div class="wizard-step-label">${label} / ${thai}</div>
              </div>
            `).join("")}
          </div>

          <div class="wizard-step active" data-step="1">
            <h2 class="panel-title">Product & Device <span> / ข้อมูลสินค้า</span></h2>
            <div class="form-grid">
              ${idashRegistrationStep1(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn idash-primary" type="button" data-next-step="1">Next Step</button>
            </div>
          </div>

          <div class="wizard-step" data-step="2">
            <h2 class="panel-title">Vehicle Type <span> / ประเภทรถ</span></h2>
            <div class="form-grid">
              ${registrationStep1(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn idash-secondary" type="button" data-prev-step="2">Back</button>
              <button class="btn idash-primary" type="button" data-next-step="2">Next Step</button>
            </div>
          </div>

          <div class="wizard-step" data-step="3">
            <h2 class="panel-title">Vehicle Model <span> / รุ่นรถ</span></h2>
            <div class="form-grid">
              ${registrationStep2(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn idash-secondary" type="button" data-prev-step="3">Back</button>
              <button class="btn idash-primary" type="button" data-next-step="3">Next Step</button>
            </div>
          </div>

          <div class="wizard-step" data-step="4">
            <h2 class="panel-title">Registration Plate <span> / ทะเบียนรถ</span></h2>
            <div class="form-grid">
              ${registrationStep3(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn idash-secondary" type="button" data-prev-step="4">Back</button>
              <button class="btn idash-primary" type="button" data-next-step="4">Next Step</button>
            </div>
          </div>

          <div class="wizard-step" data-step="5">
            <h2 class="panel-title">Install Center <span> / ศูนย์ติดตั้ง</span></h2>
            <div class="form-grid">
              ${idashRegistrationStep5(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn idash-secondary" type="button" data-prev-step="5">Back</button>
              <button class="btn idash-primary" type="button" data-next-step="5">Next Step</button>
            </div>
          </div>

          <div class="wizard-step" data-step="6">
            <h2 class="panel-title">Customer Information <span> / ข้อมูลลูกค้า</span></h2>
            <div class="form-grid">
              ${registrationStep6(record)}
            </div>
            <div class="actions wizard-nav-btns">
              <button class="btn idash-secondary" type="button" data-prev-step="6">Back</button>
              <button class="btn idash-primary" type="submit">Activate Warranty</button>
            </div>
          </div>

          <div id="register-status" class="status-line">This iDash warranty can be activated one time.</div>
        </form>

        <aside class="idash-preview-panel">
          <h2 class="panel-title">Live warranty card <span> / ตัวอย่างบัตร</span></h2>
          <div id="warranty-preview"></div>
        </aside>
      </div>
    </section>
  `;
  bindScanRegisterForm(record);
  refreshPreview(record);
}

function idashRegistrationStep1(record) {
  const installDate = today();
  const product = record.product || currentBrand.products[0]?.name || currentBrand.name;
  return `
    <label style="display:none;">Warranty No.
      <input name="serial" value="${escapeHtml(record.serial)}" readonly>
    </label>
    <label style="display:none;">Install date
      <input name="installDate" type="date" value="${escapeHtml(installDate)}" min="${escapeHtml(installDate)}" max="${escapeHtml(installDate)}" readonly required>
    </label>
    <label class="full">Product / สินค้า
      <input value="${escapeHtml(product)}" readonly>
      <input type="hidden" name="product" value="${escapeHtml(product)}">
    </label>
  `;
}

function idashRegistrationStep5(record) {
  return `
    <label class="full">Chassis number / เลขตัวถัง
      <input name="chassisNo" placeholder="Optional chassis number" value="${escapeHtml(record.chassisNo || "")}">
    </label>
    <label class="full">Install center / ศูนย์ติดตั้ง
      <select name="installCenter" required>
        <option value="">Please select... / กรุณาเลือก</option>
        ${installCenterOptions().map((center) => {
          const value = center.location ? `${center.name} - ${center.location}` : center.name;
          return `<option value="${escapeHtml(value)}" data-store="${escapeHtml(center.name)}" data-location="${escapeHtml(center.location)}" ${value === record.installCenter ? "selected" : ""}>${escapeHtml(value)}</option>`;
        }).join("")}
      </select>
    </label>
  `;
}

function renderIdashDetails(record) {
  hidePublicChrome();
  app.innerHTML = `
    <section class="idash-public-page idash-details-page">
      <div class="idash-details-grid">
        ${renderIdashWarrantyCard(record)}
        ${renderIdashProductStage(record, "details")}
      </div>
      <div class="actions idash-detail-actions">
        <button class="btn idash-primary" type="button" id="save-idash-card">Save image</button>
        <a class="btn idash-secondary" href="https://idashthailand.com/">Back to iDash website</a>
      </div>
    </section>
  `;
  document.getElementById("save-idash-card")?.addEventListener("click", () => saveIdashWarrantyImage(record));
}

function renderIdashProductStage(record, mode) {
  const product = record.product || "iDash Smart Display";
  return `
    <aside class="idash-product-stage ${mode === "details" ? "compact" : ""}">
      <div class="idash-grid-bg"></div>
      <div class="idash-stage-copy">
        <img src="${IDASH_LOGO}" alt="iDash">
        <p>Pro. Beyond Performance.</p>
        <h2>${escapeHtml(product)}</h2>
        <div class="idash-stage-meta">
          <span>CarPlay ready</span>
          <span>DSP sound</span>
          <span>Vision 360</span>
        </div>
      </div>
      <div class="idash-device-frame">
        <div class="idash-device-sidebar">
          <span>MIC</span>
          <span>RST</span>
          <i></i>
          <i></i>
          <i></i>
        </div>
        <div class="idash-screen-face">
          <img src="${IDASH_CARPLAY}" alt="">
        </div>
      </div>
      <div class="idash-hero-unit">
        <img src="${IDASH_HERO}" alt="">
      </div>
      <div class="idash-chip-card">
        <img src="${IDASH_CHIP}" alt="">
        <div>
          <span>Warranty ID</span>
          <strong>${escapeHtml(record.serial || "-")}</strong>
        </div>
      </div>
    </aside>
  `;
}

function renderIdashWarrantyCard(record) {
  const expiryDate = record.expiryDate || addYears(record.installDate, Number(record.warrantyYears || 1));
  return `
    <article class="idash-warranty-card">
      <div class="idash-card-topline">
        <img src="${IDASH_LOGO}" alt="iDash">
        <span>${escapeHtml(statusLabel(record))}</span>
      </div>
      <p class="idash-card-kicker">Digital product warranty</p>
      <h1>${escapeHtml(record.product || "iDash Smart Display")}</h1>
      <div class="idash-serial">${escapeHtml(record.serial || "-")}</div>
      <div class="idash-warranty-rows">
        ${recordRow("Customer", record.customerName || "-")}
        ${recordRow("Phone", record.phone || "-")}
        ${recordRow("Vehicle", [record.vehicleBrand, record.vehicleModel].filter(Boolean).join(" ") || "-")}
        ${recordRow("Plate", [record.plateNo, record.province].filter(Boolean).join(" ") || "-")}
        ${recordRow("Install center", record.installCenter || "-")}
        ${recordRow("Coverage", `${record.installDate || "-"} to ${expiryDate || "-"}`)}
      </div>
    </article>
  `;
}

function renderKenshoRegister(record) {
  hidePublicChrome();
  app.innerHTML = `
    ${renderKenshoOpeningOverlay(record)}
    <section class="kensho-public-page kensho-register-page kensho-app-content is-waiting">
      <div class="kensho-performance-grid">
        ${renderKenshoProductStage(record, "register")}
        <form id="register-form" class="kensho-form-panel">
          <div class="kensho-form-head">
            <img src="${KENSHO_LOGO}" alt="KENSHO Beam">
            <p>Activate beam warranty / \u0e25\u0e07\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e23\u0e31\u0e1a\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e44\u0e1f</p>
            <h1>${escapeHtml(record.serial)}</h1>
          </div>

          <datalist id="vehicle-brand-options">${vehicleMakes().map((make) => `<option value="${escapeHtml(make)}"></option>`).join("")}</datalist>
          <datalist id="vehicle-model-options">${vehicleModelsForMake(record.vehicleBrand).map((model) => `<option value="${escapeHtml(model)}"></option>`).join("")}</datalist>
          <datalist id="province-options">${THAI_PROVINCES.map((province) => `<option value="${escapeHtml(province)}"></option>`).join("")}</datalist>

          <div class="wizard-progress-track">
            <div class="wizard-progress-bar" id="wizard-progress-bar"></div>
            ${[
              ["Product", "\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32"],
              ["Type", "\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e23\u0e16"],
              ["Model", "\u0e23\u0e38\u0e48\u0e19\u0e23\u0e16"],
              ["Plate", "\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19"],
              ["Install", "\u0e15\u0e34\u0e14\u0e15\u0e31\u0e49\u0e07"],
              ["Customer", "\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32"]
            ].map(([label, thai], index) => `
              <div class="wizard-step-node ${index === 0 ? "active" : ""}" data-step-node="${index + 1}">
                <div class="wizard-step-circle">
                  <span>${index + 1}</span>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div class="wizard-step-label">${label} / ${thai}</div>
              </div>
            `).join("")}
          </div>

          <div class="wizard-step active" data-step="1">
            <h2 class="panel-title">Product & Socket <span> / \u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32</span></h2>
            <div class="form-grid">
              ${kenshoRegistrationStep1(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn kensho-primary" type="button" data-next-step="1">Next Step / \u0e16\u0e31\u0e14\u0e44\u0e1b</button>
            </div>
          </div>

          <div class="wizard-step" data-step="2">
            <h2 class="panel-title">Vehicle Type <span> / \u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e23\u0e16</span></h2>
            <div class="form-grid">
              ${registrationStep1(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn kensho-secondary" type="button" data-prev-step="2">Back / \u0e22\u0e49\u0e2d\u0e19\u0e01\u0e25\u0e31\u0e1a</button>
              <button class="btn kensho-primary" type="button" data-next-step="2">Next Step / \u0e16\u0e31\u0e14\u0e44\u0e1b</button>
            </div>
          </div>

          <div class="wizard-step" data-step="3">
            <h2 class="panel-title">Vehicle Model <span> / \u0e23\u0e38\u0e48\u0e19\u0e23\u0e16</span></h2>
            <div class="form-grid">
              ${registrationStep2(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn kensho-secondary" type="button" data-prev-step="3">Back / \u0e22\u0e49\u0e2d\u0e19\u0e01\u0e25\u0e31\u0e1a</button>
              <button class="btn kensho-primary" type="button" data-next-step="3">Next Step / \u0e16\u0e31\u0e14\u0e44\u0e1b</button>
            </div>
          </div>

          <div class="wizard-step" data-step="4">
            <h2 class="panel-title">Registration Plate <span> / \u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e23\u0e16</span></h2>
            <div class="form-grid">
              ${registrationStep3(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn kensho-secondary" type="button" data-prev-step="4">Back / \u0e22\u0e49\u0e2d\u0e19\u0e01\u0e25\u0e31\u0e1a</button>
              <button class="btn kensho-primary" type="button" data-next-step="4">Next Step / \u0e16\u0e31\u0e14\u0e44\u0e1b</button>
            </div>
          </div>

          <div class="wizard-step" data-step="5">
            <h2 class="panel-title">Install Center <span> / \u0e28\u0e39\u0e19\u0e22\u0e4c\u0e15\u0e34\u0e14\u0e15\u0e31\u0e49\u0e07</span></h2>
            <div class="form-grid">
              ${kenshoRegistrationStep5(record)}
            </div>
            <div class="wizard-nav-btns">
              <button class="btn kensho-secondary" type="button" data-prev-step="5">Back / \u0e22\u0e49\u0e2d\u0e19\u0e01\u0e25\u0e31\u0e1a</button>
              <button class="btn kensho-primary" type="button" data-next-step="5">Next Step / \u0e16\u0e31\u0e14\u0e44\u0e1b</button>
            </div>
          </div>

          <div class="wizard-step" data-step="6">
            <h2 class="panel-title">Customer Information <span> / \u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32</span></h2>
            <div class="form-grid">
              ${registrationStep6(record)}
            </div>
            <div class="actions wizard-nav-btns">
              <button class="btn kensho-secondary" type="button" data-prev-step="6">Back / \u0e22\u0e49\u0e2d\u0e19\u0e01\u0e25\u0e31\u0e1a</button>
              <button class="btn kensho-primary" type="submit">Activate warranty / \u0e22\u0e37\u0e19\u0e22\u0e31\u0e19</button>
            </div>
          </div>

          <div id="register-status" class="status-line">Product is locked from the physical card. Complete customer details once. / \u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32\u0e16\u0e39\u0e01\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e08\u0e32\u0e01\u0e1a\u0e31\u0e15\u0e23\u0e08\u0e23\u0e34\u0e07\u0e41\u0e25\u0e49\u0e27 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e01\u0e23\u0e2d\u0e01\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32\u0e43\u0e2b\u0e49\u0e04\u0e23\u0e1a\u0e16\u0e49\u0e27\u0e19</div>
        </form>
      </div>
    </section>
  `;
  bindScanRegisterForm(record);
  bindKenshoOpening();
}

function kenshoRegistrationStep1(record) {
  const installDate = today();
  const product = record.product || currentBrand.products[0]?.name || "KENSHO Beam";
  return `
    <label style="display:none;">Warranty No.
      <input name="serial" value="${escapeHtml(record.serial)}" readonly>
    </label>
    <label style="display:none;">Install date
      <input name="installDate" type="date" value="${escapeHtml(installDate)}" min="${escapeHtml(installDate)}" max="${escapeHtml(installDate)}" readonly required>
    </label>
    <label class="full">Product / \u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32
      <input value="${escapeHtml(product)}" readonly>
      <input type="hidden" name="product" value="${escapeHtml(product)}">
    </label>
    <label class="full">Socket type / \u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e02\u0e31\u0e49\u0e27\u0e44\u0e1f
      <select name="extraSocket" required>
        ${["H4", "H7", "H11", "HB3 / 9005", "HB4 / 9006", "9012"].map((socket) => `<option ${socket === record.extra?.socket ? "selected" : ""}>${socket}</option>`).join("")}
      </select>
    </label>
  `;
}

function kenshoRegistrationStep5(record) {
  return `
    <label class="full">Chassis number / \u0e40\u0e25\u0e02\u0e15\u0e31\u0e27\u0e16\u0e31\u0e07
      <input name="chassisNo" placeholder="Optional chassis number" value="${escapeHtml(record.chassisNo || "")}">
    </label>
    <label class="full">Install center / \u0e28\u0e39\u0e19\u0e22\u0e4c\u0e15\u0e34\u0e14\u0e15\u0e31\u0e49\u0e07
      <select name="installCenter" required>
        <option value="">Please select... / \u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e25\u0e37\u0e2d\u0e01</option>
        ${installCenterOptions().map((center) => {
          const value = center.location ? `${center.name} - ${center.location}` : center.name;
          return `<option value="${escapeHtml(value)}" data-store="${escapeHtml(center.name)}" data-location="${escapeHtml(center.location)}" ${value === record.installCenter ? "selected" : ""}>${escapeHtml(value)}</option>`;
        }).join("")}
      </select>
    </label>
  `;
}

function renderKenshoDetails(record) {
  hidePublicChrome();
  app.innerHTML = `
    ${renderKenshoOpeningOverlay(record)}
    <section class="kensho-public-page kensho-details-page kensho-app-content is-waiting">
      <div class="kensho-details-grid">
        ${renderKenshoWarrantyCard(record)}
        ${renderKenshoProductStage(record, "details")}
      </div>
      <div class="actions kensho-detail-actions">
        <button class="btn kensho-primary" type="button" id="save-kensho-card">Save image</button>
      </div>
    </section>
  `;
  bindKenshoOpening();
  document.getElementById("save-kensho-card")?.addEventListener("click", () => saveKenshoWarrantyImage(record));
}

function renderKenshoOpeningOverlay(record) {
  const visual = kenshoProductVisual(record);
  if (!visual.video) return "";
  return `
    <section class="kensho-opening" data-kensho-opening>
      <div class="kensho-opening-loader">
        <img src="${KENSHO_LOGO}" alt="KENSHO Beam">
        <span>Initializing beam warranty</span>
      </div>
      <video class="kensho-opening-video" data-src="${escapeHtml(visual.video)}" preload="metadata" muted playsinline webkit-playsinline poster="${escapeHtml(visual.image)}"></video>
      <button class="kensho-opening-play" type="button" data-play-opening>Play intro</button>
      <button class="kensho-skip" type="button" data-skip-opening>Skip</button>
    </section>
  `;
}

function renderKenshoProductStage(record, mode) {
  const visual = kenshoProductVisual(record);
  return `
    <aside class="kensho-product-stage ${mode === "details" ? "compact" : ""}">
      <div class="kensho-stage-bg"></div>
      <div class="kensho-stage-hud top-left">BEAM PROFILE / ${escapeHtml(visual.series)}</div>
      <div class="kensho-stage-hud top-right">2 YEAR WARRANTY</div>
      <div class="kensho-beam-line beam-a"></div>
      <div class="kensho-beam-line beam-b"></div>
      <div class="kensho-product-orbit"></div>
      <img class="kensho-product-img" src="${visual.image}" alt="${escapeHtml(record.product || "KENSHO Beam")}">
      <div class="kensho-stage-copy">
        <img src="${KENSHO_LOGO}" alt="KENSHO Beam">
        <p>${escapeHtml(visual.beam)}</p>
        <h2>${escapeHtml(record.product || `${visual.series} ${visual.name}`)}</h2>
        <div class="kensho-tech-tags">
          <span>LED CORE</span>
          <span>CANBUS READY</span>
          <span>ROAD FOCUS</span>
        </div>
      </div>
    </aside>
  `;
}

function renderKenshoWarrantyCard(record) {
  const visual = kenshoProductVisual(record);
  return `
    <article class="kensho-warranty-card">
      <div class="kensho-card-header">
        <img src="${KENSHO_LOGO}" alt="KENSHO Beam">
        <span>Verified warranty</span>
      </div>
      <div class="kensho-card-main">
        <div>
          <p class="kensho-card-kicker">Digital warranty card</p>
          <h1>${escapeHtml(record.product || `${visual.series} ${visual.name}`)}</h1>
          <div class="kensho-card-serial">${escapeHtml(record.serial || "-")}</div>
        </div>
        <img src="${visual.image}" alt="${escapeHtml(record.product || "KENSHO Beam")}">
      </div>
      <div class="kensho-coverage-strip">
        <strong>2 Year Coverage</strong>
        <span>${escapeHtml(record.installDate || "-")} to ${escapeHtml(record.expiryDate || "-")}</span>
      </div>
      <div class="kensho-card-data">
        ${kenshoDataRow("Status", statusLabel(record))}
        ${kenshoDataRow("Customer", record.customerName || "-")}
        ${kenshoDataRow("Vehicle", [record.vehicleBrand, record.vehicleModel].filter(Boolean).join(" ") || "-")}
        ${kenshoDataRow("Plate", [record.plateNo, record.province].filter(Boolean).join(" ") || "-")}
        ${kenshoDataRow("Socket", record.extra?.socket || "-")}
        ${kenshoDataRow("Install center", record.installCenter || "-")}
        ${kenshoDataRow("Chassis", record.chassisNo || "-")}
      </div>
    </article>
  `;
}

function kenshoProductVisual(record) {
  const value = `${record.product || ""} ${record.variant || ""}`;
  return KENSHO_PRODUCT_VISUALS.find((item) => item.match.test(value)) || KENSHO_PRODUCT_VISUALS[0];
}

function bindKenshoOpening() {
  const overlay = document.querySelector("[data-kensho-opening]");
  const content = document.querySelector(".kensho-app-content");
  const video = overlay?.querySelector(".kensho-opening-video[data-src]");
  const playButton = overlay?.querySelector("[data-play-opening]");
  if (!overlay || !content || !video) {
    content?.classList.remove("is-waiting");
    return;
  }

  const connection = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
  const saveData = Boolean(connection?.saveData);
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (saveData || reducedMotion) {
    finishKenshoOpening(overlay, content);
    return;
  }

  let done = false;
  const openedAt = performance.now();
  const logoHoldMs = 2000;
  const finish = () => {
    if (done) return;
    done = true;
    finishKenshoOpening(overlay, content);
  };
  const showTapToPlay = () => {
    if (done || !video.paused) return;
    overlay.classList.add("is-needs-tap");
  };
  const playOpening = () => {
    if (done) return;
    overlay.classList.remove("is-needs-tap");
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    const promise = video.play();
    if (promise?.catch) promise.catch(showTapToPlay);
  };

  overlay.querySelector("[data-skip-opening]")?.addEventListener("click", finish);
  playButton?.addEventListener("click", playOpening);
  overlay.addEventListener("click", (event) => {
    if (!overlay.classList.contains("is-needs-tap")) return;
    if (event.target.closest("[data-skip-opening]")) return;
    playOpening();
  });
  video.addEventListener("canplay", () => overlay.classList.add("is-ready"), { once: true });
  video.addEventListener("playing", () => overlay.classList.add("is-playing"), { once: true });
  video.addEventListener("ended", finish, { once: true });
  video.addEventListener("error", finish, { once: true });

  const loadVideo = () => {
    video.src = video.dataset.src;
    video.load();
    const remainingLogoHold = Math.max(0, logoHoldMs - (performance.now() - openedAt));
    window.setTimeout(() => {
      if (done) return;
      playOpening();
    }, remainingLogoHold);
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(loadVideo, { timeout: 600 });
  } else {
    window.setTimeout(loadVideo, 250);
  }
}

function finishKenshoOpening(overlay, content) {
  content.classList.remove("is-waiting");
  overlay.classList.add("is-done");
  window.setTimeout(() => overlay.remove(), 520);
}

function kenshoDataRow(label, value) {
  return `<div class="kensho-data-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "-")}</strong></div>`;
}

function renderAdmin() {
  app.innerHTML = `
    <section class="brand-page workspace-page" style="--brand-accent:#0ea5e9;--brand-dark:#111827">
      <header class="workspace-hero admin-workspace">
        <div class="workspace-identity">
          <div class="workspace-monogram">SP</div>
          <div>
            <p class="eyebrow">Admin console</p>
            <h1>Siri Pattana Warranty</h1>
            <p class="lead">Generate physical QR cards, review warranty records, and maintain catalogs across all brands.</p>
          </div>
        </div>
        <div class="brand-switcher" aria-label="Brand workspaces">
          ${brands.map((brand) => `<a href="/${brand.id}" style="--brand-accent:${brand.accent}">${escapeHtml(brand.name)}</a>`).join("")}
        </div>
      </header>

      <div id="admin-dashboard">${renderOverviewDashboard()}</div>

      <div class="tabs" role="tablist">
        <button class="tab active" data-admin-tab="dashboard">Dashboard</button>
        <button class="tab" data-admin-tab="generate">Generate Cards</button>
        <button class="tab" data-admin-tab="records">Records</button>
        <button class="tab" data-admin-tab="catalog">Catalog</button>
      </div>

      <div id="admin-generate" class="hidden">${renderGenerator()}</div>
      <div id="admin-records" class="hidden">${renderAdminRecords()}</div>
      <div id="admin-catalog" class="hidden">${renderCatalogManager(null)}</div>
    </section>
  `;
  bindAdminTabs();
  bindOverviewDashboard();
  bindGenerator();
  bindAdminRecords();
  bindCatalogForms();
}

function renderOverviewDashboard() {
  return `
    <section class="dashboard-grid">
      <div id="overview-kpis" class="kpi-grid">
        ${["Total Cards", "Registered", "Available", "Printed"].map((label) => `<div class="kpi-card"><span>${label}</span><strong>0</strong></div>`).join("")}
      </div>
      <section class="work-panel chart-panel">
        <div class="panel-head">
          <h2 class="panel-title">Cards by brand</h2>
          <a class="btn btn-ghost" href="/glassify">Open Glassify</a>
        </div>
        <div id="brand-chart" class="bar-chart"></div>
      </section>
      <section class="work-panel chart-panel">
        <div class="panel-head">
          <h2 class="panel-title">Registration status</h2>
          <button class="btn btn-ghost" type="button" data-admin-jump="records">Open records</button>
        </div>
        <div id="status-chart" class="status-chart"></div>
      </section>
    </section>
  `;
}

function renderGenerator(scopeBrandId = "") {
  const scopedBrand = brands.find((brand) => brand.id === scopeBrandId);
  const brandField = scopedBrand
    ? `
      <input type="hidden" name="brandId" value="${scopedBrand.id}">
      <label>Brand
        <input value="${escapeHtml(scopedBrand.name)}" readonly>
      </label>
    `
    : `
      <label>Brand
        <select name="brandId">${brands.map((brand) => `<option value="${brand.id}">${brand.name}</option>`).join("")}</select>
      </label>
    `;
  return `
    <div class="work-grid">
      <form id="generator-form" class="work-panel" data-brand-id="${escapeHtml(scopeBrandId)}">
        <h2 class="panel-title">Generate pending cards</h2>
        <div class="form-grid">
          ${brandField}
          <label id="generator-product-field">Product / warranty type
            <select name="product"></select>
          </label>
          <label>Batch size
            <input name="batchSize" type="number" min="1" max="200" value="5" required>
          </label>
          <label class="check-line generator-print-check">
            <input name="printed" type="checkbox"> Mark batch as physically printed
          </label>
          <label>Public base URL
            <input name="baseUrl" value="${location.origin}" required>
          </label>
          <label class="full">Batch note
            <input name="notes" placeholder="Optional: shop, print batch, stock location">
          </label>
        </div>
        <div class="actions">
          <button class="btn btn-primary" type="submit">Generate batch</button>
          <button class="btn btn-ghost" type="button" id="download-csv" disabled>Download CSV</button>
        </div>
        <div id="generator-status" class="status-line">Generated cards are pending until a customer registers.</div>
      </form>
      <aside class="result-panel">
        <div class="panel-head">
          <h2 class="panel-title">Generated cards</h2>
          <div class="actions compact-actions glassify-generated-tools hidden" id="glassify-generated-tools">
            <button class="btn btn-ghost" type="button" id="select-generated-glassify">Select all</button>
            <button class="btn btn-dark" type="button" id="download-generated-glassify" disabled>Download fronts</button>
          </div>
        </div>
        <div id="generated-selection-status" class="status-line hidden">Select Glassify cards to download front images only.</div>
        <div id="generated-cards" class="generated-cards"></div>
      </aside>
    </div>
  `;
}

function renderAdminRecords(scopeBrandId = "") {
  const scopedBrand = brands.find((brand) => brand.id === scopeBrandId);
  const showKenshoPrintTools = !scopeBrandId || scopeBrandId === "kensho" || scopeBrandId === "idash";
  const showGlassifyDownloadTools = !scopeBrandId || scopeBrandId === "glassify";
  const brandFilter = scopedBrand
    ? `
      <input type="hidden" name="brandId" value="${scopedBrand.id}">
      <label>Brand
        <input value="${escapeHtml(scopedBrand.name)}" readonly>
      </label>
    `
    : `
      <label>Brand
        <select name="brandId">
          <option value="">All brands</option>
          ${brands.map((brand) => `<option value="${brand.id}">${brand.name}</option>`).join("")}
        </select>
      </label>
    `;
  return `
    <div class="warranty-lookup-shell">
      <div id="admin-kpis" class="kpi-grid">
        ${["Total Cards", "Registered", "Available", "Printed"].map((label) => `<div class="kpi-card"><span>${label}</span><strong>0</strong></div>`).join("")}
      </div>
      <div class="warranty-lookup-grid">
        <aside class="lookup-sidebar">
          <form id="admin-form" class="lookup-search-card" data-brand-id="${escapeHtml(scopeBrandId)}">
            <h2 class="panel-title">Search warranties</h2>
            <label>Keyword (Serial / Name / Plate)
              <input name="q" placeholder="Search anything...">
            </label>
            ${brandFilter}
            <div class="lookup-extra-filters">
              <label>Install center / store
                <select name="store">
                  <option value="">All stores</option>
                  ${installCenterOptions().map((center) => `<option value="${escapeHtml(center.name)}">${escapeHtml(center.name)}</option>`).join("")}
                </select>
              </label>
              <label>Install date from
                <input name="dateFrom" type="date">
              </label>
              <label>Install date to
                <input name="dateTo" type="date">
              </label>
            </div>
            <input type="hidden" name="status" value="">
            <button class="btn btn-primary full" type="submit">Refresh Records</button>
            <div id="admin-status" class="status-line">Ready.</div>
          </form>
          ${showKenshoPrintTools ? `
            <div id="kensho-print-tools" class="batch-print-tools">
              <div>
                <strong>Name card A4 print</strong>
                <span id="kensho-print-status">Select unprinted iDash or KENSHO cards for duplex print.</span>
              </div>
              <div class="batch-print-actions">
                <button class="btn btn-ghost" type="button" id="select-unprinted-kensho">Select visible</button>
                <button class="btn btn-dark" type="button" id="print-selected-a4" disabled>Print A4</button>
                <button class="btn btn-ghost" type="button" id="mark-selected-printed" disabled>Mark printed</button>
              </div>
            </div>
          ` : ""}
          ${showGlassifyDownloadTools ? `
            <div id="glassify-download-tools" class="batch-print-tools glassify-download-tools">
              <div>
                <strong>Glassify front images</strong>
                <span id="glassify-download-status">Select Glassify cards to download QR front PNGs.</span>
              </div>
              <div class="batch-print-actions">
                <button class="btn btn-ghost" type="button" id="select-visible-glassify">Select visible</button>
                <button class="btn btn-dark" type="button" id="download-selected-glassify-fronts" disabled>Download fronts</button>
              </div>
            </div>
          ` : ""}
          <div class="lookup-tabs" role="tablist">
            <button class="lookup-tab active" type="button" data-record-status="">All</button>
            <button class="lookup-tab" type="button" data-record-status="registered">Registered</button>
            <button class="lookup-tab" type="button" data-record-status="pending">Available</button>
          </div>
          <div id="admin-results" class="lookup-list"></div>
        </aside>
        <section class="warranty-detail-panel">
          <div class="panel-head">
            <h2 class="panel-title">Warranty details</h2>
            <div class="actions compact-actions">
              <button class="btn btn-ghost" type="button" id="download-detail-png">Save image</button>
              <button class="btn btn-ghost danger" type="button" id="delete-record">Delete</button>
            </div>
          </div>
          <div id="admin-detail" class="admin-detail-empty">Select a warranty record.</div>
        </section>
      </div>
    </div>
  `;
}

function renderCatalogManager(brand) {
  const scopeBrandId = brand?.id || "";
  const title = brand ? `${brand.name} catalog` : "All catalog";
  const productBrands = brands.filter((item) => item.id !== "glassify");
  const products = catalog.products.filter((item) => !scopeBrandId || item.brandId === scopeBrandId);
  const filmOptions = catalog.filmOptions.filter((item) => !scopeBrandId || item.brandId === scopeBrandId);
  const vehicleModels = vehicleCatalogRows();
  const showFilm = !brand || brand.id === "glassify";
  const showProducts = !brand || brand.id !== "glassify";
  return `
    <div class="catalog-grid">
      <section class="work-panel ${showProducts ? "" : "hidden"}">
        <h2 class="panel-title">${escapeHtml(title)} products</h2>
        <form id="product-form" class="catalog-form" data-catalog-type="products">
          <input type="hidden" name="Id">
          <div class="form-grid">
            <label>Brand
              <select name="brandId" ${scopeBrandId && scopeBrandId !== "glassify" ? "disabled" : ""}>
                ${productBrands.map((item) => `<option value="${item.id}" ${item.id === scopeBrandId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
              </select>
            </label>
            <label>Name
              <input name="name" required>
            </label>
            <label>Variant
              <input name="variant">
            </label>
            <label>Warranty years
              <input name="warrantyYears" type="number" min="1" value="${scopeBrandId === "kensho" ? 2 : 1}" required>
            </label>
            <label>Category
              <input name="category">
            </label>
            <label>Sort order
              <input name="sortOrder" type="number" value="100">
            </label>
            <label class="check-line">
              <input name="active" type="checkbox" checked> Active
            </label>
            <label class="full">Notes
              <textarea name="notes"></textarea>
            </label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit">Save product</button>
            <button class="btn btn-ghost" type="button" data-reset-form="product-form">Clear</button>
          </div>
        </form>
        <div class="catalog-list">${products.map((item) => renderCatalogRow("products", item)).join("") || `<p class="status-line">No products yet.</p>`}</div>
      </section>

      <section class="work-panel ${showFilm ? "" : "hidden"}">
        <h2 class="panel-title">Glassify film options</h2>
        <form id="film-form" class="catalog-form" data-catalog-type="film-options">
          <input type="hidden" name="Id">
          <input type="hidden" name="brandId" value="glassify">
          <div class="form-grid">
            <label>Series
              <input name="series" placeholder="CARBON" required>
            </label>
            <label>Film / VLT
              <input name="filmName" placeholder="NANO CARBON 20" required>
            </label>
            <label>Warranty years
              <input name="warrantyYears" type="number" min="1" value="7" required>
            </label>
            <label>Sort order
              <input name="sortOrder" type="number" value="100">
            </label>
            <label class="check-line">
              <input name="active" type="checkbox" checked> Active
            </label>
            <label class="full">Notes
              <textarea name="notes"></textarea>
            </label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit">Save film option</button>
            <button class="btn btn-ghost" type="button" data-reset-form="film-form">Clear</button>
          </div>
        </form>
        <div class="catalog-list">${filmOptions.map((item) => renderCatalogRow("film-options", item)).join("") || `<p class="status-line">No film options yet.</p>`}</div>
      </section>

      <section class="work-panel">
        <h2 class="panel-title">Install centers</h2>
        <form id="center-form" class="catalog-form" data-catalog-type="install-centers">
          <input type="hidden" name="Id">
          <div class="form-grid">
            <label>Name
              <input name="name" required>
            </label>
            <label>Phone
              <input name="phone">
            </label>
            <label class="full">Location
              <input name="location">
            </label>
            <label>Sort order
              <input name="sortOrder" type="number" value="100">
            </label>
            <label class="check-line">
              <input name="active" type="checkbox" checked> Active
            </label>
            <label class="full">Notes
              <textarea name="notes"></textarea>
            </label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit">Save install center</button>
            <button class="btn btn-ghost" type="button" data-reset-form="center-form">Clear</button>
          </div>
        </form>
        <div class="catalog-list">${catalog.installCenters.map((item) => renderCatalogRow("install-centers", item)).join("") || `<p class="status-line">No install centers yet.</p>`}</div>
      </section>

      <section class="work-panel">
        <h2 class="panel-title">Vehicle brand and model catalog</h2>
        <form id="vehicle-form" class="catalog-form" data-catalog-type="vehicle-models">
          <input type="hidden" name="Id">
          <div class="form-grid">
            <label>Vehicle brand / ยี่ห้อรถ
              <input name="make" list="vehicle-brand-options" required>
            </label>
            <label>Vehicle model / รุ่นรถ
              <input name="model" required>
            </label>
            <label>Sort order
              <input name="sortOrder" type="number" value="100">
            </label>
            <label class="check-line">
              <input name="active" type="checkbox" checked> Active
            </label>
            <label class="full">Notes
              <textarea name="notes"></textarea>
            </label>
            <datalist id="vehicle-brand-options">${vehicleMakes().map((make) => `<option value="${escapeHtml(make)}"></option>`).join("")}</datalist>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit">Save vehicle model</button>
            <button class="btn btn-ghost" type="button" data-reset-form="vehicle-form">Clear</button>
          </div>
        </form>
        <div class="catalog-list compact-catalog-list">${vehicleModels.slice(0, 120).map((item) => renderCatalogRow("vehicle-models", item)).join("") || `<p class="status-line">No vehicle models yet.</p>`}</div>
      </section>
    </div>
  `;
}

function renderCatalogRow(type, item) {
  const title = type === "vehicle-models" ? item.model : item.name || item.filmName;
  const meta = type === "products"
    ? `${item.brandName || item.brandId} / ${item.variant || "-"} / ${item.warrantyYears || "-"}Y`
    : type === "film-options"
      ? `${item.series} / ${item.warrantyYears || "-"}Y`
      : type === "vehicle-models"
        ? item.make || "Vehicle brand"
        : [item.location, item.phone].filter(Boolean).join(" / ") || "Install center";
  return `
    <article class="catalog-row">
      <div>
        <strong>${escapeHtml(title || "-")}</strong>
        <span>${escapeHtml(meta)}</span>
        <small>${item.active ? "Active" : "Inactive"} / Sort ${escapeHtml(item.sortOrder || 0)}</small>
      </div>
      <div class="actions compact-actions">
        <button class="btn btn-ghost" type="button" onclick="editCatalogItem('${type}', '${escapeJs(item.Id || item.id)}')">Edit</button>
        <button class="btn btn-ghost danger" type="button" onclick="removeCatalogItem('${type}', '${escapeJs(item.Id || item.id)}')">Remove</button>
      </div>
    </article>
  `;
}

function registrationFields(record) {
  const productOptions = currentBrand.products.map((product) => {
    const selected = product.name === record.product ? "selected" : "";
    return `<option value="${escapeHtml(product.name)}" ${selected}>${escapeHtml(product.name)} (${product.years === 99 ? "Lifetime" : `${product.years}Y`})</option>`;
  }).join("");
  const vehicleMakeOptions = vehicleMakes().map((make) => `<option value="${escapeHtml(make)}"></option>`).join("");
  const vehicleModelOptions = vehicleModelsForMake(record.vehicleBrand).map((model) => `<option value="${escapeHtml(model)}"></option>`).join("");
  const provinceOptions = THAI_PROVINCES.map((province) => `<option value="${escapeHtml(province)}"></option>`).join("");
  const installDate = today();

  return `
    <div class="form-grid">
      <label>Warranty No. / เลขรับประกัน
        <input name="serial" value="${escapeHtml(record.serial)}" readonly>
      </label>
      ${currentBrand.id === "glassify" ? `
        <label>Warranty product / สินค้ารับประกัน
          <input value="Selected by film series below / เลือกตามซีรีส์ฟิล์มด้านล่าง" readonly>
        </label>
      ` : currentBrand.id === "kensho" || currentBrand.id === "idash" ? `
        <label>Product / สินค้า
          <input value="${escapeHtml(record.product || currentBrand.products[0]?.name || currentBrand.name)}" readonly>
          <input type="hidden" name="product" value="${escapeHtml(record.product || currentBrand.products[0]?.name || "")}">
        </label>
      ` : `
        <label>Product / สินค้า
          <select name="product">${productOptions}</select>
        </label>
      `}
      ${currentBrand.id === "kensho" ? `<input type="hidden" name="vehicleTemplate" value="size-l">` : `
        <label>Vehicle template / ประเภทรถ
          <select name="vehicleTemplate">
            ${CERT_TEMPLATES.map((item) => `<option value="${item.value}" ${item.value === (record.extra?.vehicleTemplate || "sedan") ? "selected" : ""}>${item.label}</option>`).join("")}
          </select>
        </label>
      `}
      <label>Install date / วันที่ติดตั้ง
        <input name="installDate" type="date" value="${escapeHtml(installDate)}" min="${escapeHtml(installDate)}" max="${escapeHtml(installDate)}" readonly required>
      </label>
      <label>Install center / ศูนย์ติดตั้ง
        <select name="installCenter" required>
          <option value="">Please select... / กรุณาเลือก</option>
          ${installCenterOptions().map((center) => {
            const value = center.location ? `${center.name} - ${center.location}` : center.name;
            return `<option value="${escapeHtml(value)}" data-store="${escapeHtml(center.name)}" data-location="${escapeHtml(center.location)}" ${value === record.installCenter ? "selected" : ""}>${escapeHtml(value)}</option>`;
          }).join("")}
        </select>
      </label>
      <label>Customer name / ชื่อลูกค้า
        <input name="customerName" autocomplete="name" required>
      </label>
      <label>Phone / เบอร์โทรศัพท์
        <input name="phone" inputmode="numeric" autocomplete="tel" pattern="[0-9]*" maxlength="15" placeholder="0812345678" required>
      </label>
      <label>Email / อีเมล
        <input name="email" type="email" autocomplete="email">
      </label>
      <label>Vehicle brand / ยี่ห้อรถ
        <input name="vehicleBrand" list="vehicle-brand-options" value="${escapeHtml(record.vehicleBrand || "")}" placeholder="Select or type manually">
      </label>
      <label>Vehicle model / รุ่นรถ
        <input name="vehicleModel" list="vehicle-model-options" value="${escapeHtml(record.vehicleModel || "")}" placeholder="Select after brand or type manually">
      </label>
      <label>License plate / ทะเบียน
        <input name="plateNo" value="${escapeHtml(record.plateNo || "")}" placeholder="3กข-1245" required>
      </label>
      <label>Province / จังหวัด
        <input name="province" list="province-options" value="${escapeHtml(record.province || "")}" placeholder="Suphan Buri / สุพรรณบุรี">
      </label>
      <label>Chassis number / เลขตัวถัง
        <input name="chassisNo">
      </label>
      ${currentBrand.id === "glassify" ? renderGlassifyFilmFields(record) : getExtraField(currentBrand)}
      <label class="full">Notes / หมายเหตุ
        <textarea name="notes" placeholder="Optional install notes / หมายเหตุเพิ่มเติม">${escapeHtml(record.notes || "")}</textarea>
      </label>
      <datalist id="vehicle-brand-options">${vehicleMakeOptions}</datalist>
      <datalist id="vehicle-model-options">${vehicleModelOptions}</datalist>
      <datalist id="province-options">${provinceOptions}</datalist>
    </div>
  `;
}


function renderGlassifyFilmFields(record) {
  const extra = record.extra || {};
  if (!glassifyFilmGroups().length) {
    return `
      <div class="form-section-title full">Film Selection / เลือกฟิล์ม</div>
      <div class="status-line full">No active Glassify film options are in the catalog yet. Add film options in the Glassify Catalog before customer registration. / ยังไม่มีตัวเลือกฟิล์ม Glassify ที่เปิดใช้งาน กรุณาเพิ่มตัวเลือกใน Catalog ก่อนให้ลูกค้าลงทะเบียน</div>
    `;
  }
  return `
    <div class="form-section-title full">Film Selection / เลือกฟิล์ม</div>
    ${renderFilmPair("front", "Front / หน้า", extra.frontSeries, extra.frontFilm)}
    ${renderFilmPair("side", "Side / ด้านข้าง", extra.sideSeries, extra.sideFilm)}
    ${renderFilmPair("rear", "Rear / หลัง", extra.rearSeries, extra.rearFilm)}
  `;
}

function renderFilmPair(position, label, selectedSeries, selectedFilm) {
  const groups = glassifyFilmGroups();
  const selected = selectedSeries || groups[0]?.key || "";
  const series = groups.find((item) => item.key === selected) || groups[0] || { films: [] };
  return `
    <div class="full" style="margin-top: 10px; margin-bottom: 6px;">
      <label style="color:#1e3a6e; font-weight:800; font-size:12px;">${label} Series / ซีรีส์</label>
      <select name="${position}Series" data-film-series="${position}" style="display:none;">
        ${groups.map((item) => `<option value="${escapeHtml(item.key)}" ${item.key === selected ? "selected" : ""}>&nbsp;${escapeHtml(item.label)}</option>`).join("")}
      </select>
      <div class="visual-chip-group" data-chip-series="${position}">
        ${groups.map((item) => `
          <div class="visual-chip ${item.key === selected ? "selected" : ""}" data-value="${escapeHtml(item.key)}">
            ${escapeHtml(item.label)}
          </div>
        `).join("")}
      </div>
    </div>
    
    <div class="full" style="margin-bottom: 14px;">
      <label style="color:#1e3a6e; font-weight:800; font-size:12px;">${label} VLT / ค่าแสงผ่าน</label>
      <select name="${position}Film" data-film-vlt="${position}" style="display:none;">
        <option value="">-- Select / เลือก --</option>
        ${series.films.map((film) => `<option value="${escapeHtml(film)}" ${film === selectedFilm ? "selected" : ""}>${escapeHtml(film)}</option>`).join("")}
      </select>
      <div class="visual-chip-group" data-chip-vlt="${position}">
        ${series.films.map((film) => `
          <div class="visual-chip ${film === selectedFilm ? "selected" : ""}" data-value="${escapeHtml(film)}">
            ${escapeHtml(film)}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function bindTabs() {
  document.querySelectorAll(".tab[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      renderBrandPage();
    });
  });
}

function bindAdminTabs() {
  document.querySelectorAll(".tab[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab[data-admin-tab]").forEach((tab) => tab.classList.remove("active"));
      button.classList.add("active");
      document.getElementById("admin-dashboard")?.classList.toggle("hidden", button.dataset.adminTab !== "dashboard");
      document.getElementById("admin-generate").classList.toggle("hidden", button.dataset.adminTab !== "generate");
      document.getElementById("admin-records").classList.toggle("hidden", button.dataset.adminTab !== "records");
      document.getElementById("admin-catalog").classList.toggle("hidden", button.dataset.adminTab !== "catalog");
    });
  });
  document.querySelectorAll("[data-admin-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector(`.tab[data-admin-tab="${button.dataset.adminJump}"]`)?.click();
    });
  });
}

async function bindOverviewDashboard() {
  const dashboard = document.getElementById("admin-dashboard");
  if (!dashboard) return;
  const response = await apiFetch("/api/warranties?limit=500");
  const data = await response.json();
  if (!response.ok) return;
  const records = data.records || [];
  updateKpiNodes("#overview-kpis", records);
  renderBrandChart(records);
  renderStatusChart(records);
}

function bindRegisterBySerialForm() {
  const form = document.getElementById("serial-form");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("serial-status");
    status.textContent = "Searching...";
    const response = await apiFetch(`/api/warranties?q=${encodeURIComponent(form.q.value)}&brandId=${currentBrand.id}&limit=10`);
    const data = await response.json();
    const record = (data.records || []).find((item) => item.serial === form.q.value.trim() || item.uniqueId === form.q.value.trim());
    if (!record) {
      status.textContent = "No matching card found.";
      return;
    }
    location.href = record.status === "registered"
      ? `/details?id=${encodeURIComponent(record.uniqueId)}`
      : `/register?id=${encodeURIComponent(record.uniqueId)}`;
  });
}


function bindScanRegisterForm(record) {
  const form = document.getElementById("register-form");
  form.installDate.value = today();
  bindGlassifyFilmSelectors(form);
  bindRegistrationHelpers(form);
  
  // ── A. Bind Opening Video Intro ──
  const glassifyOverlay = document.querySelector("[data-glassify-opening]");
  const registerPage = document.querySelector(".glassify-register-page");
  if (glassifyOverlay && registerPage) {
    const video = glassifyOverlay.querySelector(".glassify-opening-video");
    const playButton = glassifyOverlay.querySelector("[data-play-opening]");
    const skipButton = glassifyOverlay.querySelector("[data-skip-opening]");
    
    let introDone = false;
    const finishIntro = () => {
      if (introDone) return;
      introDone = true;
      registerPage.classList.remove("is-waiting");
      glassifyOverlay.classList.add("is-done");
      window.setTimeout(() => glassifyOverlay.remove(), 600);
    };
    
    const playIntro = () => {
      if (introDone) return;
      glassifyOverlay.classList.remove("is-needs-tap");
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      
      const playPromise = video.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => {
          glassifyOverlay.classList.add("is-needs-tap");
        });
      }
    };
    
    skipButton?.addEventListener("click", finishIntro);
    playButton?.addEventListener("click", playIntro);
    
    glassifyOverlay.addEventListener("click", (e) => {
      if (glassifyOverlay.classList.contains("is-needs-tap")) {
        if (e.target.closest("[data-skip-opening]")) return;
        playIntro();
      }
    });
    
    video.addEventListener("canplay", () => {
      glassifyOverlay.classList.add("is-ready");
    }, { once: true });
    
    video.addEventListener("playing", () => {
      glassifyOverlay.classList.add("is-playing");
    }, { once: true });
    
    video.addEventListener("ended", finishIntro, { once: true });
    video.addEventListener("error", finishIntro, { once: true });
    
    video.src = video.dataset.src;
    video.load();
    
    window.setTimeout(() => {
      if (!introDone && !glassifyOverlay.classList.contains("is-playing")) {
        playIntro();
      }
    }, 1800);
  } else {
    registerPage?.classList.remove("is-waiting");
  }
  
  // ── B. Bind Vehicle Character Scroll Selector ──
  const charSelector = form.querySelector("#vehicle-char-selector");
  const hiddenVehicleSelect = form.querySelector("select[name='vehicleTemplate']");
  if (charSelector && hiddenVehicleSelect) {
    charSelector.querySelectorAll(".vehicle-char-card").forEach((card) => {
      card.addEventListener("click", () => {
        charSelector.querySelectorAll(".vehicle-char-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        
        hiddenVehicleSelect.value = card.dataset.value;
        hiddenVehicleSelect.dispatchEvent(new Event("change", { bubbles: true }));
        form.dispatchEvent(new Event("input", { bubbles: true }));
        
        card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      });
    });
    
    form.querySelectorAll("[data-scroll]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const direction = btn.dataset.scroll;
        const scrollAmount = 140;
        if (direction === "left") {
          charSelector.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        } else {
          charSelector.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
      });
    });
  }
  
  // ── C. Bind Wizard progressive navigation buttons ──
  let activeStep = 1;
  const updateWizardUI = () => {
    form.querySelectorAll("[data-step]").forEach((stepDiv) => {
      const stepNum = Number(stepDiv.dataset.step);
      stepDiv.classList.toggle("active", stepNum === activeStep);
    });
    
    form.querySelectorAll("[data-step-node]").forEach((node) => {
      const nodeNum = Number(node.dataset.stepNode);
      node.classList.toggle("active", nodeNum === activeStep);
      node.classList.toggle("completed", nodeNum < activeStep);
    });
    
    const progressBar = form.querySelector("#wizard-progress-bar");
    if (progressBar) {
      const percentage = ((activeStep - 1) / 5) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  };
  
  const validateStep = (stepNum) => {
    const stepDiv = form.querySelector(`[data-step="${stepNum}"]`);
    if (!stepDiv) return true;
    const inputs = stepDiv.querySelectorAll("input, select, textarea");
    let isValid = true;
    for (const input of inputs) {
      if (!input.checkValidity()) {
        input.reportValidity();
        isValid = false;
        break;
      }
    }
    return isValid;
  };
  
  form.querySelectorAll("[data-next-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const currentStep = Number(btn.dataset.nextStep);
      if (validateStep(currentStep)) {
        activeStep = currentStep + 1;
        updateWizardUI();
      }
    });
  });
  
  form.querySelectorAll("[data-prev-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const currentStep = Number(btn.dataset.prevStep);
      activeStep = currentStep - 1;
      updateWizardUI();
    });
  });

  form.addEventListener("input", () => refreshPreview({ ...record, ...formToRecord(form) }));
  form.addEventListener("change", () => refreshPreview({ ...record, ...formToRecord(form) }));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("register-status");
    if (currentBrand.id === "glassify" && !glassifyFilmGroups().length) {
      status.textContent = "Glassify film catalog is empty. Please ask staff to add film options before registration. / ยังไม่มีตัวเลือกฟิล์ม Glassify กรุณาเพิ่มข้อมูลก่อนลงทะเบียน";
      return;
    }
    status.textContent = "Activating warranty... / กำลังลงทะเบียนรับประกัน...";
    const payload = formToRecord(form);
    const response = await fetch(`/api/warranties/${encodeURIComponent(record.uniqueId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      status.textContent = data.error || "Registration failed. / ลงทะเบียนไม่สำเร็จ";
      return;
    }
    
    // Play success fullscreen overlay animation before redirecting
    const successOverlay = document.getElementById("glassify-success-overlay");
    if (currentBrand.id === "glassify" && successOverlay) {
      successOverlay.classList.add("is-active");
      window.setTimeout(() => {
        location.href = `/details?id=${encodeURIComponent(data.record.uniqueId)}`;
      }, 1600);
    } else {
      location.href = `/details?id=${encodeURIComponent(data.record.uniqueId)}`;
    }
  });
}


function bindGlassifyFilmSelectors(form) {
  if (!form || currentBrand.id !== "glassify") return;
  
  // Helper to bind shade chips click
  function bindShadeChips(vltContainer, hiddenVltSelect) {
    vltContainer.querySelectorAll(".visual-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        vltContainer.querySelectorAll(".visual-chip").forEach((c) => c.classList.remove("selected"));
        chip.classList.add("selected");
        
        hiddenVltSelect.value = chip.dataset.value;
        hiddenVltSelect.dispatchEvent(new Event("change", { bubbles: true }));
        form.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
  }
  
  // Bind visual Series chips click
  form.querySelectorAll("[data-chip-series]").forEach((seriesContainer) => {
    const position = seriesContainer.dataset.chipSeries;
    const hiddenSelect = form.querySelector(`select[name="${position}Series"]`);
    
    seriesContainer.querySelectorAll(".visual-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        seriesContainer.querySelectorAll(".visual-chip").forEach((c) => c.classList.remove("selected"));
        chip.classList.add("selected");
        
        hiddenSelect.value = chip.dataset.value;
        hiddenSelect.dispatchEvent(new Event("change", { bubbles: true }));
        
        // Re-render VLT shade chips
        const vltContainer = form.querySelector(`[data-chip-vlt="${position}"]`);
        const hiddenVltSelect = form.querySelector(`select[name="${position}Film"]`);
        const groups = glassifyFilmGroups();
        const series = groups.find((item) => item.key === chip.dataset.value) || groups[0] || { films: [] };
        
        hiddenVltSelect.innerHTML = `<option value="">-- Select / เลือก --</option>${series.films.map((film) => `<option value="${escapeHtml(film)}">${escapeHtml(film)}</option>`).join("")}`;
        hiddenVltSelect.value = "";
        
        vltContainer.innerHTML = series.films.map((film) => `
          <div class="visual-chip" data-value="${escapeHtml(film)}">
            ${escapeHtml(film)}
          </div>
        `).join("");
        
        bindShadeChips(vltContainer, hiddenVltSelect);
        form.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
  });
  
  // Bind initial shades chips
  form.querySelectorAll("[data-chip-vlt]").forEach((vltContainer) => {
    const position = vltContainer.dataset.chipVlt;
    const hiddenVltSelect = form.querySelector(`select[name="${position}Film"]`);
    bindShadeChips(vltContainer, hiddenVltSelect);
  });
}

function bindRegistrationHelpers(form) {
  const phone = form.elements.phone;
  const brand = form.elements.vehicleBrand;
  const model = form.elements.vehicleModel;
  const plate = form.elements.plateNo;
  const modelList = document.getElementById("vehicle-model-options");

  phone?.addEventListener("input", () => {
    phone.value = phone.value.replace(/\D/g, "");
  });

  plate?.addEventListener("input", () => {
    const caretAtEnd = plate.selectionStart === plate.value.length;
    plate.value = formatPlateNumber(plate.value);
    if (caretAtEnd) plate.setSelectionRange(plate.value.length, plate.value.length);
  });
  if (plate?.value) plate.value = formatPlateNumber(plate.value);

  function refreshModelOptions() {
    if (!modelList) return;
    modelList.innerHTML = vehicleModelsForMake(brand?.value || "")
      .map((item) => `<option value="${escapeHtml(item)}"></option>`)
      .join("");
  }

  brand?.addEventListener("input", refreshModelOptions);
  brand?.addEventListener("change", () => {
    refreshModelOptions();
    if (model) model.value = "";
  });
  refreshModelOptions();
}

function formatPlateNumber(value) {
  const cleaned = String(value || "")
    .replace(/\s+/g, "")
    .replace(/[-–—]+/g, "-");
  if (!cleaned) return "";
  const [rawPrefix, ...rest] = cleaned.split("-");
  if (rest.length) {
    const prefix = rawPrefix.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3);
    const number = rest.join("").replace(/\D/g, "").slice(0, 4);
    return number && prefix ? `${prefix}-${number}` : prefix || number;
  }
  const compact = rawPrefix.replace(/[^\p{L}\p{N}]/gu, "");
  const match = compact.match(/^(.+?[^\d])(\d{1,4})$/u);
  if (!match) return compact.slice(0, 3);
  return `${match[1].slice(0, 3)}-${match[2]}`;
}

function bindLookupForm() {
  const form = document.getElementById("lookup-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("lookup-status");
    const results = document.getElementById("lookup-results");
    status.textContent = "Searching...";
    results.innerHTML = "";

    const params = new URLSearchParams({ q: form.q.value, brandId: currentBrand.id, limit: "20" });
    const response = await apiFetch(`/api/warranties?${params}`);
    const data = await response.json();
    if (!response.ok) {
      status.textContent = data.error || "Lookup failed.";
      return;
    }
    status.textContent = `${data.records.length} record(s) found.`;
    results.innerHTML = data.records.map(renderRecord).join("") || `<p class="status-line">No matching warranty.</p>`;
  });
}

function bindGenerator() {
  const form = document.getElementById("generator-form");
  if (!form) return;
  const productSelect = form.product;
  let generated = [];
  let generatedGlassifySelectedIds = new Set();

  function getGeneratedGlassifyRecords() {
    return generated.filter((record) => record.brandId === "glassify");
  }

  function getSelectedGeneratedGlassifyRecords() {
    return getGeneratedGlassifyRecords().filter((record) => generatedGlassifySelectedIds.has(record.uniqueId));
  }

  function updateGeneratedGlassifyTools() {
    const glassifyRecords = getGeneratedGlassifyRecords();
    const selected = getSelectedGeneratedGlassifyRecords();
    const tools = document.getElementById("glassify-generated-tools");
    const status = document.getElementById("generated-selection-status");
    if (tools) tools.classList.toggle("hidden", glassifyRecords.length === 0);
    if (status) {
      status.classList.toggle("hidden", glassifyRecords.length === 0);
      status.textContent = glassifyRecords.length
        ? `${selected.length} selected. Only the QR-code front side will be downloaded.`
        : "Select Glassify cards to download front images only.";
    }
    document.getElementById("download-generated-glassify")?.toggleAttribute("disabled", selected.length === 0);
  }

  function fillProducts() {
    const brandId = form.elements.brandId?.value || form.dataset.brandId || brands[0]?.id;
    const brand = brands.find((item) => item.id === brandId) || brands[0];
    const field = document.getElementById("generator-product-field");
    if (brand.id === "glassify") {
      productSelect.innerHTML = `<option value="">Customer selects film during QR registration</option>`;
      productSelect.value = "";
      field.classList.add("muted-field");
      return;
    }
    field.classList.remove("muted-field");
    productSelect.innerHTML = brand.products.length
      ? brand.products.map((product) => `<option value="${escapeHtml(product.name)}">${escapeHtml(product.name)} (${product.years === 99 ? "Lifetime" : `${product.years}Y`})</option>`).join("")
      : `<option value="">Add products in Catalog first</option>`;
  }

  if (form.elements.brandId?.tagName === "SELECT") form.elements.brandId.addEventListener("change", fillProducts);
  fillProducts();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("generator-status");
    const cards = document.getElementById("generated-cards");
    status.textContent = "Generating pending records...";
    cards.innerHTML = "";

    const payload = Object.fromEntries(new FormData(form).entries());
    if (!payload.brandId) payload.brandId = form.dataset.brandId;
    const response = await apiFetch("/api/warranty-cards/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      status.textContent = data.error || "Generation failed.";
      return;
    }

    generated = data.records || [];
    generatedGlassifySelectedIds = new Set(generated.filter((record) => record.brandId === "glassify").map((record) => record.uniqueId));
    status.textContent = `Generated ${generated.length} physical card record(s).`;
    document.getElementById("download-csv").disabled = generated.length === 0;
    cards.innerHTML = generated.map((record) => renderGeneratedCard(record, {
      selectable: record.brandId === "glassify",
      checked: generatedGlassifySelectedIds.has(record.uniqueId)
    })).join("");
    updateGeneratedGlassifyTools();
  });

  document.getElementById("generated-cards")?.addEventListener("change", (event) => {
    if (!event.target.matches("[data-generated-glassify-select]")) return;
    const uniqueId = event.target.dataset.generatedGlassifySelect;
    if (event.target.checked) generatedGlassifySelectedIds.add(uniqueId);
    else generatedGlassifySelectedIds.delete(uniqueId);
    updateGeneratedGlassifyTools();
  });

  document.getElementById("select-generated-glassify")?.addEventListener("click", () => {
    generatedGlassifySelectedIds = new Set(getGeneratedGlassifyRecords().map((record) => record.uniqueId));
    document.querySelectorAll("[data-generated-glassify-select]").forEach((input) => {
      input.checked = true;
    });
    updateGeneratedGlassifyTools();
  });

  document.getElementById("download-generated-glassify")?.addEventListener("click", async () => {
    const selected = getSelectedGeneratedGlassifyRecords();
    if (!selected.length) return;
    await downloadGlassifyPhysicalFrontImages(selected);
  });

  document.getElementById("download-csv").addEventListener("click", () => {
    const lines = ["Serial,Unique ID,Scan URL,Brand,Product"];
    generated.forEach((record) => {
      lines.push([record.serial, record.uniqueId, record.scanUrl, record.brandName, record.product].map(csvCell).join(","));
    });
    downloadText(`warranty-cards-${Date.now()}.csv`, lines.join("\n"));
  });
}

function bindAdminRecords() {
  const form = document.getElementById("admin-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadAdminRecords(form);
  });
  document.querySelectorAll("[data-record-status]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-record-status]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      form.status.value = button.dataset.recordStatus;
      adminRecordsState.status = button.dataset.recordStatus;
      renderAdminRecordList(filterAdminRecords(adminRecordsState.records, form));
    });
  });
  document.getElementById("admin-results")?.addEventListener("click", async (event) => {
    const row = event.target.closest("[data-record-id]");
    if (!row) return;
    if (event.target.closest("[data-printed-toggle], [data-print-select], [data-glassify-download-select], .printed-check, .print-select-check")) return;
    selectAdminRecord(row.dataset.recordId);
  });
  document.getElementById("admin-results")?.addEventListener("change", async (event) => {
    if (event.target.matches("[data-printed-toggle]")) {
      await updatePrintedStatus(event.target.dataset.printedToggle, event.target.checked);
      return;
    }
    if (event.target.matches("[data-print-select]")) {
      updatePrintSelection(event.target.dataset.printSelect, event.target.checked);
      return;
    }
    if (event.target.matches("[data-glassify-download-select]")) {
      updateGlassifyDownloadSelection(event.target.dataset.glassifyDownloadSelect, event.target.checked);
    }
  });
  document.getElementById("delete-record")?.addEventListener("click", deleteSelectedRecord);
  document.getElementById("download-detail-png")?.addEventListener("click", downloadDetailPng);
  document.getElementById("select-unprinted-kensho")?.addEventListener("click", selectVisibleUnprintedKenshoCards);
  document.getElementById("print-selected-a4")?.addEventListener("click", printSelectedKenshoA4);
  document.getElementById("mark-selected-printed")?.addEventListener("click", () => markKenshoCardsPrinted());
  document.getElementById("select-visible-glassify")?.addEventListener("click", selectVisibleGlassifyCards);
  document.getElementById("download-selected-glassify-fronts")?.addEventListener("click", downloadSelectedGlassifyFronts);
  loadAdminRecords(form);
}

async function loadAdminRecords(form) {
    const status = document.getElementById("admin-status");
    const results = document.getElementById("admin-results");
    status.textContent = "Loading...";
    results.innerHTML = "";

    const params = new URLSearchParams({
      q: form.q.value,
      brandId: form.elements.brandId?.value || form.dataset.brandId || "",
      limit: "500"
    });
    const response = await apiFetch(`/api/warranties?${params}`);
    const data = await response.json();
    adminRecordsState.records = data.records || [];
    prunePrintSelection();
    pruneGlassifyDownloadSelection();
    const records = filterAdminRecords(adminRecordsState.records, form);
    updateAdminKpis(records);
    status.textContent = `${records.length} card(s) loaded.`;
    renderAdminRecordList(records);
}

function filterAdminRecords(records, form) {
  const status = form.status.value;
  const store = form.store.value.toLowerCase();
  const from = form.dateFrom.value;
  const to = form.dateTo.value;
  return records.filter((record) => {
    if (status && record.status !== status) return false;
    if (store && !String(record.installCenter || "").toLowerCase().includes(store)) return false;
    if (from && (!record.installDate || record.installDate < from)) return false;
    if (to && (!record.installDate || record.installDate > to)) return false;
    return true;
  });
}

function updateAdminKpis(records) {
  updateKpiNodes("#admin-kpis", records);
}

function updateKpiNodes(selector, records) {
  const kpis = [
    records.length,
    records.filter((record) => record.status === "registered").length,
    records.filter((record) => record.status === "pending").length,
    records.filter((record) => record.extra?.printed).length
  ];
  document.querySelectorAll(`${selector} .kpi-card strong`).forEach((node, index) => {
    node.textContent = kpis[index] ?? 0;
  });
}

function renderBrandChart(records) {
  const target = document.getElementById("brand-chart");
  if (!target) return;
  const max = Math.max(1, ...brands.map((brand) => records.filter((record) => record.brandId === brand.id).length));
  target.innerHTML = brands.map((brand) => {
    const count = records.filter((record) => record.brandId === brand.id).length;
    const pct = Math.max(4, Math.round((count / max) * 100));
    return `
      <div class="bar-row" style="--brand-accent:${brand.accent}">
        <span>${escapeHtml(brand.name)}</span>
        <div><i style="width:${pct}%"></i></div>
        <strong>${count}</strong>
      </div>
    `;
  }).join("");
}

function renderStatusChart(records) {
  const target = document.getElementById("status-chart");
  if (!target) return;
  const registered = records.filter((record) => record.status === "registered").length;
  const available = records.filter((record) => record.status === "pending").length;
  const total = Math.max(1, registered + available);
  const registeredPct = Math.round((registered / total) * 100);
  target.innerHTML = `
    <div class="status-meter" style="--registered:${registeredPct}%"></div>
    <div class="status-legend">
      <span><i class="legend-registered"></i>Registered ${registered}</span>
      <span><i class="legend-available"></i>Available ${available}</span>
    </div>
  `;
}

function renderAdminRecordList(records) {
  adminRecordsState.filtered = records;
  const results = document.getElementById("admin-results");
  if (!results) return;
  if (!records.length) {
    results.innerHTML = `<p class="status-line lookup-empty">No records yet.</p>`;
    document.getElementById("admin-detail").innerHTML = `<div class="admin-detail-empty">No warranty record selected.</div>`;
    updateBatchPrintTools();
    updateGlassifyDownloadTools();
    return;
  }
  const selectedExists = records.some((record) => record.uniqueId === adminRecordsState.selectedId);
  if (!selectedExists) adminRecordsState.selectedId = records[0].uniqueId;
  results.innerHTML = records.map(renderLookupRow).join("");
  selectAdminRecord(adminRecordsState.selectedId);
  updateBatchPrintTools();
  updateGlassifyDownloadTools();
}

function renderLookupRow(record) {
  const active = record.uniqueId === adminRecordsState.selectedId ? "active" : "";
  const name = record.customerName || (record.status === "pending" ? "QR Card - Unused" : "No customer name");
  const status = record.status === "pending" ? "Pending" : "Registered";
  const canBatchPrint = isPrintableKenshoCard(record);
  const printChecked = adminRecordsState.printSelectedIds.has(record.uniqueId) ? "checked" : "";
  const canDownloadGlassifyFront = isGlassifyPhysicalCard(record);
  const glassifyChecked = adminRecordsState.glassifyDownloadSelectedIds.has(record.uniqueId) ? "checked" : "";
  return `
    <article class="lookup-row ${active}" data-record-id="${escapeHtml(record.uniqueId)}">
      <div>
        <strong>${escapeHtml(record.serial || "-")}</strong>
        <span>${escapeHtml(name)}</span>
      </div>
      <div class="lookup-row-actions">
        ${canBatchPrint ? `
          <label class="print-select-check" title="Add this unprinted card to A4 print sheet">
            <input type="checkbox" data-print-select="${escapeHtml(record.uniqueId)}" ${printChecked}>
            Print
          </label>
        ` : ""}
        ${canDownloadGlassifyFront ? `
          <label class="print-select-check" title="Add this Glassify QR front to image download">
            <input type="checkbox" data-glassify-download-select="${escapeHtml(record.uniqueId)}" ${glassifyChecked}>
            Front
          </label>
        ` : ""}
        <label class="printed-check" title="Card physically printed">
          <input type="checkbox" data-printed-toggle="${escapeHtml(record.uniqueId)}" ${record.extra?.printed ? "checked" : ""}>
          Printed
        </label>
        <small class="status-pill ${record.status === "registered" ? "registered" : "pending"}">${status}</small>
      </div>
    </article>
  `;
}

function selectAdminRecord(uniqueId) {
  adminRecordsState.selectedId = uniqueId;
  document.querySelectorAll(".lookup-row").forEach((row) => row.classList.toggle("active", row.dataset.recordId === uniqueId));
  const record = adminRecordsState.filtered.find((item) => item.uniqueId === uniqueId) || adminRecordsState.records.find((item) => item.uniqueId === uniqueId);
  const detail = document.getElementById("admin-detail");
  if (!record || !detail) return;
  detail.innerHTML = renderAdminRecordDetail(record);
  if (record.status === "registered" && !["kensho", "glassify", "idash"].includes(record.brandId)) {
    drawCertificate(record, document.getElementById("admin-detail-canvas"));
  }
  updateBatchPrintTools();
  updateGlassifyDownloadTools();
}

function renderAdminRecordDetail(record) {
  const target = record.status === "registered" ? `/details?id=${encodeURIComponent(record.uniqueId)}` : `/register?id=${encodeURIComponent(record.uniqueId)}`;
  const preview = record.status === "registered"
    ? record.brandId === "kensho"
      ? `<div class="kensho-admin-warranty-preview">${renderKenshoWarrantyCard(record)}</div>`
      : record.brandId === "glassify"
        ? `<div class="glassify-admin-warranty-preview">${renderGlassifyWarrantyCard(record)}</div>`
        : record.brandId === "idash"
          ? `<div class="idash-admin-warranty-preview">${renderIdashWarrantyCard(record)}</div>`
          : `<canvas id="admin-detail-canvas" class="certificate-canvas" width="1240" height="1754"></canvas>`
    : `<div class="admin-physical-detail">${renderGeneratedCard(record)}</div>`;
  return `
    <div class="admin-detail-preview">${preview}</div>
    <div class="detail-summary">
      ${recordRow("Card ID", record.serial || "-")}
      ${recordRow("Brand", record.brandName || "-")}
      ${recordRow("Status", record.status === "pending" ? "Available" : statusLabel(record))}
      ${recordRow("Product", record.product || (record.brandId === "glassify" ? "Customer selects by film" : "-"))}
      ${recordRow("Customer", record.customerName || "-")}
      ${recordRow("Plate", record.plateNo || "-")}
      ${recordRow("Store", record.installCenter || "-")}
      <a class="btn btn-dark" href="${target}">${record.status === "registered" ? "Open public details" : "Open QR registration"}</a>
    </div>
  `;
}

async function updatePrintedStatus(uniqueId, printed) {
  const record = adminRecordsState.records.find((item) => item.uniqueId === uniqueId);
  if (!record) return;
  const nextExtra = { ...(record.extra || {}), printed };
  const response = await apiFetch(`/api/warranties/${encodeURIComponent(uniqueId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminUpdate: true, status: record.status, extra: nextExtra })
  });
  if (!response.ok) {
    alert((await response.json()).error || "Could not update printed status.");
    renderAdminRecordList(adminRecordsState.filtered);
    return;
  }
  record.extra = nextExtra;
  if (printed) adminRecordsState.printSelectedIds.delete(uniqueId);
  renderAdminRecordList(adminRecordsState.filtered);
  updateAdminKpis(adminRecordsState.filtered);
  updateBatchPrintTools();
}

function isPrintableKenshoCard(record) {
  return ["kensho", "idash"].includes(record?.brandId) && record.status === "pending" && !record.extra?.printed;
}

function prunePrintSelection() {
  const validIds = new Set(adminRecordsState.records.filter(isPrintableKenshoCard).map((record) => record.uniqueId));
  adminRecordsState.printSelectedIds = new Set([...adminRecordsState.printSelectedIds].filter((id) => validIds.has(id)));
}

function getSelectedPrintableKenshoRecords() {
  return adminRecordsState.records.filter((record) => adminRecordsState.printSelectedIds.has(record.uniqueId) && isPrintableKenshoCard(record));
}

function isGlassifyPhysicalCard(record) {
  return record?.brandId === "glassify" && Boolean(record.scanUrl);
}

function pruneGlassifyDownloadSelection() {
  const validIds = new Set(adminRecordsState.records.filter(isGlassifyPhysicalCard).map((record) => record.uniqueId));
  adminRecordsState.glassifyDownloadSelectedIds = new Set([...adminRecordsState.glassifyDownloadSelectedIds].filter((id) => validIds.has(id)));
}

function getSelectedGlassifyPhysicalRecords() {
  return adminRecordsState.records.filter((record) => adminRecordsState.glassifyDownloadSelectedIds.has(record.uniqueId) && isGlassifyPhysicalCard(record));
}

function updateGlassifyDownloadSelection(uniqueId, selected) {
  const record = adminRecordsState.records.find((item) => item.uniqueId === uniqueId);
  if (!record || !isGlassifyPhysicalCard(record)) return;
  if (selected) adminRecordsState.glassifyDownloadSelectedIds.add(uniqueId);
  else adminRecordsState.glassifyDownloadSelectedIds.delete(uniqueId);
  updateGlassifyDownloadTools();
}

function selectVisibleGlassifyCards() {
  adminRecordsState.filtered.filter(isGlassifyPhysicalCard).forEach((record) => adminRecordsState.glassifyDownloadSelectedIds.add(record.uniqueId));
  renderAdminRecordList(adminRecordsState.filtered);
}

function updateGlassifyDownloadTools() {
  const tools = document.getElementById("glassify-download-tools");
  if (!tools) return;
  pruneGlassifyDownloadSelection();
  const visible = adminRecordsState.filtered.filter(isGlassifyPhysicalCard).length;
  const selected = getSelectedGlassifyPhysicalRecords();
  const status = document.getElementById("glassify-download-status");
  if (status) {
    status.textContent = `${selected.length} selected. ${visible} Glassify card(s) visible. Front side only.`;
  }
  document.getElementById("download-selected-glassify-fronts")?.toggleAttribute("disabled", selected.length === 0);
}

async function downloadSelectedGlassifyFronts() {
  const records = getSelectedGlassifyPhysicalRecords();
  if (!records.length) {
    alert("Select at least one Glassify card first.");
    return;
  }
  await downloadGlassifyPhysicalFrontImages(records);
}

function updatePrintSelection(uniqueId, selected) {
  const record = adminRecordsState.records.find((item) => item.uniqueId === uniqueId);
  if (!record || !isPrintableKenshoCard(record)) return;
  if (selected) adminRecordsState.printSelectedIds.add(uniqueId);
  else adminRecordsState.printSelectedIds.delete(uniqueId);
  updateBatchPrintTools();
}

function selectVisibleUnprintedKenshoCards() {
  adminRecordsState.filtered.filter(isPrintableKenshoCard).forEach((record) => adminRecordsState.printSelectedIds.add(record.uniqueId));
  renderAdminRecordList(adminRecordsState.filtered);
}

function updateBatchPrintTools() {
  const tools = document.getElementById("kensho-print-tools");
  if (!tools) return;
  prunePrintSelection();
  const printableVisible = adminRecordsState.filtered.filter(isPrintableKenshoCard).length;
  const selected = getSelectedPrintableKenshoRecords();
  const status = document.getElementById("kensho-print-status");
  if (status) {
    status.textContent = `${selected.length} selected. ${printableVisible} unprinted name card(s) visible.`;
  }
  document.getElementById("print-selected-a4")?.toggleAttribute("disabled", selected.length === 0);
  document.getElementById("mark-selected-printed")?.toggleAttribute("disabled", selected.length === 0);
}

function printSelectedKenshoA4() {
  const records = getSelectedPrintableKenshoRecords();
  if (!records.length) {
    alert("Select at least one unprinted name card first.");
    return;
  }
  const printWindow = window.open("", "name-card-a4-print", "width=980,height=1200");
  if (!printWindow) {
    alert("Please allow pop-ups so the A4 print sheet can open.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(renderKenshoA4PrintDocument(records));
  printWindow.document.close();
  printWindow.focus();
}

async function markKenshoCardsPrinted(ids = [...adminRecordsState.printSelectedIds]) {
  const records = adminRecordsState.records.filter((record) => ids.includes(record.uniqueId) && isPrintableKenshoCard(record));
  if (!records.length) return;
  if (!confirm(`Mark ${records.length} selected physical card(s) as printed?`)) return;
  for (const record of records) {
    const nextExtra = { ...(record.extra || {}), printed: true };
    const response = await apiFetch(`/api/warranties/${encodeURIComponent(record.uniqueId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminUpdate: true, status: record.status, extra: nextExtra })
    });
    if (response.ok) {
      record.extra = nextExtra;
      adminRecordsState.printSelectedIds.delete(record.uniqueId);
    }
  }
  renderAdminRecordList(adminRecordsState.filtered);
  updateAdminKpis(adminRecordsState.filtered);
  updateBatchPrintTools();
}

window.markKenshoCardsPrinted = markKenshoCardsPrinted;

async function deleteSelectedRecord() {
  const uniqueId = adminRecordsState.selectedId;
  if (!uniqueId) return;
  const record = adminRecordsState.records.find((item) => item.uniqueId === uniqueId);
  if (!confirm(`Delete warranty ${record?.serial || uniqueId}?`)) return;
  const response = await apiFetch(`/api/warranties/${encodeURIComponent(uniqueId)}`, { method: "DELETE" });
  if (!response.ok) {
    alert((await response.json()).error || "Delete failed.");
    return;
  }
  adminRecordsState.selectedId = "";
  await loadAdminRecords(document.getElementById("admin-form"));
  await bindOverviewDashboard();
}

function downloadDetailPng() {
  const record = adminRecordsState.records.find((item) => item.uniqueId === adminRecordsState.selectedId);
  if (record?.brandId === "kensho" && record.status === "registered") {
    saveKenshoWarrantyImage(record);
    return;
  }
  if (record?.brandId === "glassify" && record.status === "registered") {
    saveGlassifyCardImage(record);
    return;
  }
  if (record?.brandId === "idash" && record.status === "registered") {
    saveIdashWarrantyImage(record);
    return;
  }
  const canvas = document.getElementById("admin-detail-canvas");
  if (!canvas) {
    alert("Save image is available after a card has been registered.");
    return;
  }
  downloadCanvas(canvas, `${record?.serial || "warranty-card"}.png`);
}

async function saveIdashWarrantyImage(record) {
  try {
    const canvas = document.createElement("canvas");
    const scale = 2;
    const width = 560;
    const height = 720;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    const [logo, hero, carplay, chip] = await Promise.all([
      loadImage(IDASH_LOGO).catch(() => null),
      loadImage(IDASH_HERO).catch(() => null),
      loadImage(IDASH_CARPLAY).catch(() => null),
      loadImage(IDASH_CHIP).catch(() => null)
    ]);

    ctx.fillStyle = "#050505";
    roundRect(ctx, 0, 0, width, height, 8);
    ctx.fill();

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#061525");
    bg.addColorStop(0.45, "#08090d");
    bg.addColorStop(1, "#111028");
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, width, height, 8);
    ctx.fill();

    ctx.save();
    roundRect(ctx, 0, 0, width, height, 8);
    ctx.clip();
    if (hero) {
      ctx.globalAlpha = 0.82;
      drawCoverImage(ctx, hero, 248, 0, width - 248, 460);
      ctx.globalAlpha = 1;
      const heroFade = ctx.createLinearGradient(210, 0, width, 0);
      heroFade.addColorStop(0, "#050505");
      heroFade.addColorStop(0.28, "rgba(5,5,5,0.68)");
      heroFade.addColorStop(0.72, "rgba(5,5,5,0.18)");
      heroFade.addColorStop(1, "rgba(5,5,5,0.72)");
      ctx.fillStyle = heroFade;
      ctx.fillRect(190, 0, width - 190, 460);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.055)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    roundRect(ctx, 8.5, 8.5, width - 17, height - 17, 8);
    ctx.stroke();
    ctx.restore();

    if (logo) drawContainedImage(ctx, logo, 30, 44, 118, 46);
    drawMono(ctx, "PRO. BEYOND PERFORMANCE.", 30, 130, 13, "#79c7ff", 900);
    drawCanvasText(ctx, record.product || "iDash Smart Display", 30, 176, 36, "#fff", 900, 0.95, 265);

    [
      ["CarPlay ready", 30, 210, 108],
      ["DSP sound", 148, 210, 92],
      ["Vision 360", 250, 210, 96]
    ].forEach(([text, x, y, w]) => {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRect(ctx, x, y, w, 34, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      roundRect(ctx, x + 0.5, y + 0.5, w - 1, 33, 8);
      ctx.stroke();
      drawCanvasText(ctx, text, x + 11, y + 22, 12, "#fff", 900, 1, w - 18);
    });

    const deviceX = 24;
    const deviceY = 270;
    const deviceW = width - 48;
    const deviceH = 282;
    ctx.fillStyle = "#111114";
    roundRect(ctx, deviceX, deviceY, deviceW, deviceH, 16);
    ctx.fill();
    ctx.strokeStyle = "#343438";
    ctx.lineWidth = 3;
    roundRect(ctx, deviceX + 1.5, deviceY + 1.5, deviceW - 3, deviceH - 3, 16);
    ctx.stroke();

    ctx.fillStyle = "#17171a";
    roundRect(ctx, deviceX + 7, deviceY + 10, 42, deviceH - 20, 10);
    ctx.fill();
    drawMono(ctx, "MIC", deviceX + 15, deviceY + 34, 7, "#74777f", 800);
    drawMono(ctx, "RST", deviceX + 15, deviceY + 62, 7, "#74777f", 800);
    [87, 121, 155].forEach((offset) => {
      ctx.strokeStyle = "#64676f";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(deviceX + 28, deviceY + offset, 8, 0, Math.PI * 2);
      ctx.stroke();
    });

    const screenX = deviceX + 50;
    const screenY = deviceY + 14;
    const screenW = deviceW - 64;
    const screenH = deviceH - 28;
    ctx.save();
    roundRect(ctx, screenX, screenY, screenW, screenH, 10);
    ctx.clip();
    if (carplay) drawCoverImage(ctx, carplay, screenX, screenY, screenW, screenH);
    else {
      const fallback = ctx.createLinearGradient(screenX, screenY, screenX + screenW, screenY + screenH);
      fallback.addColorStop(0, "#2b0b18");
      fallback.addColorStop(0.5, "#141b48");
      fallback.addColorStop(1, "#70213a");
      ctx.fillStyle = fallback;
      ctx.fillRect(screenX, screenY, screenW, screenH);
    }
    ctx.restore();

    ctx.fillStyle = "rgba(0,0,0,0.88)";
    roundRect(ctx, 26, 580, width - 52, 116, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx, 26.5, 580.5, width - 53, 115, 8);
    ctx.stroke();

    if (chip) drawCoverImage(ctx, chip, 42, 596, 66, 66);
    else {
      ctx.fillStyle = "#07111f";
      roundRect(ctx, 42, 596, 66, 66, 6);
      ctx.fill();
    }
    drawMono(ctx, "WARRANTY ID", 124, 610, 11, "#8f9299", 900);
    drawMono(ctx, record.serial || "-", 124, 633, 15, "#fff", 900);

    const vehicle = [record.vehicleBrand, record.vehicleModel].filter(Boolean).join(" ") || "-";
    const plate = [record.plateNo, record.province].filter(Boolean).join(" ") || "-";
    const infoRows = [
      ["NAME", record.customerName || "-"],
      ["CAR", vehicle],
      ["PLATE", plate]
    ];
    let infoY = 612;
    infoRows.forEach(([label, value]) => {
      drawMono(ctx, label, 310, infoY, 9, "#74777f", 900);
      drawCanvasText(ctx, value, 360, infoY + 1, 11, "#f8fbff", 850, 1.08, 160);
      infoY += 24;
    });

    downloadCanvas(canvas, `${safeDownloadName(record.serial || "idash-warranty-card")}.png`);
  } catch (error) {
    console.error(error);
    alert("Could not save the iDash warranty image. Please try again.");
  }
}

async function saveKenshoWarrantyImage(record) {
  const canvas = document.createElement("canvas");
  const scale = 2;
  const width = 504;
  const height = 720;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  const visual = kenshoProductVisual(record);
  const [logo, productImage] = await Promise.all([
    loadImage(KENSHO_LOGO).catch(() => null),
    loadImage(visual.image).catch(() => null)
  ]);

  ctx.fillStyle = "#050914";
  roundRect(ctx, 0, 0, width, height, 6);
  ctx.fill();
  const gradient = ctx.createRadialGradient(410, 80, 20, 410, 80, 360);
  gradient.addColorStop(0, "rgba(14,165,233,0.28)");
  gradient.addColorStop(1, "rgba(14,165,233,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(125,211,252,0.18)";
  ctx.lineWidth = 1;
  for (let x = 28; x < width; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 28; y < height; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  if (logo) ctx.drawImage(logo, 28, 30, 162, 54);
  drawBadge(ctx, width - 168, 42, 138, 32, "VERIFIED WARRANTY");
  drawMono(ctx, "DIGITAL WARRANTY CARD", 28, 116, 10, "#7dd3fc", 900);
  drawCanvasText(ctx, record.product || "KENSHO Beam", 28, 160, 56, "#fff", 900, 0.96, 235);
  drawBadge(ctx, 28, 254, 100, 42, record.serial || "-");

  if (productImage) drawContainedImage(ctx, productImage, 304, 116, 170, 170);

  ctx.fillStyle = "rgba(14,165,233,0.10)";
  ctx.strokeStyle = "rgba(125,211,252,0.28)";
  ctx.strokeRect(28.5, 320.5, width - 58, 48);
  ctx.fillRect(29, 321, width - 58, 47);
  drawCanvasText(ctx, "2 YEAR COVERAGE", 42, 352, 14, "#fff", 900);
  drawCanvasText(ctx, `${record.installDate || "-"} to ${record.expiryDate || "-"}`, width - 224, 352, 14, "#dff7ff", 900);

  const rows = [
    ["Status", statusLabel(record)],
    ["Customer", record.customerName || "-"],
    ["Vehicle", [record.vehicleBrand, record.vehicleModel].filter(Boolean).join(" ") || "-"],
    ["Plate", [record.plateNo, record.province].filter(Boolean).join(" ") || "-"],
    ["Socket", record.extra?.socket || "-"],
    ["Install center", record.installCenter || "-"],
    ["Chassis", record.chassisNo || "-"]
  ];
  let y = 410;
  rows.forEach(([label, value]) => {
    drawCanvasText(ctx, label, 28, y, 14, "rgba(224,242,254,0.68)", 800);
    drawCanvasText(ctx, value, width - 28, y, 14, "#fff", 900, 1.1, 292, "right");
    ctx.strokeStyle = "rgba(125,211,252,0.16)";
    ctx.beginPath();
    ctx.moveTo(28, y + 15);
    ctx.lineTo(width - 28, y + 15);
    ctx.stroke();
    y += 44;
  });

  downloadCanvas(canvas, `${record.serial || "kensho-warranty-card"}.png`);
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}

async function downloadGlassifyPhysicalFrontImages(records) {
  const glassifyRecords = records.filter(isGlassifyPhysicalCard);
  if (!glassifyRecords.length) {
    alert("Select at least one Glassify card first.");
    return;
  }
  try {
    for (const record of glassifyRecords) {
      const canvas = await createGlassifyPhysicalFrontCanvas(record);
      downloadCanvas(canvas, `${safeDownloadName(record.serial || record.uniqueId || "glassify-card")}-front.png`);
      await wait(160);
    }
  } catch (error) {
    console.error(error);
    alert("Could not download one of the Glassify front images. Please check the QR image service and try again.");
  }
}

async function createGlassifyPhysicalFrontCanvas(record) {
  const [template, qr] = await Promise.all([
    loadImage("/template/glassify-front.png"),
    loadImage(proxiedQrImageSrc(record.scanUrl)).catch(() => loadImage(qrImageSrc(record.scanUrl)))
  ]);
  const width = template.naturalWidth || template.width || 638;
  const height = template.naturalHeight || template.height || 1016;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(template, 0, 0, width, height);

  const qrSize = width * 0.47;
  const qrX = width * 0.25;
  const qrY = height * 0.229;
  ctx.fillStyle = "#fff";
  ctx.fillRect(qrX, qrY, qrSize, qrSize);
  ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "#07070a";
  ctx.font = `900 ${Math.round(width * 0.05)}px Consolas, "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(record.serial || "-", width / 2, height * 0.732);
  return canvas;
}

function safeDownloadName(value) {
  return String(value || "download").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveGlassifyCardImage(record) {
  try {
    const canvas = document.createElement("canvas");
    const scale = 2;
    const width = 430;
    const height = 700;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    // 1. Load the Glassify logo
    const logo = await loadImage(GLASSIFY_LOGO).catch(() => null);

    // 2. Draw card background (rounded rectangle with a fine gradient and border)
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 0, 0, width, height, 28);
    ctx.fill();

    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
    bgGrad.addColorStop(1, "rgba(247, 251, 255, 0.92)");
    ctx.fillStyle = bgGrad;
    roundRect(ctx, 0, 0, width, height, 28);
    ctx.fill();

    ctx.strokeStyle = "rgba(59, 130, 246, 0.18)";
    ctx.lineWidth = 1;
    roundRect(ctx, 0.5, 0.5, width - 1, height - 1, 28);
    ctx.stroke();

    // 3. Header Section (Logo & Verified Badge)
    if (logo) {
      const logoAspect = logo.width / logo.height;
      const logoW = 128;
      const logoH = logoW / logoAspect;
      ctx.drawImage(logo, 24, 22, logoW, logoH);
    }

    // Verified badge
    const badgeText = (record.status === "pending" ? "PENDING REGISTRATION" : "VERIFIED WARRANTY").toUpperCase();
    ctx.font = '900 9px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Thai", Arial, sans-serif';
    const textWidth = ctx.measureText(badgeText).width;
    const badgePadX = 12;
    const badgePadY = 5;
    const badgeW = textWidth + badgePadX * 2;
    const badgeH = 9 + badgePadY * 2;
    const badgeX = width - 24 - badgeW;
    const badgeY = 22 + (24 - badgeH) / 2; // vertically align with logo (assumed height 24)

    ctx.fillStyle = "rgba(5, 150, 105, 0.08)";
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 999);
    ctx.fill();
    ctx.strokeStyle = "rgba(5, 150, 105, 0.28)";
    ctx.lineWidth = 1;
    roundRect(ctx, badgeX + 0.5, badgeY + 0.5, badgeW - 1, badgeH - 1, 999);
    ctx.stroke();

    ctx.fillStyle = "#059669";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // Divider after header: border-bottom: 1px solid rgba(59,130,246,0.10)
    ctx.strokeStyle = "rgba(59, 130, 246, 0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, 62);
    ctx.lineTo(width - 24, 62);
    ctx.stroke();

    // 4. Title Section
    ctx.fillStyle = "#3b82f6";
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Thai", Arial, sans-serif';
    ctx.fillText("Digital warranty card / บัตรรับประกันดิจิทัล", 24, 86);

    ctx.fillStyle = "#0f172a";
    ctx.font = '900 30px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Thai", Arial, sans-serif';
    ctx.fillText("Window Film Warranty", 24, 122);

    ctx.fillStyle = "#64748b";
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Thai", Arial, sans-serif';
    ctx.fillText(record.product || "Glassify film protection", 24, 142);

    // 5. Visual Stage Area
    const stageX = 16;
    const stageY = 158;
    const stageW = width - 32;
    const stageH = 240;

    ctx.save();
    roundRect(ctx, stageX, stageY, stageW, stageH, 18);
    ctx.clip();

    // Stage Background
    const stageGrad = ctx.createLinearGradient(stageX, stageY, stageX + stageW, stageY + stageH);
    stageGrad.addColorStop(0, "rgba(240, 247, 255, 0.95)");
    stageGrad.addColorStop(1, "rgba(238, 244, 255, 0.90)");
    ctx.fillStyle = stageGrad;
    ctx.fillRect(stageX, stageY, stageW, stageH);

    ctx.strokeStyle = "rgba(59, 130, 246, 0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(stageX + 0.5, stageY + 0.5, stageW - 1, stageH - 1);

    // Capture dynamic vehicle frame or fallback to static transparent shape
    const activeVideo = document.querySelector(".glassify-warranty-card .glassify-vehicle-video");
    let vehicleDrawn = false;
    const vehicleW = 320;
    const vehicleH = 180;
    const vehicleX = stageX + (stageW - vehicleW) / 2;

    if (activeVideo && activeVideo.readyState >= 2 && activeVideo.videoWidth && activeVideo.videoHeight) {
      try {
        const vAspect = activeVideo.videoWidth / activeVideo.videoHeight;
        const vH = vehicleW / vAspect;
        const vY = stageY + stageH - 14 - vH;
        ctx.drawImage(activeVideo, vehicleX, vY, vehicleW, vH);
        vehicleDrawn = true;
      } catch (err) {
        console.warn("Failed to draw video frame, falling back to static templates", err);
      }
    }

    if (!vehicleDrawn) {
      const templateVal = record.extra?.vehicleTemplate || "sedan";
      const templateUrl = CERT_TEMPLATES.find(t => t.value === templateVal)?.url || "/template/size-l.png";
      try {
        const fallbackImg = await loadImage(templateUrl);
        const imgAspect = fallbackImg.width / fallbackImg.height;
        const fW = 300;
        const fH = fW / imgAspect;
        const fX = stageX + (stageW - fW) / 2;
        const fY = stageY + stageH - 14 - fH;
        ctx.drawImage(fallbackImg, fX, fY, fW, fH);
      } catch (err) {
        console.warn("Failed to load/draw fallback template", err);
      }
    }

    // Stage Coordinate mapping (viewBox 0 0 430 250)
    const mapX = (x) => stageX + (x * stageW) / 430;
    const mapY = (y) => stageY + (y * stageH) / 250;

    // Dashed connection lines
    ctx.strokeStyle = "rgba(37, 99, 235, 0.36)";
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    ctx.lineCap = "round";

    const paths = [
      [[104, 62], [144, 116], [198, 132]],
      [[304, 56], [262, 113], [224, 128]],
      [[336, 164], [278, 143], [224, 128]]
    ];

    paths.forEach((p) => {
      ctx.beginPath();
      ctx.moveTo(mapX(p[0][0]), mapY(p[0][1]));
      for (let i = 1; i < p.length; i++) {
        ctx.lineTo(mapX(p[i][0]), mapY(p[i][1]));
      }
      ctx.stroke();
    });
    ctx.setLineDash([]); // reset dash

    // Highlight circles
    ctx.fillStyle = "#3b82f6";
    const circles = [[198, 132], [224, 128], [278, 143]];
    circles.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(mapX(cx), mapY(cy), 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Callout box helper
    function drawCallout(labelText, valText, cx, cy) {
      const cw = 116;
      const ch = 42;

      ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
      roundRect(ctx, cx, cy, cw, ch, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(59, 130, 246, 0.22)";
      ctx.lineWidth = 1;
      roundRect(ctx, cx + 0.5, cy + 0.5, cw - 1, ch - 1, 12);
      ctx.stroke();

      ctx.fillStyle = "#3b82f6";
      ctx.font = '700 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Thai", Arial, sans-serif';
      ctx.fillText(labelText, cx + 11, cy + 16);

      ctx.fillStyle = "#0f172a";
      ctx.font = '900 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Thai", Arial, sans-serif';

      let displayVal = String(valText || "-");
      if (ctx.measureText(displayVal).width > cw - 22) {
        ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Thai", Arial, sans-serif';
      }
      ctx.fillText(displayVal, cx + 11, cy + 30);
    }

    const extra = record.extra || {};
    const frontText = extra.frontFilm || extra.frontSeries || "Front film";
    const rearText = extra.rearFilm || extra.rearSeries || "Rear film";
    const sideText = extra.sideFilm || extra.sideSeries || "Side film";

    drawCallout("Front film", frontText, stageX + 12, stageY + 18);
    drawCallout("Rear film", rearText, stageX + stageW * 0.51, stageY + 14);
    drawCallout("Side film", sideText, stageX + stageW - 12 - 116, stageY + 134);

    ctx.restore(); // end of clipping

    // 6. Coverage Section
    const covX = 28;
    const covY = stageY + stageH + 16;
    const covW = width - 56;
    const covH = 38;

    const covGrad = ctx.createLinearGradient(covX, covY, covX + covW, covY + covH);
    covGrad.addColorStop(0, "#2563eb");
    covGrad.addColorStop(0.55, "#3b82f6");
    covGrad.addColorStop(1, "#00b4ff");

    ctx.fillStyle = covGrad;
    roundRect(ctx, covX, covY, covW, covH, 13);
    ctx.fill();

    const coverageText = (Number(record.warrantyYears) === 99 ? "LIFETIME COVERAGE" : `${record.warrantyYears || 7} YEAR COVERAGE`).toUpperCase();
    const expiryText = `${record.installDate || today()} to ${Number(record.warrantyYears) === 99 ? "Lifetime" : record.expiryDate || "-"}`;

    ctx.fillStyle = "#ffffff";
    ctx.font = '900 12px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Thai", Arial, sans-serif';
    ctx.textBaseline = "middle";
    ctx.fillText(coverageText, covX + 16, covY + covH / 2 + 0.5);

    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.font = '700 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Thai", Arial, sans-serif';
    ctx.textAlign = "right";
    ctx.fillText(expiryText, covX + covW - 16, covY + covH / 2 + 0.5);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic"; // reset

    // 7. Details Grid Section
    const rows = [
      ["Customer", record.customerName || "-"],
      ["Vehicle", [record.vehicleBrand, record.vehicleModel].filter(Boolean).join(" ") || "-"],
      ["Plate", [record.plateNo, record.province].filter(Boolean).join(" ") || "-"],
      ["Install center", record.installCenter || "-"]
    ];

    let rowY = covY + covH + 16;
    rows.forEach(([label, value]) => {
      ctx.fillStyle = "#64748b";
      ctx.font = '700 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Thai", Arial, sans-serif';
      ctx.fillText(label.toUpperCase(), 24, rowY + 26);

      ctx.fillStyle = "#0f172a";
      ctx.font = '900 13px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Thai", Arial, sans-serif';
      ctx.textAlign = "right";
      ctx.fillText(value, width - 24, rowY + 26);

      ctx.textAlign = "left";

      // Border divider
      ctx.strokeStyle = "rgba(59, 130, 246, 0.09)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(24, rowY + 44);
      ctx.lineTo(width - 24, rowY + 44);
      ctx.stroke();

      rowY += 44;
    });

    // 8. Footer Section
    ctx.fillStyle = "#64748b";
    ctx.font = '800 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Thai", Arial, sans-serif';
    ctx.textBaseline = "middle";
    ctx.fillText("CARD ID", 24, rowY + 25);

    ctx.fillStyle = "#3b82f6";
    ctx.font = '900 15px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Thai", Arial, sans-serif';
    ctx.textAlign = "right";
    ctx.fillText(record.serial || "-", width - 24, rowY + 25);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // 9. Trigger download!
    downloadCanvas(canvas, `${record.serial || "glassify-warranty-card"}.png`);
  } catch (error) {
    console.error(error);
    alert("Could not save this warranty card image. Please try again.");
  }
}

async function replaceCloneVideosWithFrames(sourceRoot, cloneRoot) {
  const sourceVideos = [...sourceRoot.querySelectorAll("video")];
  const cloneVideos = [...cloneRoot.querySelectorAll("video")];
  sourceVideos.forEach((video, index) => {
    const cloneVideo = cloneVideos[index];
    if (!cloneVideo) return;
    const image = document.createElement("img");
    image.className = cloneVideo.className;
    image.alt = "";
    if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      image.src = canvas.toDataURL("image/png");
    } else {
      image.src = TRANSPARENT_IMAGE;
    }
    cloneVideo.replaceWith(image);
  });
}

function absolutizeCloneAssets(root) {
  root.querySelectorAll("img").forEach((image) => {
    if (image.getAttribute("src")) image.src = new URL(image.getAttribute("src"), location.origin).href;
  });
  root.querySelectorAll("source").forEach((source) => {
    if (source.getAttribute("src")) source.src = new URL(source.getAttribute("src"), location.origin).href;
  });
}

async function convertImagesToBase64(root) {
  const images = [...root.querySelectorAll("img")];
  for (const img of images) {
    const src = img.getAttribute("src");
    if (src && !src.startsWith("data:")) {
      try {
        const absoluteUrl = new URL(src, location.origin).href;
        const res = await fetch(absoluteUrl);
        const blob = await res.blob();
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        img.src = base64;
      } catch (e) {
        console.warn("Failed to convert image to base64:", src, e);
      }
    }
  }
}

function collectDocumentCss() {
  return [...document.styleSheets].map((sheet) => {
    try {
      return [...sheet.cssRules]
        .map((rule) => {
          const text = rule.cssText;
          if (text.includes("url(")) {
            return "";
          }
          return text;
        })
        .join("\n");
    } catch {
      return "";
    }
  }).join("\n");
}

function drawBadge(ctx, x, y, w, h, text) {
  ctx.fillStyle = "rgba(14,165,233,0.10)";
  ctx.strokeStyle = "rgba(125,211,252,0.36)";
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  drawCanvasText(ctx, text, x + 14, y + h / 2 + 5, 12, "#e0f2fe", 900);
}

function drawMono(ctx, text, x, y, size, color, weight = 800) {
  ctx.font = `${weight} ${size}px Consolas, "JetBrains Mono", monospace`;
  ctx.fillStyle = color;
  ctx.letterSpacing = "0px";
  ctx.fillText(String(text || ""), x, y);
}

function drawCanvasText(ctx, text, x, y, size, color, weight = 800, lineHeight = 1.15, maxWidth = 420, align = "left") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans Thai",Arial,sans-serif`;
  ctx.textAlign = align;
  String(text || "").split(" ").reduce((line, word) => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += size * lineHeight;
      return word;
    }
    return next;
  }, "").split("\n").forEach((line) => {
    if (line) ctx.fillText(line, x, y);
  });
  ctx.textAlign = "left";
}

function drawContainedImage(ctx, image, x, y, w, h) {
  const ratio = Math.min(w / image.width, h / image.height);
  const dw = image.width * ratio;
  const dh = image.height * ratio;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawCoverImage(ctx, image, x, y, w, h) {
  const ratio = Math.max(w / image.width, h / image.height);
  const dw = image.width * ratio;
  const dh = image.height * ratio;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bindCatalogForms() {
  document.querySelectorAll(".catalog-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const type = form.dataset.catalogType;
      const payload = catalogPayload(type, form);
      const id = form.Id?.value;
      const response = await apiFetch(`/api/catalog/${type}${id ? `/${encodeURIComponent(id)}` : ""}`, {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        alert((await response.json()).error || "Catalog save failed.");
        return;
      }
      await refreshCatalogView();
    });
  });
  document.querySelectorAll("[data-reset-form]").forEach((button) => {
    button.addEventListener("click", () => {
      const form = document.getElementById(button.dataset.resetForm);
      form?.reset();
      if (form?.Id) form.Id.value = "";
    });
  });
}

function catalogPayload(type, form) {
  const data = Object.fromEntries(new FormData(form).entries());
  data.active = Boolean(form.active?.checked);
  data.sortOrder = Number(data.sortOrder || 0);
  if (type === "products") {
    const brandId = form.brandId?.value || currentBrand?.id || data.brandId;
    const brand = brands.find((item) => item.id === brandId);
    data.brandId = brandId;
    data.brandName = brand?.name || data.brandName || "";
    data.warrantyYears = Number(data.warrantyYears || (brandId === "kensho" ? 2 : 1));
  }
  if (type === "film-options") {
    data.brandId = "glassify";
    data.series = String(data.series || "").toUpperCase();
    data.warrantyYears = Number(data.warrantyYears || 7);
  }
  if (type === "vehicle-models") {
    data.make = String(data.make || "").trim();
    data.model = String(data.model || "").trim();
  }
  return data;
}

async function editCatalogItem(type, id) {
  const source = {
    products: catalog.products,
    "film-options": catalog.filmOptions,
    "install-centers": catalog.installCenters,
    "vehicle-models": catalog.vehicleModels
  }[type] || [];
  const item = source.find((record) => String(record.Id || record.id) === String(id));
  if (!item) return;
  const formId = type === "products" ? "product-form" : type === "film-options" ? "film-form" : type === "vehicle-models" ? "vehicle-form" : "center-form";
  const form = document.getElementById(formId);
  if (!form) return;
  Object.entries(item).forEach(([key, value]) => {
    if (!form.elements[key]) return;
    if (form.elements[key].type === "checkbox") form.elements[key].checked = Boolean(value);
    else form.elements[key].value = value ?? "";
  });
  form.Id.value = item.Id || item.id;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function removeCatalogItem(type, id) {
  if (!confirm("Remove this catalog item?")) return;
  const response = await apiFetch(`/api/catalog/${type}/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) {
    alert((await response.json()).error || "Remove failed.");
    return;
  }
  await refreshCatalogView();
}

async function refreshCatalogView() {
  await loadCatalog(true);
  const path = location.pathname;
  if (path === "/" || path === "/admin") renderAdmin();
  else renderBrandPage();
}

function formToRecord(form) {
  const formData = new FormData(form);
  const productName = formData.get("product");
  const glassifyExtra = readExtra(formData);
  const groups = glassifyFilmGroups();
  const frontSeries = groups.find((item) => item.key === glassifyExtra.frontSeries) || groups[0] || { label: "Glassify Film", years: 7 };
  const product = currentBrand.id === "glassify"
    ? { name: frontSeries.label, variant: glassifyExtra.frontFilm || frontSeries.label, years: frontSeries.years }
    : currentBrand.products.find((item) => item.name === productName) || currentBrand.products[0];
  const installDate = today();
  const warrantyYears = currentBrand.id === "idash" ? 1 : currentBrand.id === "kensho" ? 2 : product.years;
  const plateNo = formatPlateNumber(formData.get("plateNo") || "");
  return {
    brandId: currentBrand.id,
    brandName: currentBrand.name,
    product: product.name,
    variant: product.variant,
    warrantyYears,
    customerName: formData.get("customerName") || "",
    phone: String(formData.get("phone") || "").replace(/\D/g, ""),
    email: formData.get("email") || "",
    vehicleBrand: formData.get("vehicleBrand") || "",
    vehicleModel: formData.get("vehicleModel") || "",
    plateNo,
    province: formData.get("province") || "",
    chassisNo: formData.get("chassisNo") || "",
    installCenter: formData.get("installCenter") || "",
    installDate,
    expiryDate: addYears(installDate, warrantyYears),
    notes: formData.get("notes") || "",
    extra: glassifyExtra
  };
}

function refreshPreview(record) {
  const preview = document.getElementById("warranty-preview");
  if (!preview) return;
  if (record.brandId === "glassify") {
    preview.innerHTML = renderGlassifyWarrantyCard(record, "preview");
    return;
  }
  if (record.brandId === "idash") {
    preview.innerHTML = renderIdashWarrantyCard(record);
    return;
  }
  preview.innerHTML = `<canvas id="certificate-preview" class="certificate-canvas" width="1240" height="1754"></canvas>`;
  drawCertificate(record, document.getElementById("certificate-preview"));
}

async function drawCertificate(record, canvas) {
  if (!canvas) return;
  const template = CERT_TEMPLATES.find((item) => item.value === record.extra?.vehicleTemplate) || CERT_TEMPLATES[2];
  const image = await loadImage(template.url);
  const ratio = image.width / image.height;
  const width = 1240;
  const height = Math.round(width / ratio);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const expiryDate = record.expiryDate || addYears(record.installDate, Number(record.warrantyYears || 1));
  const extraText = record.extra?.filmPosition || record.extra?.socket || record.variant || "";
  const isGlassify = record.brandId === "glassify";
  const values = {
    frontFilm: isGlassify ? record.extra?.frontFilm || "" : record.product || "",
    rearFilm: isGlassify ? record.extra?.rearFilm || "" : record.variant || record.product || "",
    sideFilm: isGlassify ? record.extra?.sideFilm || "" : extraText || record.product || "",
    installDate: record.installDate || "",
    expiryDate: Number(record.warrantyYears) === 99 ? "Lifetime" : expiryDate || "",
    customerName: record.customerName || "",
    brand: record.vehicleBrand || "",
    model: record.vehicleModel || "",
    plate: [record.plateNo, record.province].filter(Boolean).join("  "),
    chassisNo: record.chassisNo || "",
    installCenter: record.installCenter || "",
    remarks: record.notes || "",
    warrantyNo: record.serial || ""
  };

  Object.entries(values).forEach(([key, value]) => drawCertText(ctx, canvas, key, value));
}

function drawCertText(ctx, canvas, key, value) {
  const config = CERT_POS[key];
  if (!config) return;
  const sx = canvas.width / CERT_REF_W;
  const sy = canvas.height / CERT_REF_H;
  const scale = (sx + sy) / 2;
  const x = config.x * sx;
  const y = (config.y + CERT_Y_SHIFT) * sy;
  const size = (config.size + CERT_FONT_ADD) * scale;
  ctx.font = `${config.weight || "700"} ${size}px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans Thai",Arial,sans-serif`;
  ctx.fillStyle = "#222";
  ctx.textAlign = config.align || "left";
  ctx.textBaseline = "middle";
  ctx.fillText(String(value || ""), x, y);
}

function qrImageSrc(scanUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&data=${encodeURIComponent(scanUrl)}`;
}

function proxiedQrImageSrc(scanUrl) {
  return `/api/qr-image?size=400&margin=2&data=${encodeURIComponent(scanUrl)}`;
}

function renderGeneratedCard(record, options = {}) {
  const qrSrc = qrImageSrc(record.scanUrl);
  if (record.brandId === "glassify") return renderGlassifyPhysicalCard(record, qrSrc, options);
  if (record.brandId === "kensho") return renderKenshoPhysicalCard(record, qrSrc);
  if (record.brandId === "idash") return renderIdashPhysicalCard(record, qrSrc);
  return `
    <article class="physical-card">
      <div class="card-template">
        <img class="card-template-bg" src="/template/front-side.png" alt="">
        <img class="card-template-qr" src="${qrSrc}" alt="QR for ${escapeHtml(record.serial)}">
        <div class="card-template-serial">${escapeHtml(record.serial)}</div>
      </div>
      <a href="${escapeHtml(record.scanUrl)}" target="_blank" rel="noopener">${escapeHtml(record.scanUrl)}</a>
      <button class="btn btn-ghost" type="button" onclick="window.open('${escapeJs(record.scanUrl)}','_blank')">Test scan</button>
    </article>
  `;
}

function renderIdashPhysicalCard(record, qrSrc) {
  return `
    <article class="physical-card idash-physical-card">
      <div class="idash-name-card-set" aria-label="iDash physical warranty card">
        <section class="idash-name-card idash-name-card-front">
          <div class="idash-name-card-grid"></div>
          <div class="idash-card-glow glow-one"></div>
          <div class="idash-card-glow glow-two"></div>
          <img class="idash-name-card-logo" src="${IDASH_LOGO}" alt="iDash">
          <div class="idash-name-device">
            <div class="idash-name-device-bar"></div>
            <div class="idash-name-device-screen">
              <img src="${IDASH_CARPLAY}" alt="">
            </div>
          </div>
          <div class="idash-name-card-copy">
            <span>Physical warranty card / บัตรรับประกันสินค้า</span>
            <strong>${escapeHtml(record.product || "iDash Smart Display")}</strong>
            <em>1 Year Warranty / รับประกัน 1 ปี</em>
          </div>
        </section>
        <section class="idash-name-card idash-name-card-back">
          <div class="idash-name-card-grid"></div>
          <div class="idash-name-card-qr-box">
            <img src="${qrSrc}" alt="QR for ${escapeHtml(record.serial)}">
          </div>
          <div class="idash-name-card-back-copy">
            <strong>Scan to activate / สแกนเพื่อลงทะเบียน</strong>
            <span>Card ID / เลขบัตร</span>
            <em>${escapeHtml(record.serial)}</em>
          </div>
        </section>
      </div>
      <a href="${escapeHtml(record.scanUrl)}" target="_blank" rel="noopener">${escapeHtml(record.scanUrl)}</a>
      <button class="btn btn-ghost" type="button" onclick="window.open('${escapeJs(record.scanUrl)}','_blank')">Test scan</button>
    </article>
  `;
}

function renderGlassifyPhysicalCard(record, qrSrc, options = {}) {
  const selector = options.selectable
    ? `
      <label class="physical-card-select">
        <input type="checkbox" data-generated-glassify-select="${escapeHtml(record.uniqueId)}" ${options.checked ? "checked" : ""}>
        Select front image
      </label>
    `
    : "";
  return `
    <article class="physical-card glassify-physical-card">
      ${selector}
      <div class="glassify-template-set" aria-label="Glassify physical warranty card">
        <section class="glassify-template-card glassify-template-front">
          <img class="glassify-template-bg" src="/template/glassify-front.png" alt="Glassify warranty card front">
          <img class="glassify-template-qr" src="${qrSrc}" alt="QR for ${escapeHtml(record.serial)}">
          <strong class="glassify-template-serial">${escapeHtml(record.serial)}</strong>
        </section>
        <section class="glassify-template-card">
          <img class="glassify-template-bg" src="/template/glassify-back.png" alt="Glassify warranty card back">
        </section>
      </div>
      <a href="${escapeHtml(record.scanUrl)}" target="_blank" rel="noopener">${escapeHtml(record.scanUrl)}</a>
      <button class="btn btn-ghost" type="button" onclick="window.open('${escapeJs(record.scanUrl)}','_blank')">Test scan</button>
    </article>
  `;
}

function renderGlassifyWarrantyCard(record, mode = "details") {
  const extra = record.extra || {};
  const front = extra.frontFilm || extra.frontSeries || "Front film";
  const rear = extra.rearFilm || extra.rearSeries || "Rear film";
  const side = extra.sideFilm || extra.sideSeries || "Side film";
  const coverage = Number(record.warrantyYears) === 99
    ? "Lifetime coverage"
    : `${record.warrantyYears || 7} year coverage`;
  return `
    <article class="glassify-warranty-card ${mode === "preview" ? "is-preview" : ""}">
      <div class="glassify-card-sheen"></div>
      <header class="glassify-cert-head">
        <img src="${GLASSIFY_LOGO}" alt="Glassify">
        <span>${record.status === "pending" ? "Pending registration" : "Verified warranty"}</span>
      </header>
      <section class="glassify-cert-title">
        <p>Digital warranty card / \u0e1a\u0e31\u0e15\u0e23\u0e23\u0e31\u0e1a\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e14\u0e34\u0e08\u0e34\u0e17\u0e31\u0e25</p>
        <h2>Window Film Warranty</h2>
        <small>${escapeHtml(record.product || "Glassify film protection")}</small>
      </section>
      <section class="glassify-cert-stage">
        <svg class="glassify-cert-lines" viewBox="0 0 430 250" aria-hidden="true">
          <path d="M104 62 L144 116 L198 132" />
          <path d="M304 56 L262 113 L224 128" />
          <path d="M336 164 L278 143 L224 128" />
          <circle cx="198" cy="132" r="4" />
          <circle cx="224" cy="128" r="4" />
          <circle cx="278" cy="143" r="4" />
        </svg>
        ${glassifyFilmCallout("front", "Front film", front)}
        ${glassifyFilmCallout("rear", "Rear film", rear)}
        ${glassifyFilmCallout("side", "Side film", side)}
        <div class="glassify-cert-vehicle">
          ${renderGlassifyVehicleVisual(record)}
        </div>
      </section>
      <section class="glassify-cert-coverage">
        <strong>${escapeHtml(coverage)}</strong>
        <span>${escapeHtml(record.installDate || today())} to ${escapeHtml(Number(record.warrantyYears) === 99 ? "Lifetime" : record.expiryDate || "-")}</span>
      </section>
      <section class="glassify-cert-details">
        ${glassifyWarrantyRow("Customer", record.customerName || "-")}
        ${glassifyWarrantyRow("Vehicle", [record.vehicleBrand, record.vehicleModel].filter(Boolean).join(" ") || "-")}
        ${glassifyWarrantyRow("Plate", [record.plateNo, record.province].filter(Boolean).join(" ") || "-")}
        ${glassifyWarrantyRow("Install center", record.installCenter || "-")}
      </section>
      <footer class="glassify-cert-footer">
        <span>Card ID</span>
        <strong>${escapeHtml(record.serial || "-")}</strong>
      </footer>
    </article>
  `;
}

function renderGlassifyVehicleVisual(record) {
  const template = record.extra?.vehicleTemplate || "sedan";
  const asset = GLASSIFY_VEHICLE_ASSETS[template] || GLASSIFY_DEFAULT_VEHICLE_VIDEO;
  return `
    <video class="glassify-vehicle-video" autoplay muted playsinline webkit-playsinline loop preload="auto" aria-label="Glassify animated vehicle preview">
      <source src="${asset}" type="video/mp4">
    </video>
  `;
}

function glassifyFilmCallout(position, label, value) {
  return `
    <div class="glassify-film-callout ${position}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "-")}</strong>
    </div>
  `;
}

function glassifyWarrantyRow(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderKenshoPhysicalCard(record, qrSrc) {
  return `
    <article class="physical-card kensho-physical-card">
      <div class="kensho-business-card-set" aria-label="KENSHO Beam physical warranty card">
        <section class="kensho-business-card kensho-card-front">
          <div class="kensho-card-grid"></div>
          <div class="kensho-card-beam beam-one"></div>
          <div class="kensho-card-beam beam-two"></div>
          <img class="kensho-card-logo" src="${KENSHO_LOGO}" alt="KENSHO Beam">
          <div class="kensho-card-front-copy">
            <span>Physical warranty card / \u0e1a\u0e31\u0e15\u0e23\u0e23\u0e31\u0e1a\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32</span>
            <strong>${escapeHtml(record.product || "KENSHO Beam")}</strong>
            <em>2 Year Warranty / รับประกัน 2 ปี</em>
          </div>
        </section>
        <section class="kensho-business-card kensho-card-back">
          <div class="kensho-card-grid"></div>
          <div class="kensho-card-qr-box">
            <img src="${qrSrc}" alt="QR for ${escapeHtml(record.serial)}">
          </div>
          <div class="kensho-card-back-copy">
            <strong>Scan to activate / \u0e2a\u0e41\u0e01\u0e19\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e25\u0e07\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19</strong>
            <span>Card ID / \u0e40\u0e25\u0e02\u0e1a\u0e31\u0e15\u0e23</span>
            <em>${escapeHtml(record.serial)}</em>
          </div>
        </section>
      </div>
      <a href="${escapeHtml(record.scanUrl)}" target="_blank" rel="noopener">${escapeHtml(record.scanUrl)}</a>
      <button class="btn btn-ghost" type="button" onclick="window.open('${escapeJs(record.scanUrl)}','_blank')">Test scan</button>
    </article>
  `;
}

function renderKenshoA4PrintDocument(records) {
  const chunks = chunkRecords(records, 10);
  const selectedIds = JSON.stringify(records.map((record) => record.uniqueId));
  const sheetLabel = printSheetBrandLabel(records);
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <base href="${escapeHtml(location.origin)}/">
        <title>Name card A4 warranty print</title>
        <style>${kenshoA4PrintCss()}</style>
      </head>
      <body>
        <div class="print-toolbar">
          <div>
            <strong>Name card A4 duplex print</strong>
            <span>${records.length} card(s). Front pages are followed by matching back pages.</span>
          </div>
          <div>
            <button type="button" onclick="window.print()">Print A4</button>
            <button type="button" onclick="window.opener?.markKenshoCardsPrinted?.(${escapeHtml(selectedIds)})">Mark printed in admin</button>
          </div>
        </div>
        ${chunks.map((chunk, index) => `
          <section class="a4-sheet">
            <div class="sheet-note">KENSHO Beam physical warranty cards · Front side · Sheet ${index + 1}</div>
            <div class="a4-card-grid">
              ${chunk.map((record) => renderPrintCardSide(record, "front")).join("")}
            </div>
          </section>
          <section class="a4-sheet">
            <div class="sheet-note">KENSHO Beam physical warranty cards · Back side · Sheet ${index + 1}</div>
            <div class="a4-card-grid">
              ${chunk.map((record) => renderPrintCardSide(record, "back")).join("")}
            </div>
          </section>
        `).join("")}
        <script>
          const waitForImages = Promise.all(Array.from(document.images).map((image) => {
            if (image.complete) return Promise.resolve();
            return new Promise((resolve) => {
              image.onload = resolve;
              image.onerror = resolve;
            });
          }));
          waitForImages.then(() => setTimeout(() => window.print(), 500));
        </script>
      </body>
    </html>
  `.replaceAll("KENSHO Beam physical warranty cards", `${escapeHtml(sheetLabel)} physical warranty cards`);
}

function printSheetBrandLabel(records) {
  const brandNames = [...new Set(records.map((record) => record.brandName || record.brandId).filter(Boolean))];
  if (!brandNames.length) return "Warranty";
  if (brandNames.length === 1) return brandNames[0];
  return brandNames.join(" / ");
}

function renderPrintCardSide(record, side) {
  if (record.brandId === "idash") return renderIdashPrintCardSide(record, side);
  return renderKenshoPrintCardSide(record, side);
}

function renderIdashPrintCardSide(record, side) {
  const qrSrc = qrImageSrc(record.scanUrl);
  if (side === "back") {
    return `
      <article class="idash-print-card idash-print-back">
        <div class="idash-print-grid"></div>
        <div class="idash-print-qr-frame">
          <img src="${qrSrc}" alt="QR for ${escapeHtml(record.serial)}">
        </div>
        <div class="idash-print-back-copy">
          <strong>Scan to activate / สแกนเพื่อลงทะเบียน</strong>
          <span>Card ID / เลขบัตร</span>
          <em>${escapeHtml(record.serial)}</em>
        </div>
      </article>
    `;
  }
  return `
    <article class="idash-print-card idash-print-front">
      <div class="idash-print-grid"></div>
      <div class="idash-print-glow glow-one"></div>
      <div class="idash-print-glow glow-two"></div>
      <img class="print-idash-logo" src="${IDASH_LOGO}" alt="iDash">
      <div class="idash-print-device">
        <div></div>
      </div>
      <div class="idash-print-front-copy">
        <span>Physical warranty card / บัตรรับประกันสินค้า</span>
        <strong>${escapeHtml(record.product || "iDash")}</strong>
        <em>1 Year Warranty / รับประกัน 1 ปี</em>
      </div>
    </article>
  `;
}

function renderKenshoPrintCardSide(record, side) {
  const qrSrc = qrImageSrc(record.scanUrl);
  if (side === "back") {
    return `
      <article class="kensho-print-card kensho-print-back">
        <div class="print-card-grid"></div>
        <div class="print-qr-frame">
          <img src="${qrSrc}" alt="QR for ${escapeHtml(record.serial)}">
        </div>
        <div class="print-back-copy">
          <strong>Scan to activate / \u0e2a\u0e41\u0e01\u0e19\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e25\u0e07\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19</strong>
          <span>Card ID / \u0e40\u0e25\u0e02\u0e1a\u0e31\u0e15\u0e23</span>
          <em>${escapeHtml(record.serial)}</em>
        </div>
      </article>
    `;
  }
  return `
    <article class="kensho-print-card kensho-print-front">
      <div class="print-card-grid"></div>
      <div class="print-beam beam-one"></div>
      <div class="print-beam beam-two"></div>
      <img class="print-kensho-logo" src="${KENSHO_LOGO}" alt="KENSHO Beam">
      <div class="print-front-copy">
        <span>Physical warranty card / \u0e1a\u0e31\u0e15\u0e23\u0e23\u0e31\u0e1a\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32</span>
        <strong>${escapeHtml(record.product || "KENSHO Beam")}</strong>
        <em>2 Year Warranty / \u0e23\u0e31\u0e1a\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19 2 \u0e1b\u0e35</em>
      </div>
    </article>
  `;
}

function chunkRecords(records, size) {
  const chunks = [];
  for (let index = 0; index < records.length; index += size) {
    chunks.push(records.slice(index, index + size));
  }
  return chunks;
}

function kenshoA4PrintCss() {
  return `
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #dfe7ef;
      color: #f8fbff;
      font-family: Arial, "Noto Sans Thai", "Tahoma", sans-serif;
    }
    .print-toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 18px;
      background: #ffffff;
      color: #07111f;
      border-bottom: 1px solid #d8e2ed;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
    }
    .print-toolbar div:first-child { display: grid; gap: 3px; }
    .print-toolbar strong { font-size: 15px; }
    .print-toolbar span { color: #64748b; font-size: 12px; font-weight: 700; }
    .print-toolbar button {
      min-height: 36px;
      padding: 0 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #07111f;
      color: #fff;
      font-weight: 800;
      cursor: pointer;
    }
    .print-toolbar button + button { background: #fff; color: #07111f; }
    .a4-sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 18px auto;
      padding: 8mm;
      background: #fff;
      page-break-after: always;
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
    }
    .sheet-note {
      height: 5mm;
      color: #64748b;
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .a4-card-grid {
      display: grid;
      grid-template-columns: repeat(2, 90mm);
      grid-auto-rows: 54mm;
      justify-content: center;
      align-content: start;
      gap: 2mm 4mm;
    }
    .kensho-print-card {
      position: relative;
      width: 90mm;
      height: 54mm;
      overflow: hidden;
      border: 0.28mm solid rgba(125, 211, 252, 0.28);
      border-radius: 0;
      background: #050508;
      isolation: isolate;
      break-inside: avoid;
    }
    .print-card-grid {
      position: absolute;
      inset: 0;
      z-index: -3;
      background:
        linear-gradient(rgba(255,255,255,0.04) 0.22mm, transparent 0.22mm),
        linear-gradient(90deg, rgba(255,255,255,0.035) 0.22mm, transparent 0.22mm),
        radial-gradient(circle at 82% 16%, rgba(56,189,248,0.25), transparent 30%),
        linear-gradient(135deg, #030407 0%, #07111f 58%, #020617 100%);
      background-size: 7mm 7mm, 7mm 7mm, auto, auto;
    }
    .print-card-grid::after {
      content: "";
      position: absolute;
      inset: 3mm;
      border: 0.24mm solid rgba(125, 211, 252, 0.16);
      border-radius: 0;
    }
    .print-beam {
      position: absolute;
      left: -12%;
      right: -12%;
      height: 0.35mm;
      background: linear-gradient(90deg, transparent, rgba(125,211,252,0.26), rgba(255,255,255,0.9), rgba(14,165,233,0.64), transparent);
      box-shadow: 0 0 5mm rgba(14,165,233,0.42);
    }
    .print-beam.beam-one { top: 40%; transform: rotate(-8deg); }
    .print-beam.beam-two { top: 64%; transform: rotate(6deg); opacity: 0.16; }
    .print-kensho-logo {
      position: absolute;
      left: 50%;
      top: 5.4mm;
      width: 35mm;
      padding: 1.2mm;
      border: 0.24mm solid rgba(125, 211, 252, 0.52);
      border-radius: 1.4mm;
      background: linear-gradient(135deg, rgba(14,165,233,0.28), transparent 46%), #050508;
      box-shadow: 0 0 0 0.22mm rgba(255,255,255,0.08), 0 4mm 12mm rgba(14,165,233,0.25);
      transform: translateX(-50%);
    }
    .print-front-copy {
      position: absolute;
      left: 7mm;
      right: 7mm;
      bottom: 6mm;
      display: grid;
      gap: 1.5mm;
    }
    .print-front-copy span,
    .print-back-copy span {
      color: #7dd3fc;
      font-family: Consolas, "Courier New", monospace;
      font-size: 6.5pt;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .print-front-copy strong {
      color: #fff;
      font-size: 23pt;
      font-weight: 900;
      line-height: 0.94;
      letter-spacing: 0.01em;
      text-transform: uppercase;
      text-shadow: 0.55mm 0.55mm 0 #162033;
    }
    .print-front-copy em {
      width: fit-content;
      padding: 1mm 2mm;
      border: 0.24mm solid rgba(125, 211, 252, 0.24);
      background: rgba(2, 6, 23, 0.70);
      color: #e0f2fe;
      font-size: 7.5pt;
      font-style: normal;
      font-weight: 850;
    }
    .kensho-print-back {
      display: grid;
      grid-template-columns: 30mm minmax(0, 1fr);
      align-items: center;
      gap: 6mm;
      padding: 7mm;
    }
    .print-qr-frame {
      z-index: 1;
      display: grid;
      place-items: center;
      width: 30mm;
      height: 30mm;
      padding: 1.5mm;
      border: 0.28mm solid rgba(255,255,255,0.32);
      border-radius: 1.8mm;
      background: #fff;
    }
    .print-qr-frame img { width: 100%; height: 100%; display: block; }
    .print-back-copy {
      z-index: 1;
      display: grid;
      gap: 1.6mm;
      min-width: 0;
    }
    .print-back-copy strong {
      color: #fff;
      font-size: 16pt;
      font-weight: 900;
      letter-spacing: 0.01em;
      line-height: 1.05;
      text-shadow: 0.45mm 0.45mm 0 #162033;
    }
    .print-back-copy em {
      color: #e0f2fe;
      font-family: Consolas, "Courier New", monospace;
      font-size: 10pt;
      font-style: normal;
      font-weight: 900;
      letter-spacing: 0.04em;
    }
    .idash-print-card {
      position: relative;
      width: 90mm;
      height: 54mm;
      overflow: hidden;
      border: 0.28mm solid rgba(255,255,255,0.18);
      background: #050505;
      color: #fff;
      isolation: isolate;
      break-inside: avoid;
    }
    .idash-print-grid {
      position: absolute;
      inset: 0;
      z-index: -3;
      background:
        linear-gradient(rgba(255,255,255,0.045) 0.22mm, transparent 0.22mm),
        linear-gradient(90deg, rgba(255,255,255,0.035) 0.22mm, transparent 0.22mm),
        radial-gradient(circle at 16% 18%, rgba(0,122,255,0.28), transparent 30%),
        radial-gradient(circle at 88% 18%, rgba(88,86,214,0.24), transparent 28%),
        linear-gradient(135deg, #050505 0%, #111118 58%, #000 100%);
      background-size: 7mm 7mm, 7mm 7mm, auto, auto, auto;
    }
    .idash-print-grid::after {
      content: "";
      position: absolute;
      inset: 3mm;
      border: 0.24mm solid rgba(255,255,255,0.12);
    }
    .idash-print-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(5mm);
      opacity: 0.45;
    }
    .idash-print-glow.glow-one { right: 8mm; top: 4mm; width: 28mm; height: 28mm; background: rgba(0,122,255,0.55); }
    .idash-print-glow.glow-two { left: 8mm; bottom: 4mm; width: 26mm; height: 26mm; background: rgba(88,86,214,0.45); }
    .print-idash-logo {
      position: absolute;
      left: 6mm;
      top: 5mm;
      z-index: 2;
      width: 28mm;
      height: auto;
    }
    .idash-print-device {
      position: absolute;
      right: 6mm;
      top: 12mm;
      z-index: 1;
      width: 38mm;
      height: 22mm;
      padding: 1.5mm;
      border: 0.5mm solid #343438;
      border-radius: 2mm;
      background: linear-gradient(180deg, #2a2a2a, #111);
      box-shadow: 0 4mm 9mm rgba(0,0,0,0.42);
      transform: rotate(-3deg);
    }
    .idash-print-device div {
      width: 100%;
      height: 100%;
      border-radius: 1.2mm;
      background:
        linear-gradient(135deg, rgba(0,122,255,0.74), rgba(88,86,214,0.62)),
        linear-gradient(90deg, #111, #222);
    }
    .idash-print-front-copy {
      position: absolute;
      left: 6mm;
      right: 6mm;
      bottom: 5.5mm;
      display: grid;
      gap: 1.45mm;
    }
    .idash-print-front-copy span,
    .idash-print-back-copy span {
      color: #90c5ff;
      font-family: Consolas, "Courier New", monospace;
      font-size: 6.5pt;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .idash-print-front-copy strong {
      max-width: 72mm;
      color: #fff;
      font-size: 22pt;
      font-weight: 900;
      line-height: 0.96;
      text-transform: uppercase;
      text-shadow: 0.55mm 0.55mm 0 #151522;
    }
    .idash-print-front-copy em {
      width: fit-content;
      padding: 1mm 2mm;
      border: 0.24mm solid rgba(255,255,255,0.18);
      background: rgba(255,255,255,0.08);
      color: #fff;
      font-size: 7.5pt;
      font-style: normal;
      font-weight: 850;
    }
    .idash-print-back {
      display: grid;
      grid-template-columns: 30mm minmax(0, 1fr);
      align-items: center;
      gap: 6mm;
      padding: 7mm;
    }
    .idash-print-qr-frame {
      z-index: 1;
      display: grid;
      place-items: center;
      width: 30mm;
      height: 30mm;
      padding: 1.5mm;
      border: 0.28mm solid rgba(255,255,255,0.34);
      border-radius: 1.8mm;
      background: #fff;
    }
    .idash-print-qr-frame img { width: 100%; height: 100%; display: block; }
    .idash-print-back-copy {
      z-index: 1;
      display: grid;
      gap: 1.6mm;
      min-width: 0;
    }
    .idash-print-back-copy strong {
      color: #fff;
      font-size: 16pt;
      font-weight: 900;
      line-height: 1.05;
      text-shadow: 0.45mm 0.45mm 0 #151522;
    }
    .idash-print-back-copy em {
      color: #fff;
      font-family: Consolas, "Courier New", monospace;
      font-size: 10pt;
      font-style: normal;
      font-weight: 900;
      letter-spacing: 0.04em;
    }
    .idash-print-card {
      border-color: rgba(255,255,255,0.16);
      border-radius: 1.8mm;
      background:
        radial-gradient(circle at 16% 18%, rgba(0, 122, 255, 0.24), transparent 30%),
        radial-gradient(circle at 88% 12%, rgba(236, 72, 153, 0.18), transparent 28%),
        linear-gradient(135deg, #05070b 0%, #101117 54%, #020305 100%);
      box-shadow: inset 0 0 0 0.22mm rgba(255,255,255,0.04);
    }
    .idash-print-grid {
      opacity: 0.72;
      background:
        linear-gradient(rgba(255,255,255,0.035) 0.22mm, transparent 0.22mm),
        linear-gradient(90deg, rgba(255,255,255,0.030) 0.22mm, transparent 0.22mm),
        linear-gradient(135deg, rgba(0, 122, 255, 0.10), rgba(236, 72, 153, 0.08) 44%, rgba(20, 184, 166, 0.08));
      background-size: 7mm 7mm, 7mm 7mm, auto;
    }
    .idash-print-grid::after {
      inset: 3.3mm;
      border-color: rgba(255,255,255,0.13);
    }
    .idash-print-front::before {
      content: "";
      position: absolute;
      inset: 0 0 0 34%;
      z-index: -2;
      background:
        linear-gradient(90deg, rgba(5,7,11,0.92), rgba(5,7,11,0.20) 42%, rgba(5,7,11,0.66)),
        url("/brand-assets/iDash/i-dash%20website/hero-product.png") center / cover no-repeat;
      opacity: 0.92;
    }
    .idash-print-front::after,
    .idash-print-back::after {
      content: "";
      position: absolute;
      inset: 0;
      z-index: -1;
      background: linear-gradient(120deg, rgba(255,255,255,0.12), transparent 22%, transparent 72%, rgba(255,255,255,0.06));
    }
    .print-idash-logo {
      width: 28mm;
      height: auto;
      filter: drop-shadow(0 2.5mm 5mm rgba(0,0,0,0.42));
    }
    .idash-print-device {
      display: none;
    }
    .idash-print-glow {
      z-index: -2;
      opacity: 0.38;
    }
    .idash-print-glow.glow-one { right: 14mm; top: 4mm; background: rgba(0,122,255,0.52); }
    .idash-print-glow.glow-two { left: 8mm; bottom: 3mm; background: rgba(236,72,153,0.34); }
    .idash-print-front-copy {
      left: 6.5mm;
      right: auto;
      bottom: 5.7mm;
      max-width: 51mm;
      gap: 1.5mm;
    }
    .idash-print-front-copy span,
    .idash-print-back-copy span {
      color: #78d4ff;
      font-size: 5.8pt;
      letter-spacing: 0.14em;
    }
    .idash-print-front-copy strong {
      max-width: 49mm;
      font-size: 19pt;
      line-height: 0.96;
      text-shadow: 0 2.5mm 5mm rgba(0,0,0,0.42);
    }
    .idash-print-front-copy em {
      border-color: rgba(120, 212, 255, 0.30);
      border-radius: 99mm;
      background: rgba(1, 12, 24, 0.74);
      color: #e7f8ff;
    }
    .idash-print-back {
      grid-template-columns: 32mm minmax(0, 1fr);
      gap: 6mm;
    }
    .idash-print-qr-frame {
      width: 32mm;
      height: 32mm;
      border-color: rgba(120, 212, 255, 0.32);
      border-radius: 2.2mm;
    }
    .idash-print-back-copy strong {
      font-size: 15pt;
      text-shadow: 0 2.5mm 5mm rgba(0,0,0,0.42);
    }
    .idash-print-back-copy em {
      color: #e7f8ff;
    }
    @media print {
      body { background: #fff; }
      .print-toolbar { display: none !important; }
      .a4-sheet {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
      .sheet-note { display: none; }
    }
  `;
}

function loadImage(url) {
  if (!imageCache.has(url)) {
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      if (/^https?:\/\//i.test(url) && !url.startsWith(location.origin)) {
        image.crossOrigin = "anonymous";
      }
      image.onload = () => resolve(image);
      image.onerror = () => {
        imageCache.delete(url);
        reject(new Error(`Could not load ${url}`));
      };
      image.src = url;
    });
    imageCache.set(url, promise);
  }
  return imageCache.get(url);
}

function getBrandContent(brand) {
  if (brand.id === "glassify") {
    return {
      hero: `
        <div class="brand-showcase glassify-showcase">
          <div class="showcase-copy">
            <img class="brand-logo" src="${brand.logo}" alt="${brand.name}">
            <p class="eyebrow">World Class Films</p>
            <h1>Glassify warranty, scanned from the physical card.</h1>
            <p class="lead">Clean, frosted, film-focused warranty registration for BLACKOUT, SPECTRE, SENTINEL, and PHANTOM tiers.</p>
            <div class="hero-meta">
              <span class="meta-chip">TSER / IR film data</span>
              <span class="meta-chip">Vehicle film positions</span>
              <span class="meta-chip">3Y to lifetime</span>
            </div>
          </div>
          <div class="glass-film-stage">
            <img src="/brand-assets/Glassify/website-light/images/hero-car.png" alt="">
            <div class="film-strip">CX-95 // PHANTOM</div>
          </div>
        </div>
      `,
      support: `
        <section class="brand-product-band glass-band">
          ${brand.products.map((item) => `<div><span>${escapeHtml(item.variant)}</span><strong>${escapeHtml(item.name)}</strong><small>${item.years === 99 ? "Lifetime" : `${item.years} year`} warranty</small></div>`).join("")}
        </section>
      `
    };
  }

  if (brand.id === "idash") {
    return {
      hero: `
        <div class="brand-showcase idash-showcase">
          <div class="idash-screen">
            <img src="/brand-assets/iDash/i-dash%20website/hero-product.png" alt="">
          </div>
          <div class="showcase-copy">
            <img class="brand-logo" src="${brand.logo}" alt="${brand.name}">
            <p class="eyebrow">Pro. Beyond Performance.</p>
            <h1>iDash card scan for head unit warranty.</h1>
            <p class="lead">A dark, dashboard-style registration experience for Apple-ready smart displays and warranty activation.</p>
            <div class="hero-meta">
              <span class="meta-chip">Warranty ID</span>
              <span class="meta-chip">Install center</span>
              <span class="meta-chip">1 year coverage</span>
            </div>
          </div>
        </div>
      `,
      support: `
        <section class="brand-product-band idash-band">
          ${brand.products.map((item) => `<div><span>${escapeHtml(item.variant)}</span><strong>${escapeHtml(item.name)}</strong><small>CarPlay / Android unit</small></div>`).join("")}
        </section>
      `
    };
  }

  return {
    hero: `
      <div class="brand-showcase kensho-showcase">
        <div class="showcase-copy">
          <div class="kanji-mark">้ก•็…ง</div>
          <img class="brand-logo kensho-logo" src="${brand.logo}" alt="${brand.name}">
          <p class="eyebrow">Light Revealed.</p>
          <h1>KENSHO Beam warranty from the QR card.</h1>
          <p class="lead">A technical LED warranty flow for sockets, CANBUS-ready installs, and series-specific coverage.</p>
          <div class="hero-meta">
            <span class="meta-chip">Socket type</span>
            <span class="meta-chip">CANBUS ready</span>
            <span class="meta-chip">1Y to 3Y</span>
          </div>
        </div>
        <div class="beam-stage">
          <img src="/brand-assets/KENSHO%20Beam/website/img/hero-bg.png" alt="">
          <div class="beam-line"></div>
        </div>
      </div>
    `,
    support: `
      <section class="brand-product-band kensho-band">
        ${brand.products.map((item) => `<div><span>${escapeHtml(item.variant)}</span><strong>${escapeHtml(item.name)}</strong><small>${item.years} year warranty</small></div>`).join("")}
      </section>
    `
  };
}

function renderRecord(record) {
  const brand = brands.find((item) => item.id === record.brandId) || { accent: "#0ea5e9", name: record.brandName || "Brand" };
  const target = record.status === "registered" ? `/details?id=${encodeURIComponent(record.uniqueId)}` : `/register?id=${encodeURIComponent(record.uniqueId)}`;
  return `
    <article class="record" style="--brand-accent:${brand.accent}">
      <strong>${escapeHtml(record.serial || "-")} ยท ${escapeHtml(record.brandName || brand.name)}</strong>
      ${recordRow("Status", statusLabel(record))}
      ${recordRow("Customer", record.customerName || "-")}
      ${recordRow("Product", record.product || "-")}
      ${recordRow("Phone", record.phone || "-")}
      ${recordRow("Plate", record.plateNo || "-")}
      ${recordRow("Install", `${record.installDate || "-"} to ${Number(record.warrantyYears) === 99 ? "Lifetime" : record.expiryDate || "-"}`)}
      ${recordRow("Center", record.installCenter || "-")}
      <a class="btn btn-dark" href="${target}">${record.status === "registered" ? "View details" : "Register card"}</a>
    </article>
  `;
}

function renderAdminCard(record) {
  const target = record.status === "registered" ? `/details?id=${encodeURIComponent(record.uniqueId)}` : `/register?id=${encodeURIComponent(record.uniqueId)}`;
  const preview = record.status === "registered"
    ? `<canvas class="admin-cert-thumb" data-cert-id="${escapeHtml(record.uniqueId)}" width="620" height="877"></canvas>`
    : `<div class="admin-physical-thumb">${renderGeneratedCard(record)}</div>`;
  return `
    <article class="admin-record-card">
      <div class="admin-record-preview">${preview}</div>
      <div class="admin-record-info">
        <strong>${escapeHtml(record.serial || "-")}</strong>
        ${recordRow("Brand", record.brandName || "-")}
        ${recordRow("Status", record.status === "pending" ? "Available" : statusLabel(record))}
        ${recordRow("Product", record.product || (record.brandId === "glassify" ? "Customer selects by film" : "-"))}
        ${recordRow("Customer", record.customerName || "-")}
        ${recordRow("Store", record.installCenter || "-")}
        ${recordRow("Install date", record.installDate || "-")}
        <a class="btn btn-dark" href="${target}">${record.status === "registered" ? "View card" : "Open QR registration"}</a>
      </div>
    </article>
  `;
}

function renderAdminCertificateCanvases(records) {
  const canvases = [...document.querySelectorAll("[data-cert-id]")];
  records.filter((record) => record.status === "registered").forEach((record) => {
    const canvas = canvases.find((node) => node.dataset.certId === record.uniqueId);
    if (canvas) drawCertificate(record, canvas);
  });
}

function getExtraField(brand) {
  if (brand.id === "glassify") {
    return `
      <label>Film position / \u0e15\u0e33\u0e41\u0e2b\u0e19\u0e48\u0e07\u0e1f\u0e34\u0e25\u0e4c\u0e21
        <select name="extraFilmPosition">
          <option>Full car / รอบคัน</option>
          <option>Front windshield / กระจกบานหน้า</option>
          <option>Side and rear / \u0e14\u0e49\u0e32\u0e19\u0e02\u0e49\u0e32\u0e07\u0e41\u0e25\u0e30\u0e14\u0e49\u0e32\u0e19\u0e2b\u0e25\u0e31\u0e07</option>
          <option>Sunroof / หลังคาซันรูฟ</option>
        </select>
      </label>
    `;
  }

  if (brand.id === "idash") return "";

  return `
    <label>Socket type / \u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e02\u0e31\u0e49\u0e27\u0e44\u0e1f
      <select name="extraSocket">
        <option>H4</option>
        <option>H7</option>
        <option>H11</option>
        <option>HB3 / 9005</option>
        <option>HB4 / 9006</option>
        <option>9012</option>
      </select>
    </label>
  `;
}

function readExtra(formData) {
  return {
    frontSeries: formData.get("frontSeries") || "",
    frontFilm: formData.get("frontFilm") || "",
    sideSeries: formData.get("sideSeries") || "",
    sideFilm: formData.get("sideFilm") || "",
    rearSeries: formData.get("rearSeries") || "",
    rearFilm: formData.get("rearFilm") || "",
    filmPosition: formData.get("extraFilmPosition") || "",
    socket: formData.get("extraSocket") || "",
    vehicleTemplate: formData.get("vehicleTemplate") || "sedan"
  };
}

function installCenterOptions() {
  return (catalog.installCenters?.length ? catalog.installCenters : INSTALL_CENTERS)
    .filter((center) => center.active !== false)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.name || "").localeCompare(String(b.name || "")));
}

function vehicleCatalogRows() {
  return (catalog.vehicleModels || [])
    .filter((item) => item.active !== false && item.make && item.model)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.make || "").localeCompare(String(b.make || "")) || String(a.model || "").localeCompare(String(b.model || "")));
}

function vehicleMakes() {
  return [...new Set(vehicleCatalogRows().map((item) => item.make))];
}

function vehicleModelsForMake(make) {
  const normalized = String(make || "").trim().toLowerCase();
  const rows = vehicleCatalogRows();
  const source = normalized ? rows.filter((item) => String(item.make || "").toLowerCase() === normalized) : rows;
  return [...new Set(source.map((item) => item.model))];
}

function glassifyFilmGroups() {
  const rows = (catalog.filmOptions || []).filter((item) => item.active !== false && item.brandId === "glassify");
  if (!rows.length) return catalogLoaded ? [] : GLASSIFY_FILM_SERIES;
  const map = new Map();
  rows.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)).forEach((item) => {
    const key = item.series || "OTHER";
    if (!map.has(key)) {
      map.set(key, { key, label: key, years: Number(item.warrantyYears || 7), films: [] });
    }
    map.get(key).films.push(item.filmName);
  });
  return [...map.values()];
}

function statusLabel(record) {
  if (record.status === "pending") return "Pending registration";
  if (record.expiryDate && record.expiryDate < new Date().toISOString().slice(0, 10)) return "Expired";
  return "Active";
}

function renderProblem(title, message) {
  app.innerHTML = `
    <section class="center-state problem">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <a class="btn btn-dark" href="/">Back home</a>
    </section>
  `;
}

function addYears(dateString, years) {
  const match = String(dateString || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  return `${Number(match[1]) + Number(years || 0)}-${match[2]}-${match[3]}`;
}

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cardRow(label, value) {
  return `<div class="card-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "-")}</strong></div>`;
}

function recordRow(label, value) {
  return `<div class="record-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "-")}</strong></div>`;
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJs(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}





