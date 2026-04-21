import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { toApiErrorMessage } from '../../../src/lib/api';
import { useApi } from '../../../src/lib/use-api';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';
import { PressableScale } from '../../../src/components';

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

const LEVELS: {
  value: 'loose' | 'normal' | 'caring';
  label: string;
  description: string;
}[] = [
  {
    value: 'loose',
    label: 'ゆるい',
    description: '長時間未反応でもまとめて通知',
  },
  {
    value: 'normal',
    label: 'ふつう',
    description: '標準的なタイミングで通知',
  },
  {
    value: 'caring',
    label: '気にかける',
    description: '未反応が続いたら早めに通知',
  },
];

export default function NotificationSettingsScreen() {
  const { session } = useSession();
  const [groups, setGroups] = useState<GroupNotificationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null);
  const { request } = useApi();

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

  async function loadNotificationSettings() {
    try {
      setLoading(true);
      const groupResponse = await request<GroupSummary[]>('/groups', {});

      const notificationResponses = await Promise.all(
        groupResponse.map((group) =>
          request<GroupNotificationSettings>(
            `/groups/${group.groupId}/notification-settings`,
            {},
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
      const response = await request<GroupNotificationSettings>(
        `/groups/${groupId}/notification-settings`,
        { method: 'PATCH', body: { notificationLevel } },
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
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          グループごとに通知の頻度を設定できます。
          メンバーの「今日いる」未反応が続いたとき、どれだけ早く知らせるかを選んでください。
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            所属グループがありません。{'\n'}グループを作成すると通知設定が表示されます。
          </Text>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.groupId} style={styles.groupCard}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupMeta}>{group.memberCount}人のメンバー</Text>

            <View style={styles.levelList}>
              {LEVELS.map((level) => {
                const isActive = group.notificationLevel === level.value;
                const isSaving = savingGroupId === group.groupId;
                return (
                  <PressableScale
                    key={level.value}
                    hapticStyle="medium"
                    style={[styles.levelRow, isActive && styles.levelRowActive]}
                    disabled={isSaving}
                    onPress={() => {
                      void updateNotificationLevel(group.groupId, level.value);
                    }}
                  >
                    <View style={styles.levelLeft}>
                      <View style={[styles.radio, isActive && styles.radioActive]}>
                        {isActive && <View style={styles.radioDot} />}
                      </View>
                      <View style={styles.levelText}>
                        <Text style={[styles.levelLabel, isActive && styles.levelLabelActive]}>
                          {level.label}
                        </Text>
                        <Text style={styles.levelDescription}>{level.description}</Text>
                      </View>
                    </View>
                    {isSaving && savingGroupId === group.groupId && isActive && (
                      <ActivityIndicator size="small" color={colors.accent} />
                    )}
                  </PressableScale>
                );
              })}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: colors.pageBg,
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.accentStrong,
  },
  emptyCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },
  groupCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  groupMeta: {
    fontSize: 13,
    color: colors.muted,
    marginTop: -8,
  },
  levelList: {
    gap: 8,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.nestedBorder,
    backgroundColor: colors.nestedSurface,
  },
  levelRowActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentTint,
  },
  levelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.hint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  levelText: {
    flex: 1,
    gap: 2,
  },
  levelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  levelLabelActive: {
    color: colors.accentStrong,
  },
  levelDescription: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
});
