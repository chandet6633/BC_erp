// ── main.gs ──────────────────────────────────────────────────────────────────
// Assumes config.gs has already defined:
//   SHEET_ID, NAMELIST_SHEET, ATTEND_SHEET, STORE_SHEET, LOGGER_SHEET, LEAVE_SHEET,
//   TELEGRAM_TOKEN, TELEGRAM_CHAT (with both main and _ห้องลางาน keys)

// ── Helper: lookup chat + thread ──────────────────────────────────────────────
function getChatConfig(key) {
  var cfg = TELEGRAM_CHAT[key] || TELEGRAM_CHAT.default;
  if (!TELEGRAM_CHAT[key]) {
    writeLogger(key, cfg ? cfg.chat_id : '', 'telegram_debug', 'fallback to default');
  }
  return cfg;
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function pushToTelegram(chatId, text, threadId) {
  if (!chatId || !TELEGRAM_TOKEN) return;
  
  var url = 'https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendMessage';
  var payload = {
    chat_id:    chatId,
    text:       text,
    parse_mode: 'Markdown'
  };
  if (threadId !== undefined && threadId !== null) {
    payload.message_thread_id = threadId;
  }
  
  try {
    UrlFetchApp.fetch(url, {
      method:      'post',
      contentType: 'application/json',
      payload:     JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    writeLogger('telegram', chatId, 'telegram_fetch_error', e.toString());
  }
}

function writeLogger(dept, chatId, status, info) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName(LOGGER_SHEET) || ss.insertSheet(LOGGER_SHEET);
    if (sh.getLastRow() === 0) {
      sh.appendRow(['Timestamp','Department','ChatID','Status','Info']);
    }
    sh.appendRow([ new Date(), dept || '', chatId || '', status || '', info || '' ]);
  } catch (e) {
    // Silent fail for logger
  }
}

function haversine(lat1, lon1, lat2, lon2) {
  var toRad = function(r) { return r * Math.PI / 180; };
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var a = Math.pow(Math.sin(dLat / 2), 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.pow(Math.sin(dLon / 2), 2);
  return 2 * 6371000 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findStore(lat, lon) {
  if (isNaN(lat) || isNaN(lon)) return null;
  
  var rows = SpreadsheetApp.openById(SHEET_ID)
            .getSheetByName(STORE_SHEET)
            .getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    var name = rows[i][0];
    var sLat = parseFloat(rows[i][1]);
    var sLon = parseFloat(rows[i][2]);
    var radius = parseFloat(rows[i][3]) || 200;
    
    if (!isNaN(sLat) && !isNaN(sLon) && haversine(lat, lon, sLat, sLon) <= radius) {
      return { name: name };
    }
  }
  return null;
}

// ── Input Sanitization ────────────────────────────────────────────────────────
function sanitizeString(str) {
  if (!str) return '';
  return String(str).trim().replace(/[<>]/g, '');
}

function sanitizeType(type) {
  type = String(type).toUpperCase().trim();
  return (type === 'IN' || type === 'OUT') ? type : null;
}

// ── Leaderboards ──────────────────────────────────────────────────────────────
function getTodayStart() {
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function buildLeaderboard(dept, type) {
  type = type || 'IN';
  var all = SpreadsheetApp.openById(SHEET_ID)
             .getSheetByName(ATTEND_SHEET)
             .getDataRange().getValues().slice(1);
  var today = getTodayStart();
  
  var logs = all
    .filter(function(r) { return r[0] >= today && r[2] === dept && r[3] === type; })
    .sort(function(a, b) { return a[0] - b[0]; });
  
  if (!logs.length) {
    return type === 'IN' ? 'ยังไม่มีผู้เช็คอินวันนี้' : 'ยังไม่มีผู้เช็คเอาท์วันนี้';
  }
  
  var medals = ['🥇', '🥈', '🥉'];
  return logs.map(function(r, i) {
    var emoji = medals[i] || '🏅';
    var time = Utilities.formatDate(r[0], Session.getScriptTimeZone(), 'HH:mm:ss');
    return emoji + ' ' + r[1] + ' (' + time + ')';
  }).join('\n');
}

function buildCheckoutLeaderboard(dept) {
  return buildLeaderboard(dept, 'OUT');
}

// ── Department Statistics ─────────────────────────────────────────────────────
function getDeptStats(dept) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Get all employees in department
  var namelistData = ss.getSheetByName(NAMELIST_SHEET).getDataRange().getValues().slice(1);
  var deptEmployees = namelistData.filter(function(r) { return r[3] === dept; });
  var totalEmployees = deptEmployees.length;
  
  // Get today's check-ins
  var attendData = ss.getSheetByName(ATTEND_SHEET).getDataRange().getValues().slice(1);
  var today = getTodayStart();
  
  var checkedIn = attendData.filter(function(r) {
    return r[0] >= today && r[2] === dept && r[3] === 'IN';
  });
  
  var checkedInNames = checkedIn.map(function(r) { return r[1]; });
  
  // Find who hasn't checked in
  var notCheckedIn = deptEmployees.filter(function(emp) {
    return checkedInNames.indexOf(emp[1]) === -1;
  }).map(function(emp) { return emp[1]; });
  
  // Calculate average check-in time
  var avgTime = null;
  if (checkedIn.length > 0) {
    var totalMinutes = checkedIn.reduce(function(sum, r) {
      var d = new Date(r[0]);
      return sum + d.getHours() * 60 + d.getMinutes();
    }, 0);
    var avgMinutes = Math.round(totalMinutes / checkedIn.length);
    var avgH = Math.floor(avgMinutes / 60);
    var avgM = avgMinutes % 60;
    avgTime = (avgH < 10 ? '0' : '') + avgH + ':' + (avgM < 10 ? '0' : '') + avgM;
  }
  
  // Find late arrivals (after 8:00 AM)
  var lateArrivals = checkedIn.filter(function(r) {
    var d = new Date(r[0]);
    var minutes = d.getHours() * 60 + d.getMinutes();
    // > 8:00 AM (8*60 = 480 minutes)
    return minutes > 480;
  }).map(function(r) {
    var time = Utilities.formatDate(r[0], Session.getScriptTimeZone(), 'HH:mm');
    return r[1] + ' (' + time + ')';
  });
  
  return {
    total: totalEmployees,
    checkedIn: checkedIn.length,
    notCheckedIn: notCheckedIn,
    lateArrivals: lateArrivals,
    avgTime: avgTime
  };
}

// ── Daily Summary (Triggered at 9:00 AM) ──────────────────────────────────────
function sendDailySummary() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var depts = getDepartments();
  var today = new Date();
  var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'd MMM yyyy');
  
  depts.forEach(function(dept) {
    // Skip testroom
    if (dept.toLowerCase().indexOf('test') !== -1) return;
    
    var stats = getDeptStats(dept);
    var leaderboard = buildLeaderboard(dept, 'IN');
    
    var msgParts = [
      '📊 *สรุปการลงเวลาเข้า* ประจำวันที่ ' + dateStr,
      '',
      '🏆 *Leaderboard (เข้างาน)*',
      leaderboard,
      '',
      '📈 *สถิติ*',
      '✅ เข้างานแล้ว: ' + stats.checkedIn + ' คน',
      '❌ ยังไม่เข้า: ' + stats.notCheckedIn.length + ' คน'
    ];
    
    if (stats.avgTime) {
      msgParts.push('⏰ เฉลี่ยเวลาเข้า: ' + stats.avgTime);
    }
    
    // Add late arrivals if any
    if (stats.lateArrivals.length > 0) {
      msgParts.push('');
      msgParts.push('⚠️ *มาสาย (หลัง 8:00)*');
      msgParts.push(stats.lateArrivals.join('\n'));
    }
    
    // Add absent list if any
    if (stats.notCheckedIn.length > 0 && stats.notCheckedIn.length <= 10) {
      msgParts.push('');
      msgParts.push('📋 *ยังไม่ลงเวลา*');
      msgParts.push(stats.notCheckedIn.join(', '));
    }
    
    var msg = msgParts.join('\n');
    var cfg = getChatConfig(dept);
    
    if (cfg && cfg.chat_id) {
      try {
        pushToTelegram(cfg.chat_id, msg, cfg.thread_id);
        writeLogger(dept, cfg.chat_id, 'daily_summary_success', dateStr);
      } catch (err) {
        writeLogger(dept, cfg.chat_id, 'daily_summary_error', err.toString());
      }
    }
  });
}

// ── Checkout Statistics ───────────────────────────────────────────────────────
function getDeptCheckoutStats(dept) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Get all employees in department
  var namelistData = ss.getSheetByName(NAMELIST_SHEET).getDataRange().getValues().slice(1);
  var deptEmployees = namelistData.filter(function(r) { return r[3] === dept; });
  var totalEmployees = deptEmployees.length;
  
  // Get today's attendance data
  var attendData = ss.getSheetByName(ATTEND_SHEET).getDataRange().getValues().slice(1);
  var today = getTodayStart();
  
  // Get check-ins today
  var checkIns = attendData.filter(function(r) {
    return r[0] >= today && r[2] === dept && r[3] === 'IN';
  });
  
  // Get check-outs today
  var checkOuts = attendData.filter(function(r) {
    return r[0] >= today && r[2] === dept && r[3] === 'OUT';
  });
  
  var checkedOutNames = checkOuts.map(function(r) { return r[1]; });
  
  // Find who checked in but hasn't checked out yet
  var notCheckedOut = checkIns.filter(function(cin) {
    return checkedOutNames.indexOf(cin[1]) === -1;
  }).map(function(cin) { return cin[1]; });
  
  // Calculate average checkout time
  var avgTime = null;
  if (checkOuts.length > 0) {
    var totalMinutes = checkOuts.reduce(function(sum, r) {
      var d = new Date(r[0]);
      return sum + d.getHours() * 60 + d.getMinutes();
    }, 0);
    var avgMinutes = Math.round(totalMinutes / checkOuts.length);
    var avgH = Math.floor(avgMinutes / 60);
    var avgM = avgMinutes % 60;
    avgTime = (avgH < 10 ? '0' : '') + avgH + ':' + (avgM < 10 ? '0' : '') + avgM;
  }
  
  // Calculate work hours for each employee
  var workHours = [];
  checkOuts.forEach(function(cout) {
    var checkin = checkIns.find(function(cin) { return cin[1] === cout[1]; });
    if (checkin) {
      var diff = (new Date(cout[0]) - new Date(checkin[0])) / (1000 * 60 * 60);
      workHours.push({
        name: cout[1],
        hours: diff.toFixed(1),
        checkin: Utilities.formatDate(checkin[0], Session.getScriptTimeZone(), 'HH:mm'),
        checkout: Utilities.formatDate(cout[0], Session.getScriptTimeZone(), 'HH:mm')
      });
    }
  });
  
  // Sort by checkout time (earliest first)
  workHours.sort(function(a, b) { return parseFloat(a.hours) - parseFloat(b.hours); });
  
  // Find overtime (more than 9 hours)
  var overtime = workHours.filter(function(w) { return parseFloat(w.hours) > 9; });
  
  return {
    totalEmployees: totalEmployees,
    checkedIn: checkIns.length,
    checkedOut: checkOuts.length,
    notCheckedOut: notCheckedOut,
    avgTime: avgTime,
    workHours: workHours,
    overtime: overtime
  };
}

// ── Daily Checkout Summary (Triggered at 6:00 PM) ─────────────────────────────
function sendDailyCheckoutSummary() {
  var depts = getDepartments();
  var today = new Date();
  var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'd MMM yyyy');
  
  depts.forEach(function(dept) {
    // Skip testroom
    if (dept.toLowerCase().indexOf('test') !== -1) return;
    
    var stats = getDeptCheckoutStats(dept);
    var leaderboard = buildLeaderboard(dept, 'OUT');
    
    var msgParts = [
      '📊 *สรุปการลงเวลาออก* ประจำวันที่ ' + dateStr,
      '',
      '🏆 *Leaderboard (ออกงาน)*',
      leaderboard,
      '',
      '📈 *สถิติ*',
      '✅ เข้างานวันนี้: ' + stats.checkedIn + ' คน',
      '🚪 ออกงานแล้ว: ' + stats.checkedOut + ' คน',
      '⏳ ยังไม่ออก: ' + stats.notCheckedOut.length + ' คน'
    ];
    
    if (stats.avgTime) {
      msgParts.push('⏰ เฉลี่ยเวลาออก: ' + stats.avgTime);
    }
    
    // Add not checked out list if any (max 10)
    if (stats.notCheckedOut.length > 0 && stats.notCheckedOut.length <= 10) {
      msgParts.push('');
      msgParts.push('📋 *ยังไม่ลงเวลาออก*');
      msgParts.push(stats.notCheckedOut.join(', '));
    }
    
    var msg = msgParts.join('\n');
    var cfg = getChatConfig(dept);
    
    if (cfg && cfg.chat_id) {
      try {
        pushToTelegram(cfg.chat_id, msg, cfg.thread_id);
        writeLogger(dept, cfg.chat_id, 'checkout_summary_success', dateStr);
      } catch (err) {
        writeLogger(dept, cfg.chat_id, 'checkout_summary_error', err.toString());
      }
    }
  });
}

// ── Dropdown APIs ─────────────────────────────────────────────────────────────
function getDepartments() {
  var cache = CacheService.getScriptCache();
  var key = 'depts';
  var hit = cache.get(key);
  
  if (hit) {
    try {
      return JSON.parse(hit);
    } catch (e) {
      // Cache corrupted, continue to rebuild
    }
  }
  
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(NAMELIST_SHEET);
  var lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return [];
  
  var vals = sheet.getRange(2, 4, lastRow - 1, 1).getValues().flat().filter(Boolean);
  var depts = [];
  vals.forEach(function(v) {
    if (depts.indexOf(v) === -1) depts.push(v);
  });
  
  cache.put(key, JSON.stringify(depts), 300);
  return depts;
}

function getNamesByDept(dept) {
  dept = sanitizeString(dept);
  if (!dept) return [];
  
  var cache = CacheService.getScriptCache();
  var key = 'names_' + dept;
  var hit = cache.get(key);
  
  if (hit) {
    try {
      return JSON.parse(hit);
    } catch (e) {
      // Cache corrupted, continue to rebuild
    }
  }
  
  var rows = SpreadsheetApp.openById(SHEET_ID)
            .getSheetByName(NAMELIST_SHEET)
            .getDataRange().getValues();
  
  var names = rows
    .filter(function(r, i) { return i > 0 && r[3] === dept; })
    .map(function(r) { return r[1]; });
  
  cache.put(key, JSON.stringify(names), 300);
  return names;
}

// ── Clear Cache (call after data changes) ─────────────────────────────────────
function clearCache() {
  var cache = CacheService.getScriptCache();
  cache.remove('depts');
  // Note: Can't easily clear all names_* keys, they will expire in 5 min
}

// ── Employee Attendance History ───────────────────────────────────────────────
function getEmployeeHistory(dept, name, limit) {
  dept = sanitizeString(dept);
  name = sanitizeString(name);
  limit = parseInt(limit) || 30;
  
  if (!dept || !name) return { error: 'Missing dept or name' };
  
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var attendData = ss.getSheetByName(ATTEND_SHEET).getDataRange().getValues().slice(1);
  
  // Filter for this employee
  var history = attendData
    .filter(function(r) { return r[2] === dept && r[1] === name; })
    .map(function(r) {
      return {
        date: Utilities.formatDate(r[0], Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        time: Utilities.formatDate(r[0], Session.getScriptTimeZone(), 'HH:mm:ss'),
        type: r[3],
        store: r[6] || ''
      };
    })
    .reverse() // Most recent first
    .slice(0, limit);
  
  // Calculate stats for this month
  var now = new Date();
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  var monthData = attendData.filter(function(r) {
    return r[2] === dept && r[1] === name && r[0] >= monthStart;
  });
  
  var checkIns = monthData.filter(function(r) { return r[3] === 'IN'; });
  // Late = after 7:45 AM (7*60 + 45 = 465 minutes)
  var lateCount = checkIns.filter(function(r) {
    var d = new Date(r[0]);
    var minutes = d.getHours() * 60 + d.getMinutes();
    return minutes > 465;
  }).length;
  
  return {
    history: history,
    stats: {
      thisMonth: {
        checkIns: checkIns.length,
        lateCount: lateCount,
        onTimeRate: checkIns.length > 0 ? Math.round((checkIns.length - lateCount) / checkIns.length * 100) : 0
      }
    }
  };
}

// ── Monthly Top Performers ────────────────────────────────────────────────────
// Scoring:
//  < 07:35: +10
//  < 07:50: +5
//  > 08:00: -5
//  07:50-08:00: 0
// Streaks: +2 every 3 consecutive on-time days (<= 08:00)
// Cached for 60 seconds
function getMonthlyTopPerformers(limit) {
  limit = parseInt(limit) || 20; // Increased default limit to allow expanding
  
  // Check cache first
  var cache = CacheService.getScriptCache();
  var cacheKey = 'topPerformers_v2_' + limit; // Changed key to invalid old cache
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }
  
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var attendData = ss.getSheetByName(ATTEND_SHEET).getDataRange().getValues().slice(1);
  
  var now = new Date();
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Group check-ins by employee
  var employeeRecords = {};
  
  attendData.forEach(function(r) {
    if (r[0] < monthStart || r[3] !== 'IN') return;
    
    var key = r[2] + '|' + r[1]; // dept|name
    if (!employeeRecords[key]) {
      employeeRecords[key] = { name: r[1], dept: r[2], records: [] };
    }
    employeeRecords[key].records.push(new Date(r[0]));
  });
  
  // Calculate scores and streaks
  var performers = Object.keys(employeeRecords).map(function(key) {
    var e = employeeRecords[key];
    var records = e.records.sort(function(a, b) { return a - b; }); // Sort by time
    
    var score = 0;
    var streak = 0;
    var maxStreak = 0;
    var totalMinutes = 0;
    
    records.forEach(function(d) {
      var minutes = d.getHours() * 60 + d.getMinutes();
      totalMinutes += minutes;
      
      // Base Score
      if (minutes < 455) { // < 07:35
        score += 10;
      } else if (minutes < 470) { // < 07:50
        score += 5;
      } else if (minutes > 480) { // > 08:00
        score -= 5;
      }
      // 07:50 - 08:00 = 0 points
      
      // Streak Calculation (On Time <= 08:00 / 480 min)
      if (minutes <= 480) {
        streak++;
        if (streak % 3 === 0) {
          score += 2; // Bonus every 3 days
        }
      } else {
        streak = 0; // Reset on late
      }
      if (streak > maxStreak) maxStreak = streak;
    });
    
    var avgMinutes = Math.round(totalMinutes / records.length);
    var avgH = Math.floor(avgMinutes / 60);
    var avgM = avgMinutes % 60;
    var avgTime = (avgH < 10 ? '0' : '') + avgH + ':' + (avgM < 10 ? '0' : '') + avgM;
    
    return {
      name: e.name,
      dept: e.dept,
      score: score,
      streak: streak, // Current streak
      avgTime: avgTime,
      total: records.length
    };
  });
  
  // Sort by score (highest first)
  performers.sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    // Secondary sort by streak
    if (b.streak !== a.streak) return b.streak - a.streak;
    return b.total - a.total;
  });
  
  var result = performers.slice(0, limit);
  
  cache.put(cacheKey, JSON.stringify(result), 60);
  
  return result;
}

// ── Department Ranking ────────────────────────────────────────────────────────
// On-time = check-in before 7:45 AM
// Cached for 60 seconds for performance
function getDepartmentRanking() {
  // Check cache first
  var cache = CacheService.getScriptCache();
  var cacheKey = 'deptRanking';
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }
  
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var attendData = ss.getSheetByName(ATTEND_SHEET).getDataRange().getValues().slice(1);
  var namelistData = ss.getSheetByName(NAMELIST_SHEET).getDataRange().getValues().slice(1);
  
  var now = new Date();
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Get departments
  var depts = getDepartments();
  
  var deptStats = depts.map(function(dept) {
    // Skip test rooms
    if (dept.toLowerCase().indexOf('test') !== -1) return null;
    
    // Count employees in department
    var employees = namelistData.filter(function(r) { return r[3] === dept; });
    var totalEmployees = employees.length;
    if (totalEmployees === 0) return null;
    
    // Count check-ins this month
    var checkIns = attendData.filter(function(r) {
      return r[0] >= monthStart && r[2] === dept && r[3] === 'IN';
    });
    
    // Late = after 8:00 AM (8*60 = 480 minutes)
    var lateCount = checkIns.filter(function(r) {
      var d = new Date(r[0]);
      var minutes = d.getHours() * 60 + d.getMinutes();
      return minutes > 480;
    }).length;
    
    var onTimeCount = checkIns.length - lateCount;
    var onTimeRate = checkIns.length > 0 ? Math.round(onTimeCount / checkIns.length * 100) : 0;
    
    // Working days this month (rough estimate: current day of month)
    var workDays = now.getDate();
    var expectedCheckIns = totalEmployees * workDays;
    var attendanceRate = expectedCheckIns > 0 ? Math.round(checkIns.length / expectedCheckIns * 100) : 0;
    
    return {
      dept: dept,
      employees: totalEmployees,
      checkIns: checkIns.length,
      onTimeRate: onTimeRate,
      attendanceRate: Math.min(attendanceRate, 100), // Cap at 100%
      score: onTimeRate * 0.6 + attendanceRate * 0.4 // Weighted score
    };
  }).filter(Boolean);
  
  // Sort by score
  deptStats.sort(function(a, b) { return b.score - a.score; });
  
  // Cache result for 60 seconds
  cache.put(cacheKey, JSON.stringify(deptStats), 60);
  
  return deptStats;
}

// ── Handlers ─────────────────────────────────────────────────────────────────
function handleLog(p) {
  // Acquire lock to prevent race conditions
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { status: 'fail', message: 'ระบบกำลังประมวลผล กรุณาลองใหม่' };
  }
  
  try {
    var dept     = sanitizeString(p.department);
    var name     = sanitizeString(p.name);
    var type     = sanitizeType(p.type);
    var isAdmin  = p.isAdmin === 'true' || p.isAdmin === true;
    var lat      = parseFloat(p.lat);
    var lon      = parseFloat(p.lon);
    
    // Validate required fields
    if (!dept || !name || !type) {
      return { status: 'fail', message: 'ข้อมูลไม่ครบถ้วน' };
    }
    
    var ss       = SpreadsheetApp.openById(SHEET_ID);
    var attendSh = ss.getSheetByName(ATTEND_SHEET);
    var now      = new Date();
    
    // Admin time override
    if (isAdmin && p.overrideTime) {
      var timeParts = String(p.overrideTime).split(':');
      if (timeParts.length >= 2) {
        now.setHours(parseInt(timeParts[0], 10) || 0);
        now.setMinutes(parseInt(timeParts[1], 10) || 0);
        now.setSeconds(0);
      }
    }
    
    // Admin date override
    if (isAdmin && p.overrideDate) {
      var dateParts = String(p.overrideDate).split('-');
      if (dateParts.length === 3) {
        now.setFullYear(parseInt(dateParts[0], 10));
        now.setMonth(parseInt(dateParts[1], 10) - 1);
        now.setDate(parseInt(dateParts[2], 10));
      }
    }
    
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Duplicate check (skip for admin)
    if (!isAdmin && attendSh) {
      var data = attendSh.getDataRange().getValues().slice(1);
      var dup = data.some(function(r) {
        return r[1] === name && r[3] === type && r[0] >= today;
      });
      if (dup) {
        writeLogger(dept, '', 'duplicate_' + type, name + ' already ' + type);
        return { status: 'fail', message: 'คุณได้ลงเวลา' + (type === 'IN' ? 'เข้า' : 'ออก') + 'แล้ววันนี้' };
      }
    }
    
    // Find store (skip for admin with location bypass)
    var storeObj = null;
    if (isAdmin) {
      // Admin can specify store or use "Admin Override"
      storeObj = { name: p.overrideStore || 'Admin Override' };
    } else {
      storeObj = findStore(lat, lon);
      if (!storeObj) {
        writeLogger(dept, '', 'fail', 'นอกพื้นที่ร้าน lat:' + lat + ' lon:' + lon);
        return { status: 'fail', message: 'นอกพื้นที่ร้าน' };
      }
    }
    
    // Create sheet if not exists
    if (!attendSh) {
      attendSh = ss.insertSheet(ATTEND_SHEET);
      attendSh.appendRow(['Timestamp', 'Name', 'Department', 'Type', 'Lat', 'Lon', 'Store', 'LoggedBy']);
    }
    
    // Append row
    attendSh.appendRow([
      now,
      name,
      dept,
      type,
      isAdmin ? '' : lat,
      isAdmin ? '' : lon,
      storeObj.name,
      isAdmin ? 'admin' : 'employee'
    ]);
    
    // Build response with leaderboard
    var leaderboard = buildLeaderboard(dept, type);
    
    // Log success
    writeLogger(dept, '', 'log_success_' + type, name + ' at ' + storeObj.name + (isAdmin ? ' (admin)' : ''));
    
    return {
      status: 'success',
      store: storeObj.name,
      leaderboard: leaderboard,
      isAdmin: isAdmin
    };
    
  } finally {
    lock.releaseLock();
  }
}

function handleLeave(p) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { result: 'fail', message: 'ระบบกำลังประมวลผล กรุณาลองใหม่' };
  }
  
  try {
    var ss  = SpreadsheetApp.openById(SHEET_ID);
    var sh  = ss.getSheetByName(LEAVE_SHEET) || ss.insertSheet(LEAVE_SHEET);
    var now = new Date();
    
    // Sanitize inputs
    var dept      = sanitizeString(p.department);
    var fullName  = sanitizeString(p.fullName);
    var startDate = sanitizeString(p.startDate);
    var endDate   = sanitizeString(p.endDate);
    var totalDays = sanitizeString(p.totalDays);
    var leaveType = sanitizeString(p.leaveType);
    var reason    = sanitizeString(p.reason);
    
    if (!dept || !fullName || !startDate) {
      return { result: 'fail', message: 'ข้อมูลไม่ครบถ้วน' };
    }
    
    // Check for duplicate
    if (sh.getLastRow() > 0) {
      var data = sh.getDataRange().getValues().slice(1);
      var dup = data.some(function(r) {
        return r[2] === fullName && r[3] === startDate && r[4] === endDate;
      });
      if (dup) {
        return { result: 'duplicate', message: 'ใบลานี้ส่งไปแล้ว' };
      }
    }
    
    if (sh.getLastRow() === 0) {
      sh.appendRow([
        'Timestamp', 'Department', 'Name-นามสกุล',
        'StartDate', 'EndDate', 'TotalDays', 'LeaveType', 'Reason'
      ]);
    }
    
    sh.appendRow([
      now,
      dept,
      fullName,
      startDate,
      endDate,
      totalDays,
      leaveType,
      reason
    ]);
    
    // Build leave message
    var text = [
      '📌 *คำขอวันลาใหม่*',
      '👤 ชื่อ-นามสกุล: ' + fullName,
      '🏢 แผนก: ' + dept,
      '📅 วันที่ลา: ' + startDate + ' ถึง ' + endDate,
      '📊 จำนวนวัน: ' + totalDays,
      '📝 สาเหตุ: ' + leaveType,
      reason ? '💬 เหตุผลเพิ่มเติม: ' + reason : ''
    ].filter(Boolean).join('\n');
    
    // Lookup leave-topic config
    var leaveKey = dept + '_ห้องลางาน';
    var cfg = getChatConfig(leaveKey);
    
    if (cfg && cfg.chat_id) {
      try {
        pushToTelegram(cfg.chat_id, text, cfg.thread_id);
        writeLogger(dept, cfg.chat_id, 'telegram_leave_success', fullName);
      } catch (err) {
        writeLogger(dept, cfg.chat_id, 'telegram_leave_error', err.toString());
      }
    }
    
    return { result: 'success' };
    
  } finally {
    lock.releaseLock();
  }
}

// ── Entry Points ─────────────────────────────────────────────────────────────
function doGet(e) {
  var cb      = e.parameter.callback;
  var action  = e.parameter.action;
  var payload;
  
  try {
    switch (action) {
      case 'getDepartments':
        payload = getDepartments();
        break;
      case 'getNamesByDept':
        payload = getNamesByDept(e.parameter.dept);
        break;
      case 'log':
        payload = handleLog(e.parameter);
        break;
      case 'submitLeave':
        payload = handleLeave(e.parameter);
        break;
      case 'getStats':
        payload = getDeptStats(sanitizeString(e.parameter.dept));
        break;
      case 'getEmployeeHistory':
        payload = getEmployeeHistory(e.parameter.dept, e.parameter.name, e.parameter.limit);
        break;
      case 'getTopPerformers':
        payload = getMonthlyTopPerformers(e.parameter.limit);
        break;
      case 'getDeptRanking':
        payload = getDepartmentRanking();
        break;
      default:
        payload = { error: 'unknown action' };
    }
  } catch (err) {
    payload = { error: 'exception', message: err.toString() };
    writeLogger('api', '', 'api_error', err.toString());
  }
  
  var out = cb
    ? cb + '(' + JSON.stringify(payload) + ');'
    : JSON.stringify(payload);
  
  return ContentService
    .createTextOutput(out)
    .setMimeType(cb ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function doPost(e) {
  var action = e.parameter.action;
  var payload;
  
  try {
    if (action === 'submitLeave') {
      payload = handleLeave(e.parameter);
    } else if (action === 'log') {
      payload = handleLog(e.parameter);
    } else {
      payload = { error: 'unknown action' };
    }
  } catch (err) {
    payload = { error: 'exception', message: err.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Trigger Setup Instructions ────────────────────────────────────────────────
// To set up the daily summaries, you need to create TWO triggers:
//
// TRIGGER 1: Check-in Summary (9:00 AM)
// 1. Go to Apps Script Editor
// 2. Click on "Triggers" (clock icon) in left sidebar
// 3. Click "+ Add Trigger"
// 4. Choose function: sendDailySummary
// 5. Event source: Time-driven
// 6. Type: Day timer
// 7. Time of day: 9am to 10am
// 8. Click Save
//
// TRIGGER 2: Checkout Summary (6:00 PM)  
// 1. Click "+ Add Trigger" again
// 2. Choose function: sendDailyCheckoutSummary
// 3. Event source: Time-driven
// 4. Type: Day timer
// 5. Time of day: 6pm to 7pm
// 6. Click Save
