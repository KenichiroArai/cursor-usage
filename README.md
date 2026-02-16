# cursor-usage

Cursorの使用量の記録を公開する。

## 開発

```bash
npm install
npm run dev
```

http://localhost:3000/ で表示されます。（本番は `/cursor-usage/` 配下）

`npm run dev` 実行時は自動で `scripts/copy-data.js` が走り、`data/` のデータを `public/data/` にコピーします。

## ビルド

```bash
npm run build
```

静的ファイルが `out/` に出力されます。

## データ処理ツール

```bash
npm run tool:update-events   # usage-events.csv を更新
npm run tool:calc-api-cost   # API コスト算出
```

## デプロイ

main ブランチへの push で GitHub Actions が自動的に GitHub Pages にデプロイします。
