import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CheckinButton, Confetti, Mascot, MascotCheerOverlay, MoodSticker, ScreenHeader, StreakDots, Toast, PressableScale } from '../../../src/components';
import { toApiErrorMessage } from '../../../src/lib/api';
import {
  formatDateTime,
  toAliveStateLabel,
  toGroupTypeLabel,
} from '../../../src/lib/format';
import { useSession } from '../../../src/session/session-context';
import { useApi } from '../../../src/lib/use-api';
import { KeyboardAwareScrollView } from '../../../src/ui/KeyboardAwareScrollView';
import { colors, spacing, typography } from '../../../src/ui/theme';

interface GroupSummary {
  groupId: string;
  name: string;
  type: string;
  iconUrl: string | null;
  memberCount: number;
}

interface CheckinHistoryResponse {
  days: {
    businessDateJst: string;
    checkedIn: boolean;
    checkedInAt: string | null;
    mood: string | null;
    note: string | null;
    state: string;
  }[];
}

const moodOptions = [
  { emoji: '😊', label: '元気', value: '元気' },
  { emoji: '🙂', label: 'ふつう', value: 'ふつう' },
  { emoji: '😴', label: '眠い', value: '眠い' },
  { emoji: '😓', label: '忙しい', value: '忙しい' },
  { emoji: '😢', label: 'しんどい', value: 'しんどい' },
];

export default function HomeTabScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [history, setHistory] = useState<CheckinHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  const [submittingMood, setSubmittingMood] = useState(false);
  const [pendingMoodValue, setPendingMoodValue] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [completionTick, setCompletionTick] = useState(0);

  useEffect(() => {
    if (session?.accessToken) {
      void loadHomeData();
    }
  }, [session?.accessToken]);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const { request } = useApi();
  const today = history?.days[0] ?? null;
  const checkinButtonState = today?.checkedIn
    ? 'done'
    : submittingCheckin
      ? 'submitting'
      : 'idle';

  async function loadHomeData() {
    try {
      setLoading(true);
      const [groupsResponse, historyResponse] = await Promise.all([
        request<GroupSummary[]>('/groups', {}),
        request<CheckinHistoryResponse>('/me/checkins/history', {}),
      ]);
      setGroups(groupsResponse);
      setHistory(historyResponse);
      setPendingMoodValue(historyResponse.days[0]?.mood ?? null);
    } catch (error) {
      Alert.alert('ホームの取得に失敗しました', toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const submitCheckin = async () => {
    try {
      setSubmittingCheckin(true);
      await request('/me/checkins/today', {
        method: 'POST',
      });
      await loadHomeData();
      setCompletionTick((currentTick) => currentTick + 1);
      Toast.show({ message: '今日いる、届いたよ！', type: 'success', silent: true });
    } catch (error) {
      Alert.alert('今日いるの送信に失敗しました', toApiErrorMessage(error));
    } finally {
      setSubmittingCheckin(false);
    }
  };

  const submitMood = async (mood: string) => {
    try {
      setPendingMoodValue(mood);
      setSubmittingMood(true);
      await request('/me/mood-stamp', {
        method: 'POST',
        body: { mood, note: noteInput.trim() || undefined },
      });
      setNoteInput('');
      await loadHomeData();
    } catch (error) {
      setPendingMoodValue(null);
      Alert.alert('気分スタンプの送信に失敗しました', toApiErrorMessage(error));
    } finally {
      setSubmittingMood(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="今日いる" />
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>今日の状態</Text>
          {loading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <Text style={styles.statusText}>
                状態: {toAliveStateLabel(today?.state ?? null)}
              </Text>
              <Text style={styles.metaText}>
                最終反応: {formatDateTime(today?.checkedInAt ?? null)}
              </Text>
              <Text style={styles.metaText}>気分: {today?.mood ?? '未設定'}</Text>
              {today?.note ? (
                <Text style={styles.noteText}>「{today.note}」</Text>
              ) : null}
              <StreakDots history={history?.days ?? []} />
              <CheckinButton
                onPress={() => {
                  void submitCheckin();
                }}
                state={checkinButtonState}
              />
            </>
          )}
        </View>

        {today?.checkedIn && !today.mood ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>気分スタンプ</Text>
            <Text style={styles.metaText}>
              今日の気分と一言を送れます。
            </Text>
            <TextInput
              style={styles.noteInput}
              value={noteInput}
              onChangeText={setNoteInput}
              placeholder="今日の一言（任意）"
              placeholderTextColor={colors.hint}
              maxLength={100}
            />
            <View style={styles.stickerWrap}>
              {moodOptions.map((mood) => (
                <MoodSticker
                  key={mood.value}
                  disabled={submittingMood}
                  emoji={mood.emoji}
                  label={mood.label}
                  onPress={() => {
                    void submitMood(mood.value);
                  }}
                  selected={pendingMoodValue === mood.value || today?.mood === mood.value}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>所属グループ</Text>

          <PressableScale
            style={styles.createGroupRow}
            onPress={() => { router.push('/(tabs)/home/create-group' as never); }}
          >
            <View style={styles.createGroupIcon}>
              <Ionicons name="people" size={22} color={colors.accentStrong} />
            </View>
            <Text style={styles.createGroupLabel}>グループを作成</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.hint} />
          </PressableScale>

          {loading ? (
            <ActivityIndicator color={colors.accent} />
          ) : groups.length === 0 ? (
            <View style={styles.emptyState}>
              <Mascot size={120} variant="default" />
              <Text style={styles.emptyStateText}>
                まだグループがないよ。作るか、招待されてみよう
              </Text>
            </View>
          ) : (
            groups.map((group) => (
              <PressableScale
                key={group.groupId}
                style={styles.groupCard}
                onPress={() => {
                  router.push({
                    pathname: '/(tabs)/home/groups/[groupId]',
                    params: { groupId: group.groupId },
                  } as never);
                }}
              >
                <Text style={styles.groupTitle}>{group.name}</Text>
                <Text style={styles.metaText}>{toGroupTypeLabel(group.type)}</Text>
                <Text style={styles.metaText}>メンバー数: {group.memberCount}</Text>
              </PressableScale>
            ))
          )}
        </View>
      </KeyboardAwareScrollView>
      <View pointerEvents="box-none" style={styles.overlayLayer}>
        <Confetti trigger={completionTick} />
        <MascotCheerOverlay trigger={completionTick} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.pageBg,
    flex: 1,
  },
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: colors.pageBg,
  },
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.accentStrong,
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.onDark,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.onAccentMuted,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing['3xl'],
  },
  emptyStateText: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  metaText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
    fontStyle: 'italic',
  },
  noteInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
  },
  stickerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  createGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.nestedBorder,
  },
  createGroupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createGroupLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  groupCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.nestedSurface,
    borderWidth: 1,
    borderColor: colors.nestedBorder,
    gap: 4,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
});
