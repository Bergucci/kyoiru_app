# Step 8 QA 受け入れチェック

## 法務導線

- `GET /legal-links` が 4 種の公開ページ URL を返す
- mobile の `設定・ヘルプ` 画面から以下へ遷移できる
- プライバシーポリシー
- 利用規約
- 特定商取引法に基づく表記
- サポート / お問い合わせ

## サブスク説明

- `GET /billing/subscription-copy` が以下を返す
- プラン名
- 月額 980 円
- 7 日間無料トライアル
- 自動更新
- 解約方法
- 利用規約リンク
- プライバシーポリシーリンク
- 禁止表現を含まない

## 位置情報説明

- `GET /location-permission-copy` が説明文を返す
- mobile の `位置情報の説明` 画面が存在する
- 用途、明示同意後のみ有効、平常時は緊急連絡先非表示を確認できる

## 退会

- `DELETE /account` が認証済み本人のみ実行できる
- 実行直後に `users.profile_status = deactivated`
- 実行直後に refresh token が revoke される
- 実行直後に push token が revoke される
- 実行直後に monitoring relationship が `stopped` になる
- 実行直後に target 側 monitoring settings の `gps_share_mode = off`
- 退会後は `login / social login / refresh / access token validate` で再入場できない

## 削除スケジュール

- `account_deletion_requests` に 24h / 30d / 180d / 7y の実行時刻が保存される
- `AccountDeletionJob` が期限ごとに対象を処理する
- 24h: push token と将来の位置履歴 / 最終位置 / 通知キュー purge 起点
- 30d: auth identities / friendships / requests / memberships / checkins / moods / monitoring / invite links の削除または匿名化
- 180d: audit log 相当データ purge 起点
- 7y: billing / webhook / tax 対応データ purge 起点
