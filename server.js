const http = require('http');

function summarize(body) {
  const { zone, stats = {}, isCompare, compareStats } = body || {};
  const n = Number(stats.n) || 0;
  if (n === 0) return { comment: 'データが見つかりません。スカウティングCSVをアップロードしてください。' };

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
  return { comment: parts.join('\n') };
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/analyze') {
    let buf = '';
    req.on('data', (c) => buf += c);
    req.on('end', () => {
      try {
        const body = JSON.parse(buf || '{}');
        const out = summarize(body);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(out));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
  res.end('Not found');
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log('Local analyze API listening on http://localhost:' + port + '/api/analyze'));
