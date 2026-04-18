# Kyoiru — ローカル開発手順

PC再起動後、以下の順番で起動してください。

## 1. PostgreSQL を起動

```bash
brew services start postgresql@16
```

## 2. API サーバーを起動（ターミナル①）

```bash
cd ~/kyoiru_app/apps/api
pnpm dev
```

`Kyoiru API is running on http://localhost:3000` が出たら起動完了。

## 3. モバイルアプリをビルド・起動（ターミナル②）

iPhone を Mac に接続した状態で：

```bash
cd ~/kyoiru_app/apps/mobile
npx expo run:ios --device
```

ビルド完了後、iPhone に Kyoiru アプリが起動します。

---

## 初回セットアップ（クローン直後）

```bash
# ルートで依存関係インストール
cd ~/kyoiru_app
pnpm install

# workspace パッケージをビルド
pnpm --filter @kyoiru/domain build

# Prisma クライアント生成
cd apps/api
pnpm db:generate

# DB マイグレーション
pnpm db:migrate:dev
```

## 環境変数

| ファイル | 用途 |
|---|---|
| `apps/api/.env` | API サーバー設定（DB、JWT、LINE チャンネル ID など） |
| `apps/mobile/.env` | モバイル設定（API URL、LINE チャンネル ID など） |

`apps/mobile/.env` の `EXPO_PUBLIC_API_URL` は Mac のローカル IP に設定してください：

```bash
ipconfig getifaddr en0   # IP 確認
```

```
EXPO_PUBLIC_API_URL=http://<上記のIP>:3000
```
