export default function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { zone, stats = {}, isCompare, compareStats } = req.body || {};
    const n = Number(stats.n) || 0;
    if (n === 0) {
      return res.json({ comment: 'データが見つかりません。スカウティングCSVをアップロードしてください。' });
    }

    const parts = [];
    parts.push(zone ? `Zone ${zone}: ${n} plays analyzed.` : `${n} plays analyzed.`);
    if (stats.bt !== undefined) parts.push(`Big-plays estimate: ${stats.bt}.`);
    if (Array.isArray(stats.cov) && stats.cov.length) {
      const top = stats.cov[0];
      const pct = Math.round((top[1] || 0) * 100);
      parts.push(`Most common coverage: ${top[0]} (${pct}%).`);
    }
    if (isCompare && compareStats && Number(compareStats.n)) {
      parts.push(`Compared to post-game data: ${compareStats.n} plays.`);
    }

    if (n < 20) {
      parts.push('注意: サンプル数が少ないため、分析結果は参考値です。');
    } else if ((stats.bp || 0) > 0.15) {
      parts.push('洞察: ビッグプレーが多めです。リスク管理を検討してください。');
    } else {
      parts.push('洞察: 全体的に安定した守備傾向です。');
    }

    const comment = parts.join('\n');
    return res.json({ comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
}
