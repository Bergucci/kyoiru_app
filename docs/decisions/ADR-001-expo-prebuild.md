# ADR-001 Expo Prebuild を採用する

## ステータス

決定済み

## 日付

2026-04-15

## 文脈

Kyoiru は以下の前提を持つ。

- LINE ログインを日本向け導線として重視する
- Apple ログイン、Google ログイン、通知、Deep Link を含むモバイル基盤が必要
- 後から native module 対応のために構成変更すると管理コストが高い

これまでの候補は以下の 2 つだった。

- Expo managed を維持する
- Expo prebuild を前提にする

## 決定

モバイル基盤は **Expo prebuild 前提** で進める。

## 理由

- LINE ログイン対応の不確実性を早い段階で下げられる
- native module を必要とする場合でも構成変更なしで対応できる
- Apple / Google 認証、通知、Deep Link を含めた将来拡張に対して安定している
- managed で開始して後から prebuild に移行するより、初期から prebuild を前提にした方が管理しやすい

## 採用しなかった案

### Expo managed

不採用理由:
- LINE ログイン実装経路の制約が残る
- 後から native module が必要になった場合に構成変更コストが発生する
- 認証・通知・ビルド運用を含めて再整理が必要になる可能性がある

## 影響

- LINE ログインは native module 利用を許容する前提で設計する
- 通知基盤の選択は Expo 前提で整理しやすくなる
- CI / ビルド運用は prebuild 前提で設計する
- `docs/architecture.md` の認証方針を native SDK 前提で具体化できる

## 後続アクション

- ADR-004 通知基盤選定を前に進める
- `docs/architecture.md` と実装側設定で LINE ログイン詳細を具体化する
