-- ─────────────────────────────────────────────────────────────────────────────
-- 気分スタンプへの1タップリアクションと、グループ毎日のお題 (共通プロンプト)
-- 「反応はできるが会話にはならない」軽リアクションのため、全て日次リセット前提で扱う。
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateEnum
-- like  = 👍 いいね
-- heart = ❤️ 気持ち
-- care  = 🤗 気にかけてる
-- cheer = 💪 おつかれ
-- same  = 😊 わかる
CREATE TYPE "MoodStampReactionType" AS ENUM (
  'like',
  'heart',
  'care',
  'cheer',
  'same'
);

-- CreateTable: mood_stamp_reactions
-- 1 ユーザーは 1 気分スタンプに対して 1 リアクションまで (差し替えは upsert)
CREATE TABLE "mood_stamp_reactions" (
    "id"                UUID NOT NULL,
    "mood_stamp_id"     UUID NOT NULL,
    "from_user_id"      UUID NOT NULL,
    "to_user_id"        UUID NOT NULL,
    "business_date_jst" TEXT NOT NULL,
    "reaction_type"     "MoodStampReactionType" NOT NULL,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mood_stamp_reactions_pkey" PRIMARY KEY ("id")
);

-- 1 ユーザー = 1 気分スタンプ = 1 リアクション
CREATE UNIQUE INDEX "uq_mood_stamp_reactions_stamp_from"
    ON "mood_stamp_reactions"("mood_stamp_id", "from_user_id");

-- 日次集計 / 日次フィルタ用
CREATE INDEX "mood_stamp_reactions_business_date_jst_idx"
    ON "mood_stamp_reactions"("business_date_jst");

-- 受信側の「今日反応された数」集計用
CREATE INDEX "mood_stamp_reactions_to_user_id_business_date_jst_idx"
    ON "mood_stamp_reactions"("to_user_id", "business_date_jst");

-- FK
ALTER TABLE "mood_stamp_reactions"
    ADD CONSTRAINT "mood_stamp_reactions_mood_stamp_id_fkey"
    FOREIGN KEY ("mood_stamp_id")
    REFERENCES "daily_mood_stamps"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mood_stamp_reactions"
    ADD CONSTRAINT "mood_stamp_reactions_from_user_id_fkey"
    FOREIGN KEY ("from_user_id")
    REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mood_stamp_reactions"
    ADD CONSTRAINT "mood_stamp_reactions_to_user_id_fkey"
    FOREIGN KEY ("to_user_id")
    REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: daily_prompts
-- グループ × 業務日で 1 件。prompt_key は prompt-pool.ts のキー (アプリ側の定数に対応)。
CREATE TABLE "daily_prompts" (
    "id"                UUID NOT NULL,
    "group_id"          UUID NOT NULL,
    "business_date_jst" TEXT NOT NULL,
    "prompt_key"        TEXT NOT NULL,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_prompts_pkey" PRIMARY KEY ("id")
);

-- グループ毎に 1 日 1 プロンプトのみ
CREATE UNIQUE INDEX "uq_daily_prompts_group_business_date"
    ON "daily_prompts"("group_id", "business_date_jst");

CREATE INDEX "daily_prompts_business_date_jst_idx"
    ON "daily_prompts"("business_date_jst");

ALTER TABLE "daily_prompts"
    ADD CONSTRAINT "daily_prompts_group_id_fkey"
    FOREIGN KEY ("group_id")
    REFERENCES "groups"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: daily_prompt_answers
-- プロンプト × ユーザーで 1 件 (差し替えは upsert)。choice_key は prompt-pool.ts の選択肢キー。
CREATE TABLE "daily_prompt_answers" (
    "id"         UUID NOT NULL,
    "prompt_id"  UUID NOT NULL,
    "user_id"    UUID NOT NULL,
    "choice_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_prompt_answers_pkey" PRIMARY KEY ("id")
);

-- 1 ユーザーは 1 プロンプトに 1 回答のみ
CREATE UNIQUE INDEX "uq_daily_prompt_answers_prompt_user"
    ON "daily_prompt_answers"("prompt_id", "user_id");

CREATE INDEX "daily_prompt_answers_user_id_idx"
    ON "daily_prompt_answers"("user_id");

ALTER TABLE "daily_prompt_answers"
    ADD CONSTRAINT "daily_prompt_answers_prompt_id_fkey"
    FOREIGN KEY ("prompt_id")
    REFERENCES "daily_prompts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "daily_prompt_answers"
    ADD CONSTRAINT "daily_prompt_answers_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
