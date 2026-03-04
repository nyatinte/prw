# @nyatinte/prw

pnpm workspace で、rootからインタラクティブにパッケージとスクリプトを選んで実行するCLIツール。

## インストール

```bash
npm install -g @nyatinte/prw
# または
pnpm add -g @nyatinte/prw
```

## 使い方

### モード 1: インタラクティブ選択（引数なし）

```bash
prw
# ↓ パッケージ一覧を表示
# ❯ (root)          .
#   @myapp/web      apps/web
#   @myapp/api      apps/api
# ↓ スクリプト一覧を表示
# ❯ dev
#   build
#   test
```

### モード 2: パッケージ指定（パッケージ名のfuzzy match）

```bash
prw web
# @myapp/web が自動選択 → スクリプト選択画面へ
```

複数にマッチした場合はパッケージ選択画面が表示されます。

### モード 3: 直接実行（パッケージ + スクリプト指定）

```bash
prw @myapp/web dev
# 直接実行、UIなし
```

## 特徴

- 🎯 **インタラクティブ**: fuzzy search で素早くパッケージ・スクリプトを検索
- 📝 **履歴機能**: よく使うパッケージ・スクリプトは常に上に表示
- ⚡ **高速**: 軽量なCLI、起動時間最小化
- 📦 **pnpm対応**: pnpm workspace に完全対応

## デモ

```
$ prw
? Select package ›
❯ @myapp/web      apps/web
  @myapp/api      apps/api
  (root)          .

? Select script ›
❯ dev
  build
  type-check
  test
```

## ライセンス

MIT

