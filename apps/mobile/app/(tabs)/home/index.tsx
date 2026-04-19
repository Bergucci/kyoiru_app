import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiRequest, toApiErrorMessage } from '../../../src/lib/api';
import {
  formatDateTime,
  toAliveStateLabel,
  toGroupTypeLabel,
} from '../../../src/lib/format';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';

interface GroupSummary {
  groupId: string;
  name: string;
  type: string;
  iconUrl: string | null;
  memberCount: number;
}

interface CheckinHistoryResponse {
  days: Array<{
    businessDateJst: string;
    checkedIn: boolean;
    checkedInAt: string | null;
    mood: string | null;
    state: string;
  }>;
}

const moodOptions = ['😊 いい感じ', '🙂 ふつう', '😴 ねむい', '😢 しんどい', '🤒 つらい'];

export default function HomeTabScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [history, setHistory] = useState<CheckinHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  const [submittingMood, setSubmittingMood] = useState(false);

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

  const currentSession = session;

  const today = history?.days[0] ?? null;

  async function loadHomeData() {
    try {
      setLoading(true);
      const [groupsResponse, historyResponse] = await Promise.all([
        apiRequest<GroupSummary[]>('/groups', {
          token: currentSession.accessToken,
        }),
        apiRequest<CheckinHistoryResponse>('/me/checkins/history', {
          token: currentSession.accessToken,
        }),
      ]);
      setGroups(groupsResponse);
      setHistory(historyResponse);
    } catch (error) {
      Alert.alert('ホームの取得に失敗しました', toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const submitCheckin = async () => {
    try {
      setSubmittingCheckin(true);
      await apiRequest('/me/checkins/today', {
        method: 'POST',
        token: currentSession.accessToken,
      });
      await loadHomeData();
    } catch (error) {
      Alert.alert('今日いるの送信に失敗しました', toApiErrorMessage(error));
    } finally {
      setSubmittingCheckin(false);
    }
  };

  const submitMood = async (mood: string) => {
    try {
      setSubmittingMood(true);
      await apiRequest('/me/mood-stamp', {
        method: 'POST',
        token: currentSession.accessToken,
        body: { mood },
      });
      await loadHomeData();
    } catch (error) {
      Alert.alert('気分スタンプの送信に失敗しました', toApiErrorMessage(error));
    } finally {
      setSubmittingMood(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>ホーム</Text>
        <Text style={styles.heroText}>
          自分の今日の状態と所属グループを確認し、必要ならすぐに「今日いる」を送れます。
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>今日の状態</Text>
          <Pressable onPress={() => void loadHomeData()}>
            <Text style={styles.refreshText}>再読込</Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <View style={styles.statusPanel}>
            <Text style={styles.statusText}>
              状態: {toAliveStateLabel(today?.state ?? null)}
            </Text>
            <Text style={styles.metaText}>
              最終反応: {formatDateTime(today?.checkedInAt ?? null)}
            </Text>
            <Text style={styles.metaText}>気分: {today?.mood ?? '未設定'}</Text>
            <Pressable
              style={[
                styles.primaryButton,
                (today?.checkedIn || submittingCheckin) && styles.buttonDisabled,
              ]}
              disabled={today?.checkedIn || submittingCheckin}
              onPress={() => {
                void submitCheckin();
              }}
            >
              <Text style={styles.primaryButtonLabel}>
                {today?.checkedIn ? '今日反応済み' : '今日いる'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {today?.checkedIn && !today.mood ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>気分スタンプ</Text>
          <Text style={styles.metaText}>
            生存報告後に、その日の気分を 1 つだけ送れます。
          </Text>
          <View style={styles.chipWrap}>
            {moodOptions.map((mood) => (
              <Pressable
                key={mood}
                style={[
                  styles.chip,
                  submittingMood && styles.buttonDisabled,
                ]}
                disabled={submittingMood}
                onPress={() => {
                  void submitMood(mood);
                }}
              >
                <Text style={styles.chipLabel}>{mood}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>所属グループ</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : groups.length === 0 ? (
          <Text style={styles.metaText}>まだ所属グループがありません。</Text>
        ) : (
          groups.map((group) => (
            <Pressable
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
              <Text style={styles.metaText}>
                メンバー数: {group.memberCount}
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  refreshText: {
    color: colors.accent,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  statusPanel: {
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
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
