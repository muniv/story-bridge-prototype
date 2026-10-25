const { cors } = require('./_lib');
module.exports = (req, res) => { if (cors(req, res)) return; res.status(200).json({ ok: true, server: true, key: !!process.env.OPENAI_API_KEY, code: !!process.env.DEMO_CODE }); };
