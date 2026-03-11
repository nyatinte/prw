# ADR-001: 初期CLIアーキテクチャ設計

## Status

Accepted

## Date

2026-03-12

## Context

pnpm workspace 環境において、ルートから対話的にパッケージとスクリプトを選んで実行できる CLI ツールが必要だった。

`nr`（antfu/ni）は `-C packages/app` でディレクトリ指定すればスクリプトピッカーは出るが、「どのパッケージか自体をインタラクティブに選ぶ」機能がない。`@nyatinte/prw` はその gap を埋めるために設計した。

## Decision

以下のアーキテクチャ・機能仕様を採用する。

### 基本フロー

```
prw
# ↓ パッケージ一覧（fuzzy search）
❯ (root)          .
  @myapp/web      apps/web
  @myapp/api      apps/api
  @myapp/ui       packages/ui
# ↓ スクリプト一覧（fuzzy search）
❯ dev
  build
  test
# → pnpm --filter @myapp/web run dev を実行
# root を選んだ場合は pnpm run dev を実行（--filter なし）
```

### モジュール構成

| ファイル | 責務 |
|---|---|
| `src/workspace.ts` | `findWorkspaceRoot`, `getPackages` |
| `src/history.ts` | 履歴の読み書き（LRU 50件） |
| `src/runner.ts` | `runScript`（pnpm コマンド実行） |
| `src/ui.ts` | `@clack/prompts` を使ったインタラクティブ UI |
| `src/sort.ts` | パッケージ・スクリプトのソートロジック |
| `src/index.ts` | CLI エントリーポイント |

### CLI 引数仕様

| コマンド | 動作 |
|---|---|
| `prw` | パッケージ選択 → スクリプト選択 → 実行 |
| `prw <package>` | fuzzy match でパッケージ特定 → スクリプト選択 → 実行 |
| `prw <package> <script>` | 直接実行（UI なし） |

### workspace 検出

カレントディレクトリのみ `pnpm-workspace.yaml` を探す。親ディレクトリへの遡りはサポートしない。

理由: `pnpm` コマンドはワークスペースルートから実行するのが前提であるため、`prw` も同様でよい。遡った先が意図したワークスペースかの判断が困難であり、シンプルな実装・明確なエラーメッセージで十分。

見つからない場合は `WorkspaceNotFoundError` をスロー（メッセージ: "Run prw from workspace root."）。

### UI ライブラリ

`@clack/prompts` の `autocomplete` を使用し、入力しながら絞り込める UI を実現する。

### 履歴機能

- 保存先: `~/.config/prw/history.json`（OS ホームディレクトリ基準）
- 保持件数: 50件（LRU）
- 同じ package + script の再追加 → 先頭に移動（重複なし）
- 履歴があるパッケージ・スクリプトを上位に表示

### スクリプト実行

- `pkg.dir === "."` → `pnpm run <script>`（`--filter` なし）
- それ以外 → `pnpm --filter <pkg.name> run <script>`
- `stdio: "inherit"` で対話的に動作

## Consequences

- シンプルな設計でテスト可能。UI ロジックはソートなど純粋関数として分離し、ユニットテストを書きやすくした
- workspace 遡り非対応により、ユーザーはルートから実行する必要があるが、これは pnpm の標準的な使い方と一致する
- 履歴機能によりよく使うパッケージ・スクリプトが上に表示され、UX が向上する
