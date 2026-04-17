# Architecture

## 1. 目的

この文書は、Kyoiru の技術方針と初期設計を 1 つに集約する。  
機能ごとの細分化された設計 md は増やさず、この文書を更新点の中心にする。

## 2. 設計原則

- 無料版の主役は軽さであり、見守り訴求を常設バナー化しない
- 有料版は必要時だけ安心強化として出す
- block 優先、JST 朝 6:00、見守り同意、招待リンク制約は横断ルールとして先に評価する
- UI 表示状態を DB の正本にしない
- 個人情報はプロフィール、位置情報、緊急連絡先、課金イベントを分離して持つ

## 3. 確定済み技術方針

| 領域 | 方針 |
|---|---|
| モバイル | React Native + Expo prebuild |
| ルーティング | expo-router |
| モバイル状態管理 | Zustand + TanStack Query |
| API | NestJS |
| DB | PostgreSQL |
| ORM | Prisma |
| キャッシュ / キュー | Redis + BullMQ |
| 課金 | RevenueCat |
| 認証 | Apple / LINE / Google / メール + パスワード |

## 4. ディレクトリ構成

```text
/
├─ apps/
│  ├─ mobile/
│  ├─ api/
│  └─ web/
├─ packages/
│  ├─ config/
│  ├─ contracts/
│  ├─ domain/
│  └─ testkit/
├─ infra/
│  ├─ docker/
│  ├─ scripts/
│  └─ ci/
└─ docs/
```

### 4.1 責務

- `apps/mobile`
  - Expo prebuild ベースのアプリ本体
  - 画面、UI 状態、API client、権限案内、Deep Link 制御
- `apps/api`
  - 業務ルールの正本
  - 認証、友達、block、グループ、招待、生存報告、通知、課金、見守り
- `apps/web`
  - プライバシーポリシー、利用規約、特商法、サポートの公開ページ
- `packages/contracts`
  - DTO、enum、schema 共有
- `packages/domain`
  - JST 朝 6:00 判定、状態算出、並び順、権限判定など UI 非依存ロジック

### 4.2 共有ルール

- 共有するのは型、schema、業務ルールに限定する
- UI コンポーネントは共有しない
- サーバーデータを Zustand に複製しない
- entitlement 判定はバックエンドの結果だけを信頼する

## 5. モバイル構成

```text
apps/mobile/
├─ app/
├─ src/features/
├─ src/entities/
├─ src/providers/
├─ src/stores/
├─ src/services/
├─ src/lib/
├─ src/constants/
└─ assets/
```

### 5.1 Zustand で持つもの

- 認証状態
- Access Token
- モーダル開閉
- アプリ内トーストや軽い UI フラグ

### 5.2 TanStack Query で持つもの

- 自分のプロフィール
- 友達一覧、友達申請一覧
- グループ一覧、グループ詳細
- 生存報告状態、7 日履歴、気分スタンプ
- block 一覧
- entitlement 状態
- 見守り対象一覧

## 6. API モジュール

| モジュール | 主責務 |
|---|---|
| `auth` | ログイン、JWT、セッション、プロフィール未完了制御 |
| `users` | 表示名、アイコン、ユーザーID、検索公開設定 |
| `friendships` | 申請送信、承認、拒否、取消、再申請制限 |
| `blocks` | block 実行 / 解除、横断 block 判定 |
| `groups` | グループ作成、一覧、詳細、メンバー表示 |
| `invites` | 友達リンク、グループ招待リンク、再発行 |
| `checkins` | 生存報告、気分スタンプ、履歴、状態算出 |
| `notifications` | 通知温度感、深夜抑止、送信ログ |
| `subscriptions` | RevenueCat Webhook、entitlement、Grace Period |
| `monitoring` | 見守り同意、GPS、緊急連絡先、段階通知、ダッシュボード |
| `legal` | 公開ページ URL、課金画面必須表示、説明導線 |

## 7. 認証とセッション

### 7.1 ログイン導線

表示優先順:
1. LINE
2. Apple
3. Google
4. メール

### 7.2 セッション方針

- Access Token は短期 JWT
- Refresh Token は長期で rotate する
- Access Token はメモリ保持
- Refresh Token は Secure Store と DB で管理

### 7.3 初回プロフィール設定

- ログイン直後に `profile_status = pending`
- 表示名、アイコン、ユーザーID 完了までホームに遷移させない
- ユーザーID は DB unique 制約必須
- 初回設定後の変更は 30 日に 1 回まで

## 8. 権限制御

評価順:
1. block
2. entitlement
3. 見守り同意
4. 通常処理

### 8.1 block 優先で遮断するもの

- ID 検索表示
- 友達申請の送受信
- 新規グループ作成や招待
- 招待リンク経由の参加
- 見守り開始 / 継続 / 位置参照 / 緊急連絡先表示

### 8.2 block 実行時の副作用

- 既存友達関係を解除
- pending 申請を無効化
- 既存見守り設定を停止
- 招待候補やおすすめから除外

### 8.3 既存グループでの block 相手表示

残す:
- アイコン
- 表示名
- 最低限の存在表示

隠す:
- 最終反応時刻
- 気分スタンプ
- 詳細導線
- 見守り関連情報
- 友達状態
- ユーザーID

## 9. 時間基準と通知

### 9.1 business day

- 生存報告の基準日は JST 朝 6:00
- 端末ローカル日付は使わない
- `business_date_jst` を API が付与する

### 9.2 生存報告状態

- `checked_in`
- `pending`
- `overdue`
- `monitor_alert`

内部状態名と UI 文言は分離する。

### 9.3 通知温度感

| 設定 | 動作 |
|---|---|
| ゆるい | プッシュ通知なし |
| ふつう | 翌業務日 6:00 以降に軽い通知 1 回 |
| 気にかける | 当日 21:00 と翌業務日 6:00 以降に通知 |

- 22:00〜7:00 は原則通知しない
- 見守り段階通知だけは別扱い

## 10. 課金と見守り

### 10.1 課金

- 月額 980 円
- 7 日間無料トライアル
- 月額のみ
- 解約後も有効期限満了までは利用可
- Grace Period 中は見守り機能維持
- 満了後に停止するが、見守り設定は削除しない

### 10.2 見守り有効化条件

- 見守る側が課金済み
- 対象と block 関係でない
- 見守られる側の明示同意が完了

### 10.3 見守り設定

- GPS: `none` / `on_overdue` / `always`
- 緊急連絡先は第 3 段階のみ表示
- 緊急連絡先は 1 件のみ
- 緊急連絡先の保持項目は `氏名`、`電話番号`、`続柄`
- 複数回チェックイン: 1 回 / 2 回 / 3 回
- テンプレ: 朝 / 朝夜 / 朝昼夜

### 10.3.1 位置履歴保持

- 位置履歴は 30 日ローリング保持
- 収集条件は見守り有効、同意済み、GPS 設定が `on_overdue` または `always`
- block、同意撤回、見守り OFF、Grace Period 終了後の失効、退会時は新規収集停止
- 収集停止後、位置履歴と最終位置は 24 時間以内に削除
- 再契約時に復元するのは見守り設定のみで、位置履歴は復元しない

### 10.4 段階通知

| 段階 | 条件 | 動作 |
|---|---|---|
| 第1段階 | 当日 21:00 未反応 | 軽い通知 |
| 第2段階 | 翌業務日 6:00 未反応 | 強め通知 + 位置確認導線 |
| 第3段階 | 翌日 12:00 未反応 | 緊急連絡先表示 + 連絡導線 |

## 11. データモデル要約

### 11.1 アカウント

- `users`
  - `user_id UNIQUE`
  - `profile_status`
  - `search_visibility`
  - `user_id_changed_at`
- `auth_identities`
  - `(provider, provider_subject) UNIQUE`
  - メール認証時のみ `password_hash`

### 11.2 友達 / block

- `friendship_requests`
  - pending の重複申請禁止
  - `rejected_until`
  - `rejection_revert_until`
- `friendships`
  - 2 ユーザーで 1 レコード
- `user_blocks`
  - `(blocker_user_id, blocked_user_id) UNIQUE`

### 11.3 グループ / 招待

- `groups`
- `group_memberships`
- `group_notification_settings`
- `friend_invite_links`
- `group_invite_links`

招待リンクは:
- 30 日期限
- 1 回のみ
- 再発行で旧リンク即無効
- token はハッシュ保存

### 11.4 生存報告

- `daily_checkins`
  - `(user_id, business_date_jst) UNIQUE`
- `daily_mood_stamps`
  - `(user_id, business_date_jst) UNIQUE`
  - 削除後再設定不可

### 11.5 課金 / 見守り

- `subscription_customers`
- `subscription_webhook_events`
- `monitoring_relationships`
- `monitoring_consent_events`
- `monitoring_emergency_contacts`
- `monitoring_location_snapshots`
- `monitoring_alert_events`

見守りは課金状態と同意状態を別に持ち、同意前は `pending_consent` を維持する。

補足:
- `monitoring_emergency_contacts` は 1 レコードのみを許可
- `monitoring_location_snapshots` は 30 日ローリング削除前提
- 課金設定は復元対象だが、位置履歴は復元対象に含めない

### 11.6 通知

- `device_push_tokens`
- `notification_deliveries`

### 11.7 退会時データ保持

- 即時停止:
  - ログイン
  - セッション
  - push
  - 見守り
  - 位置収集
- 24 時間以内削除:
  - 位置履歴
  - 最終位置
  - 通知キュー
  - push token
- 30 日以内削除または匿名化:
  - プロフィール
  - 外部認証連携
  - 友達関係
  - グループ所属
  - 生存報告
  - 気分スタンプ
  - 見守り設定
  - 緊急連絡先
  - 招待リンク
- 180 日保持後削除:
  - block 履歴ログ
  - 見守り同意履歴
  - 緊急連絡先閲覧ログ
  - スパム対策ログ
- 7 年保持:
  - 課金、返金、請求、税務対応に必要な取引記録

## 12. 初回 Prisma スコープ

### Wave 1

- `users`
- `auth_identities`
- `friendship_requests`
- `friendships`
- `user_blocks`

### Wave 2

- `groups`
- `group_memberships`
- `group_notification_settings`
- `friend_invite_links`
- `group_invite_links`
- `daily_checkins`
- `daily_mood_stamps`

### Wave 3

- `subscription_customers`
- `subscription_webhook_events`
- `monitoring_relationships`
- `monitoring_consent_events`
- `monitoring_emergency_contacts`
- `monitoring_location_snapshots`
- `monitoring_alert_events`
- `device_push_tokens`
- `notification_deliveries`

## 13. 未確定事項

- 現時点で管理上の未確定事項はない
