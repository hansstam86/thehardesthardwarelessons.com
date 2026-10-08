// Leaderboard API. Scores are client-reported, so this is a casual board: bounded, rate-limited, one row per player per chapter.
const MAX = { 1: 100000, 2: 100000, 3: 100000, 4: 100000, 5: 100000, 6: 100000 }; // loose sanity caps; tighten once real maxima are known
const ORIGINS = ['https://www.thehardesthardwarelessons.com', 'https://thehardesthardwarelessons.com'];

const cors = (req) => {
  const o = req.headers.get('origin') || '';
  const ok = ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return { 'access-control-allow-origin': ok ? o : ORIGINS[0], 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS', vary: 'origin' };
};
const json = (req, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors(req) } });
const clean = (n) => String(n || '').replace(/[^\p{L}\p{N} ._\-]/gu, '').trim().slice(0, 20);
const short = (pid) => pid.slice(0, 8);

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
    const url = new URL(req.url);
    const now = Date.now();

    if (req.method === 'POST' && url.pathname === '/score') {
      let b; try { b = await req.json(); } catch { return json(req, { error: 'bad json' }, 400); }
      const name = clean(b.name), pid = String(b.pid || '');
      // accept one score {ch,score} or a full set {bests:{ch:score}}
      const entries = b.bests && typeof b.bests === 'object' ? Object.entries(b.bests) : [[b.ch, b.score]];
      const list = entries.map(([c, v]) => [Number(c), Math.round(Number(v))]).filter(([c, v]) => MAX[c] && v >= 0 && v <= MAX[c]);
      if (!/^[0-9a-f]{32}$/.test(pid) || !name || !list.length) return json(req, { error: 'invalid' }, 400);

      // rate limit: at most 1 write per 2s per player
      const last = await env.DB.prepare('SELECT updated FROM players WHERE pid=?').bind(pid).first();
      if (last && now - last.updated < 2000) return json(req, { error: 'slow down' }, 429);

      await env.DB.batch([
        env.DB.prepare('INSERT INTO players (pid,name,updated) VALUES (?,?,?) ON CONFLICT(pid) DO UPDATE SET name=excluded.name, updated=excluded.updated').bind(pid, name, now),
        ...list.map(([ch, score]) => env.DB.prepare('INSERT INTO scores (pid,ch,score,updated) VALUES (?,?,?,?) ON CONFLICT(pid,ch) DO UPDATE SET score=MAX(score,excluded.score), updated=CASE WHEN excluded.score>score THEN excluded.updated ELSE updated END').bind(pid, ch, score, now)),
      ]);
      return json(req, { ok: true, saved: list.length });
    }

    if (req.method === 'GET' && url.pathname === '/top') {
      const ch = url.searchParams.get('ch'); // 1-6 or "all"
      const pid = url.searchParams.get('pid') || '';
      let rows, me = null;
      if (ch === 'all') {
        const q = 'SELECT p.pid, p.name, SUM(s.score) AS score, COUNT(*) AS games FROM scores s JOIN players p USING(pid) GROUP BY p.pid ORDER BY score DESC, games DESC LIMIT 50';
        rows = (await env.DB.prepare(q).all()).results;
        if (/^[0-9a-f]{32}$/.test(pid)) me = await env.DB.prepare('WITH t AS (SELECT pid, SUM(score) sc FROM scores GROUP BY pid) SELECT sc AS score, (SELECT COUNT(*)+1 FROM t t2 WHERE t2.sc>t.sc) AS rank FROM t WHERE pid=?').bind(pid).first();
      } else {
        const n = Number(ch); if (!MAX[n]) return json(req, { error: 'bad chapter' }, 400);
        rows = (await env.DB.prepare('SELECT p.pid, p.name, s.score FROM scores s JOIN players p USING(pid) WHERE s.ch=? ORDER BY s.score DESC, s.updated ASC LIMIT 50').bind(n).all()).results;
        if (/^[0-9a-f]{32}$/.test(pid)) me = await env.DB.prepare('SELECT score, (SELECT COUNT(*)+1 FROM scores s2 WHERE s2.ch=s.ch AND s2.score>s.score) AS rank FROM scores s WHERE pid=? AND ch=?').bind(pid, n).first();
      }
      return json(req, { rows: rows.map((r) => ({ id: short(r.pid), name: r.name, score: r.score, games: r.games })), me });
    }

    return json(req, { error: 'not found' }, 404);
  },
};
