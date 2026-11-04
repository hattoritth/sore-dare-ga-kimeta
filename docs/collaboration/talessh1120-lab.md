# talessh1120-lab：共同編集用worktree

**目的：** 他の開発者の変更・Gitブランチと衝突しないよう、作業場所を分離する。worktree内でも `site/` など実際のゲームソースを編集できる。

## 初回セットアップ（作業する本人のPCで）
1. GitHubからの共同編集招待を承諾する。
2. 未取得なら `git clone https://github.com/hattoritth/sore-dare-ga-kimeta.git` する。
3. **PR #25 がまだmainにマージされていない場合**、以下の専用bootstrapブランチ経由で準備する。

```sh
cd sore-dare-ga-kimeta
git fetch origin
git switch -c local-collab-setup --track origin/collab/talessh1120-lab/bootstrap
COLLAB_BASE_REF=origin/collab/talessh1120-lab/bootstrap bash scripts/setup-talessh1120-lab-worktree.sh first-change
```

PR #25 がmainにマージされた後は、通常の `main` チェックアウトから
`bash scripts/setup-talessh1120-lab-worktree.sh first-change` を実行してもよい
（ただしゲーム改修時の基点ブランチは事前に確認）。

リポジトリの**隣**に `sore-dare-ga-kimeta-talessh1120-lab/` が作られ、そこで `collab/talessh1120-lab/first-change` ブランチが有効になる。フォルダは各PCのローカルにあり、GitHubにフォルダ自体は同期されない。

既定のベースは `origin/main`。ただしゲーム最新版が未マージの開発ブランチにある場合があるため、作業開始前に責任者とベースを決める。たとえば2026-11-04時点の開発ブランチを使う場合：

```sh
COLLAB_BASE_REF=origin/feat/f5-v23-happiness-options-qr-20261104 bash scripts/setup-talessh1120-lab-worktree.sh first-change
```

上記ブランチ名は例。実行時の最新ブランチを都度確認する。

## Claude Code / Codex の起動
エージェントは専用worktreeのルートから起動する。`AGENTS.md` はCodex用、`CLAUDE.md` はClaude Code用（同じ方針を読み込む）。

```sh
# 元のclone内から、作業領域の検証付きで起動
bash scripts/enter-talessh1120-lab.sh codex
# または
bash scripts/enter-talessh1120-lab.sh claude

# 手動起動も可
cd ../sore-dare-ga-kimeta-talessh1120-lab
git status --short --branch
codex   # または claude
```

エージェントへの依頼例：「talessh1120-labの専用worktreeで実装し、テスト・差分を検証してPRを作成。mainへ直接pushやmerge、Sites公開はしないでください。」

## 日々の運用
- タスクごとに `collab/talessh1120-lab/<task>` ブランチを作り、変更の途中で別タスクに切り替えない。
- 修正後は `git diff`、`git status`、該当テストを確認。自分のブランチにpushしてPRを提出する。PRのベースは着手前に合意したブランチ。
- Merge・一般公開・本番データ操作は依頼者の承認が必要。秘密情報はGitに登録しない。
- スクリプトは既存のフォルダを削除せず、異なるworktreeやブランチがある場合は停止する。
- worktreeはアクセス制限ではない。GitHubの権限とブランチ保護を併用する。
