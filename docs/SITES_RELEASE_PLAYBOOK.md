# ChatGPT Sites リリース手順

この文書をSitesリリースの唯一の手順書とする。 OpenAI公式説明では、公開が失敗してもDB変更が残る可能性があり、旧版へ戻してもDBやアップロードファイルは復元されない（[Creating and using ChatGPT Sites](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites)）。したがって、UI-only判定だけでDB安全と断定しない。Git差分の判定は補助CLI `node site/scripts/sites-release-preflight.mjs --base <base> --target <target>` を使う。分類が緑でもバックアップ、復元可能性、公開承認、Sites側の状態を証明しない。

## 役割と開始条件

- **依頼者:** 何をいつどの既存Siteへ公開するかを承認する。リスク受容や必須バックアップ条件の緩和も別の明示承認として判断する。
- **ChatGPT親エージェント:** 変更範囲、ブランチ、受入結果、承認境界を管理し、Mac担当へ具体的な実行指示を渡す。承認なしにGitHub mainへmergeしない。
- **Codex Mac:** ローカルGit差分・ビルド成果物・SHAを確認し、この手順とpreflightに従う。秘密・本番データをリポジトリやログへ入れない。
- **Work（公式Sites環境）:** 既存プロジェクトの公式UI/APIでアーカイブ、D1確認、バージョン保存・公開・ヘルス確認を行う。利用可能なツール能力を最初に確認し、未提供のDBコマンドを仮定しない。

長い確認に入る前に、Workで使える公式機能を確認する: 対象Siteの選択、ソース・Worker・静的成果物の読取、D1の読み取り/SQL/export、公開バージョン保存、公開、公開状態・URLの再読取。確認できた操作とできない操作を記録する。完全バックアップが読めない場合は一度だけ、公式の別exportまたはSQL読取・chunk queryが使えるかを試す。能力がなければ `CAPABILITY_BLOCKED` と記録し、**R0で承認済み代替策の全条件を満たせる場合のみ**再取得を省略して次へ進む。R1/R2またはR0の条件不足は停止し、同じ取得操作や認証を反復しない。

Google loginはSites/D1作業の前提ではない。公式ツールが特定操作にGoogle認証を必要とすると実証でき、かつ承認済み作業に必要な場合だけ依頼者に説明する。認証を推測で求めない。

## リスク分類とバックアップ承認

| 区分 | 差分 | 公開前ゲート |
|---|---|---|
| **R0 UI-only** | UI、静的asset、docs、testsのみ。Worker、engine、schema、migration、binding、他backend変更なし | 完全な最新バックアップを優先。取得機能がない場合は**2026-11-04承認済みR0代替策**の全条件を満たす場合のみ、過去の復元検証済みバックアップを使用可。 |
| **R1 DB-impacting code** | Worker/engine等のコードにDB読書き・初期化・状態変換の変更 | 完全な最新D1バックアップ、復元確認、DB影響とmigration有無/計画、コード/データ互換性が揃わなければNO-GO。 |
| **R2 schema/binding** | DDL、migration、DB schema、binding/target変更 | 完全バックアップと復元確認に加えて、migration計画・適用順・ロールバック・実行後schema検証が必須。欠ければNO-GO。 |

**2026-11-04にR0代替策を明示承認済み。** ユーザーはv17～v19の停止と、UI更新時に限る代替バックアップ・残存データ喪失リスクの説明を受け、「任せるので公開して」とv19公開と当該リスクの受容を指示した。承認記録と適用境界は [SITES_RELEASE_POLICY_DECISION_20261104.md](SITES_RELEASE_POLICY_DECISION_20261104.md) を参照。**公開自体の承認はリリースごとに必要**であり、この方針は無条件の自動公開許可ではない。R1/R2のバックアップゲートは変更しない。

R0で**完全な最新D1バックアップが利用できないときの代替GO条件（全項目必須）**：
1. 公式Sitesの新しい全件exportまたはread-only SQL chunk方式を一度調べ、不可能・途中省略と記録。利用できるときは新規の完全バックアップ＋復元検証を優先する。
2. 同じDBの既存フルバックアップ（例：v18時点）が**省略なしで取得済み・復元検証済み**で、保存先と証跡が参照可能。復元に使ったDDLがソース由来で本番ライブDDL全文は未検証と明記する。過去バックアップに現在までの投票等は含まれない場合がある。
3. 今回のGit差分が `UI_ONLY`。Worker API、engine、SQL/schema、migration、hosting manifest、D1 binding、Site ID/URLが変わらないことを別途照合。preflight greenのみを根拠にしない。
4. 公開直前に公式read-only操作で**両テーブルの行数**、取得可能なら行ID・version・ハッシュ・バイト数を記録し、公開後も同じ値を比較する。行数が不明、予期しない構造/行数差分、破壊的変更の実証がある場合は停止。ゲーム稼働中のversion増加は自然な更新の可能性があるため、単独ではデータ完全性の証拠にも障害の証拠にもならない。
5. 本番D1の完全な最新状態は復旧できない可能性、Sites内部で未知のDB操作が起きる可能性、ロールバックでもD1は戻らないことを受容したうえで、既存Siteの正確な対象保存版・ソース・Worker/公開asset SHAと承認済み公開要求を照合して公開。公開後すぐ健康状態・公開版・行数などを検証し、異常時には追加の書込み/再公開を止めて状況を報告する。

R0以外には代替バックアップを適用できない。過去バックアップが見つからない、復元検証の証跡が不十分、Site/DBの対象不明、コード変更の影響が不明の場合も代替GOにしない。

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

1行のサイズとrow countを記録し、1-based byte offsetで全範囲を重複なく読み取る。チャンクごとにversionが同一であることを確認する。Workがchunk query/exportに対応する場合、結果を保護されたJSON入力としてMacへ渡し、`node site/scripts/verify-d1-chunks.mjs --input <private.json> --output <private-restored.json>` で検証する。入力は `expectedBytes`, `finalBytes`, `expectedVersion`, `finalVersion`, `expectedRowId`, `chunks:[{id,offset,version,hex}]` を含む。最後に再度SELECTでid/version/bytesを確認して開始時の値と一致させる。テーブル行のid/versionはJSON本体の項目とは別に取得する。検証器は完全coverage、UTF-8、JSON、行ID/versionを確認し、出力を新規ファイル・0600で作成する。切り詰めたテキストだけから欠落データは復元できない。SQL機能がない場合、架空のtool支持を示唆せず `CAPABILITY_BLOCKED` と記録する。R0かつ承認済み代替GO条件がすべて揃う場合は既存バックアップを使い、他は停止する。

## GO / NO-GO

**GO** は次のすべてが揃った場合のみ: 正確なtarget commitと成果物SHAを照合、preflight分類を確認、リスク分類を確定、適用中のバックアップ要件（新規完全バックアップ、または承認済みR0代替GOの全条件）を満たし過去バックアップの復元可能性を確認、D1の公開前baselineを記録、既存Site ID・URL・binding・公開範囲を固定、依頼者の今回の公開承認を確認。これらを一つでも確認できなければ**NO-GO**。

公開後は公式Sites画面を再読込して保存version/公開状態とsource SHAを確認し、公開URLでHTTP/healthと主要画面、`/app.js` SHA、必要な読み取り専用API応答、D1行数/version/checksumを公開前記録と比較する。動作を変えるDB書込み試験は別承認がない限り行わない。アクセス可能なデータをログへ出さず、結果はhash/件数/状態だけで報告する。UIの見た目やURL応答だけをD1整合性証拠としない。

異常、予期しないschema/row差、source SHA不一致、保存/公開状態の不明、公開後ヘルス不良は停止条件。既存の承認済みrollback手順で前のSites versionへ戻し、公開状態・URL・データ状態を再確認する。D1への手動復元や書込みは別途明示承認なしに行わない。復元できる状態が確認できない場合はさらに変更を加えず、状況と欠落証拠を依頼者へ報告する。
