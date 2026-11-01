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
