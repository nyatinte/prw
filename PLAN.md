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
  - **カレントディレクトリのみ** `pnpm-workspace.yaml` を探す（親ディレクトリへの遡りなし）
  - 見つからなければ `WorkspaceNotFoundError` をthrow（エラーメッセージ: "Run prw from workspace root."）
  - 遡り機能は初期リリースではサポートしない（曖昧性・複雑性のため）

```
テストケース:
- pnpm-workspace.yaml がカレントにある → そのパスを返す
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

## Phase 6: 品質改善（レビューで発覚した課題）

### CP-17: history.ts のフォールバックテスト追加

現在のロジックテストはファイルシステムをモックしていないため、PLAN.md で定義したテストが未実装のままになっている。

```
追加テストケース（fs モック使用）:
- 履歴ファイルが存在しない → [] を返す（クラッシュしない）
- 履歴ファイルが存在するが不正 JSON → [] を返す（クラッシュしない）
- saveHistory → loadHistory で同じデータが返る（実際の読み書き）
```

### CP-18: findWorkspaceRoot を「カレントのみ」に変更

**決定**: 遡り機能は初期リリースから除外する。

理由:
- `pnpm` コマンドはワークスペースルートから実行するのが前提のため、`prw` も同様でよい
- 遡った先が意図したワークスペースかの判断が困難
- シンプルな実装・明確なエラーメッセージで十分

```
実装変更:
- while ループを削除し、カレントディレクトリのみチェック
- エラーメッセージを "Run prw from workspace root." に変更

テストケース変更:
- 追加: pnpm-workspace.yaml がカレントにある → そのパスを返す ✅ 既存
- 削除: 親ディレクトリにある → 親のパスを返す（機能削除）
- 変更: 存在しない → WorkspaceNotFoundError ✅ 既存（メッセージ更新）
```

### CP-19: `select` → `autocomplete` 移行

`@clack/prompts` v1.1.0 に `autocomplete` 関数が存在する（type-ahead filtering 内蔵）。
現在の `select` を `autocomplete` に差し替えることで UI での fuzzy filtering が実現できる。

```typescript
// 現状
import { select } from "@clack/prompts";
await select({ message, options });

// 変更後
import { autocomplete } from "@clack/prompts";
await autocomplete({ message, options }); // 入力しながら絞り込み可能
```

**影響範囲**:
- `src/ui.ts`: `select` → `autocomplete` に変更
- `src/fuzzy.ts`: CLI 引数モード（`prw <pkg>`）のフィルタリング用としては残す or 削除
  - CLI 引数モードは既に `includes()` のみで動いているため `fuzzy.ts` 自体を削除も検討

```
テストケース:
- autocomplete に options を渡すと正常に動作する（手動確認）
- fuzzy.ts を削除した場合は fuzzy.test.ts も削除
```

### CP-20: ソートロジックを `sort.ts` に分離

`src/ui.ts` にある `sortPackages`, `sortScripts` は UI と独立したロジック。分離してテストしやすくする。

```
変更内容:
- src/sort.ts を新規作成（sortPackages, sortScripts を移動）
- src/sort.test.ts として独立したテストファイル
- src/ui.ts は @clack/prompts を使うコードのみに特化
- src/ui.test.ts は削除（テストは sort.test.ts に移行）
```

### CP-21: pnpm workspace 除外パターンのテスト追加

`fast-glob` は `!` prefix の除外パターンに対応しているため実装は動くが、テストが欠けている。

```
追加テストケース:
- packages: ['apps/*', '!apps/legacy'] → legacy 以外が返る
```

### CP-22: index.ts の CLI モードテスト追加

CP-12, CP-13 でテストケースが PLAN.md に定義されているが、`src/index.ts` のテストファイルが存在しない。

```
新規: src/index.test.ts
- prw <package> で 1件のみマッチ → selectScript に進む
- prw <package> で 0件マッチ → process.exit(1)
- prw <package> で 複数マッチ → selectPackage UI を表示
- prw <package> <script> で 1件マッチ → 直接 runScript 呼び出し
- prw <package> <script> で 0件マッチ → process.exit(1)
- prw <package> <script> で 複数マッチ → "Be more specific" エラーで process.exit(1)
```

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
|CP-17|history.ts フォールバックテスト    |品質改善  |⬜ 未実装     |
|CP-18|findWorkspaceRoot 遡り削除  |品質改善  |⬜ 未実装     |
|CP-19|`autocomplete` 移行        |品質改善  |⬜ 未実装     |
|CP-20|ソートロジック `sort.ts` 分離    |品質改善  |⬜ 未実装     |
|CP-21|除外パターンテスト追加             |品質改善  |⬜ 未実装     |
|CP-22|index.ts CLI モードテスト追加    |品質改善  |⬜ 未実装     |
