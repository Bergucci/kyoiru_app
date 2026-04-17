# ADR-002 RevenueCat を採用する

## ステータス

決定済み

## 日付

2026-04-15

## 文脈

Kyoiru の課金仕様は以下を含む。

- 月額課金のみ
- 7 日間無料トライアル
- Grace Period を前提とした継続利用
- 解約後も有効期限満了までは有料機能利用可
- 満了後は停止
- 見守り設定は削除せず保持し、再契約時に復元可能

課金基盤の候補は以下の 2 つだった。

- RevenueCat を採用する
- App Store / Google Play を自前で直接扱う

## 決定

課金基盤は **RevenueCat を採用** する。

## 理由

- 月額課金、無料トライアル、Grace Period、復元の管理負荷を下げられる
- iOS / Android の差分吸収に向いている
- entitlement 管理の安定性を優先できる
- 自前実装に比べて QA と運用のリスクが小さい

## 採用しなかった案

### 自前課金基盤

不採用理由:
- StoreKit / Google Play Billing の差分吸収コストが高い
- Grace Period、復元、Webhook 相当の状態同期を自前で設計する必要がある
- 課金まわりの QA と運用監視が重くなる

## 影響

- 課金権利の単一ソースは RevenueCat 連携済みの entitlement 情報を基準とする
- クライアント単体で有料機能を解放しない
- バックエンドは RevenueCat Webhook を前提に権利状態を同期する
- `docs/architecture.md` の課金 / 見守り方針を具体化できる

## 後続アクション

- `docs/architecture.md` で RevenueCat 前提の権利管理方針を維持する
- 課金 QA は RevenueCat Sandbox 前提で整理する
