# 初期ソースの由来と確認範囲

- 取り込み元: `snorlaxrelaxed/sore-dare-ga-kimeta` / `experiment/living-city-beats` / `2b50b57`（2026-11-01）
- 方法: 元コミットからコード・テスト・OSSライセンスを抽出し、会社側リポジトリにクリーンな初期コミットを作成。元のGit履歴はコピーしない。
- 配布物: `standalone/それ、誰が決めた？_街が動く版.html`（ローカル単体動作確認済み）
- 素材の形態: 独立したPNG/JPEG/フォントファイルはなく、街の描画は `site/public/city-art.js`、AI担当者の立ち絵は `site/public/app.js` 内のSVG。
- OSS: QRCode for JavaScriptのMITライセンス情報は `site/vendor/LICENSE-notice.txt` を参照。
- 除外: `.openai/hosting.json`、環境変数ファイル、D1実データ、Cookie、Git履歴、認証情報、他プロジェクトの資料。
- ビルドとテストが成功しても、会社端末・社内ネットワーク・会場の実機動作を保証するものではない。
- 本GitHubへの保存はWeb公開・実D1の移行ではない。公開や共有は別途承認を必要とする。
