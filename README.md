# IMPULSE Defense Scouting Dashboard

Panasonic IMPULSE アメフト部 ディフェンス スカウティングダッシュボード

## 機能 / Features

- スカウティングCSVのアップロード・分析
- ゾーン別 / DOWN×DIST / モーション / フォーメーション別分析
- 事前スカウティング vs 試合後データの比較（割合ベース）
- **AI（Claude）によるコーチングコメント自動生成**

---

## セットアップ手順 / Setup

### 1. GitHubにアップロード

このフォルダをGitHubリポジトリとしてpushしてください。
APIキーはコードに含まれていないので安全にpushできます。

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_ORG/impulse-scouting.git
git push -u origin main
```

### 2. Vercelにデプロイ

1. https://vercel.com にアクセス（GitHubアカウントでログイン）
2. 「New Project」→ GitHubリポジトリを選択
3. 「Deploy」ボタンを押すだけ

### 3. APIキーを環境変数に設定（重要）

Vercelのダッシュボードで：

1. プロジェクトを選択
2. Settings → Environment Variables
3. 以下を追加：

| Name | Value |
|------|-------|
| ANTHROPIC_API_KEY | sk-ant-xxxxxxxxxx（あなたのAPIキー） |

4. Save → Redeploy

### 4. 共有

デプロイ完了後に表示されるURL（例: https://impulse-scouting.vercel.app）を
チームメンバーに共有するだけです。

---

## 使い方 / How to Use

1. URLにアクセス
2. スカウティングCSVをアップロード（またはテキスト貼り付け）
3. 各タブで分析を確認
4. 「分析を生成 / Generate」ボタンでAIコーチコメントを取得
5. 「試合後データと比較 / Compare」で試合後CSVと比較分析

---

## CSVフォーマット

| 列名 | 説明 |
|------|------|
| ODK | D（スカウティング）またはO（試合後）|
| YARD LN | ヤードライン（自陣マイナス、敵陣プラス）|
| DN | ダウン数（1/2/3）|
| DIST | 残り距離（ヤード）|
| COVERAGE | カバレッジ（BSKY, FBUZZ等）|
| DEF FRONT | ディフェンスフロント |
| BLITZ | ブリッツ（例: W-2, L-5+W-6）|
| STUNT | スタント |
| MOTION | モーション（JET等）|
| OFF FORM | オフェンスフォーメーション（STRONG, WEAK等）|
