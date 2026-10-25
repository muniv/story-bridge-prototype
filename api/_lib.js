// 공통: CORS(GitHub Pages·Vercel 주소만), 입장 코드, 간단한 사용량 제한
const ALLOW = [/^https:\/\/muniv\.github\.io$/, /^https:\/\/[a-z0-9-]+\.vercel\.app$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const hits = new Map(); // 함수 인스턴스 단위의 대략적 제한 (프로토타입용)
function cors(req, res) {
  const o = req.headers.origin || '';
  if (ALLOW.some(r => r.test(o))) res.setHeader('Access-Control-Allow-Origin', o);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Demo-Code');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}
function guard(req, res, cost = 1) {
  const need = process.env.DEMO_CODE;
  if (need && (req.headers['x-demo-code'] || '') !== need) { res.status(401).json({ error: { message: '입장 코드가 맞지 않아요' } }); return false; }
  if (!process.env.OPENAI_API_KEY) { res.status(503).json({ error: { message: '서버에 OpenAI 키가 아직 없어요' } }); return false; }
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const now = Date.now(), w = 10 * 60 * 1000, lim = +(process.env.RATE_LIMIT || 120);
  const h = (hits.get(ip) || []).filter(t => now - t < w); for (let i = 0; i < cost; i++) h.push(now); hits.set(ip, h);
  if (h.length > lim) { res.status(429).json({ error: { message: '잠시 뒤에 다시 해 주세요 (사용량 제한)' } }); return false; }
  return true;
}
const OA = 'https://api.openai.com/v1';
const auth = () => ({ Authorization: 'Bearer ' + process.env.OPENAI_API_KEY });
module.exports = { cors, guard, OA, auth };
