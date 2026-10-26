// 구조화 출력 전용 프록시: 정해진 스키마 이름만 허용, 입력 크기 제한
const { cors, guard, OA, auth } = require('./_lib');
const NAMES = new Set(['lecture_eval', 'book_split', 'curriculum_tags']);
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'POST only' } });
  if (!guard(req, res)) return;
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { system, user, name, schema } = b;
    if (!NAMES.has(name)) return res.status(400).json({ error: { message: 'unknown task' } });
    if (JSON.stringify(b).length > 120000) return res.status(413).json({ error: { message: '입력이 너무 길어요' } });
    const model = process.env.LLM_MODEL || 'gpt-6-luna';
    const r = await fetch(OA + '/chat/completions', { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: String(system || '') }, { role: 'user', content: String(user || '') }],
        response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } }, ...(/^(gpt-[5-9]|o[1-9])/.test(model) ? { reasoning_effort: 'low' } : {}) }) });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: { message: j.error?.message || 'OpenAI 오류' } });
    const msg = j.choices?.[0]?.message;
    if (!msg || msg.refusal) return res.status(422).json({ error: { message: msg?.refusal || '응답이 비어 있어요' } });
    res.status(200).json({ content: JSON.parse(msg.content), model: j.model });
  } catch (e) { res.status(500).json({ error: { message: e.message } }); }
};
