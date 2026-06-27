const axios = require('axios');

const MAX_LOGS = 500;
const _memLogs = []; // in-memory fallback khi không có Redis

async function redisCmd(...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/['"]/g, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.replace(/['"]/g, '');
  if (!url || !token) return null;
  try {
    const res = await axios.post(url, args, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    return res.data.result;
  } catch (err) {
    console.error('[Redis]', err.message);
    return null;
  }
}

async function addLog(entry) {
  const log = { ...entry, timestamp: new Date().toISOString() };

  const pushed = await redisCmd('LPUSH', 'dailoc_msg_log', JSON.stringify(log));
  if (pushed !== null) {
    await redisCmd('LTRIM', 'dailoc_msg_log', 0, MAX_LOGS - 1);
  } else {
    _memLogs.unshift(log);
    if (_memLogs.length > MAX_LOGS) _memLogs.length = MAX_LOGS;
  }
}

async function getLogs(limit = 50) {
  const raw = await redisCmd('LRANGE', 'dailoc_msg_log', 0, limit - 1);
  if (raw) {
    return raw.map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
  }
  return _memLogs.slice(0, limit);
}

module.exports = { addLog, getLogs };