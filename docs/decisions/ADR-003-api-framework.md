# ADR-003 API フレームワーク選定

- ステータス: **確定**
- 仕様参照先: `docs/product/source-spec.md`
- 関連文書: `docs/architecture.md`
- 関連 open question: なし

---

## 1. コンテキスト

Kyoiru のバックエンド API を構築するフレームワークを選定する。  
`docs/architecture.md` で整理した 11 モジュール（auth / users / friendships / blocks / groups / invites / checkins / notifications / subscriptions / monitoring / legal）と横断制御ルール（block 優先・JST 朝 6:00・entitlement 確認）を、実装担当が構造を迷わず管理できる形で実現する必要がある。

### プロジェクト固有の要件

| 要件 | 詳細 |
|---|---|
| モジュール数 | 11 モジュール。責務境界が明確に分かれている |
| 横断制御 | block チェック・entitlement チェック・JST 業務日付を全エンドポイントに横断適用する必要がある |
| ジョブキュー | 段階通知（21:00 / 翌 6:00 / 翌 12:00）・深夜抑止を BullMQ で管理する |
| ORM | Prisma（TypeScript ファースト） |
| 言語 | TypeScript（モバイルと型定義を共有する前提） |

---

## 2. 検討した選択肢

### 選択肢 A: NestJS

TypeScript 向けのフルスタックフレームワーク。モジュール・Provider（DI）・Guard・Interceptor・Decorator の仕組みを持つ。

**このプロジェクトでの利点**:
- モジュールシステムが整理済みの 11 モジュール構成と直接対応する（`AuthModule`, `BlocksModule`, etc.）
- `Guard` で block チェックや entitlement チェックを横断的に適用できる（`BlockGuard`, `EntitlementGuard`）
- `Interceptor` で JST 業務日付の解釈など横断処理を挿入できる
- DI によりモジュールを独立してテストしやすい
- `@nestjs/bullmq` で BullMQ との統合が公式サポートされている
- Prisma との組み合わせの実績が多い
- `@nestjs/jwt`, `@nestjs/passport` で認証の定型実装が整っている

**懸念点**:
- 学習コスト（デコレータ・DI の概念）
- 小規模な機能には記述量が多い

### 選択肢 B: Fastify + Zod

軽量・高速な Web フレームワーク。Zod で型安全なリクエスト検証を実現する。

**このプロジェクトでの課題**:
- モジュール管理の仕組みがないため、11 モジュールの境界管理・DI を自前で実装する必要がある
- block チェックなどの横断 Guard を Fastify の `preHandler` フック等で自前構築する必要がある
- BullMQ との統合は可能だが、NestJS ほどの公式サポートはない
- 実装工数が NestJS より多くなる可能性が高い

### 選択肢 C: Hono

Edge 環境向けの超軽量フレームワーク。

**このプロジェクトでの課題**:
- サーバーレス / Edge での使用を想定した設計であり、Node.js + BullMQ + Prisma の組み合わせと思想的に合わない
- 複雑な業務ロジック（段階通知スケジューリング、block 横断制御）を長期管理するには構造的なサポートが不足している

---

## 3. 決定

**NestJS を採用する。**

### 採用理由の要点

1. **モジュール境界が設計に自然に対応する**  
   `@Module()` 装飾子で `BlocksModule`, `MonitoringModule` 等を独立させ、`docs/architecture.md` で整理した責務境界をコードで直接表現できる。

2. **横断制御が Guard / Interceptor で構造化できる**  
   `BlockGuard`（block チェック）、`EntitlementGuard`（課金確認）、`ProfileSetupGuard`（プロフィール設定未完了チェック）を Guard として実装することで、各エンドポイントへの横断適用を宣言的に管理できる。

3. **BullMQ 統合が公式サポートされている**  
   段階通知スケジューリングは `@nestjs/bullmq` で実装する。ジョブ定義・ワーカー・キューが NestJS のモジュールシステムに統合される。

4. **Prisma との組み合わせの実績が豊富**  
   `PrismaService` を Provider として DI に乗せることで、すべてのモジュールから型安全に DB アクセスできる。

5. **認証の実装が定型化されている**  
   `@nestjs/jwt` + `@nestjs/passport` で JWT 認証・Apple / Google の OIDC 検証を実装できる。

### 不採用理由の要点

- **Fastify + Zod**: 軽量で高速だが、11 モジュールの横断ルール管理（block、entitlement、Guard）を自前で組む工数が NestJS の学習コストを上回ると判断した。
- **Hono**: Edge 向けの思想がこのプロジェクトの実行環境（Node.js + BullMQ + Prisma）と合わない。

---

## 4. 決定に伴う前提・制約

| 前提 | 内容 |
|---|---|
| 言語 | TypeScript（strict モード推奨） |
| ORM | Prisma（`PrismaService` を共有 Provider として DI に乗せる） |
| キュー | BullMQ（`@nestjs/bullmq` 経由） |
| 認証 | `@nestjs/jwt` + `@nestjs/passport`。Apple / Google は OIDC 検証 |
| テスト | Jest（NestJS のデフォルト。DI を活用したモジュール単体テスト） |

---

## 5. Guard の適用方針（抜粋）

横断制御の実装指針を記録する。詳細は各モジュール実装時に具体化する。

| Guard | 役割 | 適用対象 |
|---|---|---|
| `JwtAuthGuard` | JWT 検証。未認証リクエストを弾く | 保護 API 全体 |
| `ProfileSetupGuard` | プロフィール設定未完了ユーザーを遮断 | ホーム以降の API |
| `EntitlementGuard` | 有料機能への未課金アクセスを遮断 | 見守り・GPS・緊急連絡先 API |

block チェックは Guard ではなく、各モジュールのサービス層で `BlocksService.check()` を呼ぶ方式とする。  
理由: block は「この 2 ユーザー間の関係」に基づくため、リクエスト対象が確定してから評価する必要がある。

---

## 6. 変更トリガー

以下の条件が発生した場合、この ADR を再検討する。

- NestJS のパフォーマンスボトルネックが API SLA を達成できない場合
- BullMQ との統合で重大な問題が判明した場合
