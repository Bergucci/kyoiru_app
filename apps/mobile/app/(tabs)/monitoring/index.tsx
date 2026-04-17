import { Redirect, useRouter } from 'expo-router';
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
  toEntitlementLabel,
  toMonitoringRoleLabel,
  toMonitoringStageLabel,
  toMonitoringStatusLabel,
} from '../../../src/lib/format';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';

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

  const currentSession = session;

  async function loadMonitoring() {
    try {
      setLoading(true);
      const [entitlementResponse, copyResponse] = await Promise.all([
        apiRequest<EntitlementResponse>('/billing/entitlement', {
          token: currentSession.accessToken,
        }),
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
        apiRequest<DashboardItem[]>('/monitoring/dashboard', {
          token: currentSession.accessToken,
        }),
        apiRequest<MonitoringRelationshipSummary[]>('/monitoring', {
          token: currentSession.accessToken,
        }),
        apiRequest<MonitoringRelationshipSummary[]>('/monitoring/requests/incoming', {
          token: currentSession.accessToken,
        }),
        apiRequest<MonitoringRelationshipSummary[]>('/monitoring/requests/outgoing', {
          token: currentSession.accessToken,
        }),
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
      await apiRequest('/monitoring/requests', {
        method: 'POST',
        token: currentSession.accessToken,
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
      await apiRequest(`/monitoring/requests/${requestId}/${path}`, {
        method: 'POST',
        token: currentSession.accessToken,
      });
      await loadMonitoring();
    } catch (error) {
      Alert.alert('見守りリクエストの更新に失敗しました', toApiErrorMessage(error));
    }
  };

  const openFinalStageContact = async (relationshipId: string) => {
    try {
      const response = await apiRequest<FinalStageEmergencyContact>(
        `/monitoring/${relationshipId}/emergency-contact/final-stage`,
        {
          token: currentSession.accessToken,
        },
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
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>見守り</Text>
          <Text style={styles.heroText}>
            見守りプランにご加入いただくと、離れた家族の「今日いる」をやさしく確認できます。
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>今の状態</Text>
          <Text style={styles.metaText}>
            現在は見守りプラン未加入です。見守り機能は有料プラン加入後にご利用いただけます。
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>見守りプランでできること</Text>
          <Text style={styles.metaText}>
            ・ 相手が「今日いる」かをそっと把握できます
          </Text>
          <Text style={styles.metaText}>
            ・ 反応がないときは段階的にやさしく通知します
          </Text>
          <Text style={styles.metaText}>
            ・ 最終段階では登録された緊急連絡先にアクセスできます
          </Text>
          {subscriptionCopy ? (
            <>
              <View style={styles.planBox}>
                <Text style={styles.planName}>{subscriptionCopy.planName}</Text>
                <Text style={styles.planPrice}>{subscriptionCopy.priceDisplay}</Text>
                <Text style={styles.metaText}>{subscriptionCopy.freeTrial}</Text>
              </View>
            </>
          ) : null}
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              router.push('/(tabs)/settings/subscription-info' as never);
            }}
          >
            <Text style={styles.primaryButtonLabel}>見守りプランの詳細を見る</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              router.push('/(tabs)/settings/subscription-management' as never);
            }}
          >
            <Text style={styles.secondaryButtonLabel}>サブスク管理へ</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const actionableRelationships = relationships.filter(
    (item) => item.status === 'active' || item.status === 'pending',
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: '#f6f1e7',
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
  listCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fcfaf4',
    borderWidth: 1,
    borderColor: '#e2dccf',
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
    borderColor: colors.border,
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ebe3d6',
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
    backgroundColor: '#eef5f1',
    gap: 4,
  },
  contactTitle: {
    fontWeight: '700',
    color: colors.ink,
  },
  planBox: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#eef5f1',
    gap: 4,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  planPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accentStrong,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
