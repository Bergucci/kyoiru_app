import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiRequest, toApiErrorMessage } from '../../../src/lib/api';
import {
  formatDateTime,
  toCheckinTemplateLabel,
  toGpsShareModeLabel,
  toMonitoringRoleLabel,
  toMonitoringStageLabel,
  toMonitoringStatusLabel,
} from '../../../src/lib/format';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';

interface MonitoringRelationshipSummary {
  id: string;
  counterpart: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  };
  role: 'watcher' | 'target';
  status: string;
  requestedAt: string;
  activatedAt: string | null;
  isEffectivelyActive: boolean;
}

interface MonitoringSettingsResponse {
  monitoringRelationshipId: string;
  status: string;
  gpsShareMode: 'off' | 'on_overdue' | 'always';
  updatedAt: string | null;
}

interface EmergencyContactResponse {
  monitoringRelationshipId: string;
  emergencyContact: {
    name: string;
    phoneNumber: string;
    relationship: string | null;
    updatedAt: string;
  } | null;
}

interface CheckinSettingsResponse {
  monitoringRelationshipId: string;
  status: string;
  checkinFrequency: 1 | 2 | 3;
  checkinTemplate: 'morning' | 'morning_evening' | 'morning_noon_evening';
  updatedAt: string | null;
}

interface DashboardItem {
  relationshipId: string;
  currentStage: string;
  hasEmergencyContact: boolean;
  canOpenLocationCheck: boolean;
}

interface FinalStageEmergencyContact {
  monitoringRelationshipId: string;
  currentStage: string;
  canOpenLocationCheck: boolean;
  emergencyContact: {
    name: string;
    phoneNumber: string;
    relationship: string | null;
    updatedAt: string;
  };
}

function templateForFrequency(
  frequency: 1 | 2 | 3,
): 'morning' | 'morning_evening' | 'morning_noon_evening' {
  switch (frequency) {
    case 2:
      return 'morning_evening';
    case 3:
      return 'morning_noon_evening';
    default:
      return 'morning';
  }
}

export default function MonitoringDetailScreen() {
  const router = useRouter();
  const { relationshipId } = useLocalSearchParams<{ relationshipId: string }>();
  const { session } = useSession();
  const [relationship, setRelationship] = useState<MonitoringRelationshipSummary | null>(
    null,
  );
  const [settings, setSettings] = useState<MonitoringSettingsResponse | null>(null);
  const [checkinSettings, setCheckinSettings] =
    useState<CheckinSettingsResponse | null>(null);
  const [dashboardItem, setDashboardItem] = useState<DashboardItem | null>(null);
  const [emergencyContact, setEmergencyContact] =
    useState<EmergencyContactResponse | null>(null);
  const [finalStageContact, setFinalStageContact] =
    useState<FinalStageEmergencyContact | null>(null);
  const [gpsShareMode, setGpsShareMode] = useState<'off' | 'on_overdue' | 'always'>(
    'on_overdue',
  );
  const [checkinFrequency, setCheckinFrequency] = useState<1 | 2 | 3>(1);
  const [contactName, setContactName] = useState('');
  const [contactPhoneNumber, setContactPhoneNumber] = useState('');
  const [contactRelationship, setContactRelationship] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingGps, setSavingGps] = useState(false);
  const [savingCheckin, setSavingCheckin] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (session?.accessToken && relationshipId) {
      void loadDetail();
    }
  }, [relationshipId, session?.accessToken]);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const currentSession = session;

  async function loadDetail() {
    try {
      setLoading(true);
      const relationshipResponse = await apiRequest<MonitoringRelationshipSummary>(
        `/monitoring/${relationshipId}`,
        {
          token: currentSession.accessToken,
        },
      );

      const [settingsResponse, checkinResponse, dashboardResponse, emergencyResponse] =
        await Promise.all([
          apiRequest<MonitoringSettingsResponse>(`/monitoring/${relationshipId}/settings`, {
            token: currentSession.accessToken,
          }),
          apiRequest<CheckinSettingsResponse>(
            `/monitoring/${relationshipId}/checkin-settings`,
            {
              token: currentSession.accessToken,
            },
          ),
          apiRequest<DashboardItem[]>('/monitoring/dashboard', {
            token: currentSession.accessToken,
          }),
          relationshipResponse.role === 'target'
            ? apiRequest<EmergencyContactResponse>(
                `/monitoring/${relationshipId}/emergency-contact`,
                {
                  token: currentSession.accessToken,
                },
              )
            : Promise.resolve(null),
        ]);

      setRelationship(relationshipResponse);
      setSettings(settingsResponse);
      setCheckinSettings(checkinResponse);
      setDashboardItem(
        dashboardResponse.find((item) => item.relationshipId === relationshipId) ?? null,
      );
      setEmergencyContact(emergencyResponse);
      setGpsShareMode(settingsResponse.gpsShareMode);
      setCheckinFrequency(checkinResponse.checkinFrequency);
      setContactName(emergencyResponse?.emergencyContact?.name ?? '');
      setContactPhoneNumber(emergencyResponse?.emergencyContact?.phoneNumber ?? '');
      setContactRelationship(emergencyResponse?.emergencyContact?.relationship ?? '');
    } catch (error) {
      Alert.alert('見守り詳細の取得に失敗しました', toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const saveGpsShareMode = async () => {
    try {
      setSavingGps(true);
      const response = await apiRequest<MonitoringSettingsResponse>(
        `/monitoring/${relationshipId}/settings`,
        {
          method: 'PATCH',
          token: currentSession.accessToken,
          body: { gpsShareMode },
        },
      );
      setSettings(response);
    } catch (error) {
      Alert.alert('GPS共有設定の更新に失敗しました', toApiErrorMessage(error));
    } finally {
      setSavingGps(false);
    }
  };

  const saveCheckinSettings = async () => {
    try {
      setSavingCheckin(true);
      const response = await apiRequest<CheckinSettingsResponse>(
        `/monitoring/${relationshipId}/checkin-settings`,
        {
          method: 'PATCH',
          token: currentSession.accessToken,
          body: {
            checkinFrequency,
            checkinTemplate: templateForFrequency(checkinFrequency),
          },
        },
      );
      setCheckinSettings(response);
    } catch (error) {
      Alert.alert('複数回チェックイン設定の更新に失敗しました', toApiErrorMessage(error));
    } finally {
      setSavingCheckin(false);
    }
  };

  const saveEmergencyContact = async () => {
    if (!contactName.trim() || !contactPhoneNumber.trim()) {
      Alert.alert('入力不足', '氏名と電話番号を入力してください。');
      return;
    }

    try {
      setSavingContact(true);
      const response = await apiRequest<EmergencyContactResponse>(
        `/monitoring/${relationshipId}/emergency-contact`,
        {
          method: 'PUT',
          token: currentSession.accessToken,
          body: {
            name: contactName.trim(),
            phoneNumber: contactPhoneNumber.trim(),
            relationship: contactRelationship.trim() || null,
          },
        },
      );
      setEmergencyContact(response);
    } catch (error) {
      Alert.alert('緊急連絡先の更新に失敗しました', toApiErrorMessage(error));
    } finally {
      setSavingContact(false);
    }
  };

  const revokeConsent = async () => {
    try {
      setRevoking(true);
      await apiRequest(`/monitoring/${relationshipId}/revoke`, {
        method: 'POST',
        token: currentSession.accessToken,
      });
      await loadDetail();
    } catch (error) {
      Alert.alert('見守りの停止に失敗しました', toApiErrorMessage(error));
    } finally {
      setRevoking(false);
    }
  };

  const openFinalStageEmergencyContact = async () => {
    try {
      const response = await apiRequest<FinalStageEmergencyContact>(
        `/monitoring/${relationshipId}/emergency-contact/final-stage`,
        {
          token: currentSession.accessToken,
        },
      );
      setFinalStageContact(response);
    } catch (error) {
      Alert.alert('最終段階の連絡先取得に失敗しました', toApiErrorMessage(error));
    }
  };

  const isTargetEditor =
    relationship?.role === 'target' && relationship.status === 'active';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading || !relationship || !settings || !checkinSettings ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{relationship.counterpart.displayName}</Text>
            <Text style={styles.heroText}>@{relationship.counterpart.userId}</Text>
            <Text style={styles.heroText}>
              {toMonitoringRoleLabel(relationship.role)} /{' '}
              {toMonitoringStatusLabel(relationship.status)}
            </Text>
            <Text style={styles.heroText}>
              開始: {formatDateTime(relationship.activatedAt ?? relationship.requestedAt)}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>現在の見守り状態</Text>
            <Text style={styles.metaText}>
              実効状態: {relationship.isEffectivelyActive ? '有効' : '停止または待機'}
            </Text>
            {dashboardItem ? (
              <>
                <Text style={styles.metaText}>
                  ステージ: {toMonitoringStageLabel(dashboardItem.currentStage)}
                </Text>
                <Text style={styles.metaText}>
                  GPS 導線: {dashboardItem.canOpenLocationCheck ? '表示可' : 'まだ表示しない'}
                </Text>
              </>
            ) : null}
            {relationship.role === 'target' ? (
              <Text style={styles.noteText}>
                target 側だけが GPS共有・緊急連絡先・複数回チェックイン設定を編集できます。
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>GPS共有設定</Text>
            <Text style={styles.metaText}>
              現在値: {toGpsShareModeLabel(settings.gpsShareMode)}
            </Text>
            <View style={styles.segment}>
              {(['off', 'on_overdue', 'always'] as const).map((value) => (
                <Pressable
                  key={value}
                  style={[
                    styles.segmentButton,
                    gpsShareMode === value && styles.segmentButtonActive,
                  ]}
                  disabled={!isTargetEditor}
                  onPress={() => {
                    setGpsShareMode(value);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      gpsShareMode === value && styles.segmentLabelActive,
                    ]}
                  >
                    {toGpsShareModeLabel(value)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {isTargetEditor ? (
              <Pressable
                style={[styles.primaryButton, savingGps && styles.buttonDisabled]}
                disabled={savingGps}
                onPress={() => {
                  void saveGpsShareMode();
                }}
              >
                <Text style={styles.primaryButtonLabel}>GPS共有設定を保存</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>複数回チェックイン設定</Text>
            <Text style={styles.metaText}>
              現在値: {checkinSettings.checkinFrequency} 回 /{' '}
              {toCheckinTemplateLabel(checkinSettings.checkinTemplate)}
            </Text>
            <View style={styles.segment}>
              {[1, 2, 3].map((value) => (
                <Pressable
                  key={value}
                  style={[
                    styles.segmentButton,
                    checkinFrequency === value && styles.segmentButtonActive,
                  ]}
                  disabled={!isTargetEditor}
                  onPress={() => {
                    setCheckinFrequency(value as 1 | 2 | 3);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      checkinFrequency === value && styles.segmentLabelActive,
                    ]}
                  >
                    {value} 回
                  </Text>
                </Pressable>
              ))}
            </View>
            {isTargetEditor ? (
              <Pressable
                style={[styles.primaryButton, savingCheckin && styles.buttonDisabled]}
                disabled={savingCheckin}
                onPress={() => {
                  void saveCheckinSettings();
                }}
              >
                <Text style={styles.primaryButtonLabel}>複数回チェックインを保存</Text>
              </Pressable>
            ) : null}
          </View>

          {relationship.role === 'target' ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>緊急連絡先設定</Text>
              <TextInput
                value={contactName}
                onChangeText={setContactName}
                placeholder="氏名"
                style={styles.input}
              />
              <TextInput
                value={contactPhoneNumber}
                onChangeText={setContactPhoneNumber}
                placeholder="電話番号"
                keyboardType="phone-pad"
                style={styles.input}
              />
              <TextInput
                value={contactRelationship}
                onChangeText={setContactRelationship}
                placeholder="続柄 (任意)"
                style={styles.input}
              />
              {emergencyContact?.emergencyContact ? (
                <Text style={styles.metaText}>
                  最終更新: {formatDateTime(emergencyContact.emergencyContact.updatedAt)}
                </Text>
              ) : null}
              {isTargetEditor ? (
                <Pressable
                  style={[styles.primaryButton, savingContact && styles.buttonDisabled]}
                  disabled={savingContact}
                  onPress={() => {
                    void saveEmergencyContact();
                  }}
                >
                  <Text style={styles.primaryButtonLabel}>緊急連絡先を保存</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {dashboardItem?.currentStage === 'monitor_stage_3' &&
          dashboardItem.hasEmergencyContact ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>最終段階の緊急連絡先</Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => {
                  void openFinalStageEmergencyContact();
                }}
              >
                <Text style={styles.primaryButtonLabel}>緊急連絡先を取得</Text>
              </Pressable>
              {finalStageContact ? (
                <View style={styles.contactCard}>
                  <Text style={styles.metaText}>
                    氏名: {finalStageContact.emergencyContact.name}
                  </Text>
                  <Text style={styles.metaText}>
                    電話番号: {finalStageContact.emergencyContact.phoneNumber}
                  </Text>
                  <Text style={styles.metaText}>
                    続柄:{' '}
                    {finalStageContact.emergencyContact.relationship ?? '未設定'}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {relationship.role === 'target' && relationship.status === 'active' ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>見守り停止</Text>
              <Text style={styles.metaText}>
                同意を撤回すると自動復元されず、再開には再リクエストが必要です。
              </Text>
              <Pressable
                style={[styles.dangerButton, revoking && styles.buttonDisabled]}
                disabled={revoking}
                onPress={() => {
                  Alert.alert(
                    '見守りを停止しますか',
                    'この操作は同意撤回として扱われます。',
                    [
                      { text: 'キャンセル', style: 'cancel' },
                      {
                        text: '停止する',
                        style: 'destructive',
                        onPress: () => {
                          void revokeConsent();
                        },
                      },
                    ],
                  );
                }}
              >
                <Text style={styles.dangerLabel}>同意を撤回する</Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              router.back();
            }}
          >
            <Text style={styles.secondaryButtonLabel}>見守り一覧へ戻る</Text>
          </Pressable>
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
    backgroundColor: colors.sky,
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fcff',
  },
  heroText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#d5e6ee',
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
  metaText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.warning,
  },
  segment: {
    gap: 10,
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
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: '#ebe3d6',
  },
  secondaryButtonLabel: {
    color: colors.ink,
    fontWeight: '700',
  },
  contactCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#eef5f1',
    gap: 4,
  },
  dangerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: colors.danger,
  },
  dangerLabel: {
    color: '#fff7ee',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
