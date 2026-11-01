# 会話後の「選択肢を見る」廃止（ローカルUIレビュー）

## 意図
会話の直後に「選択肢を見る」という追加操作をさせず、担当AIの相談と2択（人が判断する / AIに任せる）を同時表示する。23秒の共有投票時間の一部を不要な操作に使わない。

## 変更
- `site/public/index.html`: `dialogueSkip` ボタンを削除
- `site/public/app.js`: 3秒経過/時間切れ間際/ボタン押下による選択肢の段階開示を削除。アクティブな議題では `decisionOptions` を常時表示
- `site/public/style.css`: 使われなくなった `dialogue-skip` のスタイル5箇所を削除
- `site/tests/entry.test.cjs`: 中間ボタンの不在、2択の存在を自動チェック

## 確認内容
- ローカル Worker成果物のビルド・検証・`npm test` 成功（10件）
- Headless ChromeでiPad横置き1024×768、iPhone縦390×844、小型375×667、PC1440×900（みんなでモード）を確認
- 全画面で中間ボタンなし、2択は初回表示時点で可視、タップ操作可能、横スクロールなし、JavaScript例外なし
- 各選択肢の高さは実測66px以上。iPadでは街と担当者・2択を左右同時表示
- 一人モードでAI判断を押すと受理・選択状態が表示される
- 共有モードではAPIへ投票が到達して集計されることを確認。待機時間23秒と共有APIは改修していない
- サーバー不要の単体HTMLも動作確認済み

## 公開・運用
- 公開中のSites v6やD1には変更を加えていない
- 視覚レビュー用単体HTMLはMacのDownloadsフォルダに保管
- GitHubでは `fix/choices-direct` を `fix/prologue-playflow-ux` に向ける積み上げDraft PRとしてレビューする。mainにはmergeしない
- 実iPad/iPhoneやSitesへの再デプロイ・実D1での本変更の再検証は未実施
