# それ、誰が決めた？ — AIゼミ展示制作

AIに任せるうちに、誰が決めたのかわからなくなる未来を、2.5Dの街づくりと物語で体験する展示。

## 収録内容
- `standalone/それ、誰が決めた？_街が動く版.html` — サーバー不要で遊べる一人モード。まずはこちらを開いて展示体験を確認
- `site/public/` — 街の描画、キャラクター、HTML/CSS、ゲームUI
- `site/engine.js` と `site/public/engine.js` — ゲームエンジン
- `site/src/worker.mjs`・`site/drizzle/` — 共有モードとD1に対応するWorker/DB定義（実データは含まれません）
- `site/tests/` と `site/scripts/` — 動作テスト・ビルド検証・単体HTMLの自動再生成
- `site/vendor/LICENSE-notice.txt` — QRコードライブラリのライセンス情報

## ローカル実行と検証
Node.js 20以降を使用。

```sh
cd site
npm test                       # Worker/単体HTMLをビルドしてから全テスト実行
node scripts/validate-artifact.mjs
# または: bash scripts/build.sh
```

ローカルサーバーで確認する場合は `cd site && node server.mjs`。ローカルサーバーの状態は本番D1とは別です。

**単体HTMLは一人モード専用**です。`npm test` または `bash scripts/build.sh` で `standalone/それ、誰が決めた？_街が動く版.html` が現行ソースから再生成されます。共有モードにはNodeサーバーまたはD1付きWorkerが必要です。

**Workerのビルド成果物は `site/dist/server/index.js`** です。`site/worker/index.js` は旧スターターコードでゲーム本体ではありません。`dist/.openai/hosting.json` はローカル検証用の仮設定であり、本番D1接続やデプロイ設定は含みません。

## 重要：権限・公開境界
- このリポジトリは **Private**。会社環境での利用範囲や共有・素材の権利は、所属組織のルールを確認してください。
- GitHub Pages・外部共有・本番デプロイ・会社側のD1構築は、個別の承認なしに行わないでください。
- APIキー・Cookie・実際のプレイヤーデータ・社内機密・個人情報をコミットしないでください。
- 個人GitHub側の履歴を直接ミラーせず、展示用の確認済みソースを初期登録しています。
- 初期ソースの基準は個人開発版 `snorlaxrelaxed/sore-dare-ga-kimeta` の `experiment/living-city-beats` コミット `2b50b57`。以後の変更は本リポジトリでも独立して管理します。

## 現時点の状態
一人モードは4つの重要判断と街の変化・住民の反応を体験可能。共有モードは既存の7ラウンドの仕組みを保持。5つの独立ブラウザによる実Sites D1テストは個人側の既存公開版で実施済みであり、本リポジトリに稼働中のD1は含みません。

## 2026-11-01の改善
- 全6指標に共通の警告（30未満）と終了（10未満）を適用。人が判断すると警告指標を回復する介入を追加。
- 結末ごとの街のトラブル、判断履歴、途中の非公開数値の秘匿を維持。
- 共有APIのラウンド整合性、投票リプレイ、同一オリジン、QRのURL検証を強化。
- 単体HTML生成をビルドに統合し、スマートフォンとタブレットの警告表示を調整。
- 詳細な変更・確認・制約は `docs/OPTIMIZATION_REPORT_20261101.md` を参照。
