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

  // 優先順位: Gemini（無料）→ Groq（無料）→ Claude。設定された環境変数のキーを使う。
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !groqKey && !claudeKey) {
    return res.status(500).json({ error: 'APIキーが設定されていません（Vercelの環境変数に GEMINI_API_KEY（推奨・無料）/ GROQ_API_KEY / ANTHROPIC_API_KEY のいずれかを設定してください）。' });
  }

  try {
    const { zone, stats, compareStats, isCompare, isCustom, question, context } = req.body;

    // ===== プロンプト構築 =====
    let prompt = '';

    if (isCustom && question) {
      // 自由入力（ASK AI）プロンプト
      const st = stats || {};
      const q = String(question).slice(0, 2000);
      const ctx = context ? String(context).slice(0, 6000) : '';
      prompt = `あなたはアメリカンフットボールの優秀なオフェンスコーチ兼データアナリストです。
以下の相手ディフェンスのスカウティングデータ要約に基づき、ユーザーの質問に答えます。
出力は「JSONのみ」とし、前後に文章・説明・コードフェンス(\`\`\`)を一切付けないでください。

JSONスキーマ:
{
  "summary": "結論を1〜3文の日本語で",
  "blocks": [
    {"type":"kpi","items":[{"label":"指標名","value":"数値や語","unit":"%"}]},
    {"type":"bars","title":"見出し","unit":"%","data":[{"label":"項目","value":42}]},
    {"type":"table","title":"見出し","headers":["列1","列2"],"rows":[["値","値"]]},
    {"type":"note","text":"補足・注意（推測の明示など）"}
  ]
}

規則:
- 数値は必ず下記データに存在する値のみを使う。データに無い数値は作らず、必要なら note で「データ範囲外」と明示。
- 質問に最も答える形式を選ぶ（順位・比較は bars、内訳一覧は table、要点は kpi、補足は note）。
- blocks は1〜4個。ラベルは日本語可。bars/table の value は数値のみ（単位は unit や見出しで表現）。
- 具体的なプレーコール／スキーム提案がある場合は note か summary に含める。

【データ要約】
${ctx}

【主要指標（全体）】
- 総プレー数: ${st.n}P / ブリッツ率 ${st.bp}% / スタント率 ${st.sp}%
- 主要カバレッジ: ${(st.cov || []).slice(0,6).map(x => x[0] + '(' + x[1] + '件)').join(', ')}
- 主要フロント: ${(st.front || []).slice(0,5).map(x => x[0] + '(' + x[1] + '件)').join(', ')}

【ブリッツ補足知識】
- W/F/C = バウンダリーサイドのLB、M/S = フィールドサイドのLB
- 偶数番（2,4,6,8）= バウンダリー方向、奇数番（1,3,5,7,9）= フィールド方向、L-5+W-6のようなBOTHは両サイド同時

【ユーザーの質問】
${q}`;

    } else if (isCompare && compareStats) {
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

    // ===== LLM 呼び出し =====
    const wantJson = !!(isCustom && question); // ASK AI は JSON で返す
    const maxTokens = isCustom ? 1500 : 800;
    let text = '';

    if (geminiKey) {
      // Google Gemini（無料枠）。thinkingBudget:0 で思考トークンを使わせ、出力を回答に充てる。
      // JSONが要る場合は responseMimeType で強制。
      const gmodel = 'gemini-2.5-flash';
      const genCfg = { maxOutputTokens: maxTokens, temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } };
      if (wantJson) genCfg.responseMimeType = 'application/json';
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + gmodel + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: genCfg }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${err}`);
      }
      const data = await response.json();
      const cand = data.candidates && data.candidates[0];
      text = (cand && cand.content && cand.content.parts || []).map(p => p.text || '').join('');
      if (!text && cand && cand.finishReason) throw new Error(`Gemini empty response (finishReason: ${cand.finishReason})`);
    } else if (groqKey) {
      // Groq（OpenAI互換・無料枠）。JSONが要る場合は response_format で強制
      const gbody = {
        model: 'llama-3.3-70b-versatile',
        max_tokens: maxTokens,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      };
      if (wantJson) gbody.response_format = { type: 'json_object' };
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
        body: JSON.stringify(gbody),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Groq API error: ${response.status} ${err}`);
      }
      const data = await response.json();
      text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    } else {
      // Claude
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Claude API error: ${response.status} ${err}`);
      }
      const data = await response.json();
      text = data.content.map(c => c.type === 'text' ? c.text : '').join('');
    }

    return res.status(200).json({ comment: text });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
