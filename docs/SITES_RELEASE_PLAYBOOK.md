# ChatGPT Sites リリース手順

この文書をSitesリリースの唯一の手順書とする。 OpenAI公式説明では、公開が失敗してもDB変更が残る可能性があり、旧版へ戻してもDBやアップロードファイルは復元されない（[Creating and using ChatGPT Sites](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites)）。したがって、UI-only判定だけでDB安全と断定しない。Git差分の判定は補助CLI `node site/scripts/sites-release-preflight.mjs --base <base> --target <target>` を使う。分類が緑でもバックアップ、復元可能性、公開承認、Sites側の状態を証明しない。

## 役割と開始条件

- **依頼者:** 何をいつどの既存Siteへ公開するかを承認する。リスク受容や必須バックアップ条件の緩和も別の明示承認として判断する。
- **ChatGPT親エージェント:** 変更範囲、ブランチ、受入結果、承認境界を管理し、Mac担当へ具体的な実行指示を渡す。承認なしにGitHub mainへmergeしない。
- **Codex Mac:** ローカルGit差分・ビルド成果物・SHAを確認し、この手順とpreflightに従う。秘密・本番データをリポジトリやログへ入れない。
- **Work（公式Sites環境）:** 既存プロジェクトの公式UI/APIでアーカイブ、D1確認、バージョン保存・公開・ヘルス確認を行う。利用可能なツール能力を最初に確認し、未提供のDBコマンドを仮定しない。

長い確認に入る前に、Workで使える公式機能を確認する: 対象Siteの選択、ソース・Worker・静的成果物の読取、D1の読み取り/SQL/export、公開バージョン保存、公開、公開状態・URLの再読取。確認できた操作とできない操作を記録する。完全バックアップが読めない場合は一度だけ、公式の別exportまたはSQL読取・chunk queryが使えるかを試す。能力がなければ直ちに `CAPABILITY_BLOCKED` とし、反復試行を止めて、現在の必須ゲートに基づく停止と、後述するリスク受容案を依頼者へ一度提示する。

Google loginはSites/D1作業の前提ではない。公式ツールが特定操作にGoogle認証を必要とすると実証でき、かつ承認済み作業に必要な場合だけ依頼者に説明する。認証を推測で求めない。

## リスク分類とバックアップ承認

| 区分 | 差分 | 公開前ゲート |
|---|---|---|
| **R0 UI-only** | UI、静的asset、docs、testsのみ。Worker、engine、schema、migration、binding、他backend変更なし | 現在の必須ゲートは**毎回の新しい完全D1バックアップ**と復元可能性確認。コードのみの緑判定で免除しない。 |
| **R1 DB-impacting code** | Worker/engine等のコードにDB読書き・初期化・状態変換の変更 | 完全な最新D1バックアップ、復元確認、DB影響とmigration有無/計画、コード/データ互換性が揃わなければNO-GO。 |
| **R2 schema/binding** | DDL、migration、DB schema、binding/target変更 | 完全バックアップと復元確認に加えて、migration計画・適用順・ロールバック・実行後schema検証が必須。欠ければNO-GO。 |

現在の必須方針: **R0を含め、各リリース前に新しく取得した完全なD1バックアップを必須とする。** v19公開試行が止まっても、この条件を暗黙に弱めない。

別途提案する将来の低リスク代替案（現時点では未承認）: 既に取得済みの復元検証済みバックアップを使い、DB影響ソース差分がないこと、公開前後の行数とDBバージョン/checksum（公式機能で取得可能な値）を比較し、明示承認を得る場合に限りR0の「毎回新規フルバックアップ」を緩和する。依頼者が**バックアップ必須ゲートの緩和を明示承認する前にWorkは使用できない**。一度の承認を将来リリースへ流用しない。R1/R2には適用しない。

Workにpending-migrationsの読取コマンドがないことは既知の能力制約であり、その不存在を何度も調査しない。内部migration planまたはDDLが見られないことだけでは、すでに承認された代替確認があり、差分が実際にDB非変更である場合のR0を止める理由としない。ただし、ソースが同じでもプラットフォーム側の自動migrationがない証明にはならない。R1/R2は完全バックアップとmigration計画なしにfail closedとする。

## バックアップ取得とchunk復元

完全なsnapshot/exportが利用できる場合は常に取得し、外部のアクセス制御された一時保存先だけに置く。Git、Issue、PR、通常ログへD1データを保存しない。

通常exportが1行で切り詰められる場合、WorkがSQL読取に対応することを先に確認した上で、次の読み取り専用クエリを候補として使う（対応可否を仮定しない）。

```sql
SELECT id, version, length(CAST(json AS BLOB)) AS bytes
FROM city_state_stage4;

SELECT id, version, hex(substr(CAST(json AS BLOB), :offset1Based, :chunkBytes)) AS chunk_hex
FROM city_state_stage4
WHERE id = 1;
```

1行のサイズとrow countを記録し、1-based byte offsetで全範囲を重複なく読み取る。チャンクごとにversionが同一であることを確認する。Workがchunk query/exportに対応する場合、結果を保護されたJSON入力としてMacへ渡し、`node site/scripts/verify-d1-chunks.mjs --input <private.json> --output <private-restored.json>` で検証する。入力は `expectedBytes`, `finalBytes`, `expectedVersion`, `finalVersion`, `expectedRowId`, `chunks:[{id,offset,version,hex}]` を含む。最後に再度SELECTでid/version/bytesを確認して開始時の値と一致させる。テーブル行のid/versionはJSON本体の項目とは別に取得する。検証器は完全coverage、UTF-8、JSON、行ID/versionを確認し、出力を新規ファイル・0600で作成する。切り詰めたテキストだけから欠落データは復元できない。SQL機能がない場合、架空のtool支持を示唆せず `CAPABILITY_BLOCKED` とする。

## GO / NO-GO

**GO** は次のすべてが揃った場合のみ: 正確なtarget commitと成果物SHAを照合、preflight分類を確認、リスク分類を確定、適用中のバックアップ要件を満たし復元可能性を確認、D1の公開前baselineを記録、既存Site ID・URL・binding・公開範囲を固定、依頼者の今回の公開承認を確認。これらを一つでも確認できなければ**NO-GO**。

公開後は公式Sites画面を再読込して保存version/公開状態とsource SHAを確認し、公開URLでHTTP/healthと主要画面、`/app.js` SHA、必要な読み取り専用API応答、D1行数/version/checksumを公開前記録と比較する。動作を変えるDB書込み試験は別承認がない限り行わない。アクセス可能なデータをログへ出さず、結果はhash/件数/状態だけで報告する。UIの見た目やURL応答だけをD1整合性証拠としない。

異常、予期しないschema/row差、source SHA不一致、保存/公開状態の不明、公開後ヘルス不良は停止条件。既存の承認済みrollback手順で前のSites versionへ戻し、公開状態・URL・データ状態を再確認する。D1への手動復元や書込みは別途明示承認なしに行わない。復元できる状態が確認できない場合はさらに変更を加えず、状況と欠落証拠を依頼者へ報告する。
