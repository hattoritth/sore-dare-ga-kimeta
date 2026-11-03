# 結末画面の街スナップショットと6指標レーダー（2026-11-03）

## 変更内容

- 結末に入った後、完成済みの街を描画する `townCanvas` をPNG data URIとして取得し、`cityStartedAt` ごとに一度だけ保持する。取得前に `scene.render(0)` を呼び、`syncArt` が反映した建物・最終警告・危機ビジュアルを含む状態にする。Canvasが空、tainted、またはPNG形式でない場合は既存のローカルSVG街絵へ戻す。
- 一人プレイの再開などで街が変わるとキャッシュを消す。HTML結果プレビューと1600×1100印刷カードへ同じ画像を渡す。印刷カードはSVG内のdata:image/pngのみを使い、外部URLは受け付けない。
- 結果カードの街画像には結末別の控えめな色調を重ねる。TRUE ENDだけに成功の暖色を使い、NORMAL ENDは中立の健やかさとして区別する。警告と未決にも別の控えめな扱いを適用する。
- 4/5段階（`endingFlowStage === 3`）で、6指標のレーダーと従来の6本の値表示を同時に示す。3/5段階より前は、レーダーをDOMから外し、秘密の値・結末名を追加公開しない。
- `この群の最高 / 最低` 表現は復活させない。街のスナップショットはARIAラベルから結末名を除き、TRUE情報を早い段階で読み上げない。

## 参照した作業

結果カードのキャッシュ、画像テーマ、レーダー配置の考え方は、指定された読み取り専用の ending-radar-city WIP を参考にした。実装は現ブランチのPR #16を基準に追加し、古いWIPの `app.js` や結末フローは取り込んでいない。impeccable WIPの旧結果グリッドCSSは、新しい結果画面との干渉を避けて採用していない。会話 portrait の余白やカメラ倍率も、この変更では視覚上の必要性が見えなかったため触れていない。

## 検証範囲

Focused tests cover one-capture-per-city, city reset, canvas failure fallback, data URI allowlisting, six crisis themes plus TRUE/NORMAL/WARNING/undecided distinctions, stage-based radar disclosure, absence of the old group-high/low copy, and saved-card image/value markup. `npm test` and artifact validation results are recorded in the change report.

Mac通常環境で既存・新規合わせて134/134テスト成功、Worker成果物検証とGit差分検証成功。Chrome for Testing + Puppeteer（オフラインHTML）で390×844のTRUE、1024×768のNORMAL、1920×1080のBADを実操作し、5段階の結末、4/5のレーダー開示、結果ステージ前の値の非開示、横はみ出しなし、JavaScriptエラーなしを確認した。結果画面・保存カードの画像data URIが同一（TRUE画像約212KB相当）であることも検証した。保存されたPNGは506,129バイト、実際に読み込んでゲーム内2.5Dの街・レーダー・6指標が描画されていることを目視確認した。印刷PDFはA4の1ページとなり、文字と数値を抽出できた。

未検証は実機iPhone/iPadのSafari、共有7判断の実D1多人数参加、iOSネイティブPDF保存ダイアログであり、いずれも完了とは扱わない。公開Sites、D1、mainは変更していない。

The standalone HTML remains solo-only and works offline; shared play requires the server/Worker and D1.
