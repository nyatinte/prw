# @nyatinte/prw

[English](./README.md) | 日本語

`prw` は、pnpm workspace のルートからパッケージとスクリプトを選んで実行するための CLI ツールです。

> [!IMPORTANT]
> `prw` は意図的に機能を絞っています。
> workspace 内にすでに定義されている script を選んで実行することだけを扱います。
> 独自のタスク定義や追加の仕組みは持ち込みません。

## これは何をするツールか

pnpm workspace で、実行したい package と script をルートから選んで実行します。
使うのは既存の `package.json` scripts だけです。

## インストール

```bash
npm install -g @nyatinte/prw
# or
pnpm add -g @nyatinte/prw
```

## 開発

このリポジトリでは型チェックに [`tsgo`](https://github.com/microsoft/typescript-go) を使います。

```bash
pnpm typecheck
pnpm test run
pnpm build
```

## 使い方

### 1. 引数なしで起動する

```bash
prw
```

package を選んで、script を選んで、そのまま実行します。
workspace root の package も選択できます。

### 2. package を先に指定する

```bash
prw web
```

package 名はラフに指定できます。
完全一致でなくても、名前の一部が合っていれば絞り込めます。
マッチする package が 1 件なら、そのまま script 選択に進みます。
複数マッチした場合は package 選択画面が表示されます。
よく使う package は履歴に基づいて上に表示されます。

### 3. package と script を直接指定する

```bash
prw @myapp/web dev
```

package と script が特定できれば、そのまま実行します。
実行できるのは `package.json` に定義された script だけです。
よく使う script も履歴に基づいて上に表示されます。

> [!NOTE]
> package 名を毎回フルで打つ必要はありません。
> `prw web` のような短い指定でも使えます。

## 実行イメージ

```text
$ prw
? Select package
❯ (root)
  @myapp/web      apps/web
  @myapp/api      apps/api

? Select script
❯ dev
  build
  test
```

## workspace の例

```text
.
├─ package.json
├─ pnpm-workspace.yaml
├─ apps/
│  └─ web/
│     └─ package.json
└─ packages/
   ├─ ui/
   │  └─ package.json
   └─ config/
      └─ package.json
```

このような monorepo で、ルートから `apps/*` や `packages/*` の scripts を選んで実行できます。

## 注意事項

> [!IMPORTANT]
> `prw` は workspace root で実行してください。
> カレントディレクトリに `pnpm-workspace.yaml` がない場合は動作しません。

## License

MIT
