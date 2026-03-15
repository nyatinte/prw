# @nyatinte/prw

[English](./README.md) | 日本語

[![CI](https://github.com/nyatinte/prw/actions/workflows/ci.yml/badge.svg)](https://github.com/nyatinte/prw/actions/workflows/ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/%40nyatinte%2Fprw)](https://npmx.dev/package/@nyatinte/prw#downloads)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

`prw` は、pnpm workspace でパッケージと script を選んで実行できる CLI ツールです。既存の `package.json` scripts だけを使い、独自の設定ファイルは不要です。

<table>
  <tr>
    <td width="50%">
      <img src="https://cdn.jsdelivr.net/gh/nyatinte/prw@main/.github/assets/readme-package-picker.webp" alt="package 名で絞り込んでいる画面" width="100%" />
    </td>
    <td width="50%">
      <img src="https://cdn.jsdelivr.net/gh/nyatinte/prw@main/.github/assets/readme-script-picker.webp" alt="package 選択後に script を選んでいる画面" width="100%" />
    </td>
  </tr>
  <tr>
    <td align="center"><small>fuzzy 検索で package を絞り込めます。</small></td>
    <td align="center"><small>script を選んで実行できます。</small></td>
  </tr>
</table>

## インストール

```bash
npm install -g @nyatinte/prw
# or
pnpm add -g @nyatinte/prw
```

## 使い方

### 1. 引数なしで起動する

```bash
prw
```

対話形式で package と script を選んで実行します。
ルートパッケージも選択できます。

### 2. package を指定する

```bash
prw web
```

package 名は fuzzy で指定できます。
1 件にマッチすれば script 選択へ、複数マッチすれば package 選択画面が表示されます。
よく使う package は履歴順で上位に表示されます。

### 3. package と script を指定する

```bash
prw @myapp/web dev
```

両方が一意に決まれば、選択画面をスキップして即実行します。
よく使う script も履歴順で上位に表示されます。

> [!NOTE]
> package 名をフルで入力する必要はありません。
> `prw web` のような短い指定でも使えます。

## 実行イメージ

```text
$ prw
│
◆  Select package
│
│  Search: _
│  ● (root)
│  ○ @myapp/web
│  ○ @myapp/api
│  ↑/↓ to select • Enter: confirm • Type: to search
└
```

package を選ぶと script 選択へ進みます。フォーカス中の script はコマンド本体が `(...)` で表示されます。

```text
│
◇  Select package
│  @myapp/web
│
◆  Select script
│
│  Search: _
│  ● dev (vite)
│  ○ build
│  ○ test
│  ↑/↓ to select • Enter: confirm • Type: to search
└
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

このような monorepo で、workspace 内のどこからでも apps/ や packages/ 配下の script を選んで実行できます。

## 仕様

> [!IMPORTANT]
> `prw` は workspace 内であればどこからでも実行できます。
> 親ディレクトリをたどって最も近い `pnpm-workspace.yaml` を見つけます。

> [!NOTE]
> 実行履歴は workspace ごとに `$XDG_STATE_HOME/prw/histories/<workspace-id>.json`
> （`XDG_STATE_HOME` 未設定時は `~/.local/state/prw/histories/<workspace-id>.json`）へ保存されます。
> `<workspace-id>` は、解決された workspace root path の SHA-256 ハッシュです。

## License

MIT
