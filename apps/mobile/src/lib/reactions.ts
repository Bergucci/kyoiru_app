export type ReactionType = 'like' | 'heart' | 'care' | 'cheer' | 'same';

export interface ReactionDefinition {
  type: ReactionType;
  emoji: string;
  label: string;
}

export const REACTIONS: readonly ReactionDefinition[] = [
  { type: 'like', emoji: '👍', label: 'いいね' },
  { type: 'heart', emoji: '❤️', label: '気持ち' },
  { type: 'care', emoji: '🤗', label: '気にかけてる' },
  { type: 'cheer', emoji: '💪', label: 'おつかれ' },
  { type: 'same', emoji: '😊', label: 'わかる' },
] as const;

export const REACTION_BY_TYPE: Record<ReactionType, ReactionDefinition> =
  REACTIONS.reduce(
    (acc, reaction) => {
      acc[reaction.type] = reaction;
      return acc;
    },
    {} as Record<ReactionType, ReactionDefinition>,
  );
