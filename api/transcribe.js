// 음성 조각(4MB 이하) 받아쓰기 프록시. 본문은 원본 바이트, 파일 이름·프롬프트는 쿼리로.
const { cors, guard, OA, auth } = require('./_lib');
module.exports.config = { api: { bodyParser: false } };
async function readBody(req) { const chunks = []; let n = 0; for await (const c of req) { n += c.length; if (n > 4.4 * 1048576) throw Object.assign(new Error('조각이 너무 커요'), { code: 413 }); chunks.push(c); } return Buffer.concat(chunks); }
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'POST only' } });
  if (!guard(req, res, 2)) return;
  try {
    const buf = await readBody(req);
    const name = String(req.query?.name || 'audio.wav').slice(0, 80), type = req.headers['content-type'] || 'audio/wav';
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type }), name);
    fd.append('model', process.env.STT_MODEL || 'whisper-1'); fd.append('language', 'ko');
    fd.append('response_format', 'verbose_json'); fd.append('timestamp_granularities[]', 'segment');
    if (req.query?.prompt) fd.append('prompt', String(req.query.prompt).slice(0, 400));
    const r = await fetch(OA + '/audio/transcriptions', { method: 'POST', headers: auth(), body: fd });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: { message: j.error?.message || 'OpenAI 오류' } });
    res.status(200).json(j);
  } catch (e) { res.status(e.code || 500).json({ error: { message: e.message } }); }
};
