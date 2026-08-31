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
  'วิริยะเซอร์วิส': { chat_id: -1002581740311, thread_id: 2 },
  'ศูนย์รวมประกันภัย': { chat_id: -1002537760951, thread_id: 2 },
  'บัญชาประดับยนต์ เมือง': { chat_id: -1002570853976, thread_id: 6 },
  'ตรอ วิริยะเซอร์วิส': { chat_id: -1002567913507, thread_id: 3 }
};

const TELEGRAM_CONFIG_STATUS = 'telegram_config';

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
    configs[dept] = { chat_id: chatId, thread_id: parseOptionalInteger(info.thread_id) };
  });

  return configs;
}

// --- Helper: Native HTTPS Request ---
function makeRequest(method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlPath, NOCODB_URL);
    const options = {
      method: method,
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      headers: {
        'xc-token': API_TOKEN,
        'Content-Type': 'application/json'
      }
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

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// --- Helper: Date & Time in ICT ---
function getICTDate(date = new Date()) {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 7));
}

function parseTimestampLocal(ts) {
  if (!ts) return new Date();
  return new Date(ts.substring(0, 19).replace(' ', 'T'));
}

function formatTime(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTimestamp(d) {
  return `${formatDate(d)} ${formatTime(d)}`;
}

function hasBrokenText(value) {
  return String(value || '').includes('\uFFFD');
}

function normalizeText(value) {
  return String(value || '').trim().normalize('NFC');
}

function getNickname(value) {
  const match = String(value || '').match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : '';
}

function compactNameForRepair(value) {
  return String(value || '')
    .replace(/\uFFFD/g, '')
    .replace(/[()\s]/g, '')
    .normalize('NFC');
}

function findFuzzyEmployeeMatch(log, employees) {
  const logDept = normalizeText(log.Department);
  const sameDeptEmployees = hasBrokenText(log.Department)
    ? employees
    : employees.filter(emp => normalizeText(emp.Department) === logDept);
  const compactLogName = compactNameForRepair(log.Name);
  if (!compactLogName) return null;

  const strongTokens = String(log.Name || '')
    .replace(/\uFFFD/g, '')
    .normalize('NFC')
    .split(/[()\s]+/)
    .filter(token => token.length >= 4);
  for (const token of strongTokens) {
    const tokenMatches = sameDeptEmployees.filter(emp => compactNameForRepair(emp.Name).includes(token));
    if (tokenMatches.length === 1) return tokenMatches[0];
  }

  const containmentMatches = sameDeptEmployees.filter(emp => {
    const compactEmpName = compactNameForRepair(emp.Name);
    return compactLogName.length >= 2 &&
      (compactEmpName.includes(compactLogName) || compactLogName.includes(compactEmpName));
  });
  if (containmentMatches.length === 1) return containmentMatches[0];

  const firstChar = compactLogName[0];
  const lastChar = compactLogName[compactLogName.length - 1];
  const edgeMatches = sameDeptEmployees.filter(emp => {
    const compactEmpName = compactNameForRepair(emp.Name);
    return compactEmpName &&
      compactEmpName[0] === firstChar &&
      compactEmpName[compactEmpName.length - 1] === lastChar &&
      Math.abs(compactEmpName.length - compactLogName.length) <= 4;
  });

  return edgeMatches.length === 1 ? edgeMatches[0] : null;
}

function repairLogWithEmployees(log, employees) {
  if (!hasBrokenText(log.Name) && !hasBrokenText(log.Department)) return log;

  const exactNameMatches = employees.filter(emp => emp.Name === log.Name);
  if (exactNameMatches.length === 1) {
    return { ...log, Name: exactNameMatches[0].Name, Department: exactNameMatches[0].Department };
  }

  const nickname = getNickname(log.Name);
  if (nickname) {
    const nicknameMatches = employees.filter(emp => getNickname(emp.Name) === nickname);
    if (nicknameMatches.length === 1) {
      return { ...log, Name: nicknameMatches[0].Name, Department: nicknameMatches[0].Department };
    }
  }

  const fuzzyMatch = findFuzzyEmployeeMatch(log, employees);
  if (fuzzyMatch) {
    return { ...log, Name: fuzzyMatch.Name, Department: fuzzyMatch.Department };
  }

  return log;
}

function repairLogsWithEmployees(logs, employees) {
  return logs.map(log => repairLogWithEmployees(log, employees));
}

async function repairEmployeesFromDirectRows(tableIds, employees) {
  if (!tableIds['employees']) return employees;

  const repaired = [];
  for (const emp of employees) {
    if (!emp.Id || (!hasBrokenText(emp.Name) && !hasBrokenText(emp.Department))) {
      repaired.push(emp);
      continue;
    }

    try {
      const query = `(Id,eq,${emp.Id})`;
      const directRes = await makeRequest('GET', `/api/v2/tables/${tableIds['employees']}/records?limit=1&where=${encodeURIComponent(query)}`);
      const direct = directRes.data && directRes.data.list ? directRes.data.list[0] : null;
      if (direct && !hasBrokenText(direct.Name) && !hasBrokenText(direct.Department)) {
        repaired.push(direct);
        continue;
      }
    } catch (e) {
      // Keep the original row if a direct refresh fails.
    }

    repaired.push(emp);
  }

  return repaired;
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
    req.on('error', () => resolve());
    req.write(data);
    req.end();
  });
}

// --- Helper: System Logging ---
async function writeLog(systemLogTableId, dept, chatId, status, info) {
  try {
    await makeRequest('POST', `/api/v2/tables/${systemLogTableId}/records`, {
      Timestamp: formatTimestamp(getICTDate()),
      Department: dept || '',
      ChatID: String(chatId || ''),
      Status: status || '',
      Info: info || ''
    });
  } catch (e) {
    // Silent fail
  }
}

// --- Handler ---
exports.handler = async (event, context) => {
  console.log('🌅 Starting Scheduled Morning Daily Summary Cron (9:00 AM)...');

  try {
    // 1. Get Tables Mappings
    const metaRes = await makeRequest('GET', `/api/v2/meta/bases/${BASE_ID}/tables`);
    if (metaRes.status !== 200 || !metaRes.data || !metaRes.data.list) {
      throw new Error('Failed to fetch table structure from NocoDB.');
    }
    const tableIds = {};
    metaRes.data.list.forEach(t => { tableIds[t.table_name] = t.id; });
    const telegramChat = await getTelegramChatConfigs(tableIds);

    // 2. Fetch Departments & Employees
    const empRes = await makeRequest('GET', `/api/v2/tables/${tableIds['employees']}/records?limit=1000`);
    let employees = empRes.data && empRes.data.list ? empRes.data.list : [];
    employees = await repairEmployeesFromDirectRows(tableIds, employees);
    const depts = [...new Set(employees.map(e => e.Department).filter(Boolean))];

    // 3. Fetch check_logs today
    const todayDateStr = formatDate(getICTDate());
    const logQuery = `(Type,eq,IN)~and(Timestamp,ge,exactDate,${todayDateStr} 00:00:00)`;
    const logRes = await makeRequest('GET', `/api/v2/tables/${tableIds['check_logs']}/records?limit=5000&sort=Timestamp&where=${encodeURIComponent(logQuery)}`);
    const allIns = logRes.data && logRes.data.list ? logRes.data.list : [];
    const repairedIns = repairLogsWithEmployees(allIns, employees);
    const todayIns = repairedIns.filter(log => {
      return log.Timestamp && log.Timestamp.startsWith(todayDateStr);
    });

    const now = getICTDate();
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear() + 543}`;

    // 4. Calculate for each department
    for (const dept of depts) {
      if (dept.toLowerCase().includes('test')) continue;

      const deptEmployees = employees.filter(e => e.Department === dept);
      if (deptEmployees.length === 0) continue;

      const deptIns = todayIns.filter(log => log.Department === dept).sort((a, b) => parseTimestampLocal(a.Timestamp) - parseTimestampLocal(b.Timestamp));
      const checkedInNames = deptIns.map(log => log.Name);
      const notCheckedIn = deptEmployees.filter(e => !checkedInNames.includes(e.Name)).map(e => e.Name);

      // Average arrival time
      let avgTime = null;
      if (deptIns.length > 0) {
        const totalMinutes = deptIns.reduce((sum, log) => {
          const d = parseTimestampLocal(log.Timestamp);
          return sum + d.getHours() * 60 + d.getMinutes();
        }, 0);
        const avgMinutes = Math.round(totalMinutes / deptIns.length);
        const avgH = Math.floor(avgMinutes / 60);
        const avgM = avgMinutes % 60;
        avgTime = `${String(avgH).padStart(2, '0')}:${String(avgM).padStart(2, '0')}`;
      }

      // Late arrivals (after 8:00 AM)
      const lateArrivals = deptIns.filter(log => {
        const d = parseTimestampLocal(log.Timestamp);
        return (d.getHours() * 60 + d.getMinutes()) > 480;
      }).map(log => {
        const d = parseTimestampLocal(log.Timestamp);
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return `${log.Name} (${timeStr})`;
      });

      // Leaderboard
      const medals = ['🥇', '🥈', '🥉'];
      const leaderboard = deptIns.length > 0
        ? deptIns.map((log, i) => {
            const emoji = medals[i] || '🏅';
            const time = formatTime(parseTimestampLocal(log.Timestamp));
            return `${emoji} ${log.Name} (${time})`;
          }).join('\n')
        : 'ยังไม่มีผู้เช็คอินวันนี้';

      // Build Report Message
      const msgParts = [
        `📊 *สรุปการลงเวลาเข้า* ประจำวันที่ ${dateStr}`,
        '',
        '🏆 *Leaderboard (เข้างาน)*',
        leaderboard,
        '',
        '📈 *สถิติ*',
        `✅ เข้างานแล้ว: ${deptIns.length} คน`,
        `❌ ยังไม่เข้า: ${notCheckedIn.length} คน`
      ];

      if (avgTime) {
        msgParts.push(`⏰ เฉลี่ยเวลาเข้า: ${avgTime}`);
      }

      if (lateArrivals.length > 0) {
        msgParts.push('');
        msgParts.push('⚠️ *มาสาย (หลัง 8:00)*');
        msgParts.push(lateArrivals.join('\n'));
      }

      if (notCheckedIn.length > 0 && notCheckedIn.length <= 10) {
        msgParts.push('');
        msgParts.push('📋 *ยังไม่ลงเวลา*');
        msgParts.push(notCheckedIn.join(', '));
      }

      const msg = msgParts.join('\n');
      const cfg = telegramChat[dept];

      if (cfg && cfg.chat_id) {
        try {
          await pushToTelegram(cfg.chat_id, msg, cfg.thread_id);
          await writeLog(tableIds['system_logs'], dept, cfg.chat_id, 'daily_summary_success', dateStr);
        } catch (err) {
          await writeLog(tableIds['system_logs'], dept, cfg.chat_id, 'daily_summary_error', err.toString());
        }
      }
    }

    console.log('✅ Scheduled Morning Daily Summary Cron Completed Successfully.');
    return { statusCode: 200, body: 'Daily Summary Completed' };

  } catch (error) {
    console.error('❌ Morning Summary Cron Error:', error);
    return { statusCode: 500, body: 'Error: ' + error.message };
  }
};
