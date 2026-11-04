# それ、誰が決めた？ — AIゼミ展示制作

AIに任せるうちに、誰が決めたのかわからなくなる未来を、2.5Dの街づくりと物語で体験する展示。

## 収録内容
- `standalone/それ、誰が決めた？_街が動く版.html` — サーバー不要で遊べる一人モード。まずはこちらを開いて展示体験を確認
- `site/public/` — 街の描画、キャラクター、HTML/CSS、ゲームUI
- `site/engine.js` と `site/public/engine.js` — ゲームエンジン
- `site/src/worker.mjs`・`site/drizzle/` — 共有モードとD1に対応するWorker/DB定義（実データは含まれません）
- `site/tests/` と `site/scripts/` — 動作テスト・ビルド検証
- `site/vendor/LICENSE-notice.txt` — QRコードライブラリのライセンス情報

## 共同編集：talessh1120-lab

作業の衝突を防ぐため開発者ごとに独立したGit worktreeとブランチを使用します。
初回は `bash scripts/setup-talessh1120-lab-worktree.sh first-change`。
Codex / Claude Codeの起動とPR運用は [共同編集ガイド](docs/collaboration/talessh1120-lab.md) を参照してください。
共通のAI指示は `AGENTS.md`、Claude Code用の入口は `CLAUDE.md` です。

## ローカル実行と検証
Node.js 20以降を使用。

```sh
cd site
bash scripts/build.sh
node scripts/validate-artifact.mjs
npm test
```

ローカルサーバーで確認する場合は `cd site && node server.mjs`。ローカルサーバーの状態は本番D1とは別です。

## 重要：権限・公開境界
- このリポジトリは現在 **Public**（2026-11-04にGitHubで確認）。会社環境での利用範囲や共有・素材の権利は、所属組織のルールを確認してください。
- GitHub Pages・外部共有・本番デプロイ・会社側のD1構築は、個別の承認なしに行わないでください。
- APIキー・Cookie・実際のプレイヤーデータ・社内機密・個人情報をコミットしないでください。
- 個人GitHub側の履歴を直接ミラーせず、展示用の確認済みソースを初期登録しています。
- 初期ソースの基準は個人開発版 `snorlaxrelaxed/sore-dare-ga-kimeta` の `experiment/living-city-beats` コミット `2b50b57`。以後の変更は本リポジトリでも独立して管理します。

## 現時点の状態
一人モードは4つの重要判断と街の変化・住民の反応を体験可能。共有モードは既存の7ラウンドの仕組みを保持。5つの独立ブラウザによる実Sites D1テストは個人側の既存公開版で実施済みであり、本リポジトリに稼働中のD1は含みません。
