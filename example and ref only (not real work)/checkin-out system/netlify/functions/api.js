const https = require('https');

// --- Configuration ---
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const NOCODB_URL = requireEnv('NOCODB_URL');
const API_TOKEN = requireEnv('NOCODB_API_TOKEN');
const BASE_ID = requireEnv('NOCODB_BASE_ID');

const TELEGRAM_TOKEN = requireEnv('TELEGRAM_BOT_TOKEN');

const TELEGRAM_CHAT = {
  'บัญชาประดับยนต์ สามชุก': { chat_id: -1002506573395, thread_id: 9 },
  'บัญชาประดับยนต์ สามชุก_ห้องลางาน': { chat_id: -1002506573395, thread_id: 154 },
  'วิริยะเซอร์วิส': { chat_id: -1002581740311, thread_id: 2 },
  'วิริยะเซอร์วิส_ห้องลางาน': { chat_id: -1002581740311, thread_id: 81 },
  'ศูนย์รวมประกันภัย': { chat_id: -1002537760951, thread_id: 2 },
  'ศูนย์รวมประกันภัย_ห้องลางาน': { chat_id: -1002537760951, thread_id: 45 },
  'บัญชาประดับยนต์ เมือง': { chat_id: -1002570853976, thread_id: 6 },
  'บัญชาประดับยนต์ เมือง_ห้องลางาน': { chat_id: -1002570853976, thread_id: 95 },
  'testroom': { chat_id: -1002589539296, thread_id: 2 },
  'testroom_ห้องลางาน': { chat_id: -1002589539296, thread_id: 43 },
  'ตรอ วิริยะเซอร์วิส': { chat_id: -1002567913507, thread_id: 3 },
  'ตรอ วิริยะเซอร์วิส_ห้องลางาน': { chat_id: -1002567913507, thread_id: 40 }
};

const TELEGRAM_CONFIG_STATUS = 'telegram_config';
const TELEGRAM_LEAVE_SUFFIX = '_ห้องลางาน';

function parseOptionalInteger(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseTelegramConfigInfo(info) {
  try {
    return info ? JSON.parse(info) : {};
  } catch {
    return {};
  }
}

async function getTelegramChatConfigs(tableIds) {
  const configs = { ...TELEGRAM_CHAT };
  if (!tableIds['system_logs']) return configs;

  const query = `(Status,eq,${TELEGRAM_CONFIG_STATUS})`;
  const res = await makeRequest('GET', `/api/v2/tables/${tableIds['system_logs']}/records?limit=1000&sort=-Timestamp&where=${encodeURIComponent(query)}`);
  const rows = res.data && res.data.list ? res.data.list : [];
  const seen = new Set();

  rows.forEach(row => {
    const dept = row.Department;
    const chatId = parseOptionalInteger(row.ChatID);
    if (!dept || !chatId || seen.has(dept)) return;
    seen.add(dept);

    const info = parseTelegramConfigInfo(row.Info);
    const threadId = parseOptionalInteger(info.thread_id);
    const leaveThreadId = parseOptionalInteger(info.leave_thread_id);

    configs[dept] = { chat_id: chatId, thread_id: threadId };
    if (leaveThreadId !== undefined) {
      configs[`${dept}${TELEGRAM_LEAVE_SUFFIX}`] = { chat_id: chatId, thread_id: leaveThreadId };
    }
  });

  return configs;
}

function getDefaultTelegramConfigRows() {
  return Object.entries(TELEGRAM_CHAT)
    .filter(([department]) => {
      const deptLower = department.toLowerCase();
      return !deptLower.includes('test') && !department.endsWith(TELEGRAM_LEAVE_SUFFIX);
    })
    .map(([department, cfg]) => {
      const leaveCfg = TELEGRAM_CHAT[`${department}${TELEGRAM_LEAVE_SUFFIX}`] || {};
      return {
        Id: '',
        Department: department,
        ChatID: cfg.chat_id !== undefined ? String(cfg.chat_id) : '',
        ThreadID: cfg.thread_id !== undefined ? cfg.thread_id : '',
        LeaveThreadID: leaveCfg.thread_id !== undefined ? leaveCfg.thread_id : '',
        Source: 'default',
        IsDefault: true
      };
    });
}

// --- NocoDB Discovery Cache ---
let cachedTableIds = null;

// --- Helper: Native HTTPS Request ---
function makeRequest(method, urlPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlPath, NOCODB_URL);
    const bodyStr = body ? JSON.stringify(body) : null;
    
    const reqHeaders = {
      'xc-token': API_TOKEN,
      'Content-Type': 'application/json',
      ...headers
    };
    
    if (bodyStr) {
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const options = {
      method: method,
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      headers: reqHeaders
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

// --- Helper: Auto-Discover Table IDs ---
async function getTableIds() {
  if (cachedTableIds) return cachedTableIds;
  const res = await makeRequest('GET', `/api/v2/meta/bases/${BASE_ID}/tables`);
  if (res.status !== 200 || !res.data || !res.data.list) {
    throw new Error(`Failed to fetch table structure: ${JSON.stringify(res.data || res.raw)}`);
  }
  const mappings = {};
  res.data.list.forEach(t => {
    mappings[t.table_name] = t.id;
  });
  cachedTableIds = mappings;
  return mappings;
}

// --- Helper: Push to Telegram ---
function pushToTelegram(chatId, text, threadId) {
  if (!chatId || !TELEGRAM_TOKEN) return Promise.resolve();
  return new Promise((resolve) => {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    };
    if (threadId !== undefined && threadId !== null) {
      payload.message_thread_id = threadId;
    }
    const data = JSON.stringify(payload);

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      resolve();
    });
    req.on('error', () => resolve()); // Silent fail
    req.write(data);
    req.end();
  });
}

// --- Helper: System Logging ---
async function writeLog(tableIds, dept, chatId, status, info) {
  try {
    await makeRequest('POST', `/api/v2/tables/${tableIds['system_logs']}/records`, {
      Timestamp: formatICTTimestamp(),
      Department: dept || '',
      ChatID: String(chatId || ''),
      Status: status || '',
      Info: info || ''
    });
  } catch (e) {
    // Silent fail for logger
  }
}

// --- Helper: Date & Time in ICT (UTC+7) ---
const ICT_TIME_ZONE = 'Asia/Bangkok';

function getICTDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ICT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second
  };
}

function formatTimestampParts({ year, month, day, hour = '00', minute = '00', second = '00' }) {
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function formatICTTimestamp(date = new Date()) {
  return formatTimestampParts(getICTDateParts(date));
}

function getICTDate(date = new Date()) {
  const parts = getICTDateParts(date);
  return new Date(
    parseInt(parts.year, 10),
    parseInt(parts.month, 10) - 1,
    parseInt(parts.day, 10),
    parseInt(parts.hour, 10),
    parseInt(parts.minute, 10),
    parseInt(parts.second, 10)
  );
}

function normalizeDepartment(dept) {
  if (!dept) return '';
  let d = String(dept).trim();
  d = d.replace(/\uFFFD/g, '');
  // Map corrupted or duplicate variations to clean ones
  if (d.includes('บญชาประดับยนต์ สามชุก') || d.includes('บัญชาปะดับยนต์ สามชุก') || d.includes('บญชาปะดับยนต์ สามชุก') || d.includes('บัญชาประดับยนต์สามชุก')) {
    return 'บัญชาประดับยนต์ สามชุก';
  }
  d = d.replace(/บ\.ญชา/g, 'บัญชา');
  d = d.replace(/บญชา/g, 'บัญชา');
  d = d.replace(/ปะดับ/g, 'ประดับ');
  return d;
}

function normalizeTextValue(value) {
  let val = String(value || '');
  // Repair corrupted "ช่าง" (common encoding issue)
  val = val.replace(/ช่า\uFFFD+/g, 'ช่าง');
  val = val.replace(/ช่า\uFFFD*ฟ/g, 'ช่างฟ');
  val = val.replace(/ช่า\uFFFD*ส/g, 'ช่างส');
  // Strip any remaining replacement characters
  val = val.replace(/\uFFFD/g, '');
  return val
    .replace(/\u0E40\u0E40/g, '\u0E41')
    .trim()
    .normalize('NFC');
}

function hasReplacementCharacter(value) {
  return String(value || '').includes('\uFFFD');
}

function compactNameForMatch(value) {
  return normalizeTextValue(value)
    .replace(/\uFFFD/g, '')
    .replace(/[()\s]/g, '');
}

function getNameTokensForMatch(value) {
  return normalizeTextValue(value)
    .replace(/\uFFFD/g, '')
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 3);
}

function isSamePersonName(a, b) {
  const cleanA = normalizeTextValue(a);
  const cleanB = normalizeTextValue(b);
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  const compactA = compactNameForMatch(cleanA);
  const compactB = compactNameForMatch(cleanB);
  if (compactA && compactB && (compactA.includes(compactB) || compactB.includes(compactA))) {
    return true;
  }

  const tokensA = getNameTokensForMatch(cleanA);
  const tokensB = getNameTokensForMatch(cleanB);
  const matches = tokensA.filter(token => tokensB.includes(token));
  return matches.length >= 2 || matches.some(token => token.length >= 5);
}

function findCanonicalEmployee(employees, dept, name) {
  const targetDept = normalizeDepartment(dept);
  const targetName = normalizeTextValue(name);
  const sameDeptEmployees = hasReplacementCharacter(dept)
    ? employees
    : employees.filter(emp => normalizeDepartment(emp.Department) === targetDept);

  const exact = sameDeptEmployees.find(emp => normalizeTextValue(emp.Name) === targetName);
  if (exact) return exact;

  const fuzzyMatches = sameDeptEmployees.filter(emp => isSamePersonName(emp.Name, targetName));
  if (fuzzyMatches.length === 1) return fuzzyMatches[0];

  const compactTarget = compactNameForMatch(targetName);
  if (compactTarget.length >= 2) {
    const firstChar = compactTarget[0];
    const lastChar = compactTarget[compactTarget.length - 1];
    const edgeMatches = sameDeptEmployees.filter(emp => {
      const compactEmpName = compactNameForMatch(emp.Name);
      return compactEmpName &&
        compactEmpName[0] === firstChar &&
        compactEmpName[compactEmpName.length - 1] === lastChar &&
        Math.abs(compactEmpName.length - compactTarget.length) <= 4;
    });
    if (edgeMatches.length === 1) return edgeMatches[0];
  }

  return null;
}

function canonicalizeEmployeeRecord(emp) {
  return {
    ...emp,
    Name: normalizeTextValue(emp.Name),
    Department: normalizeDepartment(emp.Department)
  };
}

function canonicalizePeopleRows(rows, employees) {
  return rows.map(row => {
    const canonical = findCanonicalEmployee(employees, row.Department, row.Name);
    if (!canonical) {
      return {
        ...row,
        Name: normalizeTextValue(row.Name),
        Department: normalizeDepartment(row.Department)
      };
    }

    return {
      ...row,
      Name: normalizeTextValue(canonical.Name),
      Department: normalizeDepartment(canonical.Department)
    };
  });
}

async function findEmployeeByNameAndDept(tableIds, dept, name) {
  const res = await makeRequest('GET', `/api/v2/tables/${tableIds['employees']}/records?limit=1000`);
  const employees = (res.data && res.data.list ? res.data.list : []).map(canonicalizeEmployeeRecord);
  return findCanonicalEmployee(employees, dept, name);
}


function parseTimestampLocal(ts) {
  if (!ts) return new Date();
  const cleanTs = ts.substring(0, 19).replace(' ', 'T');
  return new Date(cleanTs);
}

function formatTime(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// --- Helper: Geolocation Distance ---
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (r) => (r * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.pow(Math.sin(dLat / 2), 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.pow(Math.sin(dLon / 2), 2);
  return 2 * 6371000 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Leaderboard Builder ---
async function buildLeaderboard(tableIds, dept, type) {
  const todayDateStr = formatDate(getICTDate());
  const empRes = await makeRequest('GET', `/api/v2/tables/${tableIds['employees']}/records?limit=1000`);
  const employees = (empRes.data && empRes.data.list ? empRes.data.list : []).map(canonicalizeEmployeeRecord);
  const query = `(Department,eq,${dept})~and(Type,eq,${type})`;
  const res = await makeRequest('GET', `/api/v2/tables/${tableIds['check_logs']}/records?limit=1000&where=${encodeURIComponent(query)}`);
  const allLogs = canonicalizePeopleRows(res.data && res.data.list ? res.data.list : [], employees);

  // Filter logs for today in ICT using robust string startsWith
  const todayLogs = allLogs.filter(log => {
    return log.Timestamp && log.Timestamp.startsWith(todayDateStr);
  }).sort((a, b) => parseTimestampLocal(a.Timestamp) - parseTimestampLocal(b.Timestamp));

  if (!todayLogs.length) {
    return type === 'IN' ? 'ยังไม่มีผู้เช็คอินวันนี้' : 'ยังไม่มีผู้เช็คเอาท์วันนี้';
  }

  const medals = ['🥇', '🥈', '🥉'];
  return todayLogs.map((r, i) => {
    const emoji = medals[i] || '🏅';
    const time = formatTime(parseTimestampLocal(r.Timestamp));
    return `${emoji} ${r.Name} (${time})`;
  }).join('\n');
}

// --- Department Stats ---
async function getDeptStats(tableIds, dept) {
  // Get employees
  const empQuery = `(Department,eq,${dept})`;
  const empRes = await makeRequest('GET', `/api/v2/tables/${tableIds['employees']}/records?limit=1000&where=${encodeURIComponent(empQuery)}`);
  const employees = (empRes.data && empRes.data.list ? empRes.data.list : []).map(canonicalizeEmployeeRecord);

  // Get check-ins today
  const todayDateStr = formatDate(getICTDate());
  const logQuery = `(Department,eq,${dept})~and(Type,eq,IN)`;
  const logRes = await makeRequest('GET', `/api/v2/tables/${tableIds['check_logs']}/records?limit=1000&where=${encodeURIComponent(logQuery)}`);
  const checkLogs = canonicalizePeopleRows(logRes.data && logRes.data.list ? logRes.data.list : [], employees);

  const todayCheckIns = checkLogs.filter(log => {
    return log.Timestamp && log.Timestamp.startsWith(todayDateStr);
  });

  const checkedInNames = todayCheckIns.map(log => log.Name);
  const notCheckedIn = employees.filter(emp => !checkedInNames.includes(emp.Name)).map(emp => emp.Name);

  let avgTime = null;
  if (todayCheckIns.length > 0) {
    const totalMinutes = todayCheckIns.reduce((sum, log) => {
      const d = parseTimestampLocal(log.Timestamp);
      return sum + d.getHours() * 60 + d.getMinutes();
    }, 0);
    const avgMinutes = Math.round(totalMinutes / todayCheckIns.length);
    const avgH = Math.floor(avgMinutes / 60);
    const avgM = avgMinutes % 60;
    avgTime = `${String(avgH).padStart(2, '0')}:${String(avgM).padStart(2, '0')}`;
  }

  // Late arrivals (after 8:00 AM)
  const lateArrivals = todayCheckIns.filter(log => {
    const d = parseTimestampLocal(log.Timestamp);
    return (d.getHours() * 60 + d.getMinutes()) > 480;
  }).map(log => {
    const d = parseTimestampLocal(log.Timestamp);
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${log.Name} (${timeStr})`;
  });

  return {
    total: employees.length,
    checkedIn: todayCheckIns.length,
    notCheckedIn,
    lateArrivals,
    avgTime
  };
}

// --- Dynamic Route Handler ---
exports.handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'OK' };
  }

  try {
    const tableIds = await getTableIds();
    const action = event.queryStringParameters.action || (event.body && JSON.parse(event.body).action);

    if (!action) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing action parameter' }) };
    }

    switch (action) {
      case 'getDepartments': {
        const res = await makeRequest('GET', `/api/v2/tables/${tableIds['employees']}/records?limit=1000`);
        const employees = (res.data && res.data.list ? res.data.list : []).map(canonicalizeEmployeeRecord);
        const departments = [...new Set(employees.map(e => normalizeDepartment(e.Department)).filter(d => d && !hasReplacementCharacter(d)))].sort();
        return { statusCode: 200, headers, body: JSON.stringify(departments) };
      }

      case 'getNamesByDept': {
        const dept = event.queryStringParameters.dept;
        const res = await makeRequest('GET', `/api/v2/tables/${tableIds['employees']}/records?limit=1000&where=${encodeURIComponent(`(Department,eq,${dept})`)}`);
        const employees = (res.data && res.data.list ? res.data.list : []).map(canonicalizeEmployeeRecord);
        const names = employees.map(e => normalizeTextValue(e.Name)).filter(Boolean);
        return { statusCode: 200, headers, body: JSON.stringify(names) };
      }

      case 'log': {
        const body = event.httpMethod === 'POST' ? JSON.parse(event.body) : event.queryStringParameters;
        let dept = normalizeDepartment(body.department);
        let name = normalizeTextValue(body.name);
        const type = body.type ? body.type.toUpperCase() : null;
        const isAdmin = body.isAdmin === 'true' || body.isAdmin === true;
        const lat = parseFloat(body.lat);
        const lon = parseFloat(body.lon);

        if (!dept || !name || !type) {
          return { statusCode: 400, headers, body: JSON.stringify({ status: 'fail', message: 'ข้อมูลไม่ครบถ้วน' }) };
        }

        if (hasReplacementCharacter(dept) || hasReplacementCharacter(name)) {
          await writeLog(tableIds, dept, '', 'reject_corrupt_text', `${name} / ${dept}`);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ status: 'fail', message: 'Employee name or department contains broken characters. Please refresh and try again.' })
          };
        }

        const employeeRecord = await findEmployeeByNameAndDept(tableIds, dept, name);
        if (!employeeRecord) {
          await writeLog(tableIds, dept, '', 'reject_unknown_employee', `${name} / ${dept}`);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ status: 'fail', message: 'Employee name was not found in the master list. Please refresh and select again.' })
          };
        }

        name = normalizeTextValue(employeeRecord.Name);
        dept = normalizeDepartment(employeeRecord.Department);

        // Duplicate Check (skip for admin)
        if (!isAdmin) {
          const todayDateStr = formatDate(getICTDate());
          const dupQuery = `(Department,eq,${dept})~and(Type,eq,${type})`;
          const dupRes = await makeRequest('GET', `/api/v2/tables/${tableIds['check_logs']}/records?limit=5000&where=${encodeURIComponent(dupQuery)}`);
          const userLogs = dupRes.data && dupRes.data.list ? dupRes.data.list : [];
          const targetDept = normalizeDepartment(dept);
          const targetName = normalizeTextValue(name);
          const alreadyLogged = userLogs.some(log => {
            return normalizeDepartment(log.Department) === targetDept &&
                   normalizeTextValue(log.Name) === targetName &&
                   log.Timestamp &&
                   log.Timestamp.startsWith(todayDateStr);
          });

          if (alreadyLogged) {
            await writeLog(tableIds, dept, '', `duplicate_${type}`, `${name} already ${type}`);
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ status: 'fail', message: `คุณได้ลงเวลา${type === 'IN' ? 'เข้า' : 'ออก'}แล้ววันนี้` })
            };
          }
        }

        // Geofencing Check
        let storeName = 'Admin Override';
        if (!isAdmin) {
          const storeRes = await makeRequest('GET', `/api/v2/tables/${tableIds['stores']}/records?limit=100`);
          const stores = storeRes.data && storeRes.data.list ? storeRes.data.list : [];
          let foundStore = null;

          for (const store of stores) {
            const sLat = parseFloat(store.Latitude);
            const sLon = parseFloat(store.Longitude);
            const radius = parseFloat(store.Radius) || 200;

            if (!isNaN(sLat) && !isNaN(sLon) && haversine(lat, lon, sLat, sLon) <= radius) {
              foundStore = store;
              break;
            }
          }

          if (!foundStore) {
            await writeLog(tableIds, dept, '', 'fail', `นอกพื้นที่ร้าน lat:${lat} lon:${lon}`);
            return { statusCode: 200, headers, body: JSON.stringify({ status: 'fail', message: 'นอกพื้นที่ร้าน' }) };
          }
          storeName = foundStore.Store;
        } else if (body.overrideStore) {
          storeName = body.overrideStore;
        }

        // Calculate log timestamp in Thai local time. Avoid toISOString(), which
        // converts the wall-clock time back to UTC on Bangkok-local servers.
        let timestampStr = formatICTTimestamp();
        if (isAdmin) {
          if (body.overrideDate && body.overrideTime) {
            const timeParts = body.overrideTime.split(':');
            const dateParts = body.overrideDate.split('-');
            timestampStr = formatTimestampParts({
              year: dateParts[0],
              month: dateParts[1],
              day: dateParts[2],
              hour: timeParts[0].padStart(2, '0'),
              minute: (timeParts[1] || '0').padStart(2, '0'),
              second: '00'
            });
          }
        }

        // Write log record
        const insertRes = await makeRequest('POST', `/api/v2/tables/${tableIds['check_logs']}/records`, {
          Timestamp: timestampStr,
          Name: name,
          Department: dept,
          Type: type,
          Lat: isAdmin ? null : lat,
          Lon: isAdmin ? null : lon,
          Store: storeName,
          LoggedBy: isAdmin ? 'admin' : 'employee'
        });

        if (insertRes.status !== 200 && insertRes.status !== 201) {
          throw new Error('Failed to insert log into database: ' + JSON.stringify(insertRes));
        }

        // Leaderboard
        const leaderboard = await buildLeaderboard(tableIds, dept, type);

        // Success Log
        await writeLog(tableIds, dept, '', `log_success_${type}`, `${name} at ${storeName} ${isAdmin ? '(admin)' : ''}`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'success',
            store: storeName,
            leaderboard: leaderboard,
            isAdmin: isAdmin
          })
        };
      }

      case 'submitLeave': {
        const body = event.httpMethod === 'POST' ? JSON.parse(event.body) : event.queryStringParameters;
        let dept = normalizeDepartment(body.department);
        let fullName = normalizeTextValue(body.fullName);
        const startDate = body.startDate;
        const endDate = body.endDate;
        const totalDays = parseFloat(body.totalDays) || 1;
        const leaveType = body.leaveType;
        const reason = body.reason || '';

        if (!dept || !fullName || !startDate) {
          return { statusCode: 400, headers, body: JSON.stringify({ result: 'fail', message: 'ข้อมูลไม่ครบถ้วน' }) };
        }

        if (hasReplacementCharacter(dept) || hasReplacementCharacter(fullName)) {
          await writeLog(tableIds, dept, '', 'reject_corrupt_leave_text', `${fullName} / ${dept}`);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: 'fail', message: 'Employee name or department contains broken characters. Please refresh and try again.' })
          };
        }

        const employeeRecord = await findEmployeeByNameAndDept(tableIds, dept, fullName);
        if (!employeeRecord) {
          await writeLog(tableIds, dept, '', 'reject_unknown_leave_employee', `${fullName} / ${dept}`);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: 'fail', message: 'Employee name was not found in the master list. Please refresh and select again.' })
          };
        }

        fullName = normalizeTextValue(employeeRecord.Name);
        dept = normalizeDepartment(employeeRecord.Department);

        // Duplicate Check
        const dupRes = await makeRequest('GET', `/api/v2/tables/${tableIds['leave_logs']}/records?limit=100&where=${encodeURIComponent(`(Name,eq,${fullName})~and(StartDate,eq,exactDate,${startDate})~and(EndDate,eq,exactDate,${endDate})`)}`);
        if (dupRes.data && dupRes.data.list && dupRes.data.list.length > 0) {
          return { statusCode: 200, headers, body: JSON.stringify({ result: 'duplicate', message: 'ใบลานี้ส่งไปแล้ว' }) };
        }

        const timestampStr = formatICTTimestamp();

        // Write Leave Record
        const insertRes = await makeRequest('POST', `/api/v2/tables/${tableIds['leave_logs']}/records`, {
          Timestamp: timestampStr,
          Department: dept,
          Name: fullName,
          StartDate: startDate,
          EndDate: endDate,
          TotalDays: totalDays,
          LeaveType: leaveType,
          Reason: reason
        });

        if (insertRes.status !== 200 && insertRes.status !== 201) {
          throw new Error('Failed to submit leave to database: ' + JSON.stringify(insertRes));
        }

        // Send Telegram Msg
        const leaveKey = `${dept}_ห้องลางาน`;
        const telegramChat = await getTelegramChatConfigs(tableIds);
        const cfg = telegramChat[leaveKey] || telegramChat.default;
        if (cfg && cfg.chat_id) {
          const leaveMsg = [
            '📌 *คำขอวันลาใหม่*',
            `👤 ชื่อ-นามสกุล: ${fullName}`,
            `🏢 แผนก: ${dept}`,
            `📅 วันที่ลา: ${startDate} ถึง ${endDate}`,
            `📊 จำนวนวัน: ${totalDays}`,
            `📝 สาเหตุ: ${leaveType}`,
            reason ? `💬 เหตุผลเพิ่มเติม: ${reason}` : ''
          ].filter(Boolean).join('\n');

          await pushToTelegram(cfg.chat_id, leaveMsg, cfg.thread_id);
          await writeLog(tableIds, dept, cfg.chat_id, 'telegram_leave_success', fullName);
        }

        return { statusCode: 200, headers, body: JSON.stringify({ result: 'success' }) };
      }

      case 'getStats': {
        const dept = event.queryStringParameters.dept;
        const stats = await getDeptStats(tableIds, dept);
        return { statusCode: 200, headers, body: JSON.stringify(stats) };
      }

      case 'getEmployeeHistory': {
        const dept = event.queryStringParameters.dept;
        const name = event.queryStringParameters.name;
        const limit = parseInt(event.queryStringParameters.limit) || 30;

        if (!dept || !name) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing dept or name' }) };
        }

        // Do not put the employee name in NocoDB's where expression. Names can
        // contain parentheses, which NocoDB treats as filter syntax.
        const empRes = await makeRequest('GET', `/api/v2/tables/${tableIds['employees']}/records?limit=1000`);
        const employees = (empRes.data && empRes.data.list ? empRes.data.list : []).map(canonicalizeEmployeeRecord);
        const canonicalEmployee = findCanonicalEmployee(employees, dept, name);
        const canonicalDept = canonicalEmployee ? canonicalEmployee.Department : dept;
        const canonicalName = canonicalEmployee ? canonicalEmployee.Name : name;
        const logQuery = `(Department,eq,${dept})`;
        const logRes = await makeRequest('GET', `/api/v2/tables/${tableIds['check_logs']}/records?limit=5000&sort=-Timestamp&where=${encodeURIComponent(logQuery)}`);
        const deptLogs = canonicalizePeopleRows(logRes.data && logRes.data.list ? logRes.data.list : [], employees);
        const targetDept = normalizeDepartment(canonicalDept);
        const targetName = normalizeTextValue(canonicalName);
        const userLogs = deptLogs.filter(log => {
          return normalizeDepartment(log.Department) === targetDept &&
                 normalizeTextValue(log.Name) === targetName;
        });

        // Sort user logs descending (most recent first)
        const sortedLogs = userLogs.sort((a, b) => parseTimestampLocal(b.Timestamp) - parseTimestampLocal(a.Timestamp));
        const limitedLogs = sortedLogs.slice(0, limit).map(log => {
          const d = parseTimestampLocal(log.Timestamp);
          const mins = d.getHours() * 60 + d.getMinutes();
          
          let isMorningBonus = false;
          let otHours = 0;
          
          if (log.Type === 'IN') {
            // Before 7:45 AM (465 minutes) is morning bonus
            if (mins <= 465) {
              isMorningBonus = true;
            }
          } else if (log.Type === 'OUT') {
            // From 18:00 onward (1080 minutes) is OT
            if (mins >= 1080) {
              const diffMins = mins - 1080;
              otHours = 0.5 + Math.floor(diffMins / 30) * 0.5;
            }
          }
          
          return {
            date: formatDate(d),
            time: formatTime(d),
            type: log.Type,
            store: log.Store || '',
            isMorningBonus,
            otHours
          };
        });

        // Stats for selected/current month
        const selectedMonth = event.queryStringParameters.month;
        let monthLogs = [];
        
        if (selectedMonth) {
          monthLogs = userLogs.filter(log => log.Timestamp && log.Timestamp.startsWith(selectedMonth));
        } else {
          const now = getICTDate();
          const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          monthLogs = userLogs.filter(log => log.Timestamp && log.Timestamp.startsWith(currentMonthStr));
        }
        
        const checkIns = monthLogs.filter(log => log.Type === 'IN');
        
        // Late is after 7:45 AM (465 minutes)
        const lateCount = checkIns.filter(log => {
          const d = parseTimestampLocal(log.Timestamp);
          return (d.getHours() * 60 + d.getMinutes()) > 465;
        }).length;

        const morningBonusCount = checkIns.filter(log => {
          const d = parseTimestampLocal(log.Timestamp);
          return (d.getHours() * 60 + d.getMinutes()) <= 465;
        }).length;
        
        const checkOuts = monthLogs.filter(log => log.Type === 'OUT');
        let totalOtHours = 0;
        checkOuts.forEach(log => {
          const d = parseTimestampLocal(log.Timestamp);
          const mins = d.getHours() * 60 + d.getMinutes();
          if (mins >= 1080) {
            const diffMins = mins - 1080;
            totalOtHours += 0.5 + Math.floor(diffMins / 30) * 0.5;
          }
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            history: limitedLogs,
            stats: {
              thisMonth: {
                checkIns: checkIns.length,
                lateCount: lateCount,
                onTimeRate: checkIns.length > 0 ? Math.round(((checkIns.length - lateCount) / checkIns.length) * 100) : 0,
                morningBonusCount: morningBonusCount,
                totalOtHours: totalOtHours
              }
            }
          })
        };
      }

      case 'getTopPerformers': {
        const limit = parseInt(event.queryStringParameters.limit) || 20;
        const now = getICTDate();
        const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
        const query = `(Type,eq,IN)~and(Timestamp,ge,exactDate,${monthStartStr})`;

        // Fetch all IN check-ins for the current month
        const empRes = await makeRequest('GET', `/api/v2/tables/${tableIds['employees']}/records?limit=1000`);
        const employees = (empRes.data && empRes.data.list ? empRes.data.list : []).map(canonicalizeEmployeeRecord);
        const res = await makeRequest('GET', `/api/v2/tables/${tableIds['check_logs']}/records?limit=5000&where=${encodeURIComponent(query)}`);
        const monthIns = canonicalizePeopleRows(res.data && res.data.list ? res.data.list : [], employees);

        // Group by Employee: "dept|name"
        const records = {};
        monthIns.forEach(log => {
          const key = `${normalizeDepartment(log.Department)}|${normalizeTextValue(log.Name)}`;
          if (!records[key]) {
            records[key] = { name: normalizeTextValue(log.Name), dept: normalizeDepartment(log.Department), dates: [] };
          }
          records[key].dates.push(parseTimestampLocal(log.Timestamp));
        });

        // Compute scores
        const performers = Object.keys(records).map(key => {
          const e = records[key];
          const dates = e.dates.sort((a, b) => a - b);
          let score = 0;
          let streak = 0;
          let totalMinutes = 0;

          dates.forEach(d => {
            const mins = d.getHours() * 60 + d.getMinutes();
            totalMinutes += mins;

            // Score logic
            if (mins < 455) { // < 07:35
              score += 10;
            } else if (mins < 470) { // < 07:50
              score += 5;
            } else if (mins > 480) { // > 08:00
              score -= 5;
            }

            // Streak check (<= 08:00 / 480 min is on time)
            if (mins <= 480) {
              streak++;
              if (streak % 3 === 0) score += 2;
            } else {
              streak = 0;
            }
          });

          const avgMinutes = Math.round(totalMinutes / dates.length);
          const avgH = Math.floor(avgMinutes / 60);
          const avgM = avgMinutes % 60;
          const avgTimeStr = `${String(avgH).padStart(2, '0')}:${String(avgM).padStart(2, '0')}`;

          return {
            name: e.name,
            dept: e.dept,
            score: score,
            streak: streak,
            avgTime: avgTimeStr,
            total: dates.length
          };
        });

        // Sort descending
        performers.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (b.streak !== a.streak) return b.streak - a.streak;
          return b.total - a.total;
        });

        return { statusCode: 200, headers, body: JSON.stringify(performers.slice(0, limit)) };
      }

      case 'getDeptRanking': {
        const now = getICTDate();
        const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
        const query = `(Type,eq,IN)~and(Timestamp,ge,exactDate,${monthStartStr})`;

        // Get departments
        const empRes = await makeRequest('GET', `/api/v2/tables/${tableIds['employees']}/records?limit=1000`);
        const employees = (empRes.data && empRes.data.list ? empRes.data.list : []).map(canonicalizeEmployeeRecord);
        const departments = [...new Set(employees.map(e => normalizeDepartment(e.Department)).filter(Boolean))];

        const logRes = await makeRequest('GET', `/api/v2/tables/${tableIds['check_logs']}/records?limit=5000&where=${encodeURIComponent(query)}`);
        const monthIns = canonicalizePeopleRows(logRes.data && logRes.data.list ? logRes.data.list : [], employees);

        const ranking = departments.map(dept => {
          if (dept.toLowerCase().includes('test')) return null;

          const deptEmployees = employees.filter(e => normalizeDepartment(e.Department) === dept);
          if (deptEmployees.length === 0) return null;

          const deptIns = monthIns.filter(log => normalizeDepartment(log.Department) === dept);
          const lateCount = deptIns.filter(log => {
            const d = parseTimestampLocal(log.Timestamp);
            return (d.getHours() * 60 + d.getMinutes()) > 480; // After 8:00 AM
          }).length;

          const onTimeCount = deptIns.length - lateCount;
          const onTimeRate = deptIns.length > 0 ? Math.round((onTimeCount / deptIns.length) * 100) : 0;

          // Estimate expected check-ins
          const workDays = now.getDate();
          const expectedCheckIns = deptEmployees.length * workDays;
          const attendanceRate = expectedCheckIns > 0 ? Math.round((deptIns.length / expectedCheckIns) * 100) : 0;

          return {
            dept,
            employees: deptEmployees.length,
            checkIns: deptIns.length,
            onTimeRate,
            attendanceRate: Math.min(attendanceRate, 100),
            score: onTimeRate * 0.6 + Math.min(attendanceRate, 100) * 0.4
          };
        }).filter(Boolean);

        ranking.sort((a, b) => b.score - a.score);

        return { statusCode: 200, headers, body: JSON.stringify(ranking) };
      }

      case 'getEmployees': {
        const res = await makeRequest('GET', `/api/v2/tables/${tableIds['employees']}/records?limit=1000`);
        const list = (res.data && res.data.list ? res.data.list : []).map(canonicalizeEmployeeRecord);
        return { statusCode: 200, headers, body: JSON.stringify(list) };
      }

      case 'addEmployee': {
        const body = event.httpMethod === 'POST' ? JSON.parse(event.body) : event.queryStringParameters;
        const name = normalizeTextValue(body.name || body.Name);
        const dept = normalizeDepartment(body.department || body.Department);
        if (!name || !dept) {
          return { statusCode: 400, headers, body: JSON.stringify({ status: 'fail', message: 'ข้อมูลไม่ครบถ้วน' }) };
        }
        if (hasReplacementCharacter(name) || hasReplacementCharacter(dept)) {
          return { statusCode: 400, headers, body: JSON.stringify({ status: 'fail', message: 'Employee name or department contains broken characters' }) };
        }
        const insertRes = await makeRequest('POST', `/api/v2/tables/${tableIds['employees']}/records`, {
          Name: name,
          Department: dept
        });
        if (insertRes.status !== 200 && insertRes.status !== 201) {
          throw new Error('Failed to add employee: ' + JSON.stringify(insertRes));
        }
        return { statusCode: 200, headers, body: JSON.stringify({ status: 'success', data: insertRes.data }) };
      }

      case 'deleteEmployee': {
        const body = event.httpMethod === 'POST' ? JSON.parse(event.body) : event.queryStringParameters;
        const id = body.id;
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ status: 'fail', message: 'Missing id' }) };
        }
        const numericId = isNaN(id) ? id : Number(id);
        const delRes = await makeRequest('DELETE', `/api/v2/tables/${tableIds['employees']}/records`, [{ Id: numericId }]);
        return { statusCode: 200, headers, body: JSON.stringify({ status: 'success', data: delRes.data }) };
      }

      case 'getCheckLogs': {
        const res = await makeRequest('GET', `/api/v2/tables/${tableIds['check_logs']}/records?limit=150&sort=-Timestamp`);
        const list = res.data && res.data.list ? res.data.list : [];
        return { statusCode: 200, headers, body: JSON.stringify(list) };
      }

      case 'updateCheckLog': {
        const body = event.httpMethod === 'POST' ? JSON.parse(event.body) : event.queryStringParameters;
        const id = body.id || body.Id;
        const timestamp = body.timestamp || body.Timestamp;
        let name = normalizeTextValue(body.name || body.Name);
        let dept = normalizeDepartment(body.department || body.Department);
        const type = body.type || body.Type;
        const store = body.store || body.Store || '';
        const loggedBy = body.loggedBy || body.LoggedBy || 'admin';

        if (!id || !timestamp || !name || !dept || !type) {
          return { statusCode: 400, headers, body: JSON.stringify({ status: 'fail', message: 'Missing required check log fields' }) };
        }

        const normalizedType = String(type).toUpperCase();
        if (!['IN', 'OUT'].includes(normalizedType)) {
          return { statusCode: 400, headers, body: JSON.stringify({ status: 'fail', message: 'Invalid check log type' }) };
        }

        if (hasReplacementCharacter(name) || hasReplacementCharacter(dept)) {
          return { statusCode: 400, headers, body: JSON.stringify({ status: 'fail', message: 'Employee name or department contains broken characters' }) };
        }

        const employeeRecord = await findEmployeeByNameAndDept(tableIds, dept, name);
        if (!employeeRecord) {
          return { statusCode: 400, headers, body: JSON.stringify({ status: 'fail', message: 'Employee name was not found in the master list' }) };
        }

        name = normalizeTextValue(employeeRecord.Name);
        dept = normalizeDepartment(employeeRecord.Department);

        const numericId = isNaN(id) ? id : Number(id);
        const payload = [{
          Id: numericId,
          Timestamp: timestamp,
          Name: name,
          Department: dept,
          Type: normalizedType,
          Store: store,
          LoggedBy: loggedBy
        }];

        const updateRes = await makeRequest('PATCH', `/api/v2/tables/${tableIds['check_logs']}/records`, payload);
        if (updateRes.status !== 200 && updateRes.status !== 201) {
          throw new Error('Failed to update check log: ' + JSON.stringify(updateRes.data || updateRes.raw));
        }

        await writeLog(tableIds, dept, '', 'admin_update_check_log', `${name} ${normalizedType} ${timestamp}`);
        return { statusCode: 200, headers, body: JSON.stringify({ status: 'success', data: updateRes.data }) };
      }

      case 'deleteCheckLog': {
        const body = event.httpMethod === 'POST' ? JSON.parse(event.body) : event.queryStringParameters;
        const id = body.id || body.Id;
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ status: 'fail', message: 'Missing id' }) };
        }

        const numericId = isNaN(id) ? id : Number(id);
        const delRes = await makeRequest('DELETE', `/api/v2/tables/${tableIds['check_logs']}/records`, [{ Id: numericId }]);
        if (delRes.status !== 200 && delRes.status !== 201) {
          throw new Error('Failed to delete check log: ' + JSON.stringify(delRes.data || delRes.raw));
        }

        await writeLog(tableIds, '', '', 'admin_delete_check_log', `Id ${id}`);
        return { statusCode: 200, headers, body: JSON.stringify({ status: 'success', data: delRes.data }) };
      }

      case 'getLeaveLogs': {
        const res = await makeRequest('GET', `/api/v2/tables/${tableIds['leave_logs']}/records?limit=150&sort=-Timestamp`);
        const list = res.data && res.data.list ? res.data.list : [];
        return { statusCode: 200, headers, body: JSON.stringify(list) };
      }

      case 'getSystemLogs': {
        const res = await makeRequest('GET', `/api/v2/tables/${tableIds['system_logs']}/records?limit=150&sort=-Timestamp`);
        const list = res.data && res.data.list ? res.data.list : [];
        return { statusCode: 200, headers, body: JSON.stringify(list) };
      }

      case 'getTelegramConfigs': {
        const query = `(Status,eq,${TELEGRAM_CONFIG_STATUS})`;
        const res = await makeRequest('GET', `/api/v2/tables/${tableIds['system_logs']}/records?limit=1000&sort=-Timestamp&where=${encodeURIComponent(query)}`);
        const rows = res.data && res.data.list ? res.data.list : [];
        const seen = new Set();
        const customConfigs = [];

        rows.forEach(row => {
          if (!row.Department || seen.has(row.Department)) return;
          seen.add(row.Department);
          const info = parseTelegramConfigInfo(row.Info);
          customConfigs.push({
            Id: row.Id,
            Department: row.Department,
            ChatID: row.ChatID || '',
            ThreadID: info.thread_id || '',
            LeaveThreadID: info.leave_thread_id || '',
            Timestamp: row.Timestamp || '',
            Source: 'custom',
            IsDefault: false
          });
        });

        const customByDept = new Map(customConfigs.map(cfg => [cfg.Department, cfg]));
        const configs = getDefaultTelegramConfigRows().map(defaultCfg => {
          return customByDept.get(defaultCfg.Department) || defaultCfg;
        });

        customConfigs.forEach(cfg => {
          if (!configs.some(existing => existing.Department === cfg.Department)) {
            configs.push(cfg);
          }
        });

        return { statusCode: 200, headers, body: JSON.stringify(configs) };
      }

      case 'saveTelegramConfig': {
        const body = event.httpMethod === 'POST' ? JSON.parse(event.body) : event.queryStringParameters;
        const dept = body.department || body.Department;
        const chatId = body.chatId || body.ChatID;
        const threadId = body.threadId || body.ThreadID || '';
        const leaveThreadId = body.leaveThreadId || body.LeaveThreadID || '';

        if (!dept || !chatId) {
          return { statusCode: 400, headers, body: JSON.stringify({ status: 'fail', message: 'Missing department or chat ID' }) };
        }

        const insertRes = await makeRequest('POST', `/api/v2/tables/${tableIds['system_logs']}/records`, {
          Timestamp: formatICTTimestamp(),
          Department: dept,
          ChatID: String(chatId),
          Status: TELEGRAM_CONFIG_STATUS,
          Info: JSON.stringify({
            thread_id: threadId === '' ? null : parseOptionalInteger(threadId),
            leave_thread_id: leaveThreadId === '' ? null : parseOptionalInteger(leaveThreadId)
          })
        });

        if (insertRes.status !== 200 && insertRes.status !== 201) {
          throw new Error('Failed to save Telegram config: ' + JSON.stringify(insertRes.data || insertRes.raw));
        }

        return { statusCode: 200, headers, body: JSON.stringify({ status: 'success', data: insertRes.data }) };
      }

      case 'deleteTelegramConfig': {
        const body = event.httpMethod === 'POST' ? JSON.parse(event.body) : event.queryStringParameters;
        const id = body.id || body.Id;
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ status: 'fail', message: 'Missing id' }) };
        }

        const numericId = isNaN(id) ? id : Number(id);
        const delRes = await makeRequest('DELETE', `/api/v2/tables/${tableIds['system_logs']}/records`, [{ Id: numericId }]);
        if (delRes.status !== 200 && delRes.status !== 201) {
          throw new Error('Failed to delete Telegram config: ' + JSON.stringify(delRes.data || delRes.raw));
        }

        return { statusCode: 200, headers, body: JSON.stringify({ status: 'success', data: delRes.data }) };
      }

      case 'getStores': {
        const res = await makeRequest('GET', `/api/v2/tables/${tableIds['stores']}/records?limit=100`);
        const list = res.data && res.data.list ? res.data.list : [];
        return { statusCode: 200, headers, body: JSON.stringify(list) };
      }

      case 'addStore': {
        const body = event.httpMethod === 'POST' ? JSON.parse(event.body) : event.queryStringParameters;
        const store = body.store || body.Store;
        const lat = parseFloat(body.lat || body.Latitude);
        const lon = parseFloat(body.lon || body.Longitude);
        const radius = parseFloat(body.radius || body.Radius) || 200;

        if (!store || isNaN(lat) || isNaN(lon)) {
          return { statusCode: 400, headers, body: JSON.stringify({ status: 'fail', message: 'ข้อมูลไม่ครบถ้วน' }) };
        }
        const insertRes = await makeRequest('POST', `/api/v2/tables/${tableIds['stores']}/records`, {
          Store: store,
          Latitude: String(lat),
          Longitude: String(lon),
          Radius: String(radius)
        });
        if (insertRes.status !== 200 && insertRes.status !== 201) {
          throw new Error('Failed to add store: ' + JSON.stringify(insertRes));
        }
        return { statusCode: 200, headers, body: JSON.stringify({ status: 'success', data: insertRes.data }) };
      }

      case 'deleteStore': {
        const body = event.httpMethod === 'POST' ? JSON.parse(event.body) : event.queryStringParameters;
        const id = body.id;
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ status: 'fail', message: 'Missing id' }) };
        }
        const numericId = isNaN(id) ? id : Number(id);
        const delRes = await makeRequest('DELETE', `/api/v2/tables/${tableIds['stores']}/records`, [{ Id: numericId }]);
        return { statusCode: 200, headers, body: JSON.stringify({ status: 'success', data: delRes.data }) };
      }

      case 'getAdminDashboardData': {
        const todayDateStr = formatDate(getICTDate());
        const dept = event.queryStringParameters.dept;
        
        // Fetch all employees
        const empRes2 = await makeRequest('GET', `/api/v2/tables/${tableIds['employees']}/records?limit=1000`);
        let employees = (empRes2.data && empRes2.data.list ? empRes2.data.list : []).map(canonicalizeEmployeeRecord);

        // Fetch check logs for today
        const logQuery = `(Timestamp,ge,exactDate,${todayDateStr} 00:00:00)`;
        const logRes = await makeRequest('GET', `/api/v2/tables/${tableIds['check_logs']}/records?limit=2000&where=${encodeURIComponent(logQuery)}`);
        const allLogs = logRes.data && logRes.data.list ? logRes.data.list : [];
        let todayLogs = canonicalizePeopleRows(allLogs, employees).filter(log => log.Timestamp && log.Timestamp.startsWith(todayDateStr));

        // Fetch leave logs that overlap with today
        const leaveRes = await makeRequest('GET', `/api/v2/tables/${tableIds['leave_logs']}/records?limit=1000`);
        const allLeaves = leaveRes.data && leaveRes.data.list ? leaveRes.data.list : [];
        let todayLeaves = canonicalizePeopleRows(allLeaves, employees).filter(leave => {
          return leave.StartDate && leave.EndDate && 
                 todayDateStr >= leave.StartDate && 
                 todayDateStr <= leave.EndDate;
        });

        // Filter by department inside JavaScript
        if (dept && dept !== 'all' && dept !== 'ทั้งหมด' && dept !== 'undefined') {
          const targetDept = normalizeDepartment(dept);
          employees = employees.filter(emp => normalizeDepartment(emp.Department) === targetDept);
          todayLogs = todayLogs.filter(log => normalizeDepartment(log.Department) === targetDept);
          todayLeaves = todayLeaves.filter(leave => normalizeDepartment(leave.Department) === targetDept);
        }

        // Process metrics
        const checkedInEmployees = todayLogs.filter(log => log.Type === 'IN');
        const checkedInNames = [...new Set(checkedInEmployees.map(log => normalizeTextValue(log.Name)))];

        const checkedOutEmployees = todayLogs.filter(log => log.Type === 'OUT');
        const checkedOutNames = [...new Set(checkedOutEmployees.map(log => normalizeTextValue(log.Name)))];

        const leaveNames = [...new Set(todayLeaves.map(l => normalizeTextValue(l.Name)))];

        // Find employees who did not check in today
        const notCheckedIn = employees.filter(emp => !checkedInNames.includes(normalizeTextValue(emp.Name)));
        
        // Absent are those who are not checked in AND do not have leave
        const absent = notCheckedIn.filter(emp => !leaveNames.includes(normalizeTextValue(emp.Name)));
        const onLeave = notCheckedIn.filter(emp => leaveNames.includes(normalizeTextValue(emp.Name)));

        // Calculate rate
        const totalEmpCount = employees.length;
        const checkedInCount = checkedInNames.length;
        const checkInRate = totalEmpCount > 0 ? Math.round((checkedInCount / totalEmpCount) * 100) : 0;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            today: todayDateStr,
            totalEmployees: totalEmpCount,
            checkedInCount: checkedInCount,
            checkInRate: checkInRate,
            notCheckedInCount: notCheckedIn.length,
            absentCount: absent.length,
            onLeaveCount: onLeave.length,
            checkedIn: checkedInNames.map(name => {
              const logs = todayLogs.filter(l => normalizeTextValue(l.Name) === name && l.Type === 'IN').sort((a,b) => parseTimestampLocal(a.Timestamp) - parseTimestampLocal(b.Timestamp));
              const firstIn = logs[0] ? formatTime(parseTimestampLocal(logs[0].Timestamp)) : '';
              const empObj = employees.find(e => normalizeTextValue(e.Name) === name);
              return { name, time: firstIn, department: empObj ? empObj.Department : '' };
            }),
            notCheckedIn: notCheckedIn.map(emp => ({ name: emp.Name, department: emp.Department })),
            absent: absent.map(emp => ({ name: emp.Name, department: emp.Department })),
            onLeave: onLeave.map(emp => {
              const leave = todayLeaves.find(l => normalizeTextValue(l.Name) === normalizeTextValue(emp.Name));
              return { 
                name: emp.Name, 
                department: emp.Department,
                leaveType: leave ? leave.LeaveType : 'ลา',
                reason: leave ? leave.Reason : ''
              };
            })
          })
        };
      }

      case 'getPayrollData': {
        const month = event.queryStringParameters.month || formatDate(getICTDate()).substring(0, 7); // "YYYY-MM"
        const dept = event.queryStringParameters.dept;

        // Fetch employees
        let empQuery = '';
        if (dept) {
          empQuery = `(Department,eq,${dept})`;
        }
        const empRes = await makeRequest('GET', `/api/v2/tables/${tableIds['employees']}/records?limit=1000${empQuery ? `&where=${encodeURIComponent(empQuery)}` : ''}`);
        const employees = (empRes.data && empRes.data.list ? empRes.data.list : []).map(canonicalizeEmployeeRecord);

        // Fetch check logs for this month
        let logQuery = `(Timestamp,ge,exactDate,${month}-01 00:00:00)`;
        if (dept) {
          logQuery = `(Timestamp,ge,exactDate,${month}-01 00:00:00)~and(Department,eq,${dept})`;
        }
        const logRes = await makeRequest('GET', `/api/v2/tables/${tableIds['check_logs']}/records?limit=5000&where=${encodeURIComponent(logQuery)}`);
        const allMonthLogs = logRes.data && logRes.data.list ? logRes.data.list : [];
        const monthLogs = canonicalizePeopleRows(allMonthLogs, employees).filter(log => log.Timestamp && log.Timestamp.startsWith(month));

        // Fetch leave logs for this month
        let leaveQuery = `(StartDate,ge,exactDate,${month}-01)`;
        if (dept) {
          leaveQuery = `(StartDate,ge,exactDate,${month}-01)~and(Department,eq,${dept})`;
        }
        const leaveRes = await makeRequest('GET', `/api/v2/tables/${tableIds['leave_logs']}/records?limit=1000${leaveQuery ? `&where=${encodeURIComponent(leaveQuery)}` : ''}`);
        const allMonthLeaves = leaveRes.data && leaveRes.data.list ? leaveRes.data.list : [];
        const monthLeaves = canonicalizePeopleRows(allMonthLeaves, employees).filter(leave => {
          return (leave.StartDate && leave.StartDate.startsWith(month)) || 
                 (leave.EndDate && leave.EndDate.startsWith(month));
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            month,
            employees,
            checkLogs: monthLogs,
            leaveLogs: monthLeaves
          })
        };
      }

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
    }

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message })
    };
  }
};
