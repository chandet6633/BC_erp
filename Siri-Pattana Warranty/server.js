const http = require("node:http");
const fsStream = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = __dirname;
loadDotEnv(path.join(ROOT, ".env"));
const PUBLIC_DIR = path.join(ROOT, "public");
const BRAND_ASSETS_DIR = path.join(ROOT, "Brand Assets");
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const LOCAL_DB = path.join(DATA_DIR, "warranties.json");

const PORT = Number(process.env.PORT || 3000);
const NOCODB_URL = trimSlash(process.env.NOCODB_URL || "");
const NOCODB_TOKEN = process.env.NOCODB_TOKEN || "";
const NOCODB_TABLE = process.env.NOCODB_WARRANTIES_TABLE || "warranties";
const NOCODB_PRODUCTS_TABLE = process.env.NOCODB_PRODUCTS_TABLE || "products";
const NOCODB_FILM_OPTIONS_TABLE = process.env.NOCODB_FILM_OPTIONS_TABLE || "film_options";
const NOCODB_INSTALL_CENTERS_TABLE = process.env.NOCODB_INSTALL_CENTERS_TABLE || "install_centers";
const NOCODB_ADMIN_USERS_TABLE = process.env.NOCODB_ADMIN_USERS_TABLE || "admin_users";
const NOCODB_VEHICLE_MODELS_TABLE = process.env.NOCODB_VEHICLE_MODELS_TABLE || "vehicle_models";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME || "Admin";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".mp4": "video/mp4"
};

const brands = [
  {
    id: "glassify",
    name: "Glassify",
    tagline: "World Class Films",
    category: "Window film warranty",
    warrantyLabel: "3 years to lifetime by film tier",
    accent: "#00B4FF",
    dark: "#0A0A0F",
    logo: "/brand-assets/Glassify/glassify_logo_website.svg",
    hero: "/brand-assets/Glassify/website-light/images/hero-car.png",
    products: [
      { name: "CC-60 // BLACKOUT", variant: "BLACKOUT", years: 3 },
      { name: "CR-80 // SPECTRE", variant: "SPECTRE", years: 5 },
      { name: "CS-95 // SENTINEL", variant: "SENTINEL", years: 7 },
      { name: "CX-95 // PHANTOM", variant: "PHANTOM", years: 99 }
    ],
    fields: ["filmPosition", "vehicle"]
  },
  {
    id: "idash",
    name: "iDash",
    tagline: "Pro. Beyond Performance.",
    category: "Android head unit warranty",
    warrantyLabel: "1 year standard coverage",
    accent: "#2DD4BF",
    dark: "#0A0A0F",
    logo: "/brand-assets/iDash/idash-static-site/img/main%20logo.png",
    hero: "/brand-assets/iDash/i-dash%20website/hero-product.png",
    products: [
      { name: "iDash Ultra", variant: "Ultra", years: 1 },
      { name: "iDash Pro Max", variant: "Pro Max", years: 1 },
      { name: "iDash Pro", variant: "Pro", years: 1 },
      { name: "iDash Core", variant: "Core", years: 1 },
      { name: "iDash Eco", variant: "Eco", years: 1 }
    ],
    fields: ["deviceSerial", "vehicle"]
  },
  {
    id: "kensho",
    name: "KENSHO Beam",
    tagline: "Light Revealed.",
    category: "LED headlight warranty",
    warrantyLabel: "1 to 3 years by series",
    accent: "#0EA5E9",
    dark: "#050508",
    logo: "/brand-assets/KENSHO%20Beam/website/img/logo.svg",
    hero: "/brand-assets/KENSHO%20Beam/website/img/hero-bg.png",
    products: [
      { name: "LX-40 LumiSync", variant: "LumiSync", years: 2 },
      { name: "LX-30 HyperBeam", variant: "HyperBeam", years: 2 },
      { name: "LX-20 TurboFlux", variant: "TurboFlux", years: 2 },
      { name: "LX-15 PureLite", variant: "PureLite", years: 2 }
    ],
    fields: ["socket", "vehicle"]
  }
];

const DEFAULT_VEHICLE_MODELS = [
  ["Toyota", "86", "Alphard", "Altis", "Avanza", "bZ4X", "Camry", "C-HR", "Commuter", "Corolla", "Corolla Cross", "Fortuner", "GR86", "Hiace", "Hilux Revo", "Innova", "Land Cruiser", "Majesty", "Prius", "RAV4", "Sienta", "Veloz", "Vios", "Yaris", "Yaris Ativ"],
  ["Honda", "Accord", "BR-V", "City", "Civic", "CR-V", "CR-Z", "Freed", "HR-V", "Jazz", "Mobilio", "Odyssey", "WR-V"],
  ["Isuzu", "D-Max", "MU-7", "MU-X", "V-Cross"],
  ["Mitsubishi", "Attrage", "Mirage", "Outlander PHEV", "Pajero Sport", "Triton", "Xpander", "Xpander Cross"],
  ["Nissan", "Almera", "Cube", "Frontier", "GT-R", "Juke", "Kicks", "Leaf", "March", "Navara", "Note", "Sylphy", "Teana", "Terra", "Urvan", "X-Trail"],
  ["Mazda", "2", "3", "6", "BT-50", "CX-3", "CX-30", "CX-5", "CX-8", "CX-9", "MX-5"],
  ["Ford", "EcoSport", "Everest", "Fiesta", "Focus", "Mustang", "Ranger", "Raptor", "Territory"],
  ["Chevrolet", "Captiva", "Colorado", "Cruze", "Optra", "Sonic", "Spin", "Trailblazer", "Zafira"],
  ["MG", "3", "4 Electric", "5", "EP", "ES", "Extender", "HS", "Maxus 9", "VS", "ZS", "ZS EV"],
  ["BYD", "Atto 3", "Dolphin", "M6", "Seal", "Sealion 6", "Sealion 7"],
  ["GWM", "Haval H6", "Haval Jolion", "Ora 07", "Ora Good Cat", "Tank 300", "Tank 500"],
  ["Neta", "Aya", "V", "X"],
  ["Tesla", "Model 3", "Model S", "Model X", "Model Y"],
  ["BMW", "1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "i4", "i5", "i7", "iX", "iX1", "iX3", "X1", "X3", "X4", "X5", "X6", "X7", "Z4"],
  ["Mercedes-Benz", "A-Class", "C-Class", "CLA", "CLS", "E-Class", "EQA", "EQB", "EQC", "EQE", "EQS", "G-Class", "GLA", "GLB", "GLC", "GLE", "GLS", "S-Class", "V-Class"],
  ["Audi", "A1", "A3", "A4", "A5", "A6", "A7", "A8", "e-tron", "Q2", "Q3", "Q5", "Q7", "Q8", "R8", "TT"],
  ["Volkswagen", "Beetle", "Caravelle", "Golf", "Passat", "Scirocco", "Tiguan", "Touareg", "Transporter"],
  ["Volvo", "C40", "EX30", "EX90", "S60", "S90", "V40", "V60", "XC40", "XC60", "XC90"],
  ["Subaru", "BRZ", "Crosstrek", "Forester", "Impreza", "Levorg", "Outback", "WRX", "XV"],
  ["Suzuki", "APV", "Carry", "Celerio", "Ciaz", "Ertiga", "Jimny", "Swift", "Vitara"],
  ["Hyundai", "Creta", "Elantra", "H-1", "Ioniq 5", "Ioniq 6", "Kona", "Palisade", "Santa Fe", "Staria", "Tucson"],
  ["Kia", "Carnival", "EV5", "EV6", "EV9", "Grand Carnival", "Seltos", "Sorento", "Soul", "Sportage"],
  ["Lexus", "ES", "GS", "GX", "IS", "LC", "LM", "LS", "LX", "NX", "RX", "UX"],
  ["Porsche", "718 Boxster", "718 Cayman", "911", "Cayenne", "Macan", "Panamera", "Taycan"],
  ["Peugeot", "2008", "3008", "408", "5008"],
  ["MINI", "Clubman", "Convertible", "Cooper", "Countryman", "Electric", "Hatch"],
  ["Jeep", "Cherokee", "Compass", "Gladiator", "Grand Cherokee", "Renegade", "Wrangler"],
  ["Land Rover", "Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"],
  ["Proton", "Exora", "Persona", "Saga", "X50", "X70"],
  ["Haval", "H6", "Jolion"]
].flatMap(([make, ...models], makeIndex) => models.map((model, modelIndex) => ({
  Id: `${make.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${modelIndex}`,
  make,
  model,
  active: true,
  sortOrder: makeIndex * 100 + modelIndex,
  notes: "Local seed from public vehicle catalog"
})));

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    if (url.pathname.startsWith("/brand-assets/")) {
      await serveStatic(req, res, BRAND_ASSETS_DIR, decodeURIComponent(url.pathname.replace("/brand-assets/", "")));
      return;
    }

    if (["/", "/glassify", "/idash", "/kensho", "/admin", "/v", "/register", "/details"].includes(url.pathname)) {
      await serveStatic(req, res, PUBLIC_DIR, "app.html");
      return;
    }

    const requested = decodeURIComponent(url.pathname.slice(1));
    await serveStatic(req, res, PUBLIC_DIR, requested);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Siri Pattana Warranty running at http://localhost:${PORT}`);
  console.log(NOCODB_URL && NOCODB_TOKEN ? "NocoDB mode enabled" : "Local JSON fallback mode enabled");
});

async function handleApi(req, res, url) {
  if (url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      storage: NOCODB_URL && NOCODB_TOKEN ? "nocodb" : "local",
      table: NOCODB_TABLE,
      catalog: {
        products: NOCODB_PRODUCTS_TABLE,
        filmOptions: NOCODB_FILM_OPTIONS_TABLE,
        installCenters: NOCODB_INSTALL_CENTERS_TABLE,
        adminUsers: NOCODB_ADMIN_USERS_TABLE,
        vehicleModels: NOCODB_VEHICLE_MODELS_TABLE
      }
    });
    return;
  }

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readJson(req);
    const user = await findAdminUser(clean(body.username));
    if (!user || !user.active || user.password !== clean(body.password)) {
      sendJson(res, 401, { error: "Invalid admin login" });
      return;
    }
    const session = {
      username: user.username,
      displayName: user.displayName || user.username,
      role: user.role || "Admin"
    };
    sendJson(res, 200, { ok: true, token: signSession(session), user: session });
    return;
  }

  if (url.pathname === "/api/auth/session" && req.method === "GET") {
    const session = getSession(req);
    if (!session) {
      sendJson(res, 401, { error: "Not signed in" });
      return;
    }
    sendJson(res, 200, { ok: true, user: session });
    return;
  }

  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/brands") {
    sendJson(res, 200, { brands: await brandsWithCatalog() });
    return;
  }

  if (url.pathname === "/api/catalog/summary" && req.method === "GET") {
    const all = url.searchParams.get("all") === "1";
    if (all && !requireAdmin(req, res)) return;
    sendJson(res, 200, await catalogSummary({ activeOnly: !all }));
    return;
  }

  const catalogMatch = url.pathname.match(/^\/api\/catalog\/(products|film-options|install-centers|vehicle-models)(?:\/([^/]+))?$/);
  if (catalogMatch) {
    const type = catalogMatch[1];
    const id = catalogMatch[2] ? decodeURIComponent(catalogMatch[2]) : "";
    if (req.method !== "GET" && !requireAdmin(req, res)) return;
    if (req.method === "GET") {
      const all = url.searchParams.get("all") === "1";
      if (all && !requireAdmin(req, res)) return;
      const activeOnly = !all;
      const brandId = url.searchParams.get("brandId") || "";
      const records = await listCatalog(type, { activeOnly, brandId });
      sendJson(res, 200, { records });
      return;
    }
    if (req.method === "POST") {
      const created = await createCatalog(type, await readJson(req));
      sendJson(res, 201, { record: created });
      return;
    }
    if (req.method === "PATCH" && id) {
      const updated = await updateCatalog(type, id, await readJson(req));
      sendJson(res, 200, { record: updated });
      return;
    }
    if (req.method === "DELETE" && id) {
      await deleteCatalog(type, id);
      sendJson(res, 200, { ok: true });
      return;
    }
  }

  if (url.pathname === "/api/warranties" && req.method === "GET") {
    if (!requireAdmin(req, res)) return;
    const q = url.searchParams.get("q") || "";
    const brandId = url.searchParams.get("brandId") || "";
    const records = await listWarranties({
      q,
      brandId,
      limit: Number(url.searchParams.get("limit") || 100)
    });
    sendJson(res, 200, { records });
    return;
  }

  if (url.pathname === "/api/warranty-cards/generate" && req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    const payload = await readJson(req);
    const batchSize = Math.min(Math.max(Number(payload.batchSize || 1), 1), 200);
    const catalogBrands = await brandsWithCatalog();
    const brand = catalogBrands.find((item) => item.id === payload.brandId) || catalogBrands[0];
    const product = brand.products.find((item) => item.name === payload.product || item.variant === payload.variant);
    if (brand.id !== "glassify" && !payload.product) {
      sendJson(res, 400, { error: `${brand.name} cards need a product before printing.` });
      return;
    }
    if (brand.id !== "glassify" && !product) {
      sendJson(res, 400, { error: "Selected product is not available in the catalog." });
      return;
    }
    const baseUrl = clean(payload.baseUrl) || `${url.protocol}//${url.host}`;
    const created = [];

    for (let index = 0; index < batchSize; index += 1) {
      const uniqueId = crypto.randomBytes(13).toString("hex");
      const record = normalizeWarranty({
        uniqueId,
        serial: generateSerial(brand.id),
        brandId: brand.id,
        product: brand.id === "glassify" ? "" : product.name,
        variant: brand.id === "glassify" ? "" : product.variant,
        warrantyYears: brand.id === "glassify" ? 0 : product.years,
        status: "pending",
        installDate: "",
        expiryDate: "",
        scanUrl: `${baseUrl.replace(/\/+$/, "")}/v?id=${encodeURIComponent(uniqueId)}`,
        notes: clean(payload.notes),
        extra: {
          printed: payload.printed === true || payload.printed === "true" || payload.printed === "on",
          printBatchNote: clean(payload.notes)
        }
      });
      const saved = await createWarranty(record);
      created.push({
        ...saved,
        scanUrl: record.scanUrl
      });
    }

    sendJson(res, 201, { records: created });
    return;
  }

  const warrantyMatch = url.pathname.match(/^\/api\/warranties\/([^/]+)$/);
  if (warrantyMatch && req.method === "GET") {
    const record = await findWarrantyByUniqueId(decodeURIComponent(warrantyMatch[1]));
    if (!record) {
      sendJson(res, 404, { error: "Warranty card not found" });
      return;
    }
    sendJson(res, 200, { record });
    return;
  }

  if (warrantyMatch && req.method === "PATCH") {
    const payload = await readJson(req);
    const uniqueId = decodeURIComponent(warrantyMatch[1]);
    const existing = await findWarrantyByUniqueId(uniqueId);
    const isAdmin = getSession(req)?.role === "Admin";
    if (!existing) {
      sendJson(res, 404, { error: "Warranty card not found" });
      return;
    }
    if (isAdmin && payload.adminUpdate) {
      const updated = await updateWarranty(uniqueId, normalizeWarranty({
        ...existing,
        ...payload,
        extra: {
          ...(existing.extra || {}),
          ...(payload.extra || {})
        },
        uniqueId,
        serial: existing.serial,
        status: clean(payload.status) || existing.status,
        createdAt: existing.createdAt
      }));
      sendJson(res, 200, { record: updated });
      return;
    }
    if (existing.status === "registered") {
      sendJson(res, 409, { error: "Warranty card is already registered", record: existing });
      return;
    }
    payload.phone = digitsOnly(payload.phone);
    payload.installDate = localToday();
    payload.expiryDate = "";
    if (payload.phone.length < 8) {
      sendJson(res, 400, { error: "Phone number must contain numbers only." });
      return;
    }
    const updated = await updateWarranty(uniqueId, normalizeWarranty({
      ...existing,
      ...payload,
      extra: {
        ...(existing.extra || {}),
        ...(payload.extra || {})
      },
      uniqueId,
      serial: existing.serial,
      status: "registered",
      createdAt: existing.createdAt
    }));
    sendJson(res, 200, { record: updated });
    return;
  }

  if (warrantyMatch && req.method === "DELETE") {
    if (!requireAdmin(req, res)) return;
    const uniqueId = decodeURIComponent(warrantyMatch[1]);
    const existing = await findWarrantyByUniqueId(uniqueId);
    if (!existing) {
      sendJson(res, 404, { error: "Warranty card not found" });
      return;
    }
    await deleteWarranty(uniqueId);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/warranties" && req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    const payload = await readJson(req);
    const record = normalizeWarranty(payload);
    const created = await createWarranty(record);
    sendJson(res, 201, { record: created });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

async function serveStatic(req, res, baseDir, requestedPath) {
  const safeTarget = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(baseDir, safeTarget);
  const resolvedBase = path.resolve(baseDir);
  const resolvedFile = path.resolve(filePath);

  if (!resolvedFile.startsWith(resolvedBase)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(resolvedFile);
    const finalPath = stat.isDirectory() ? path.join(resolvedFile, "index.html") : resolvedFile;
    const fileStat = await fs.stat(finalPath);
    const ext = path.extname(finalPath).toLowerCase();
    const noCache = [".html", ".js", ".css"].includes(ext);
    const headers = {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": noCache ? "no-cache" : "public, max-age=3600",
      "Content-Length": fileStat.size
    };

    if (ext === ".mp4") {
      headers["Accept-Ranges"] = "bytes";
      const range = req.headers.range;
      if (range) {
        const match = range.match(/^bytes=(\d*)-(\d*)$/);
        const start = match?.[1] ? Number(match[1]) : 0;
        const end = match?.[2] ? Number(match[2]) : fileStat.size - 1;
        if (!match || start > end || start >= fileStat.size || end >= fileStat.size) {
          res.writeHead(416, { "Content-Range": `bytes */${fileStat.size}` });
          res.end();
          return;
        }
        res.writeHead(206, {
          ...headers,
          "Content-Length": end - start + 1,
          "Content-Range": `bytes ${start}-${end}/${fileStat.size}`
        });
        if (req.method === "HEAD") return res.end();
        fsStream.createReadStream(finalPath, { start, end }).pipe(res);
        return;
      }
    }

    res.writeHead(200, headers);
    if (req.method === "HEAD") return res.end();
    fsStream.createReadStream(finalPath).pipe(res);
  } catch {
    sendText(res, 404, "Not found");
  }
}

function normalizeWarranty(input) {
  const brand = brands.find((item) => item.id === input.brandId) || brands[0];
  const product = brand.products.find((item) => item.name === input.product || item.variant === input.variant) || brand.products[0];
  const installDate = input.installDate !== undefined ? clean(input.installDate) : new Date().toISOString().slice(0, 10);
  const warrantyYears = Number(input.warrantyYears || product.years || 1);
  const allowBlankProduct = brand.id === "glassify" && clean(input.status) === "pending";

  return {
    uniqueId: clean(input.uniqueId),
    serial: clean(input.serial) || generateSerial(brand.id),
    brandId: brand.id,
    brandName: brand.name,
    product: allowBlankProduct ? "" : clean(input.product || product.name),
    variant: allowBlankProduct ? "" : clean(input.variant || product.variant),
    warrantyYears: allowBlankProduct ? 0 : warrantyYears,
    customerName: clean(input.customerName),
    phone: digitsOnly(input.phone),
    email: clean(input.email),
    vehicleBrand: clean(input.vehicleBrand),
    vehicleModel: clean(input.vehicleModel),
    plateNo: clean(input.plateNo),
    province: clean(input.province),
    chassisNo: clean(input.chassisNo),
    installCenter: clean(input.installCenter),
    installDate,
    expiryDate: input.expiryDate || (installDate ? addYears(installDate, warrantyYears) : ""),
    status: clean(input.status) || "registered",
    notes: clean(input.notes),
    extra: input.extra && typeof input.extra === "object" ? input.extra : {},
    scanUrl: clean(input.scanUrl),
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function createWarranty(record) {
  if (NOCODB_URL && NOCODB_TOKEN) {
    const created = await nocodbRequest("", {
      method: "POST",
      body: JSON.stringify(toNocoRecord(record))
    });
    return fromNocoRecord({ ...record, ...created });
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  const existing = await readLocalRecords();
  const localRecord = { id: crypto.randomUUID(), ...record };
  existing.unshift(localRecord);
  await fs.writeFile(LOCAL_DB, JSON.stringify(existing, null, 2), "utf8");
  return localRecord;
}

async function updateWarranty(uniqueId, nextRecord) {
  if (NOCODB_URL && NOCODB_TOKEN) {
    const existing = await findWarrantyByUniqueId(uniqueId);
    const recordId = existing?.Id || existing?.id;
    if (!recordId) throw new Error("NocoDB record id missing");
    const updated = await nocodbRequest("", {
      method: "PATCH",
      body: JSON.stringify({ Id: recordId, ...toNocoRecord(nextRecord) })
    });
    return fromNocoRecord({ ...nextRecord, ...updated, Id: recordId });
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  const records = await readLocalRecords();
  const index = records.findIndex((record) => record.uniqueId === uniqueId);
  if (index < 0) return null;
  records[index] = { ...records[index], ...nextRecord, id: records[index].id, updatedAt: new Date().toISOString() };
  await fs.writeFile(LOCAL_DB, JSON.stringify(records, null, 2), "utf8");
  return records[index];
}

async function deleteWarranty(uniqueId) {
  if (NOCODB_URL && NOCODB_TOKEN) {
    const existing = await findWarrantyByUniqueId(uniqueId);
    const recordId = existing?.Id || existing?.id;
    if (!recordId) throw new Error("NocoDB record id missing");
    await nocodbRequest("", {
      method: "DELETE",
      body: JSON.stringify({ Id: recordId })
    });
    return true;
  }

  const records = await readLocalRecords();
  const next = records.filter((record) => record.uniqueId !== uniqueId);
  await fs.writeFile(LOCAL_DB, JSON.stringify(next, null, 2), "utf8");
  return true;
}

async function findWarrantyByUniqueId(uniqueId) {
  const records = await listWarranties({ q: uniqueId, brandId: "", limit: 500 });
  return records.find((record) => record.uniqueId === uniqueId || record.serial === uniqueId) || null;
}

async function listWarranties({ q, brandId, limit }) {
  const normalizedQ = q.trim().toLowerCase();
  let records;

  if (NOCODB_URL && NOCODB_TOKEN) {
    const params = new URLSearchParams({ limit: String(Math.max(limit, 200)) });
    const response = await nocodbRequest(`?${params}`);
    records = Array.isArray(response) ? response : response.list || response.records || [];
  } else {
    records = await readLocalRecords();
  }

  return records
    .map((record) => fromNocoRecord(record.fields || record))
    .filter((record) => !brandId || record.brandId === brandId)
    .filter((record) => {
      if (!normalizedQ) return true;
      return [
        record.serial,
        record.uniqueId,
        record.customerName,
        record.phone,
        record.plateNo,
        record.chassisNo,
        record.product,
        record.installCenter
      ].some((value) => String(value || "").toLowerCase().includes(normalizedQ));
    })
    .slice(0, limit);
}

async function brandsWithCatalog() {
  const products = await listCatalog("products", { activeOnly: true, brandId: "" }).catch(() => []);
  return brands.map((brand) => {
    if (brand.id === "glassify") return brand;
    const catalogProducts = products
      .filter((product) => product.brandId === brand.id)
      .sort(sortByOrder);
    return {
      ...brand,
      products: catalogProducts.length ? catalogProducts.map((product) => ({
        id: product.Id || product.id,
        name: product.name,
        variant: product.variant || product.name,
        years: Number(product.warrantyYears || 1),
        category: product.category || brand.category
      })) : brand.products
    };
  });
}

async function catalogSummary({ activeOnly = true } = {}) {
  const [products, filmOptions, installCenters, vehicleModels] = await Promise.all([
    listCatalog("products", { activeOnly, brandId: "" }),
    listCatalog("film-options", { activeOnly, brandId: "" }),
    listCatalog("install-centers", { activeOnly, brandId: "" }),
    listCatalog("vehicle-models", { activeOnly, brandId: "" })
  ]);
  return { products, filmOptions, installCenters, vehicleModels };
}

async function listCatalog(type, { activeOnly = true, brandId = "" } = {}) {
  const table = catalogTable(type);
  if (!NOCODB_URL || !NOCODB_TOKEN) return localCatalog(type, { activeOnly, brandId });
  let response;
  try {
    response = await nocodbTableRequest(table, "?limit=1000");
  } catch (error) {
    if (type === "vehicle-models") return localCatalog(type, { activeOnly, brandId });
    throw error;
  }
  const list = Array.isArray(response) ? response : response.list || response.records || [];
  return list
    .map((record) => fromNocoRecord(record.fields || record))
    .map(normalizeCatalogRecord)
    .filter((record) => !activeOnly || record.active)
    .filter((record) => !brandId || record.brandId === brandId)
    .sort(sortByOrder);
}

async function createCatalog(type, payload) {
  const record = normalizeCatalogInput(type, payload);
  if (!NOCODB_URL || !NOCODB_TOKEN) throw new Error("Catalog CRUD requires NocoDB mode");
  const created = await nocodbTableRequest(catalogTable(type), "", {
    method: "POST",
    body: JSON.stringify(record)
  });
  return normalizeCatalogRecord({ ...record, ...created });
}

async function updateCatalog(type, id, payload) {
  if (!NOCODB_URL || !NOCODB_TOKEN) throw new Error("Catalog CRUD requires NocoDB mode");
  const record = normalizeCatalogInput(type, payload);
  const updated = await nocodbTableRequest(catalogTable(type), "", {
    method: "PATCH",
    body: JSON.stringify({ Id: Number(id), ...record })
  });
  return normalizeCatalogRecord({ ...record, ...updated, Id: Number(id) });
}

async function deleteCatalog(type, id) {
  if (!NOCODB_URL || !NOCODB_TOKEN) throw new Error("Catalog CRUD requires NocoDB mode");
  await nocodbTableRequest(catalogTable(type), "", {
    method: "DELETE",
    body: JSON.stringify({ Id: Number(id) })
  });
}

function catalogTable(type) {
  return {
    products: NOCODB_PRODUCTS_TABLE,
    "film-options": NOCODB_FILM_OPTIONS_TABLE,
    "install-centers": NOCODB_INSTALL_CENTERS_TABLE,
    "admin-users": NOCODB_ADMIN_USERS_TABLE,
    "vehicle-models": NOCODB_VEHICLE_MODELS_TABLE
  }[type];
}

function normalizeCatalogInput(type, input) {
  if (type === "products") {
    return {
      brandId: clean(input.brandId),
      brandName: clean(input.brandName),
      name: clean(input.name),
      variant: clean(input.variant),
      warrantyYears: Number(input.warrantyYears || 1),
      category: clean(input.category),
      active: input.active !== false && input.active !== "false",
      sortOrder: Number(input.sortOrder || 0),
      notes: clean(input.notes)
    };
  }
  if (type === "film-options") {
    return {
      brandId: clean(input.brandId || "glassify"),
      series: clean(input.series).toUpperCase(),
      filmName: clean(input.filmName),
      warrantyYears: Number(input.warrantyYears || 7),
      active: input.active !== false && input.active !== "false",
      sortOrder: Number(input.sortOrder || 0),
      notes: clean(input.notes)
    };
  }
  if (type === "vehicle-models") {
    return {
      make: clean(input.make),
      model: clean(input.model),
      active: input.active !== false && input.active !== "false",
      sortOrder: Number(input.sortOrder || 0),
      notes: clean(input.notes)
    };
  }
  return {
    name: clean(input.name),
    location: clean(input.location),
    phone: clean(input.phone),
    active: input.active !== false && input.active !== "false",
    sortOrder: Number(input.sortOrder || 0),
    notes: clean(input.notes)
  };
}

function normalizeCatalogRecord(record) {
  const copy = { ...record };
  copy.active = copy.active === true || copy.active === 1 || copy.active === "true";
  copy.sortOrder = Number(copy.sortOrder || 0);
  copy.warrantyYears = copy.warrantyYears === undefined || copy.warrantyYears === "" ? "" : Number(copy.warrantyYears);
  return copy;
}

function localCatalog(type, { activeOnly, brandId }) {
  if (type === "products") {
    return brands.flatMap((brand) => brand.products.map((product, index) => ({
      Id: `${brand.id}-${index}`,
      brandId: brand.id,
      brandName: brand.name,
      name: product.name,
      variant: product.variant,
      warrantyYears: product.years,
      category: brand.category,
      active: true,
      sortOrder: (index + 1) * 10,
      notes: ""
    }))).filter((record) => (!activeOnly || record.active) && (!brandId || record.brandId === brandId));
  }
  if (type === "film-options") return [];
  if (type === "vehicle-models") return DEFAULT_VEHICLE_MODELS.filter((record) => !activeOnly || record.active);
  return [];
}

function sortByOrder(a, b) {
  return Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.name || a.filmName || "").localeCompare(String(b.name || b.filmName || ""));
}

function toNocoRecord(record) {
  const copy = { ...record };
  delete copy.id;
  delete copy.Id;
  delete copy.CreatedAt;
  delete copy.UpdatedAt;
  delete copy.createdAt;
  delete copy.updatedAt;
  if (copy.extra && typeof copy.extra === "object") {
    copy.extra = JSON.stringify(copy.extra);
  }
  for (const dateField of ["installDate", "expiryDate"]) {
    if (!copy[dateField]) delete copy[dateField];
  }
  return copy;
}

function fromNocoRecord(record) {
  const copy = { ...record };
  if (typeof copy.extra === "string") {
    try {
      copy.extra = copy.extra ? JSON.parse(copy.extra) : {};
    } catch {
      copy.extra = {};
    }
  }
  return copy;
}

async function findAdminUser(username) {
  if (!username) return null;
  if (NOCODB_URL && NOCODB_TOKEN) {
    try {
      const response = await nocodbTableRequest(NOCODB_ADMIN_USERS_TABLE, "?limit=1000");
      const users = (response.list || response.records || response || []).map((record) => fromNocoRecord(record.fields || record));
      const user = users.find((item) => String(item.username || "").toLowerCase() === username.toLowerCase());
      if (user) {
        return {
          ...user,
          active: user.active === true || user.active === 1 || user.active === "true"
        };
      }
    } catch (error) {
      console.warn(`AdminUsers lookup failed, falling back to .env admin if configured: ${error.message}`);
    }
  }

  if (ADMIN_USERNAME && ADMIN_PASSWORD && username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
    return {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      displayName: ADMIN_DISPLAY_NAME,
      role: "Admin",
      active: true
    };
  }

  return null;
}

function requireAdmin(req, res) {
  const session = getSession(req);
  if (session?.role === "Admin") return true;
  sendJson(res, 401, { error: "Admin login required" });
  return false;
}

function getSession(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  return verifySession(token);
}

function signSession(user) {
  const payload = base64Url(JSON.stringify({
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 12
  }));
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifySession(token) {
  const [payload, signature] = String(token).split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || data.exp < Date.now()) return null;
    return { username: data.username, displayName: data.displayName, role: data.role };
  } catch {
    return null;
  }
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function readLocalRecords() {
  try {
    const raw = await fs.readFile(LOCAL_DB, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function nocodbRequest(query = "", init = {}) {
  return nocodbTableRequest(NOCODB_TABLE, query, init);
}

async function nocodbTableRequest(tableId, query = "", init = {}) {
  const url = `${NOCODB_URL}/api/v2/tables/${encodeURIComponent(tableId)}/records${query}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "xc-token": NOCODB_TOKEN,
      ...(init.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`NocoDB ${response.status}: ${text}`);
  }

  return data;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function addYears(dateString, years) {
  const match = String(dateString || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const year = Number(match[1]) + Number(years || 0);
  return `${year}-${match[2]}-${match[3]}`;
}

function generateSerial(brandId) {
  const prefix = {
    glassify: "GLS",
    idash: "IDS",
    kensho: "KSB"
  }[brandId] || "SPW";
  const random = crypto.randomInt(0, 36 ** 5).toString(36).toUpperCase().padStart(5, "0");
  return `${prefix}-${random}`;
}

function clean(value) {
  return String(value || "").trim();
}

function digitsOnly(value) {
  return clean(value).replace(/\D/g, "");
}

function localToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function trimSlash(value) {
  return value.replace(/\/+$/, "");
}

function loadDotEnv(filePath) {
  try {
    const raw = fsStream.readFileSync(filePath, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
      if (!match) return;
      const key = match[1].trim();
      if (process.env[key] === undefined) process.env[key] = match[2];
    });
  } catch {
    // .env is optional; Docker and production can provide real environment variables.
  }
}
