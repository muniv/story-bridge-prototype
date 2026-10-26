// 장면 그림 생성 프록시 (기준 그림 있으면 edits, 없으면 generations)
const { cors, guard, OA, auth } = require('./_lib');
module.exports.config = { api: { bodyParser: { sizeLimit: '4mb' } } };
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'POST only' } });
  if (!guard(req, res, 3)) return;
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const model = process.env.IMAGE_MODEL || 'gpt-image-2.5-flare', quality = ['low', 'medium', 'high'].includes(b.quality) ? b.quality : 'low';
    const prompt = String(b.prompt || '').slice(0, 3000); let r;
    if (b.ref && /^data:image\//.test(b.ref)) {
      const [h, d] = b.ref.split(','); const mime = h.match(/data:(.*?);/)[1];
      const fd = new FormData(); fd.append('model', model); fd.append('prompt', prompt); fd.append('size', '1024x1024'); fd.append('quality', quality);
      fd.append('image[]', new Blob([Buffer.from(d, 'base64')], { type: mime }), mime.includes('jpeg') ? 'character.jpg' : 'character.png');
      r = await fetch(OA + '/images/edits', { method: 'POST', headers: auth(), body: fd });
    } else {
      r = await fetch(OA + '/images/generations', { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt, size: '1024x1024', quality, n: 1 }) });
    }
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: { message: j.error?.message || 'OpenAI 오류' } });
    res.status(200).json({ b64: j.data[0].b64_json });
  } catch (e) { res.status(500).json({ error: { message: e.message } }); }
};
