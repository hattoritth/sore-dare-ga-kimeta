# PR #17 受入検証・独立レビュー修復（2026-11-03）

## 対象・境界
Source of Truth: hattoritth/sore-dare-ga-kimeta Draft PR #17。起点HEAD 7b182e1e690ddbdab39dd425a49f1318ab4a3c85、修正後HEADはPR最新コミットを参照。

検証対象はTRUE／NORMAL／BAD、5段階結末、実際の2.5D街画像と6軸レーダー、共有5人・全7判断。GitHub main、公開中Sites・既存D1・Worker API・DB migration・hosting manifestを変更しない。

## 実施結果
- Mac通常環境 Node 24: npm test **139/139成功**。Worker ESM成果物検証、エンジンの配信元ファイル一致、Git差分チェック成功。
- Role TRUE: ソロの16人／AI配分経路中1通り（別途通院アクセス理由・事後対応が必要）、共有128配分経路中2通り。これは経路列挙の値であり実際の来場者成功率ではない。
- 共有7判断: Chromeで独立した5 BrowserContextから参加、準備、開始、投票を実行。画面390×844、430×932、820×1180、1024×768、1440×900。別の1920×1080モニターから観戦。
- 本番コードのSites互換Worker fetchを127.0.0.1の試験サーバーで動かし、一時インメモリSQLite製D1アダプターに接続。実際の投票API、CookieとCAS更新を利用。
- 投票列 HHHAAHH。第4判断は人2票／AI3票で個人の判断と集団の採用案を区別。5人の投票7回をすべて記録し、TRUE ENDを達成（最終6指標の最低値46、判定は40以上）。6人目の観戦画面と同じ結末。
- 実際の23秒タイマー待ちだけ一時テストDBのroundEndsAtを過去に移し、通常のWorkerのEngine.advanceを経由。エンジンの得点処理やAPIを改変していない。
- 投票中は隠し指標とTRUEを公開しない。過去ラウンドの投票409、匿名投票409、他Origin403。旧legacy D1テーブルの値は不変。全画面で横はみ出し、JavaScript例外なし。
- 同じWorkerとD1アダプターの完全7判断をCIで再現できる回帰テストを site/tests/worker-seven-participants.test.cjs に追加。

## 視覚検証
- Chrome 390×844で同じページをBAD END（全AI）からリプレイしてTRUE END（HHHA）まで実操作。前の画像とは異なる最終街並み、resilienceの危機テーマからsuccessへの変化を確認（約208KB→213KBの別画像）。
- 結末1/5の時点ではタイトル・レーダー非表示。4/5で6指標とレーダー、5/5で実際の街を含む結果カードを表示。JSエラーなし。
- 前回の実画像確認でPNGを実ダウンロード（約506KB）して2.5D街と指標を目視確認。PDFは1ページ。今回修正した結果別色調は新テストで確認。

## 独立Codexレビュー指摘・修正
1. P1: 新しいプレイでも前回の街の画像を表示する。cityStartedAt切替時にhero、印刷カード、レーダー、6指標、集計DOMをクリア。実ブラウザー再試遊で修復を確認。
2. P2: canvasが取得できないときSVG代替画像の結果別テーマが消失する。共通themeラッパーを使用し、代替SVGをaria-hiddenにしたうえで読み上げ文言を中立化。
3. P2: PNG/PDFのTRUEとNORMAL、WARNINGと未決の色調が同じ。TRUEのみ暖色、NORMALの緑、WARNINGの琥珀、未決の灰色とし、6種危機のテーマを維持。4種類のoverlayが異なることを新しい自動テストで確認。さらに保存用SVG内の画像欠落時にも4種類のoverlayを適用して区別する。 実際のChromeで画像欠落時のPNGラスタライズを行い、TRUE/NORMAL/WARNING/未決の4種類が異なるRGB値で描画されることを確認。

## 未検証・公開ゲート
- 実機iPhone/iPad Safari、物理5端末での会場Wi-Fi、Cloudflareの実D1接続・遅延・排他、公式Sitesの非公開プレビューは未検証。ローカル5人5ブラウザーを実機5台と混同しない。
- Phone Harness 0.3.3のMac iPhone Mirroringは接続readyだがキャプチャ0バイトで失敗。Phone Harness Cloudは未ログイン。iOS Simulatorにも利用可能な端末なし。
- 公開Site appgprj_6ae596548c00819189f3f54ce3275e02、同一URL・既存D1(DB)・migrationゼロを維持。ソースとWorker SHAが一致する非公開保存版での実D1受入が次のゲート。
- 公開・merge・本番D1操作は明示承認がないため実施しない。

判定: 開発版のコード、自動テスト、ChromeとローカルSQLite D1互換試験は合格。本番公開に必要な実機・公式Sites/実D1受入は未完了。