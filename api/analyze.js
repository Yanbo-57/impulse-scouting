// Vercel Serverless Function
// Claude API へのプロキシ（APIキーをサーバー側で管理）

export default async function handler(req, res) {
  // CORS ヘッダー
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'APIキーが設定されていません。Vercelの環境変数を確認してください。' });
  }

  try {
    const { zone, stats, compareStats, isCompare } = req.body;

    // ===== プロンプト構築 =====
    let prompt = '';

    if (isCompare && compareStats) {
      // 比較分析プロンプト
      prompt = `あなたはアメリカンフットボールの優秀なオフェンスコーチです。
以下は事前スカウティングと実際の試合後データの比較分析結果です。
コーチとして、この違いから何を読み取り、次の試合に向けてどう対策すべきかを分析してください。

【ゾーン】${zone === 'ALL' ? '全体' : zone + ' ZONE'}

【事前スカウティング】
- 総プレー数: ${stats.n}P
- ブリッツ率: ${stats.bp}%（${stats.bn}件）
- スタント率: ${stats.sp}%（${stats.sn}件）
- 主要カバレッジ: ${stats.cov.slice(0,5).map(x => x[0] + '(' + x[1] + '件)').join(', ')}
- ブリッツ方向: BOUNDARY ${stats.bt.BOUNDARY}件 / FIELD ${stats.bt.FIELD}件 / BOTH ${stats.bt.BOTH}件
- 主要ブリッツ種別: ${stats.blitz.slice(0,5).map(x => x[0] + '×' + x[1]).join(', ')}
- 主要フロント: ${stats.front.slice(0,4).map(x => x[0] + '(' + x[1] + '件)').join(', ')}

【試合後実績】
- 総プレー数: ${compareStats.n}P
- ブリッツ率: ${compareStats.bp}%（${compareStats.bn}件）
- スタント率: ${compareStats.sp}%（${compareStats.sn}件）
- 主要カバレッジ: ${compareStats.cov.slice(0,5).map(x => x[0] + '(' + x[1] + '件)').join(', ')}
- ブリッツ方向: BOUNDARY ${compareStats.bt.BOUNDARY}件 / FIELD ${compareStats.bt.FIELD}件 / BOTH ${compareStats.bt.BOTH}件
- 主要ブリッツ種別: ${compareStats.blitz.slice(0,5).map(x => x[0] + '×' + x[1]).join(', ')}
- 主要フロント: ${compareStats.front.slice(0,4).map(x => x[0] + '(' + x[1] + '件)').join(', ')}

以下の観点で分析してください（日本語で、箇条書きを使わず自然な文章で300字程度）：
1. スカウティングと実際の最大の違いは何か
2. 相手が試合中に修正・変更してきた点はあるか
3. 次の試合に向けた具体的なオフェンス対策`;

    } else {
      // スカウティング単体分析プロンプト
      prompt = `あなたはアメリカンフットボールの優秀なオフェンスコーチです。
以下は相手ディフェンスのスカウティングデータです。
このデータを分析し、オフェンスとして何を準備すべきかをコーチ目線でアドバイスしてください。

【ゾーン】${zone === 'ALL' ? '全体' : zone + ' ZONE'}

【ディフェンス傾向データ】
- 総プレー数: ${stats.n}P
- ブリッツ率: ${stats.bp}%（${stats.bn}件）
- スタント率: ${stats.sp}%（${stats.sn}件）
- 主要カバレッジ（上位5）: ${stats.cov.slice(0,5).map(x => x[0] + '(' + x[1] + '件)').join(', ')}
- ブリッツ方向: BOUNDARY ${stats.bt.BOUNDARY}件 / FIELD ${stats.bt.FIELD}件 / BOTH ${stats.bt.BOTH}件
- 主要ブリッツ種別（上位5）: ${stats.blitz.slice(0,5).map(x => x[0] + '×' + x[1]).join(', ')}
- 主要フロント（上位4）: ${stats.front.slice(0,4).map(x => x[0] + '(' + x[1] + '件)').join(', ')}
- 主要スタント（上位3）: ${stats.stunt.slice(0,3).map(x => x[0] + '(' + x[1] + '件)').join(', ')}

【ブリッツ補足知識】
- W/F/C = バウンダリーサイドのLB
- M/S = フィールドサイドのLB
- 偶数番（2,4,6,8）= バウンダリー方向のブリッツ
- 奇数番（1,3,5,7,9）= フィールド方向のブリッツ
- L-5+W-6のようなBOTHブリッツは両サイド同時

以下の観点で分析してください（日本語で、箇条書きを使わず自然な文章で300字程度）：
1. このゾーンでの相手ディフェンスの最大の特徴と傾向
2. オフェンスとして最も注意すべき点
3. 具体的に有効なプレーコールやスキームの提案`;
    }

    // ===== Claude API 呼び出し =====
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const text = data.content.map(c => c.type === 'text' ? c.text : '').join('');

    return res.status(200).json({ comment: text });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
