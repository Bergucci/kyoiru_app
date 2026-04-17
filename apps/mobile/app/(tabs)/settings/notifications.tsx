import { Redirect } from 'expo-router';
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
import { toGroupNotificationLevelLabel } from '../../../src/lib/format';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';

interface GroupSummary {
  groupId: string;
  name: string;
  type: string;
  iconUrl: string | null;
  memberCount: number;
}

interface GroupNotificationSettings {
  groupId: string;
  notificationLevel: 'loose' | 'normal' | 'caring';
}

interface GroupNotificationCard extends GroupSummary {
  notificationLevel: 'loose' | 'normal' | 'caring';
}

export default function NotificationSettingsScreen() {
  const { session } = useSession();
  const [groups, setGroups] = useState<GroupNotificationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.accessToken) {
      void loadNotificationSettings();
    }
  }, [session?.accessToken]);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const currentSession = session;

  async function loadNotificationSettings() {
    try {
      setLoading(true);
      const groupResponse = await apiRequest<GroupSummary[]>('/groups', {
        token: currentSession.accessToken,
      });

      const notificationResponses = await Promise.all(
        groupResponse.map((group) =>
          apiRequest<GroupNotificationSettings>(
            `/groups/${group.groupId}/notification-settings`,
            {
              token: currentSession.accessToken,
            },
          ),
        ),
      );

      setGroups(
        groupResponse.map((group, index) => ({
          ...group,
          notificationLevel: notificationResponses[index].notificationLevel,
        })),
      );
    } catch (error) {
      Alert.alert('通知設定の取得に失敗しました', toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const updateNotificationLevel = async (
    groupId: string,
    notificationLevel: 'loose' | 'normal' | 'caring',
  ) => {
    try {
      setSavingGroupId(groupId);
      const response = await apiRequest<GroupNotificationSettings>(
        `/groups/${groupId}/notification-settings`,
        {
          method: 'PATCH',
          token: currentSession.accessToken,
          body: {
            notificationLevel,
          },
        },
      );

      setGroups((current) =>
        current.map((group) =>
          group.groupId === groupId
            ? { ...group, notificationLevel: response.notificationLevel }
            : group,
        ),
      );
    } catch (error) {
      Alert.alert('通知設定の更新に失敗しました', toApiErrorMessage(error));
    } finally {
      setSavingGroupId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>通知設定</Text>
        <Text style={styles.body}>
          source-spec に合わせ、通知温度感はグループ単位で管理します。
        </Text>
      </View>

      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : groups.length === 0 ? (
          <Text style={styles.body}>所属グループがありません。</Text>
        ) : (
          groups.map((group) => (
            <View key={group.groupId} style={styles.groupCard}>
              <Text style={styles.groupTitle}>{group.name}</Text>
              <Text style={styles.body}>
                現在値: {toGroupNotificationLevelLabel(group.notificationLevel)}
              </Text>
              <View style={styles.segment}>
                {(['loose', 'normal', 'caring'] as const).map((level) => (
                  <Pressable
                    key={level}
                    style={[
                      styles.segmentButton,
                      group.notificationLevel === level && styles.segmentButtonActive,
                    ]}
                    disabled={savingGroupId === group.groupId}
                    onPress={() => {
                      void updateNotificationLevel(group.groupId, level);
                    }}
                  >
                    <Text
                      style={[
                        styles.segmentLabel,
                        group.notificationLevel === level &&
                          styles.segmentLabelActive,
                      ]}
                    >
                      {toGroupNotificationLevelLabel(level)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
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
    backgroundColor: '#f6f1e7',
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  groupCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fcfaf4',
    borderWidth: 1,
    borderColor: '#e2dccf',
    gap: 10,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  segment: {
    gap: 8,
  },
  segmentButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#efe7d8',
  },
  segmentButtonActive: {
    backgroundColor: colors.accentSoft,
  },
  segmentLabel: {
    color: colors.ink,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: colors.accentStrong,
  },
});
