# AGENTS.md — AIゼミ展示「それ、誰が決めた？」

## Source of Truth
- 正式なソースは `hattoritth/sore-dare-ga-kimeta`。作業前に現在のブランチ・README・関連PR・最新仕様を確認する。
- 未マージのゲーム実装が `main` より先行することがある。作業開始前に依頼者と基点ブランチを合わせ、古い人物設定・機能仕様をこの文書だけで固定しない。

## 共同編集（Codex / Claude Code 共通）
- 開発者ごとに **Git worktree**（独立した作業フォルダとブランチ）を使う。ゲームソースを人別に複製して分岐させない。
- `talessh1120-lab` の専用作業フォルダは、リポジトリの隣の `sore-dare-ga-kimeta-talessh1120-lab/`。ブランチは `collab/talessh1120-lab/<task>`。
- 初回の準備は `bash scripts/setup-talessh1120-lab-worktree.sh <task>`。詳細は `docs/collaboration/talessh1120-lab.md`。
- `talessh1120-lab` として編集を依頼されたエージェントは、編集前に現在のGitルートとブランチを確認する。上記worktree以外にいる場合は移動し、無ければ準備を案内する。他人のworktreeを変更しない。
- `hattoritth` 側は自分のworktreeを使用し、`talessh1120-lab` の作業領域を流用しない。依頼された担当者は明示されたユーザーで判断し、`git config user.name` だけで本人確認しない。
- worktreeは作業衝突を抑える仕組みでありアクセス制御ではない。各自でブランチ・変更を管理し、統合はPRを通す。

## Workflow / 検証
1. `main` を直接編集せず、担当者・タスク別ブランチで作業する。既存の未コミット変更を勝手に破棄しない。
2. 2036年の導入、街の変化、判断の帰結、ソロ・共有モード等を維持し、変更前に現行ゲーム仕様を確認する。
3. `site/` の変更後は `cd site && bash scripts/build.sh && node scripts/validate-artifact.mjs && npm test`。必要に応じてiPad横1024×768、iPhone縦390×844、モニター1920×1080で実画面確認。
4. D1変更では同時投票・再接続・重複投票防止・隠し指標の秘匿を検証。
5. APIキー、Cookie、実D1データ、社内機密、秘密鍵、個人情報をコミット・ログに含めない。
6. PRには差分・テスト結果・未確認事項を明記。Merge・一般公開・外部共有・権限変更・本番反映には依頼者の明示的な承認が必要。

## UX
横スクロール禁止。タップ領域は原則44px以上。展示画面に「PoC」「デモ」「試作」などを出さない。街が動き、過去の判断が続く体験を優先。

## 毎回のHTML引渡し（2026-11-03 ユーザー指示）
- ゲームのUI・内容・ロジックを改修したら、完了報告と同じターンで必ず最新版の一人用単体HTMLを提示すること。これはユーザーが継続的に希望する受入成果物である。
- siteディレクトリで npm test と node scripts/validate-artifact.mjs を実行する。npm test の前処理で standalone/それ、誰が決めた？_街が動く版.html が自動再生成される。生成されたHTMLはコミット対象とし、古いHTMLを流用しない。
- HTMLの存在・サイズ・SHA-256、GitコミットSHA、同じソースから生成したことを確認する。可能ならChatGPTの会話に直接HTMLファイルを添付し、ダウンロードリンクを提示する。添付できない環境では、GitHub上の該当コミットに固定したHTMLファイルへのリンク、利用者のMac上の絶対パス、開き方を提示する。架空のsandboxリンクは作らない。
- その都度、単体HTMLはソロ専用・オフライン動作、共有プレイにはサーバー/D1が必要であることを明記する。プレビュー・実機・本番Sitesで確認できた範囲を区別し、改修しただけで公開済みとは言わない。
- Site本番公開やGitHub main mergeを、HTMLを提示するためだけに実施しない。最新版HTMLの提供は本番デプロイの承認とは別である。
