# Stage 4 → 既存ChatGPT Sites更新・リリース手順

## 対象と承認
- ユーザーは2026-11-02に「全部やってSitesへの反映まで完了させて」と明示。
- Source of Truth: Private `hattoritth/sore-dare-ga-kimeta`（このリリースブランチは既存`main`とは分離）。
- ターゲット: 既存Site `appgprj_6ae596548c00819189f3f54ce3275e02`（同じプロジェクト・既存公開URL・公開範囲を維持）。
- 対象URL（確認済みの過去公開URL）: https://machi-no-tsuzuki-20261031.tthkpba.chatgpt.site/
- 新サイト作成やURL変更は不可。Live版への公開ができるまで、GitHubのmainへmergeしない。

## Stage 4実装と保存状態
- ZIP `F5_Complete_Handoff_20261101.zip` の `candidate/` が元のゲーム仕様。
- `site/.openai/hosting.json` は既存Siteのproject_idとD1 binding `DB`。秘密ではない。
- Workerビルドは `site/dist/server/index.js`。
- 既存DBテーブル `city_state` はそのままにする。Stage 4では新テーブル `city_state_stage4` を使用。
- 追加migration `site/drizzle/0001_stage4_city.sql` は`CREATE TABLE IF NOT EXISTS`のみで旧テーブルのDROP/UPDATEをしない。
- **既存のプレイ状態をStage 4に移行しない。** 新しいStage 4状態は初回アクセス時に専用テーブルへ初期化される。
- ソースはプライベート。公開バンドルにはCookie、機密ファイル、実参加者状態や実D1データを含めない。

## 公開ゲート
1. リリースブランチ差分のレビュー・個人情報/秘密鍵スキャン。
2. `cd site && npm test`、Workerビルド、全経路テストを完了。現在44/44合格。
3. Sites管理画面で **既存**Siteの保存版・データベース・実行環境を調査し、現在の公開版を特定する。
4. `city_state_stage4`の作成は旧`city_state`を保護した追加migrationとしてのみ適用する。D1 binding `DB`の存在を必ず確認する。既存のDB行を削除・上書きしない。
5. 源コード`site/`からレビュー可能な版を**保存するだけ**（ここでは本番未反映）。プレビューでソロ4判断/結果、共有7判断、3独立ユーザー/QR/再接続/同票/途中参加、街の浸水描画/人間判断結末/介入結末を確認する。裏パラ値が投票途中に送信されないことも確認。
6. すべて合格なら、承認済みの同一Site URLにその版をデプロイし、公開アドレスでHTTPSの`/api/health`（storage:true）、共有3セッション、QR、画面サイズを再確認。失敗の場合は前版へロールバック。DB migrationはコードロールバックと別で管理する。
7. 実機 iPhone/iPad Safari + 実カメラQR + 展示用Wi-Fi + 実参加者による試遊は未完了。展示最終受入とデプロイ完了を混同しない。

## 既存ローカル検証（2026-11-02）
- 元Stage 4: 42/42 自動テスト、全経路16/128/2,187、ビジュアル30/30（Mac Chromeエミュレーション）、UI20/20。
- Sitesリリース候補: 旧state保護テスト2つ追加、**44/44 PASS**。
- 実Safari・物理Wi-Fi・実カメラ・来場者満足度は未検証。

## 操作境界
GitHub PRとSitesの保存・公開は別操作。Sites公開は正確なバージョン/URL/DB binding/保存結果を確認してから行う。現チャットではSitesに直接アクセスする管理ツールが利用できず、公開済みとは記録しない。ChatGPTのSites画面またはWorkからこのリリースブランチを使用して続行する。


## 2026-11-02 更新：v7保存後のDrizzle登録簿修正

- Workで**保存版v7**の作成とGitHubコミット ae6a131（46ファイル）の整合性を確認。v7は未公開で、ライブはv6。
- Workが停止した原因は、drizzle/0001_stage4_city.sql が drizzle/meta/_journal.json に未登録であったことと、公開中のサイトに対して保存済み版だけを非公開プレビューできる導線を確認できなかったこと。
- **今回の変更**：drizzle/meta/_journal.json にidx=1、version=6、tag=0001_stage4_cityを追加（idx=0は不変）。登録順・SQL実在・追加専用SQL・旧データ保護と再実行に関する2テストを追加。
- Node.js v24の全自動テスト **46/46合格**。これは実D1に適用した証跡ではない。
- v7は過去の保存版として保護する。この追加変更を取り込んだ**新しい保存版（通常v8）**を作成し、前の保存版を上書きしない。Sitesが返す実際のバージョン番号を採用すること。
- **公開の停止条件**：実D1のmigration状態（既存city_stateとその行の保全、Stage 4テーブルを追加する安全な経路）と、保存版を本番URL/公開範囲を変えずにプレビュー・動作検証する公式経路が確認できなければ**公開しない**。登録簿を直しただけで自動適用を断定しない。
- Sitesの正規の操作から、DBの既存migration履歴と追加SQLの適用予定を点検し、適用による公開中のv6への副作用を評価。DBの構造が変わった場合は既存行のハッシュ・件数・バージョンを適用前後で検証する（秘密値をログに出さない）。
- 公開中のv6と保存版v7/v8を混同しない。保存・非公開プレビュー・実D1検証・公開・公開後受入を別のゲートとして記録する。
- ブラウザプラグインは「originating browser context」の条件を満たさず、このチャットから管理画面を読むことはできない。URL推測や非公式APIの使用でプレビューを代替しない。
