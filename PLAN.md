# @nyatinte/prw 実装チェックポイント

## 概要

pnpm workspace で「rootからインタラクティブにパッケージとスクリプトを選んで実行する」CLIツール。

`nr`（antfu/ni）は `nr -C packages/app` でディレクトリ指定すればスクリプトのpickerは出るが、  
「どのパッケージか自体をインタラクティブに選ぶ」機能はない。  
`@nyatinte/prw` はその gap を埋める。

```
# rootで実行するだけ
prw
# ↓ パッケージ一覧（fuzzy search）
❯ (root)          .                   ← workspace root も選べる
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

履歴機能により、よく使うパッケージ・スクリプトが常に上に表示される。

-----

AIへの作業指示用。**1チェックポイント = 1コミット**を目安にする。
テストを先に書いてから実装する（TDD）。
各チェックポイントで /simplify Skillを実行すること
このファイルはコミットしないこと

-----

## Phase 1: プロジェクトセットアップ

### CP-01: リポジトリ初期化

- [x] `pnpm init`
- [x] `.gitignore` 作成
- [x] `README.md` 作成（最小限）

### CP-02: TypeScript / ビルド環境

- [x] `tsdown` `typescript` `tsx` をインストール
- [x] `tsconfig.json` 作成（ESM、strict）
- [x] `package.json` に `bin`, `scripts`, `type: "module"` を設定
- [x] `src/index.ts` に `console.log("hello")` だけ書いてビルドが通ることを確認

### CP-03: 依存パッケージ追加

- [x] `@clack/prompts` `js-yaml` `fast-glob` をインストール
- [x] `vitest` をdevDependenciesに追加
- [x] 型定義パッケージ（`@types/js-yaml` など）追加
- [x] `vitest.config.ts` 作成・`pnpm test` が通ることを確認

-----

## Phase 2: コア機能

> **TDDルール**: 各CPで先にテストを書き（Red）、実装して通す（Green）こと。

### CP-04: workspace検出

- [x] テストを先に書く
- [x] `src/workspace.ts` 実装（`findWorkspaceRoot(cwd: string): string`）
  - 現在地から上方向に `pnpm-workspace.yaml` を探す
  - 見つからなければ `WorkspaceNotFoundError` をthrow

```
テストケース:
- pnpm-workspace.yaml がカレントにある → そのパスを返す
- pnpm-workspace.yaml が親ディレクトリにある → 親のパスを返す
- pnpm-workspace.yaml が存在しない → WorkspaceNotFoundError をthrow
```

### CP-05: パッケージ一覧取得

- [x] テストを先に書く
- [x] `src/workspace.ts` に追加実装（`getPackages(root: string): Package[]`）
  - `pnpm-workspace.yaml` の `packages` glob を `fast-glob` で展開
  - 各ディレクトリの `package.json` を読んで `{ name, dir }` の配列を返す
  - **workspace root（`.`）を先頭に必ず含める**
    - 表示名: `(root)`、dir: `.`、実行時は `--filter` なしで `pnpm run <script>`

```
テストケース:
- 返り値の先頭が常に workspace root エントリ `{ name: "(root)", dir: "." }` である
- packages: ['apps/*'] → root + apps/ 配下の全パッケージを返す
- name フィールドがない package.json → dir をフォールバックとして使う
- scripts が空の package.json → scripts: {} として扱う
- glob にマッチするディレクトリが0件 → root のみ返す
```

### CP-06: 履歴の読み書き

- [x] テストを先に書く
- [x] `src/history.ts` 実装
  - `loadHistory(): HistoryEntry[]`
  - `saveHistory(entry: HistoryEntry): void`
  - 保持件数50件でLRU的に古いものを削除
  - ファイルが存在しない場合は空配列で初期化

```
テストケース:
- 履歴ファイルが存在しない → [] を返す
- 履歴ファイルが壊れている（不正JSON） → [] を返す（クラッシュしない）
- 同じ package + script を追加 → 先頭に移動（重複しない）
- 51件追加 → 50件に切り詰められる
- 保存 → 次回loadで同じデータが返る
```

### CP-07: スクリプト実行

- [x] `src/runner.ts` 実装（`runScript(pkg: Package, script: string): void`）
  - `pkg.dir === "."` の場合は `pnpm run <script>`（`--filter` なし）
  - それ以外は `pnpm --filter <pkg.name> run <script>` を実行
  - stdioをinheritして対話的に動作するように
- [x] 手動テストで `dev` スクリプトが正常に起動することを確認

```
テストケース（モック使用）:
- 通常パッケージ → ["pnpm", ["--filter", "<pkg>", "run", "<script>"]]
- workspace root（dir === "."） → ["pnpm", ["run", "<script>"]]（--filter なし）
- 終了コード0以外 → process.exit(code) が呼ばれる
```

-----

## Phase 3: UIフロー

> UIはインタラクティブなため自動テスト困難。ロジック部分だけユニットテストを書く。

### CP-08: パッケージ選択UI

- [x] `src/ui.ts` 実装（`selectPackage(packages: Package[], history: HistoryEntry[]): Promise<Package>`）
  - `@clack/prompts` の `select` でパッケージ一覧表示
  - 表示形式: `@myapp/web` + hint に `apps/web`
  - 履歴があるパッケージを上にソート、それ以外はアルファベット順

```
テストケース（ソートロジックのみ）:
- 履歴にあるパッケージが上に来る
- 履歴の新しい順（timestamp降順）でソートされる
- 履歴にないパッケージはアルファベット順
```

### CP-09: スクリプト選択UI

- [x] `src/ui.ts` に追加実装（`selectScript(pkg: Package, history: HistoryEntry[]): Promise<string>`）
  - 選択したパッケージの `package.json` のスクリプト一覧を `select` で表示
  - そのパッケージの履歴スクリプトを上に表示

```
テストケース（ソートロジックのみ）:
- 履歴にあるスクリプトが上に来る
- スクリプトが0件 → エラーメッセージを出して終了
```

### CP-10: fuzzy search対応

- [x] `src/fuzzy.ts` 実装（`fuzzyFilter(query: string, items: string[]): string[]`）
- [x] パッケージ選択・スクリプト選択の両方に組み込む

```
テストケース:
- "web" → ["@myapp/web", "@myapp/web-admin"] にマッチ
- "adm" → ["@myapp/web-admin"] のみマッチ
- 空文字 → 全件返す
- 大文字小文字を区別しない
```

-----

## Phase 4: CLIエントリーポイント

### CP-11: 引数なし（フルフロー）

- [x] `src/index.ts` 実装
  - `prw` → パッケージ選択 → スクリプト選択 → 実行 → 履歴保存
- [x] `pnpm build && prw` で手動動作確認

### CP-12: `prw <package>`

- [x] パッケージ名をfuzzy matchして特定
- [x] スクリプト選択 → 実行 → 履歴保存

```
テストケース:
- 完全一致するパッケージがある → 直接スクリプト選択へ
- 1件のみfuzzy matchする → 直接スクリプト選択へ
- 複数候補がある → UIでパッケージ選択
- 0件マッチ → エラーメッセージ出して終了
```

### CP-13: `prw <package> <script>`

- [x] 直接実行（UIなし）
- [x] 実行 → 履歴保存

```
テストケース:
- 存在するパッケージ + スクリプト → 実行
- 存在しないパッケージ → エラー終了
- 存在しないスクリプト → エラー終了
```

-----

## Phase 5: 仕上げ

### CP-14: エラーハンドリング全般

- [x] workspace外で実行した場合のエラーメッセージ
- [x] Ctrl+C でのキャンセル処理（`@clack/prompts` の `isCancel` 対応）
- [x] `package.json` に `name` フィールドがないパッケージの扱い（dirをフォールバック）

```
テストケース:
- isCancel(value) → "Cancelled." を表示して process.exit(0)
- WorkspaceNotFoundError → わかりやすいエラーメッセージを表示
```

### CP-15: README整備

- [x] インストール方法
- [x] 使い方（コマンド例3パターン）
- [x] 動作デモ（vhs or asciinema のプレースホルダー）

### CP-16: npm publish準備

- [x] `package.json` の `files` フィールド設定（`["dist"]` のみ）
- [x] `prepublishOnly` に `pnpm build` を設定
- [x] `pnpm pack` でパッケージ内容を確認
- [x] `publint` でpublish前チェック

-----

## チェックポイント一覧

|CP   |タイトル                    |フェーズ  |テストあり     |
|-----|------------------------|------|----------|
|CP-01|リポジトリ初期化                |セットアップ|—         |
|CP-02|TypeScript / ビルド環境      |セットアップ|—         |
|CP-03|依存パッケージ追加               |セットアップ|—         |
|CP-04|workspace検出             |コア    |✅         |
|CP-05|パッケージ一覧取得               |コア    |✅         |
|CP-06|履歴の読み書き                 |コア    |✅         |
|CP-07|スクリプト実行                 |コア    |✅ (モック)   |
|CP-08|パッケージ選択UI               |UI    |✅ (ロジックのみ)|
|CP-09|スクリプト選択UI               |UI    |✅ (ロジックのみ)|
|CP-10|fuzzy search対応          |UI    |✅         |
|CP-11|引数なし（フルフロー）             |CLI   |手動        |
|CP-12|`prw <package>`         |CLI   |✅         |
|CP-13|`prw <package> <script>`|CLI   |✅         |
|CP-14|エラーハンドリング全般             |仕上げ   |✅         |
|CP-15|README整備                |仕上げ   |—         |
|CP-16|npm publish準備           |仕上げ   |—         |
