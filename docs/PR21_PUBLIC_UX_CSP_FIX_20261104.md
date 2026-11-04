# PR #21 — v19公開後の初見UX指摘3点を修正（2026-11-04）

## Source of Truth／変更範囲
- 公開中v19：Site ID appgprj_6ae596548c00819189f3f54ce3275e02、URL https://machi-no-tsuzuki-20261031.tthkpba.chatgpt.site/
- GitHub公開元コミット：3b977ea22019046559e1c7304b0d2d0a99ffe7c2（PR #19）
- 作業ブランチ：fix/f5-v20-public-csp-ux-20261104。PR #20は別途Sites運用手順だけのDraft PRで、今回のゲームソースに混ぜない。
- リリース前の指摘の証拠：docs/PR19_PUBLIC_GUEST_UX_FINDINGS_20261104.md（PR #20側）。この修正は実装・GitHub反映が対象。既存Sitesを別版へ上書き公開していない。

## 変更内容

### P0：公開環境でのPNG保存失敗
- **実際の本番障害**：CSPの `img-src 'self' data:` により、`site/public/ending-card.js` が中間SVG読み込みに使う `blob:` URLを拒否された。結果カードPNG保存ボタンからエラーになっていた。
- 修正：中間SVGの画像化に `data:image/svg+xml;charset=utf-8,` + `encodeURIComponent(buildSvg(context))` を使用。CSP自体は緩めず、最終PNG Blobダウンロードは既存のまま維持。カードのテキストはescape、街画像は既存の厳格なPNG data URL検証を継続。
- 印刷PDFの1ページ構成、TRUE/NORMAL/BAD個別結末、街画像・6指標・レーダー表示は維持。

### P1：AI側の公開3指標がCSSで隠れている
- 旧CSS `.decision[data-vote=ai] .impact-row{display:none}` を除去。AIの公開3指標の変化の目安が、人の提案と同様に表示される。
- 非公開3指標（市への信頼・公平さ・未来への備え）は従来通り結末4/5でのみ開示。TRUEの判定条件は開示しない。

### P2：海辺の詳細判断で「選択に戻る」が初期画面外
- **海辺の詳細選択中だけ**街の高さを `clamp(160px,22dvh,210px)` にし、既存の下限height 210pxをこの状態で解除。
- さらに320×700相当の小画面では街を140pxに縮め、詳細選択フォームの余白を控えめにする。現在の相談の site ID を画面内の data-site に反映し、**海辺以外の診療所・電力等では縮小条件が発動しない**ことを保証する。街自体の描画/内容・他シーンは変更しない。
- 2つの詳細選択ボタン48px以上、「選択に戻る」44pxを維持。

## Macホストでのテスト・証跡
- `cd site && npm test`：**159/159成功、0失敗**（既存の共有7判断・D1隔離テストを含む）。
- `node scripts/validate-artifact.mjs`：Workerの有効なESM／default.fetchを検証して成功。
- `node scripts/qa-v20-public-ux.cjs`：Mac通常環境のローカルHTTPに**実際のSitesと同一のCSP**を設定したテストで成功。PNGは244,652バイトの1600×1100としてダウンロード。6指標・PNG埋め込み街画像（52,994文字のdata URL）を含むSVGを描画。390×844、375×812、320×700でAIチップと3操作ボタンを確認。
- **本番同等CSP検証**：実公開v19の匿名ページに新しい `style.css` と `ending-card.js` のHTTP応答だけをブラウザー内で差し替えた（実Sites/DBの変更なし）。NORMAL（390×844）、TRUE（1024×768）、BAD（1920×1080、320×700）をソロ4判断から最後まで再プレイし、**すべて実PNGダウンロード成功**。PNGサイズは約416〜482KB、全4ファイルPNG署名正常・1600×1100。
- 海辺で「選択に戻る」の実測は390×844下端802px、375×812下端792px、320×700下端686px。3サイズともタップ高さ44pxで初期画面内、横スクロールなし。
- 4/5の隠し3指標の初期画面表示、再プレイの初期化、AI/人の公開3指標表示も実プレイで維持を確認。
- ブラウザー印刷PDFをMacのPDFKitで検証：NORMAL/TRUE/BAD（390/1024/1920/320）**全4ファイル1ページ**。OSの保存ダイアログ操作や実SafariのPDF保存は未検証。
- `cmp site/engine.js site/public/engine.js`、`git diff --check`：成功。Worker API・D1 schema/SQL/migration・engine・manifest/binding、Site ID/URLの差分なし。
- PNGの再現・検証ログ（Mac）：`/tmp/f5_v20_public_CSP_parity_VERIFIED_host_test.log`、`/tmp/f5_v20_public_CSP_parity_320_FINAL_host_test.log`、`/tmp/f5_v20_PUBLIC_CSP_ALL_ENDINGS_QA_20261104.log`、`/tmp/f5_v20_PUBLIC_CSP_ALL_ENDINGS_QA_20261104/`。

## 独立レビュー（Codex）対応と最終固定
- 2026-11-04の独立レビューで見つかった3件を修復。
  - **旧CSSを含む単体HTMLの古さ**：build-standalone再実行し、HTML埋め込みCSSと現在の `site/public/style.css` の全文一致を検証。embedded app.jsにも waterfront data-site変更を反映。
  - **詳細中の街縮小が他議題にも掛かる**：`app.js`で相談 siteを`#strategyChoice[data-site]`へ設定し、`data-site=waterfront`に限定。
  - **Puppeteerの個人ユーザーパス固定**：通常の `puppeteer`、環境変数 `F5_PUPPETEER_MODULE`、ユーザーHOME相対のDesktop Commanderディレクトリの順に探す。
- 上記3件の対応後、Mac通常環境で自動テスト **159/159合格**、同一CSPのローカルHTTP・実PNG（244,652 bytes）テスト合格。実公開ページのChromeでも候補 `/app.js`・`/style.css`・`/ending-card.js` 3ファイルを一時差し替えて、320/375/390のPNG保存・44pxタップ・隠し3指標・再プレイを再確認。CSP自体は変更なし。
- ソロHTML：`standalone/それ、誰が決めた？_街が動く版.html`、346,271 bytes、SHA-256 `948e03cdd4820bf2d9be3f527d78d1071cbed9bf2e28e6770f2517d5896c1735`。
- 新 Worker artifact SHA-256 `4304a3f00240c108fe25505cdaeff400dc74ab1a14751f4df65ab9117fee1e33`、公開後 `/app.js` 期待SHA-256 `c064b19b9bb7fd5464fb67d039d812e47e96dd8fc2c1c0bb9895ce6994d70d2f`。**これらは候補値であり、Sites上ではまだ検証していない**。

## 残存事項／公開の承認境界
- Chrome/Puppeteerの画面サイズ模擬であり、**実機iPhone/iPad Safari・物理5端末・会場ネットワークは未検証**。CSPに関する本番適合性は公開版v19ページを使ったクライアント差し替えで確認したが、**変更後のSites一般公開はまだ実行していない**。
- 本番ではなく検証用のローカル仮想プレイヤーから操作。本番D1のjoin/vote/ready等の書込みは実施していない。
- 公開済みv19で検出されているCSPのinline-script拒否ログは、PNGとは別の項目であり、本修正では扱わない（ゲームの主要フローには影響を確認していない）。
- リリース時は最新のPR #20 `docs/SITES_RELEASE_PLAYBOOK.md` と承認済みR0代替安全策の条件に沿い、**このPRの正確なコミット・Worker配信アセットSHAを固定し、公式Sites Workで同じSiteに反映**。重要操作であるSitesへの一般公開は依頼者の明示指示に従う。GitHub main mergeとDB変更は不要。

## 成果物
- 最新単体HTML：`standalone/それ、誰が決めた？_街が動く版.html`（ソロ専用オフライン版）。共有プレイにはSites/D1が必要。
- QAスクリプト（Puppeteerの通常インストールまたはF5_PUPPETEER_MODULEで指定したものを使用）：`site/scripts/qa-v20-public-ux.cjs`（Puppeteerを使用、Macホストで動作検証）。自動テスト：`site/tests/v20-public-ux-csp.test.cjs`。
