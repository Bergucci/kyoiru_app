import { Redirect, useLocalSearchParams } from 'expo-router';
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
import { apiRequest, toApiErrorMessage } from '../../../../src/lib/api';
import {
  formatDateTime,
  toAliveStateLabel,
  toGroupTypeLabel,
} from '../../../../src/lib/format';
import { useSession } from '../../../../src/session/session-context';
import { colors } from '../../../../src/ui/theme';

interface GroupDetailResponse {
  groupId: string;
  name: string;
  type: string;
  iconUrl: string | null;
  members: Array<{
    displayName: string;
    avatarUrl: string | null;
    userId?: string;
    state?: string;
    lastCheckedInAt?: string | null;
    mood?: string | null;
    isInteractive: boolean;
  }>;
}

const moodOptions = ['😊 いい感じ', '🙂 ふつう', '😴 ねむい', '😢 しんどい', '🤒 つらい'];

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { session } = useSession();
  const [group, setGroup] = useState<GroupDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  const [submittingMood, setSubmittingMood] = useState(false);

  useEffect(() => {
    if (session?.accessToken && groupId) {
      void loadGroup();
    }
  }, [groupId, session?.accessToken]);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const currentSession = session;

  async function loadGroup() {
    try {
      setLoading(true);
      const response = await apiRequest<GroupDetailResponse>(`/groups/${groupId}`, {
        token: currentSession.accessToken,
      });
      setGroup(response);
    } catch (error) {
      Alert.alert('グループ詳細の取得に失敗しました', toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const selfUserId = currentSession.user.userId;
  const selfMember = group?.members.find(
    (member) => member.userId === selfUserId,
  );

  const sortedMembers = [...(group?.members ?? [])].sort((a, b) => {
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
  });

  const submitCheckin = async () => {
    try {
      setSubmittingCheckin(true);
      await apiRequest('/me/checkins/today', {
        method: 'POST',
        token: currentSession.accessToken,
      });
      await loadGroup();
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
      await loadGroup();
    } catch (error) {
      Alert.alert('気分スタンプの送信に失敗しました', toApiErrorMessage(error));
    } finally {
      setSubmittingMood(false);
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
            <Pressable
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
            </Pressable>
          </View>

          {selfMember?.state === 'checked_in' && !selfMember.mood ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>気分スタンプ</Text>
              <View style={styles.chipWrap}>
                {moodOptions.map((mood) => (
                  <Pressable
                    key={mood}
                    style={[styles.chip, submittingMood && styles.buttonDisabled]}
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
            <Text style={styles.sectionTitle}>メンバー一覧</Text>
            {sortedMembers.map((member, index) => (
              <Pressable
                key={`${member.displayName}-${index}`}
                style={[
                  styles.memberCard,
                  !member.isInteractive && styles.memberCardDisabled,
                ]}
                disabled={!member.isInteractive}
                onPress={() => {
                  Alert.alert(
                    member.displayName,
                    [
                      member.userId ? `@${member.userId}` : null,
                      member.state ? `状態: ${toAliveStateLabel(member.state)}` : null,
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
                  <Text style={styles.avatarLabel}>
                    {member.displayName.slice(0, 1)}
                  </Text>
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
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
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
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fcfaf4',
    borderWidth: 1,
    borderColor: '#e1dacd',
  },
  memberCardDisabled: {
    backgroundColor: '#f7f3ea',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dce7de',
    alignItems: 'center',
    justifyContent: 'center',
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
});
