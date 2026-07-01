// Vercel Serverless Function: ASK AI の利用ログを外部 Webhook（Google スプレッドシート等）へ転送。
// - LOG_WEBHOOK_URL（Vercel 環境変数）が未設定なら「何もしない」安全な no-op。
// - ログ送信の失敗でアプリ本体を絶対に壊さない（常に 200 を返す）。
// - オーナーは Webhook 先（スプレッドシート）を開けば、全員が入力した内容を裏で閲覧できる。
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.LOG_WEBHOOK_URL;
  if (!url) return res.status(200).json({ ok: false, skipped: true }); // 未設定なら no-op

  try {
    const b = req.body || {};
    const entry = {
      ts: new Date().toISOString(),
      screen: String(b.screen || '').slice(0, 24),      // 'ask'（スカウティング）/ 'cmp'（試合後）
      visitor: String(b.visitor || '').slice(0, 40),    // 端末ごとの匿名ID
      question: String(b.question || '').slice(0, 2000),
      answer: String(b.answer || '').slice(0, 4000)
    };
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message }); // ログ失敗は握りつぶす
  }
}
