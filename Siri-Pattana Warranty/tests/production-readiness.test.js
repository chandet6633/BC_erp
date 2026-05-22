const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PORT = 3400 + Math.floor(Math.random() * 1000);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DATA_DIR = path.join(os.tmpdir(), `siri-pattana-warranty-test-${Date.now()}-${PORT}`);
const ADMIN = { username: "admin", password: "test-admin-password" };

let server;

test.before(async () => {
  server = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR,
      NOCODB_URL: "",
      NOCODB_TOKEN: "",
      SESSION_SECRET: "test-session-secret",
      ADMIN_USERNAME: ADMIN.username,
      ADMIN_PASSWORD: ADMIN.password,
      ADMIN_DISPLAY_NAME: "Test Admin"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  server.stdout.on("data", () => {});
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await waitForServer();
});

test.after(async () => {
  if (server) {
    server.kill();
    await new Promise((resolve) => server.once("exit", resolve));
  }
  await fs.rm(DATA_DIR, { recursive: true, force: true });
});

test("production warranty workflow is protected, registerable, printable, and deletable", async () => {
  const appResponse = await fetch(`${BASE_URL}/`);
  assert.equal(appResponse.status, 200);
  assert.match(await appResponse.text(), /app\.js/);

  const scriptResponse = await fetch(`${BASE_URL}/app.js`);
  assert.equal(scriptResponse.headers.get("cache-control"), "no-cache");
  assert.match(await scriptResponse.text(), /dashboard-grid/);

  assert.equal((await fetch(`${BASE_URL}/api/warranties`)).status, 401);
  assert.equal((await fetch(`${BASE_URL}/api/warranties`, { method: "POST", body: "{}" })).status, 401);

  const badLogin = await postJson("/api/auth/login", { username: "admin", password: "wrong" });
  assert.equal(badLogin.status, 401);

  const login = await postJson("/api/auth/login", ADMIN);
  assert.equal(login.status, 200);
  const { token, user } = await login.json();
  assert.equal(user.role, "Admin");
  const auth = { Authorization: `Bearer ${token}` };

  const brands = await getJson("/api/brands");
  const idash = brands.brands.find((brand) => brand.id === "idash");
  const kensho = brands.brands.find((brand) => brand.id === "kensho");
  assert.ok(idash.products.length > 0);
  assert.ok(kensho.products.length > 0);

  const generated = await postJson("/api/warranty-cards/generate", {
    brandId: "idash",
    product: idash.products[0].name,
    batchSize: 1,
    baseUrl: BASE_URL,
    notes: "test batch"
  }, auth);
  assert.equal(generated.status, 201);
  const idashCard = (await generated.json()).records[0];
  assert.match(idashCard.serial, /^IDS-[A-Z0-9]{5}$/);
  assert.equal(idashCard.status, "pending");
  assert.equal(idashCard.warrantyYears, 1);
  assert.equal(idashCard.extra.printed, false);
  assert.match(idashCard.scanUrl, new RegExp(`^${escapeRegExp(BASE_URL)}/v\\?id=`));

  const printed = await patchJson(`/api/warranties/${idashCard.uniqueId}`, {
    adminUpdate: true,
    status: "pending",
    extra: { printed: true }
  }, auth);
  assert.equal(printed.status, 200);
  assert.equal((await printed.json()).record.extra.printed, true);

  const registered = await patchJson(`/api/warranties/${idashCard.uniqueId}`, {
    product: idash.products[0].name,
    customerName: "Production Test",
    phone: "0800000000",
    installCenter: "Siri Pattana HQ",
    installDate: "2026-05-18",
    vehicleBrand: "Toyota",
    vehicleModel: "Camry",
    plateNo: "TEST-1234",
    extra: { deviceSerial: "DUT-01", vehicleTemplate: "size-l" }
  });
  assert.equal(registered.status, 200);
  const registeredRecord = (await registered.json()).record;
  assert.equal(registeredRecord.status, "registered");
  assert.equal(registeredRecord.installDate, todayLocal());
  assert.equal(registeredRecord.expiryDate, addYears(todayLocal(), 1));
  assert.equal(registeredRecord.phone, "0800000000");

  const secondRegister = await patchJson(`/api/warranties/${idashCard.uniqueId}`, { customerName: "Duplicate" });
  assert.equal(secondRegister.status, 409);

  const list = await getJson(`/api/warranties?q=${encodeURIComponent(idashCard.serial)}&limit=10`, auth);
  assert.equal(list.records.length, 1);

  const deleted = await fetch(`${BASE_URL}/api/warranties/${idashCard.uniqueId}`, { method: "DELETE", headers: auth });
  assert.equal(deleted.status, 200);
  assert.equal((await fetch(`${BASE_URL}/api/warranties/${idashCard.uniqueId}`)).status, 404);

  const glassify = await postJson("/api/warranty-cards/generate", {
    brandId: "glassify",
    batchSize: 1,
    baseUrl: BASE_URL
  }, auth);
  assert.equal(glassify.status, 201);
  const glassifyCard = (await glassify.json()).records[0];
  assert.match(glassifyCard.serial, /^GLS-[A-Z0-9]{5}$/);
  assert.equal(glassifyCard.product, "");
  assert.equal(glassifyCard.warrantyYears, 0);
  await fetch(`${BASE_URL}/api/warranties/${glassifyCard.uniqueId}`, { method: "DELETE", headers: auth });

  const kenshoGenerated = await postJson("/api/warranty-cards/generate", {
    brandId: "kensho",
    product: kensho.products[0].name,
    batchSize: 1,
    baseUrl: BASE_URL,
    printed: true
  }, auth);
  assert.equal(kenshoGenerated.status, 201);
  const kenshoCard = (await kenshoGenerated.json()).records[0];
  assert.match(kenshoCard.serial, /^KSB-[A-Z0-9]{5}$/);
  assert.equal(kenshoCard.warrantyYears, 2);
  assert.equal(kenshoCard.extra.printed, true);
  await fetch(`${BASE_URL}/api/warranties/${kenshoCard.uniqueId}`, { method: "DELETE", headers: auth });
});

async function waitForServer() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("Server did not start in time");
}

async function getJson(pathname, headers = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, { headers });
  assert.equal(response.ok, true, `${pathname} returned ${response.status}`);
  return response.json();
}

function postJson(pathname, body, headers = {}) {
  return fetch(`${BASE_URL}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}

function patchJson(pathname, body, headers = {}) {
  return fetch(`${BASE_URL}${pathname}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function todayLocal() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addYears(dateString, years) {
  const [year, month, day] = dateString.split("-");
  return `${Number(year) + years}-${month}-${day}`;
}
