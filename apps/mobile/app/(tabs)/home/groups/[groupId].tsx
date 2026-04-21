import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  AnimatedCount,
  PressableScale,
  ReactionBurst,
} from '../../../../src/components';
import { toApiErrorMessage, resolveMediaUrl } from '../../../../src/lib/api';
import { useApi } from '../../../../src/lib/use-api';
import {
  formatDateTime,
  toAliveStateLabel,
  toGroupTypeLabel,
} from '../../../../src/lib/format';
import {
  REACTIONS,
  REACTION_BY_TYPE,
  type ReactionType,
} from '../../../../src/lib/reactions';
import { getPromptDefinition } from '../../../../src/lib/prompt-pool';
import { useSession } from '../../../../src/session/session-context';
import { colors } from '../../../../src/ui/theme';

interface MoodReactionsView {
  total: number;
  byType: Partial<Record<ReactionType, number>>;
  myReaction: ReactionType | null;
}

interface GroupDetailResponse {
  groupId: string;
  name: string;
  type: string;
  iconUrl: string | null;
  members: {
    displayName: string;
    avatarUrl: string | null;
    userId?: string;
    state?: string;
    lastCheckedInAt?: string | null;
    mood?: string | null;
    moodStampId?: string | null;
    moodReactions?: MoodReactionsView | null;
    isInteractive: boolean;
  }[];
}

interface DailyPromptAnswerView {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  choiceKey: string;
}

interface DailyPromptResponse {
  promptKey: string;
  businessDateJst: string;
  answers: DailyPromptAnswerView[];
  myAnswer: string | null;
}

const moodOptions = ['😊 いい感じ', '🙂 ふつう', '😴 ねむい', '😢 しんどい', '🤒 つらい'];

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { session } = useSession();
  const [group, setGroup] = useState<GroupDetailResponse | null>(null);
  const [dailyPrompt, setDailyPrompt] = useState<DailyPromptResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  const [submittingMood, setSubmittingMood] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [submittingReactionFor, setSubmittingReactionFor] = useState<
    string | null
  >(null);
  const [submittingPromptChoice, setSubmittingPromptChoice] = useState<
    string | null
  >(null);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(
    null,
  );
  const [burstTickByMoodStamp, setBurstTickByMoodStamp] = useState<
    Record<string, { tick: number; reactionType: ReactionType }>
  >({});
  const [flashTickByMoodStamp, setFlashTickByMoodStamp] = useState<
    Record<string, number>
  >({});
  const prevReactionTotalsRef = useRef<Record<string, number>>({});
  const selfTriggeredBurstTickRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (session?.accessToken && groupId) {
      void loadGroup();
    }
  }, [groupId, session?.accessToken]);

  const selfUserId = session?.user.userId ?? null;

  const sortedMembers = useMemo(
    () =>
      [...(group?.members ?? [])].sort((a, b) => {
        const priority = (member: GroupDetailResponse['members'][number]) => {
          if (member.userId === selfUserId) {
            return 0;
          }

          switch (member.state) {
            case 'monitor_alert':
              return 1;
            case 'overdue':
              return 2;
            case 'pending':
              return 3;
            case 'checked_in':
              return 4;
            default:
              return 5;
          }
        };

        return priority(a) - priority(b);
      }),
    [group?.members, selfUserId],
  );

  useEffect(() => {
    const nextReactionTotals: Record<string, number> = {};
    const moodStampIdsToFlash: string[] = [];

    for (const member of sortedMembers) {
      if (!member.moodStampId) {
        continue;
      }

      const moodStampId = member.moodStampId;
      const total = member.moodReactions?.total ?? 0;
      const previousTotal =
        prevReactionTotalsRef.current[moodStampId] ?? total;

      nextReactionTotals[moodStampId] = total;

      if (total <= previousTotal) {
        continue;
      }

      if (selfTriggeredBurstTickRef.current[moodStampId]) {
        delete selfTriggeredBurstTickRef.current[moodStampId];
        continue;
      }

      moodStampIdsToFlash.push(moodStampId);
    }

    prevReactionTotalsRef.current = nextReactionTotals;

    if (moodStampIdsToFlash.length === 0) {
      return;
    }

    setFlashTickByMoodStamp((currentFlashTicks) => {
      const nextFlashTicks = { ...currentFlashTicks };

      for (const moodStampId of moodStampIdsToFlash) {
        nextFlashTicks[moodStampId] = (nextFlashTicks[moodStampId] ?? 0) + 1;
      }

      return nextFlashTicks;
    });
  }, [sortedMembers]);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const { request } = useApi();

  async function loadGroup() {
    try {
      setLoading(true);
      const [detail, prompt] = await Promise.all([
        request<GroupDetailResponse>(`/groups/${groupId}`, {}),
        request<DailyPromptResponse>(`/groups/${groupId}/daily-prompt`, {}),
      ]);
      setGroup(detail);
      setDailyPrompt(prompt);
    } catch (error) {
      Alert.alert('グループ詳細の取得に失敗しました', toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const selfMember = group?.members.find(
    (member) => member.userId === selfUserId,
  );

  const submitCheckin = async () => {
    try {
      setSubmittingCheckin(true);
      await request('/me/checkins/today', {
        method: 'POST',
      });
      await loadGroup();
    } catch (error) {
      Alert.alert('今日いるの送信に失敗しました', toApiErrorMessage(error));
    } finally {
      setSubmittingCheckin(false);
    }
  };

  const generateInvite = async () => {
    try {
      setGeneratingInvite(true);
      const response = await request<{ inviteUrl: string; expiresAt: string }>(
        `/groups/${groupId}/invite-links`,
        { method: 'POST' },
      );
      await Share.share({ message: response.inviteUrl });
    } catch (error) {
      Alert.alert('招待リンクの作成に失敗しました', toApiErrorMessage(error));
    } finally {
      setGeneratingInvite(false);
    }
  };

  const submitMood = async (mood: string) => {
    try {
      setSubmittingMood(true);
      await request('/me/mood-stamp', {
        method: 'POST',
        body: { mood },
      });
      await loadGroup();
    } catch (error) {
      Alert.alert('気分スタンプの送信に失敗しました', toApiErrorMessage(error));
    } finally {
      setSubmittingMood(false);
    }
  };

  const submitReaction = async (
    moodStampId: string,
    reactionType: ReactionType,
    currentReaction: ReactionType | null,
  ) => {
    try {
      setSubmittingReactionFor(moodStampId);
      if (currentReaction === reactionType) {
        await request(`/mood-stamps/${moodStampId}/reactions`, {
          method: 'DELETE',
        });
      } else {
        await request(`/mood-stamps/${moodStampId}/reactions`, {
          method: 'PUT',
          body: { reactionType },
        });
      }
      if (currentReaction !== reactionType) {
        setBurstTickByMoodStamp((currentBursts) => {
          const nextTick = (currentBursts[moodStampId]?.tick ?? 0) + 1;

          selfTriggeredBurstTickRef.current[moodStampId] = nextTick;

          return {
            ...currentBursts,
            [moodStampId]: {
              tick: nextTick,
              reactionType,
            },
          };
        });
      }
      setReactionPickerFor(null);
      await loadGroup();
    } catch (error) {
      Alert.alert('リアクションの送信に失敗しました', toApiErrorMessage(error));
    } finally {
      setSubmittingReactionFor(null);
    }
  };

  const submitPromptAnswer = async (choiceKey: string) => {
    try {
      setSubmittingPromptChoice(choiceKey);
      const response = await request<{
        promptKey: string;
        businessDateJst: string;
        choiceKey: string;
      }>(`/groups/${groupId}/daily-prompt/answer`, {
        method: 'PUT',
        body: { choiceKey },
      });
      setDailyPrompt((prev) =>
        prev && prev.promptKey === response.promptKey
          ? { ...prev, myAnswer: response.choiceKey }
          : prev,
      );
      await loadGroup();
    } catch (error) {
      Alert.alert('お題の回答に失敗しました', toApiErrorMessage(error));
    } finally {
      setSubmittingPromptChoice(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : !group ? null : (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{group.name}</Text>
            <Text style={styles.heroText}>{toGroupTypeLabel(group.type)}</Text>
            <PressableScale
              hapticStyle="medium"
              style={[
                styles.primaryButton,
                (selfMember?.state === 'checked_in' || submittingCheckin) &&
                  styles.buttonDisabled,
              ]}
              disabled={selfMember?.state === 'checked_in' || submittingCheckin}
              onPress={() => {
                void submitCheckin();
              }}
            >
              <Text style={styles.primaryButtonLabel}>
                {selfMember?.state === 'checked_in' ? '今日反応済み' : '今日いる'}
              </Text>
            </PressableScale>
            <PressableScale
              hapticStyle="medium"
              style={[styles.inviteButton, generatingInvite && styles.buttonDisabled]}
              disabled={generatingInvite}
              onPress={() => { void generateInvite(); }}
            >
              {generatingInvite ? (
                <ActivityIndicator color={colors.accentStrong} size="small" />
              ) : (
                <Text style={styles.inviteButtonLabel}>メンバーを招待</Text>
              )}
            </PressableScale>
          </View>

          {selfMember?.state === 'checked_in' && !selfMember.mood ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>気分スタンプ</Text>
              <View style={styles.chipWrap}>
                {moodOptions.map((mood) => (
                  <PressableScale
                    hapticStyle="medium"
                    key={mood}
                    style={[styles.chip, submittingMood && styles.buttonDisabled]}
                    disabled={submittingMood}
                    onPress={() => {
                      void submitMood(mood);
                    }}
                  >
                    <Text style={styles.chipLabel}>{mood}</Text>
                  </PressableScale>
                ))}
              </View>
            </View>
          ) : null}

          {dailyPrompt ? (
            <DailyPromptCard
              prompt={dailyPrompt}
              submittingChoiceKey={submittingPromptChoice}
              onChoose={(choiceKey) => {
                void submitPromptAnswer(choiceKey);
              }}
            />
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>メンバー一覧</Text>
            {sortedMembers.map((member, index) => {
              const isSelf = member.userId === selfUserId;
              const canReact =
                !isSelf &&
                member.isInteractive &&
                !!member.moodStampId &&
                !!member.mood;
              const moodStampId = member.moodStampId ?? null;
              const pickerOpen =
                moodStampId !== null && reactionPickerFor === moodStampId;
              const reactionBusy =
                moodStampId !== null && submittingReactionFor === moodStampId;
              const flashTick =
                moodStampId !== null ? (flashTickByMoodStamp[moodStampId] ?? 0) : 0;
              const burst =
                moodStampId !== null ? burstTickByMoodStamp[moodStampId] : undefined;

              return (
                <MemberCardShell
                  key={`${member.displayName}-${index}`}
                  disabled={!member.isInteractive}
                  flashTick={flashTick}
                >
                  <PressableScale
                    style={styles.memberRow}
                    disabled={!member.isInteractive}
                    onPress={() => {
                      Alert.alert(
                        member.displayName,
                        [
                          member.userId ? `@${member.userId}` : null,
                          member.state
                            ? `状態: ${toAliveStateLabel(member.state)}`
                            : null,
                          member.lastCheckedInAt
                            ? `最終反応: ${formatDateTime(member.lastCheckedInAt)}`
                            : null,
                          member.mood ? `気分: ${member.mood}` : null,
                        ]
                          .filter(Boolean)
                          .join('\n'),
                      );
                    }}
                  >
                    <View style={styles.avatar}>
                      {resolveMediaUrl(member.avatarUrl) ? (
                        <Image
                          source={{ uri: resolveMediaUrl(member.avatarUrl) }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarLabel}>
                          {member.displayName.slice(0, 1)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.memberBody}>
                      <Text style={styles.memberName}>{member.displayName}</Text>
                      {member.isInteractive ? (
                        <>
                          <Text style={styles.memberMeta}>
                            {toAliveStateLabel(member.state)}
                          </Text>
                          <Text style={styles.memberMeta}>
                            最終反応: {formatDateTime(member.lastCheckedInAt ?? null)}
                          </Text>
                          <Text style={styles.memberMeta}>
                            気分: {member.mood ?? '未設定'}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.memberMeta}>参加中</Text>
                      )}
                    </View>
                  </PressableScale>

                  {member.isInteractive &&
                  member.moodReactions &&
                  (canReact || member.moodReactions.total > 0 || isSelf) ? (
                    <ReactionBar
                      reactions={member.moodReactions}
                      canReact={canReact}
                      pickerOpen={pickerOpen}
                      submitting={reactionBusy}
                      onTogglePicker={() => {
                        if (!moodStampId) return;
                        setReactionPickerFor((prev) =>
                          prev === moodStampId ? null : moodStampId,
                        );
                      }}
                      onSelect={(reactionType) => {
                        if (!moodStampId) return;
                        void submitReaction(
                          moodStampId,
                          reactionType,
                          member.moodReactions?.myReaction ?? null,
                        );
                      }}
                      burst={burst}
                    />
                  ) : null}
                </MemberCardShell>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

interface DailyPromptCardProps {
  prompt: DailyPromptResponse;
  submittingChoiceKey: string | null;
  onChoose: (choiceKey: string) => void;
}

function DailyPromptCard({
  prompt,
  submittingChoiceKey,
  onChoose,
}: DailyPromptCardProps) {
  const definition = getPromptDefinition(prompt.promptKey);
  if (!definition) {
    return null;
  }

  const answersByChoice = new Map<string, DailyPromptAnswerView[]>();
  for (const answer of prompt.answers) {
    const bucket = answersByChoice.get(answer.choiceKey) ?? [];
    bucket.push(answer);
    answersByChoice.set(answer.choiceKey, bucket);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.promptEyebrow}>今日のお題</Text>
      <Text style={styles.promptQuestion}>{definition.question}</Text>
      <View style={styles.promptChoices}>
        {definition.choices.map((choice) => {
          const selected = prompt.myAnswer === choice.key;
          const submitting = submittingChoiceKey === choice.key;
          const voters = answersByChoice.get(choice.key) ?? [];
          return (
            <PressableScale
              key={choice.key}
              hapticStyle="medium"
              style={[
                styles.promptChoice,
                selected && styles.promptChoiceSelected,
                submitting && styles.buttonDisabled,
              ]}
              disabled={submittingChoiceKey !== null}
              onPress={() => onChoose(choice.key)}
            >
              <Text
                style={[
                  styles.promptChoiceLabel,
                  selected && styles.promptChoiceLabelSelected,
                ]}
              >
                {choice.label}
              </Text>
              {voters.length > 0 ? (
                <Text style={styles.promptVoters}>
                  {voters.map((v) => v.displayName).join(', ')}
                </Text>
              ) : null}
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

interface ReactionBarProps {
  burst?: {
    tick: number;
    reactionType: ReactionType;
  };
  reactions: MoodReactionsView;
  canReact: boolean;
  pickerOpen: boolean;
  submitting: boolean;
  onTogglePicker: () => void;
  onSelect: (reactionType: ReactionType) => void;
}

function ReactionBar({
  burst,
  reactions,
  canReact,
  pickerOpen,
  submitting,
  onTogglePicker,
  onSelect,
}: ReactionBarProps) {
  const burstHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibleBurst, setVisibleBurst] = useState<
    ReactionBarProps['burst'] | null
  >(null);
  const counts = REACTIONS.filter(
    (r) => (reactions.byType[r.type] ?? 0) > 0,
  );

  useEffect(() => {
    if (!burst) {
      return;
    }

    if (burstHideTimeoutRef.current) {
      clearTimeout(burstHideTimeoutRef.current);
    }

    setVisibleBurst(burst);
    burstHideTimeoutRef.current = setTimeout(() => {
      setVisibleBurst((currentBurst) =>
        currentBurst?.tick === burst.tick ? null : currentBurst,
      );
    }, 700);

    return () => {
      if (burstHideTimeoutRef.current) {
        clearTimeout(burstHideTimeoutRef.current);
      }
    };
  }, [burst]);

  useEffect(() => {
    return () => {
      if (burstHideTimeoutRef.current) {
        clearTimeout(burstHideTimeoutRef.current);
      }
    };
  }, []);

  const showReactionPicker = canReact && (pickerOpen || visibleBurst !== null);

  return (
    <View style={styles.reactionBar}>
      <View style={styles.reactionCounts}>
        {counts.length === 0 ? (
          <Text style={styles.reactionCountsEmpty}>まだ反応なし</Text>
        ) : (
          counts.map((r) => (
            <AnimatedCount
              key={r.type}
              emoji={r.emoji}
              value={reactions.byType[r.type] ?? 0}
            />
          ))
        )}
      </View>
      {canReact ? (
        <PressableScale
          style={[
            styles.reactionToggle,
            reactions.myReaction && styles.reactionToggleActive,
          ]}
          disabled={submitting}
          onPress={onTogglePicker}
        >
          <Text style={styles.reactionToggleLabel}>
            {reactions.myReaction
              ? REACTION_BY_TYPE[reactions.myReaction].emoji
              : '+ 反応'}
          </Text>
        </PressableScale>
      ) : null}

      {showReactionPicker ? (
        <View style={styles.reactionPicker}>
          {REACTIONS.map((r) => {
            const active = reactions.myReaction === r.type;
            return (
              <ReactionPickerChip
                key={r.type}
                active={active}
                burstTick={
                  visibleBurst?.reactionType === r.type ? visibleBurst.tick : 0
                }
                disabled={submitting}
                reaction={r}
                onPress={() => onSelect(r.type)}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

type ReactionPickerChipProps = {
  active: boolean;
  burstTick: number;
  disabled: boolean;
  onPress: () => void;
  reaction: (typeof REACTIONS)[number];
};

function ReactionPickerChip({
  active,
  burstTick,
  disabled,
  onPress,
  reaction,
}: ReactionPickerChipProps) {
  const previousBurstTickRef = useRef(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const previousBurstTick = previousBurstTickRef.current;
    previousBurstTickRef.current = burstTick;

    if (burstTick === 0 || burstTick === previousBurstTick) {
      return;
    }

    scale.value = withSequence(
      withTiming(1.3, {
        duration: 180,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(1, {
        duration: 180,
        easing: Easing.inOut(Easing.quad),
      }),
    );
  }, [burstTick, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.reactionPickerItem}>
      <PressableScale
        disabled={disabled}
        hapticStyle="light"
        onPress={onPress}
        style={[
          styles.reactionPickerItemButton,
          active && styles.reactionPickerItemActive,
          disabled && styles.buttonDisabled,
        ]}
      >
        <Animated.View style={[styles.reactionPickerItemInner, animatedStyle]}>
          <Text style={styles.reactionPickerEmoji}>{reaction.emoji}</Text>
          <Text style={styles.reactionPickerLabel}>{reaction.label}</Text>
        </Animated.View>
      </PressableScale>
      {burstTick > 0 ? <ReactionBurst emoji={reaction.emoji} trigger={burstTick} /> : null}
    </View>
  );
}

interface MemberCardShellProps {
  children: ReactNode;
  disabled: boolean;
  flashTick: number;
}

function MemberCardShell({
  children,
  disabled,
  flashTick,
}: MemberCardShellProps) {
  const bgProgress = useSharedValue(0);

  useEffect(() => {
    if (flashTick === 0) {
      return;
    }

    bgProgress.value = 1;
    bgProgress.value = withTiming(0, { duration: 400 });
  }, [bgProgress, flashTick]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      [disabled ? '#f7f3ea' : '#fcfaf4', colors.accentTint],
    ),
  }));

  return <Animated.View style={[styles.memberCard, animatedStyle]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: '#f6f1e7',
  },
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.accentStrong,
    gap: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fffdf8',
  },
  heroText: {
    color: '#d6e6dd',
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: colors.accent,
  },
  primaryButtonLabel: {
    color: '#fffdf8',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  inviteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,253,248,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,253,248,0.5)',
  },
  inviteButtonLabel: {
    color: '#fffdf8',
    fontWeight: '600',
    fontSize: 14,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  chipLabel: {
    color: colors.accentStrong,
    fontWeight: '600',
  },
  memberCard: {
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e1dacd',
  },
  memberRow: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dce7de',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accentStrong,
  },
  memberBody: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  memberMeta: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  promptEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
  },
  promptQuestion: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  promptChoices: {
    gap: 8,
  },
  promptChoice: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.nestedSurface,
    borderWidth: 1,
    borderColor: colors.nestedBorder,
    gap: 4,
  },
  promptChoiceSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  promptChoiceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  promptChoiceLabelSelected: {
    color: colors.accentStrong,
  },
  promptVoters: {
    fontSize: 12,
    color: colors.muted,
  },
  reactionBar: {
    gap: 8,
  },
  reactionCounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  reactionCountsEmpty: {
    fontSize: 12,
    color: colors.hint,
  },
  reactionToggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reactionToggleActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  reactionToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accentStrong,
  },
  reactionPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  reactionPickerItem: {
    overflow: 'visible',
    position: 'relative',
  },
  reactionPickerItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.nestedSurface,
    borderWidth: 1,
    borderColor: colors.nestedBorder,
  },
  reactionPickerItemInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  reactionPickerItemActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  reactionPickerEmoji: {
    fontSize: 16,
  },
  reactionPickerLabel: {
    fontSize: 12,
    color: colors.ink,
  },
});
