# ADR-005 モバイル状態管理ライブラリ選定

- ステータス: **確定**
- 仕様参照先: `docs/product/source-spec.md`
- 関連文書: `docs/architecture.md`
- 関連 open question: なし（Expo managed / prebuild どちらでも適用可能）

---

## 1. コンテキスト

Kyoiru モバイルアプリの状態管理方針を確定する。  
「グローバル UI ステート」と「サーバーデータのキャッシュ」を同一の仕組みで管理すると、block 状態・entitlement 状態・友達一覧などが二重管理になり、整合性が崩れるリスクがある。  
役割を明確に分担し、二重管理を防ぐルールを定義する。

### プロジェクト固有の事情

- 認証状態・block 状態・entitlement はアプリ全体に影響するグローバルな状態
- 友達一覧・グループ状態・生存報告状態はサーバーから都度取得する動的データ
- block 発生時は UI 状態とサーバーデータを整合させる必要がある
- 見守りモードの entitlement はバックエンドが正とし、クライアント単体では判定しない（`docs/architecture.md` 参照）

---

## 2. 決定

**Zustand（グローバル UI ステート）と TanStack Query（サーバーデータキャッシュ）を採用し、責務を明確に分担する。**

---

## 3. 責務分担ルール

### 3.1 Zustand が管理するもの（クライアントの「状態」）

Zustand はサーバーとの通信に依存しない、クライアント固有の状態を管理する。

| 状態 | 詳細 |
|---|---|
| 認証状態 | `unauthenticated` / `authenticated` / `profile_pending` の 3 状態 |
| 初回プロフィール設定フラグ | `profile_status: "pending" | "complete"` |
| Access Token（メモリ保持） | JWT Access Token。Secure Storage には保存しない（§3.3 参照） |
| 通知トースト / バナー表示状態 | アプリ内通知の表示制御 |
| モーダル表示状態 | 生存報告モーダル、課金モーダルなどの開閉 |
| 見守りプラン紹介の表示制御 | 無料ユーザーへの導線表示フラグ |

**Zustand に置かないもの**:
- 友達一覧、グループ一覧、生存報告状態 → TanStack Query で管理
- block 関係の詳細データ → TanStack Query で管理（後述）

### 3.2 TanStack Query が管理するもの（サーバーデータのキャッシュ）

TanStack Query はサーバーから取得するデータのキャッシュ・同期・再取得を管理する。

| データ | Query Key 例 | 備考 |
|---|---|---|
| 自分のプロフィール | `['user', 'me']` | ログイン後に取得 |
| 友達一覧 | `['friendships']` | block 発生時に invalidate |
| 友達申請一覧 | `['friendship-requests']` | - |
| グループ一覧 | `['groups']` | - |
| グループ詳細 | `['groups', groupId]` | - |
| 生存報告状態（今日） | `['checkins', 'today']` | - |
| 過去 7 日履歴 | `['checkins', 'history']` | - |
| 気分スタンプ | `['mood-stamp', 'today']` | - |
| block 一覧 | `['blocks']` | block 操作後に invalidate |
| 見守り対象一覧 | `['monitoring', 'targets']` | 有料機能 |
| entitlement 状態 | `['subscription', 'entitlement']` | バックエンドから取得。クライアント単体で判定しない |

---

## 4. 二重管理を避けるルール

### ルール 1: サーバーデータを Zustand に複製しない

TanStack Query で管理するデータは Zustand に複製しない。  
Zustand のストアには TanStack Query のキャッシュへの参照を持たせない。

```
OK: useFriendships() フックから TanStack Query のキャッシュを直接使う
NG: Zustand の friends[] ステートに友達一覧を保存する
```

### ルール 2: Access Token は Zustand のメモリで管理し、Secure Storage は Refresh Token のみ

| トークン | 保管場所 |
|---|---|
| Access Token | Zustand のメモリ（アプリ終了で消える） |
| Refresh Token | `expo-secure-store`（永続化） |

アプリ再起動時: Secure Storage から Refresh Token を読み込み → Access Token を再発行 → Zustand に保存

### ルール 3: block 発生時はサーバーデータを再取得する

block はサーバー側の状態変化であるため、クライアントは block 操作後に関連する TanStack Query のキャッシュを invalidate して再取得する。

```
block 実行 API が成功したら:
  queryClient.invalidateQueries(['blocks'])
  queryClient.invalidateQueries(['friendships'])
  queryClient.invalidateQueries(['groups'])  ← グループ表示に影響する場合
```

Zustand の block フラグは持たない。block 状態は常に TanStack Query のキャッシュ（= サーバーの最新状態）を参照する。

### ルール 4: entitlement の判定はバックエンドの結果のみを信頼する

entitlement 状態は TanStack Query で `['subscription', 'entitlement']` として取得する。  
Zustand に entitlement フラグを複製しない。  
有料機能を表示するかどうかは、TanStack Query の entitlement データを参照して決める。

---

## 5. 認証状態の管理詳細（Zustand）

認証状態は Zustand で管理し、以下の 3 状態を持つ。

```typescript
type AuthStatus =
  | 'unauthenticated'    // 未ログイン
  | 'profile_pending'   // ログイン済み、プロフィール設定未完了
  | 'authenticated';    // ログイン済み、プロフィール設定完了

interface AuthStore {
  status: AuthStatus;
  accessToken: string | null;
  setAccessToken: (token: string) => void;
  setStatus: (status: AuthStatus) => void;
  logout: () => void;
}
```

- `profile_pending` 時は expo-router のルートガードでプロフィール設定画面に遷移させる
- `logout()` で accessToken と status をリセットし、Secure Storage の Refresh Token を削除する

---

## 6. 不採用の選択肢

### Redux Toolkit

状態管理の定番だが、このプロジェクトでは過剰。  
サーバーデータの管理に Redux + RTK Query を使うことも検討したが、TanStack Query との機能重複が大きく、Zustand + TanStack Query の組み合わせの方がシンプルに責務を分けられる。

### Jotai

Zustand の代替として軽量な atom ベースの状態管理。このプロジェクトでは認証状態・プロフィールフラグなどアプリ全体に影響するグローバルステートが中心であり、Zustand のストア形式の方が管理しやすい。

---

## 7. 変更トリガー

以下の条件が発生した場合、この ADR を再検討する。

- TanStack Query のキャッシュ戦略で block 状態の整合性が保てない問題が判明した場合
- オフライン対応要件が追加された場合（キャッシュ戦略の見直しが必要になる）
