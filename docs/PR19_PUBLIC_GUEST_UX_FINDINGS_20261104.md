# v19公開後：初見来場者のテストプレイ報告（2026-11-04）

## 結論
v19は既存URLでHTTP 200、公開 /app.jsのSHA256=25fdca5e8cc69681396f7c01fafb3cbb496bd9eac92cae1a63fd2e122b3c4c3a と一致し、/api/healthは status=ok, storage=true。Macの匿名Chromeで導入→4判断→結末5段階のNORMAL ENDを実プレイできた。TRUE/BADも別経路で完走できた。**ただし公開環境のCSPによりPNG結果カードの保存が失敗するP0不具合**が確認された。この不具合は公開前のソロHTMLテストでは検出できなかった。

## 対象と試験境界
- 対象：既存ChatGPT Sites https://machi-no-tsuzuki-20261031.tthkpba.chatgpt.site/
- 公開版v19：PR #19、commit 3b977ea22019046559e1c7304b0d2d0a99ffe7c2、deployment appgdep_6aea7b5bbe7c8191b7983bb97fbe5e43（Work報告）。
- テスト環境：Mac Chrome/Puppeteer、匿名・新規ブラウザーコンテキスト、390×844（DPR2・タッチのモバイル模擬）、320×700、1024×768、1920×1080。実物理iPhone/iPad Safariではない。
- 実施：導入4シーン→モード選択→ソロ4判断→結末5段階→記者会見入口、共有モードの匿名参加前（join/投票は未実施）。ソロNORMAL、TRUE、BADの3経路、結果の隠し3指標の開示、PNG保存ボタンクリック、PDF印刷CSSの1ページ検証、再プレイ。
- 本番D1に対するjoin/ready/vote/変更は一切実施せず、Site設定もGitHubゲーム本体も変更していない。別の参加者による実アクセス・物理5端末・会場Wi-Fiは未検証。
- Workから通常HTTP 403という報告があったが、本試験Macからは匿名トップ/app.js/healthいずれもHTTP 200。ユーザー端末や他ネットワークですべて200になると断定はしない。

## P0：公開PNG保存がCSPで失敗する【修正優先】
**症状**
- 390×844のNORMAL ENDで結末5/5「PNGで保存」を実際にクリック。PNGファイルは生成されず、画面内の status は「PNGを保存できませんでした。ブラウザの画像保存設定を確認してください。 結果カードをPNG画像に変換できませんでした。」と表示。
- ローカル単体HTMLでは同じPNG保存が成功していたので、公開前テストだけでは取りこぼした環境差分。

**根拠／原因**
- 公開サイトのContent-Security-Policy: img-src 'self' data: （blob: は許可されていない）。
- site/public/ending-card.js の renderCard が、描画用SVGの Blob URLを作り new Image().src=blob:... で読み直す。このimg.onerrorがPNG保存失敗に直結する。
- 実公開ページでごく小さいテスト用SVGをBlob URLから Image にロードすると CSP の「Loading the image 'blob:...' violates img-src 'self' data:」が発生して失敗を実証。同じ公開CSPで data:image/svg+xml,... の画像ロードは成功した。
- したがって、サイト本体のCSPを不用意に緩めず、SVG画像の一時的な読み込みを許可済みの安全なdata: URLへ変更する方向が有力。大きなカードや埋め込み街画像を含めて最終画像をブラウザ実装で検証するまでは修正成功と断定しない。

**合格条件**
- 公開同等の CSP（img-src 'self' data:）でTRUE/NORMAL/BAD結果カードのPNG実ダウンロード成功、ファイルがPNGとして読めること。
- 埋め込み街画像・レーダー・6指標がPNG内に正しく表示され、印刷PDFも1ページ維持。
- 390×844のSafari/Chrome、1024×768のブラウザー、実公開サイトでクリックし、無記名の新規訪問者でも成功すること。

## P1：AI側の3指標予測が画面上で非表示
- 例：第二判断で「自分で決める」のにぎわい/便利さ/住み心地増減チップが見えるのに、「AIに任せる」の同等情報が見えない。
- 原因：v19の app.js は aiImpact に3チップを生成しているが、site/public/style.css に .decision[data-vote=ai] .impact-row {display:none} が残っている。Macの公開画面でaiImpactのchildCount=3、computed display=none、一方humanImpactはdisplay=flexと確認。
- 推奨：この旧CSSを削除・上書きするなどして**人とAIの比較情報量を揃える**。隠し3指標・TRUEの条件は終盤まで表示しない。
- 合格条件：初見390幅で人・AI双方に公開3指標の変化の目安が表示され、テキスト折返し／44pxタップ／縦画面配置が崩れない。

## P2：海辺の「選択に戻る」が初期画面の外
- 390×844で第三判断の詳細選択時、二つの選択肢は見えるが「選択に戻る」が y=834、ボタン高さ44px、下端878pxとなり、約34px分が初期画面外。
- 推奨：縦の余白・街の表示高さ調整、または確認/戻るを下部にコンパクト配置。ただし二つの詳細選択肢を圧迫しない。
- これは操作不能ではなくスクロールでアクセスできるためP2。

## 改善が効いていた点
- 初回導入からモード選択への流れは正常。ソロは「4つの判断・自分のペース」、共有は「7つの判断・1問23秒」が入口で分かる。
- NORMAL経路では第三の結末まで選択内容に沿った振り返りが示され、4/5に隠し3指標（NORMAL: 市への信頼73、公平さ59、未来への備え85）が**初期画面内**に表示される。5/5のPNG/PDF/再挑戦は初期画面内に配置される（PNGの機能自体は前述のP0）。
- 1024×768ではTRUE END（隠し値83/92/100）、1920×1080と320×700ではBAD END（54/42/0）を確認。モバイル4/5・5/5横スクロールなし。
- 再プレイ後に前のゲームの隠し指標DOMが残らないことを確認。
- 共有参加前は「この街は進行中。次の議題から参加できます。」という中立表示。匿名状態の参加フォームが見える。
- Chromeのスクリーンショットに黒い街が映る瞬間があったが、別のCanvas画素試験（DPR 1/2、初期・決裁直後・次議題）では各25点サンプルでdarkSamples=0、alphaZeros=0。現時点ではゲーム描画の不具合と判定しない。
- PDFは公開DOMからブラウザー印刷PDFを作成し、Mac PDFKitで1ページと確認した。実際のOS印刷ダイアログでの保存操作までは未検証。

## 再発防止の提案
- 公式Sitesデプロイ後はSHA・health・D1だけで完了とせず、**CSPを含む匿名実ブラウザーでPNG/PDF、初見ソロ4判断、4/5隠し指標、5/5再プレイ、共有参加前表示**のスモークテストを標準化。
- PNGは実ダウンロードファイルを検査。DOMにボタンがあるだけでは合格にしない。
- 本番共有モードのjoin/ready/voteは本番DBへの書込みになるため、別の実施条件・承認・安全策の下で試験する。

## 画面・ログ証跡（Mac、GitHubにはゲーム以外の機密やD1データは保存しない）
- /tmp/f5_v19_public_firsttime_20261104/（初見23画面とDOM/ボタン座標）
- /tmp/f5_v19_PUBLIC_FIRST_TIME_20261104.log（初見経路・JS/通信エラーなし）
- /tmp/f5_v19_PUBLIC_UX_QA_20261104/（TRUE/NORMAL/BAD・PNG/PDFの確認）
- /tmp/f5_v19_PUBLIC_QA_DIAG_20261104.log（PNGエラーステータス）
- /tmp/f5_v19_canvas_public_probe_20261104.log（街Canvas画素の確認）
- /tmp/f5_v19_PUBLIC_BLOB_CSP_PROBE_20261104.cjs（公開CSPでBlob URL拒否の再現）
- /tmp/f5_v19_UI_CSP_DIAG_20261104.cjs（AIチップの非表示とdata:画像許可の再現）

本報告は**公開後テストによる問題抽出**。ゲーム本体の修正・新版Sitesへの再公開は未実施。
