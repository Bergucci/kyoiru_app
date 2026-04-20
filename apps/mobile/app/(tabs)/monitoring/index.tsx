import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiRequest, toApiErrorMessage } from '../../../src/lib/api';
import { useApi } from '../../../src/lib/use-api';
import {
  formatDateTime,
  toEntitlementLabel,
  toMonitoringRoleLabel,
  toMonitoringStageLabel,
  toMonitoringStatusLabel,
} from '../../../src/lib/format';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';
import { KeyboardAwareScrollView } from '../../../src/ui/KeyboardAwareScrollView';

interface EntitlementResponse {
  planName: string;
  status: string;
  currentPeriodExpiresAt: string | null;
  gracePeriodExpiresAt: string | null;
  isActiveForFeatures: boolean;
}

interface SubscriptionCopy {
  planName: string;
  priceDisplay: string;
  billingCycle: string;
  freeTrial: string;
  autoRenew: string;
  cancellationMethod: string;
  termsOfServiceUrl: string;
  privacyPolicyUrl: string;
  reviewSummary: string;
}

interface DashboardItem {
  relationshipId: string;
  target: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  };
  status: string;
  isEffectivelyActive: boolean;
  lastCheckedInAt: string | null;
  currentStage: string;
  hasEmergencyContact: boolean;
  checkinFrequency: number;
  checkinTemplate: string;
  canOpenLocationCheck: boolean;
}

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

const planHighlights = [
  '相手が「今日いる」かをそっと把握できます',
  '反応がない時に、段階的にやさしく通知します',
  '緊急連絡先を 1 件だけ登録できます',
  '見守られる側は、いつでも同意を取り消せます',
];

export default function MonitoringTabScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [entitlement, setEntitlement] = useState<EntitlementResponse | null>(null);
  const [subscriptionCopy, setSubscriptionCopy] = useState<SubscriptionCopy | null>(
    null,
  );
  const [dashboard, setDashboard] = useState<DashboardItem[]>([]);
  const [relationships, setRelationships] = useState<MonitoringRelationshipSummary[]>(
    [],
  );
  const [incomingRequests, setIncomingRequests] = useState<
    MonitoringRelationshipSummary[]
  >([]);
  const [outgoingRequests, setOutgoingRequests] = useState<
    MonitoringRelationshipSummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [contactCache, setContactCache] = useState<
    Record<string, FinalStageEmergencyContact | undefined>
  >({});

  useEffect(() => {
    if (session?.accessToken) {
      void loadMonitoring();
    }
  }, [session?.accessToken]);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const { request } = useApi();

  async function loadMonitoring() {
    try {
      setLoading(true);
      const [entitlementResponse, copyResponse] = await Promise.all([
        request<EntitlementResponse>('/billing/entitlement', {}),
        apiRequest<SubscriptionCopy>('/billing/subscription-copy'),
      ]);

      setEntitlement(entitlementResponse);
      setSubscriptionCopy(copyResponse);

      if (!entitlementResponse.isActiveForFeatures) {
        setDashboard([]);
        setRelationships([]);
        setIncomingRequests([]);
        setOutgoingRequests([]);
        return;
      }

      const [
        dashboardResponse,
        relationshipsResponse,
        incomingResponse,
        outgoingResponse,
      ] = await Promise.all([
        request<DashboardItem[]>('/monitoring/dashboard', {}),
        request<MonitoringRelationshipSummary[]>('/monitoring', {}),
        request<MonitoringRelationshipSummary[]>('/monitoring/requests/incoming', {}),
        request<MonitoringRelationshipSummary[]>('/monitoring/requests/outgoing', {}),
      ]);

      setDashboard(dashboardResponse);
      setRelationships(relationshipsResponse);
      setIncomingRequests(incomingResponse);
      setOutgoingRequests(outgoingResponse);
    } catch (error) {
      Alert.alert('見守り画面の取得に失敗しました', toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const startRequest = async () => {
    if (!targetUserId.trim()) {
      Alert.alert('入力不足', '見守りを開始したい userId を入力してください。');
      return;
    }

    try {
      setRequesting(true);
      await request('/monitoring/requests', {
        method: 'POST',
        body: {
          targetUserId: targetUserId.trim(),
        },
      });
      setTargetUserId('');
      await loadMonitoring();
    } catch (error) {
      Alert.alert('見守り開始に失敗しました', toApiErrorMessage(error));
    } finally {
      setRequesting(false);
    }
  };

  const runPendingAction = async (
    requestId: string,
    path: 'approve' | 'reject' | 'cancel',
  ) => {
    try {
      await request(`/monitoring/requests/${requestId}/${path}`, {
        method: 'POST',
      });
      await loadMonitoring();
    } catch (error) {
      Alert.alert('見守りリクエストの更新に失敗しました', toApiErrorMessage(error));
    }
  };

  const openFinalStageContact = async (relationshipId: string) => {
    try {
      const response = await request<FinalStageEmergencyContact>(
        `/monitoring/${relationshipId}/emergency-contact/final-stage`,
        {},
      );
      setContactCache((current) => ({
        ...current,
        [relationshipId]: response,
      }));
    } catch (error) {
      Alert.alert('緊急連絡先の取得に失敗しました', toApiErrorMessage(error));
    }
  };

  if (loading && !entitlement) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const isPaid = entitlement?.isActiveForFeatures ?? false;

  if (!isPaid) {
    return (
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>大切な人を、もう少しちゃんと見守る。</Text>
          <Text style={styles.heroText}>
            見守りプランにご加入いただくと、離れた家族の「今日いる」をやさしく確認できます。
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.paywallTitle}>見守りプラン</Text>
          <View style={styles.paywallPriceRow}>
            <Text style={styles.paywallPrice}>
              {subscriptionCopy?.priceDisplay ?? '¥980'}
            </Text>
            <Text style={styles.paywallCycle}>
              {subscriptionCopy?.billingCycle ?? '/ 月'}
            </Text>
          </View>
          <Text style={styles.metaText}>
            {subscriptionCopy?.freeTrial ?? '初回 7 日間は無料。いつでも解約できます。'}
          </Text>
          <View style={styles.paywallBulletList}>
            {planHighlights.map((item) => (
              <View key={item} style={styles.paywallBulletRow}>
                <View style={styles.paywallBulletDot} />
                <Text style={styles.paywallBulletText}>{item}</Text>
              </View>
            ))}
          </View>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              router.push('/(tabs)/settings/subscription-info' as never);
            }}
          >
            <Text style={styles.primaryButtonLabel}>7 日間無料で試す</Text>
          </Pressable>
          <Text style={styles.paywallFinePrint}>
            監視ではなく、反応がない時に気づきやすくするための機能です。
          </Text>
        </View>
      </KeyboardAwareScrollView>
    );
  }

  const actionableRelationships = relationships.filter(
    (item) => item.status === 'active' || item.status === 'pending',
  );

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>見守り</Text>
        <Text style={styles.heroText}>
          開始リクエスト、承認待ち、同意後の設定、ダッシュボードを 1 タブで扱えます。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>契約状態</Text>
        {entitlement ? (
          <>
            <Text style={styles.statusText}>{entitlement.planName}</Text>
            <Text style={styles.metaText}>
              状態: {toEntitlementLabel(entitlement.status)}
            </Text>
            <Text style={styles.metaText}>
              有効期限: {formatDateTime(entitlement.currentPeriodExpiresAt)}
            </Text>
            {entitlement.gracePeriodExpiresAt ? (
              <Text style={styles.metaText}>
                Grace Period: {formatDateTime(entitlement.gracePeriodExpiresAt)}
              </Text>
            ) : null}
          </>
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>見守りダッシュボード</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : dashboard.length === 0 ? (
          <Text style={styles.metaText}>見守り対象はまだありません。</Text>
        ) : (
          dashboard.map((item) => (
            <View key={item.relationshipId} style={styles.listCard}>
              <Text style={styles.statusText}>{item.target.displayName}</Text>
              <Text style={styles.metaText}>@{item.target.userId}</Text>
              <Text style={styles.metaText}>
                ステージ: {toMonitoringStageLabel(item.currentStage)}
              </Text>
              <Text style={styles.metaText}>
                最終反応: {formatDateTime(item.lastCheckedInAt)}
              </Text>
              <Text style={styles.metaText}>
                GPS 導線: {item.canOpenLocationCheck ? '表示可' : 'まだ表示しない'}
              </Text>
              {item.currentStage === 'monitor_stage_3' && item.hasEmergencyContact ? (
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => {
                    void openFinalStageContact(item.relationshipId);
                  }}
                >
                  <Text style={styles.primaryButtonLabel}>最終段階の連絡先を確認</Text>
                </Pressable>
              ) : null}
              {contactCache[item.relationshipId] ? (
                <View style={styles.contactCard}>
                  <Text style={styles.contactTitle}>緊急連絡先</Text>
                  <Text style={styles.metaText}>
                    氏名: {contactCache[item.relationshipId]?.emergencyContact.name}
                  </Text>
                  <Text style={styles.metaText}>
                    電話番号:{' '}
                    {contactCache[item.relationshipId]?.emergencyContact.phoneNumber}
                  </Text>
                  <Text style={styles.metaText}>
                    続柄:{' '}
                    {contactCache[item.relationshipId]?.emergencyContact.relationship ??
                      '未設定'}
                  </Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>見守り関係</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : actionableRelationships.length === 0 ? (
          <Text style={styles.metaText}>見守り関係はまだありません。</Text>
        ) : (
          actionableRelationships.map((item) => (
            <Pressable
              key={item.id}
              style={styles.listCard}
              onPress={() => {
                router.push({
                  pathname: '/(tabs)/monitoring/[relationshipId]',
                  params: { relationshipId: item.id },
                } as never);
              }}
            >
              <Text style={styles.statusText}>{item.counterpart.displayName}</Text>
              <Text style={styles.metaText}>@{item.counterpart.userId}</Text>
              <Text style={styles.metaText}>
                役割: {toMonitoringRoleLabel(item.role)}
              </Text>
              <Text style={styles.metaText}>
                状態: {toMonitoringStatusLabel(item.status)}
              </Text>
              <Text style={styles.metaText}>
                開始日時: {formatDateTime(item.activatedAt ?? item.requestedAt)}
              </Text>
              <Text style={styles.detailText}>詳細を開く</Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>受信した見守りリクエスト</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : incomingRequests.length === 0 ? (
          <Text style={styles.metaText}>現在の受信リクエストはありません。</Text>
        ) : (
          incomingRequests.map((item) => (
            <View key={item.id} style={styles.listCard}>
              <Text style={styles.statusText}>{item.counterpart.displayName}</Text>
              <Text style={styles.metaText}>@{item.counterpart.userId}</Text>
              <Text style={styles.metaText}>
                受信日時: {formatDateTime(item.requestedAt)}
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => {
                    void runPendingAction(item.id, 'approve');
                  }}
                >
                  <Text style={styles.primaryButtonLabel}>承認</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    void runPendingAction(item.id, 'reject');
                  }}
                >
                  <Text style={styles.secondaryButtonLabel}>拒否</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>送信中の見守りリクエスト</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : outgoingRequests.length === 0 ? (
          <Text style={styles.metaText}>送信中の見守りリクエストはありません。</Text>
        ) : (
          outgoingRequests.map((item) => (
            <View key={item.id} style={styles.listCard}>
              <Text style={styles.statusText}>{item.counterpart.displayName}</Text>
              <Text style={styles.metaText}>@{item.counterpart.userId}</Text>
              <Text style={styles.metaText}>
                送信日時: {formatDateTime(item.requestedAt)}
              </Text>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  void runPendingAction(item.id, 'cancel');
                }}
              >
                <Text style={styles.secondaryButtonLabel}>取消</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>見守り開始</Text>
        <Text style={styles.metaText}>
          userId を指定して見守り開始リクエストを送ります。
        </Text>
        <TextInput
          value={targetUserId}
          onChangeText={setTargetUserId}
          placeholder="target userId"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Pressable
          style={[styles.primaryButton, requesting && styles.buttonDisabled]}
          disabled={requesting}
          onPress={() => {
            void startRequest();
          }}
        >
          <Text style={styles.primaryButtonLabel}>見守り開始を送る</Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: colors.pageBg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: colors.onDark,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.onSkyMuted,
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
  paywallTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  paywallPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  paywallPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
  },
  paywallCycle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
  },
  paywallBulletList: {
    gap: 8,
    marginTop: 2,
  },
  paywallBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  paywallBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginTop: 8,
  },
  paywallBulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
  },
  listCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.nestedSurface,
    borderWidth: 1,
    borderColor: colors.nestedBorder,
    gap: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.secondarySurface,
  },
  secondaryButtonLabel: {
    color: colors.ink,
    fontWeight: '700',
  },
  detailText: {
    color: colors.accent,
    fontWeight: '700',
  },
  contactCard: {
    marginTop: 6,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.accentTint,
    gap: 4,
  },
  contactTitle: {
    fontWeight: '700',
    color: colors.ink,
  },
  paywallFinePrint: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    color: colors.hint,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
