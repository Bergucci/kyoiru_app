import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { CheckinPulseDot, Mascot, ScreenHeader, TodayHereBadge, PressableScale } from '../../../src/components';
import { resolveMediaUrl, toApiErrorMessage } from '../../../src/lib/api';
import { useApi } from '../../../src/lib/use-api';
import { formatDateTime } from '../../../src/lib/format';
import { useSession } from '../../../src/session/session-context';
import { KeyboardAwareScrollView } from '../../../src/ui/KeyboardAwareScrollView';
import { colors, spacing, typography } from '../../../src/ui/theme';

interface FriendSummary {
  friendshipId: string;
  friendedAt: string;
  latestCheckinAt?: string | null;
  latestMood?: string | null;
  friend: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface UserSearchResult {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface FriendRequestListItem {
  requestId: string;
  from: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  };
  to: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  };
  status: string;
  createdAt: string;
}

interface FriendInviteLinkResponse {
  token: string;
  invitePath: string;
  inviteUrl: string;
  expiresAt: string;
  shareText: string;
  lineShareUrl: string;
}

function getInitial(value: string | null | undefined) {
  return (value?.trim().charAt(0) || '友').toUpperCase();
}

function Avatar({ url, name, size = 44 }: { url: string | null; name: string; size?: number }) {
  const radius = size / 2;
  const resolved = resolveMediaUrl(url);
  if (resolved) {
    return <Image source={{ uri: resolved }} style={{ width: size, height: size, borderRadius: radius }} />;
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: radius }]}>
      <Text style={styles.avatarLabel}>{getInitial(name)}</Text>
    </View>
  );
}

function formatFriendActivity(item: FriendSummary) {
  if (item.latestCheckinAt) {
    return `今日 ${formatDateTime(item.latestCheckinAt)}`;
  }
  return `最終反応: ${formatDateTime(item.friendedAt)}`;
}

export default function FriendsTabScreen() {
  const { session } = useSession();
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestListItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteLink, setInviteLink] = useState<FriendInviteLinkResponse | null>(null);
  const [preparingInvite, setPreparingInvite] = useState(false);

  useEffect(() => {
    if (session?.accessToken) {
      void loadFriendsTab();
    }
  }, [session?.accessToken]);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const currentSession = session;
  const { request } = useApi();

  async function loadFriendsTab(isPullRefresh = false) {
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [friendsResponse, incoming, outgoing] = await Promise.all([
        request<FriendSummary[]>('/friends', {}),
        request<FriendRequestListItem[]>('/friends/requests/incoming', {}),
        request<FriendRequestListItem[]>('/friends/requests/outgoing', {}),
      ]);
      setFriends(friendsResponse);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (error) {
      Alert.alert('友達タブの取得に失敗しました', toApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await request<UserSearchResult[]>(
        `/friends/search?userId=${encodeURIComponent(searchQuery.trim())}`,
        {},
      );
      setSearchResults(results);
    } catch (error) {
      Alert.alert('ユーザー検索に失敗しました', toApiErrorMessage(error));
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (targetUserId: string) => {
    try {
      await request('/friends/requests', {
        method: 'POST',
        body: { targetUserId },
      });
      setSearchQuery('');
      setSearchResults([]);
      void loadFriendsTab();
    } catch (error) {
      Alert.alert('友達申請に失敗しました', toApiErrorMessage(error));
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      await request(`/friends/requests/${requestId}/accept`, {
        method: 'POST',
      });
      await loadFriendsTab();
    } catch (error) {
      Alert.alert('承認に失敗しました', toApiErrorMessage(error));
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      await request(`/friends/requests/${requestId}/reject`, {
        method: 'POST',
      });
      await loadFriendsTab();
    } catch (error) {
      Alert.alert('拒否に失敗しました', toApiErrorMessage(error));
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      await request(`/friends/requests/${requestId}/cancel`, {
        method: 'POST',
      });
      await loadFriendsTab();
    } catch (error) {
      Alert.alert('取消に失敗しました', toApiErrorMessage(error));
    }
  };

  const prepareInvite = async (reissue = false) => {
    try {
      setPreparingInvite(true);
      const response = await request<FriendInviteLinkResponse>(
        reissue ? '/friends/invite-links/reissue' : '/friends/invite-links',
        {
          method: 'POST',
        },
      );
      setInviteLink(response);
    } catch (error) {
      Alert.alert('招待リンクの準備に失敗しました', toApiErrorMessage(error));
    } finally {
      setPreparingInvite(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      outerStyle={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadFriendsTab(true)}
          tintColor={colors.accent}
        />
      }
    >
      <ScreenHeader title="ともだち" />
      <View style={styles.card}>
          <Text style={styles.sectionTitle}>招待リンク</Text>
          <Text style={styles.metaText}>
            リンクを送ると、相手が承認したところでフレンドになれます。
          </Text>
          {inviteLink ? (
            <>
              <View style={styles.invitePanel}>
                <Text selectable style={styles.inviteUrl}>
                  {inviteLink.inviteUrl}
                </Text>
              </View>
              <View style={styles.actionRow}>
                <PressableScale
                  style={styles.primaryButton}
                  onPress={() => { void Share.share({ message: inviteLink.shareText }); }}
                >
                  <Text style={styles.primaryButtonLabel}>リンクを共有</Text>
                </PressableScale>
                <PressableScale
                  style={styles.secondaryButton}
                  onPress={() => { void Share.share({ message: inviteLink.inviteUrl }); }}
                >
                  <Text style={styles.secondaryButtonLabel}>コピー</Text>
                </PressableScale>
              </View>
              <View style={styles.actionRow}>
                <PressableScale
                  style={[styles.secondaryButton, preparingInvite && styles.buttonDisabled]}
                  disabled={preparingInvite}
                  onPress={() => { void prepareInvite(true); }}
                >
                  <Text style={styles.secondaryButtonLabel}>再発行</Text>
                </PressableScale>
                <PressableScale
                  style={styles.secondaryButton}
                  onPress={() => { setInviteLink(null); }}
                >
                  <Text style={styles.secondaryButtonLabel}>閉じる</Text>
                </PressableScale>
              </View>
            </>
          ) : (
            <PressableScale
              hapticStyle="medium"
              style={[styles.primaryButton, preparingInvite && styles.buttonDisabled]}
              disabled={preparingInvite}
              onPress={() => { void prepareInvite(false); }}
            >
              {preparingInvite ? (
                <ActivityIndicator color="#fffdf8" />
              ) : (
                <Text style={styles.primaryButtonLabel}>招待リンクを作成</Text>
              )}
            </PressableScale>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>友達追加</Text>
          <TextInput
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (!text.trim()) setSearchResults([]);
            }}
            placeholder="userId を入力"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <PressableScale
            style={[styles.primaryButton, searching && styles.buttonDisabled]}
            disabled={searching}
            onPress={() => {
              void searchUsers();
            }}
          >
            <Text style={styles.primaryButtonLabel}>検索する</Text>
          </PressableScale>
          {searching ? <ActivityIndicator color={colors.accent} /> : null}
          {searchResults.map((result) => {
            const isFriend = friends.some((f) => f.friend.userId === result.userId);
            const isPending = outgoingRequests.some((r) => r.to.userId === result.userId);
            const isSelf = result.userId === currentSession.user.userId;
            return (
              <View key={result.userId} style={styles.listCard}>
                <View style={styles.memberRow}>
                  <Avatar url={result.avatarUrl} name={result.displayName || result.userId} />
                  <View style={styles.memberBody}>
                    <Text style={styles.listTitle}>{result.displayName}</Text>
                    <Text style={styles.metaText}>@{result.userId}</Text>
                  </View>
                </View>
                {isSelf ? (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>自分のアカウント</Text>
                  </View>
                ) : isFriend ? (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>すでに友達です</Text>
                  </View>
                ) : isPending ? (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>申請済み</Text>
                  </View>
                ) : (
                  <PressableScale
                    hapticStyle="medium"
                    style={styles.secondaryButton}
                    onPress={() => { void sendRequest(result.userId); }}
                  >
                    <Text style={styles.secondaryButtonLabel}>友達申請を送る</Text>
                  </PressableScale>
                )}
              </View>
            );
          })}
        </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>友達一覧</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : friends.length === 0 ? (
          <View style={styles.emptyState}>
            <Mascot size={120} variant="wave" />
            <Text style={styles.emptyStateText}>
              ともだちを招待して、今日いる を届けよう
            </Text>
          </View>
        ) : (
          friends.map((item) => {
            const checkedInToday = !!item.latestCheckinAt;

            return (
              <PressableScale
                key={item.friendshipId}
                style={styles.listCard}
                onPress={() => {
                  Alert.alert(
                    item.friend.displayName,
                    [`@${item.friend.userId}`, `友達になった日: ${formatDateTime(item.friendedAt)}`].join(
                      '\n',
                    ),
                  );
                }}
              >
                <View style={styles.memberRow}>
                  <View style={styles.avatarWrapper}>
                    <Avatar
                      url={item.friend.avatarUrl}
                      name={item.friend.displayName || item.friend.userId}
                    />
                    {checkedInToday ? (
                      <View pointerEvents="none" style={styles.pulseAnchor}>
                        <CheckinPulseDot />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.memberBody}>
                    <View style={styles.nameRow}>
                      <Text style={styles.listTitle}>{item.friend.displayName}</Text>
                      {checkedInToday ? <TodayHereBadge /> : null}
                    </View>
                    {!checkedInToday ? (
                      <Text style={styles.memberStatus}>まだ未反応</Text>
                    ) : null}
                    <Text style={styles.memberMetaLine}>
                      {formatFriendActivity(item)}
                      {item.latestMood ? ` ／ 気分: ${item.latestMood}` : ''}
                    </Text>
                  </View>
                </View>
              </PressableScale>
            );
          })
        )}
      </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>受信した申請</Text>
          {loading ? (
            <ActivityIndicator color={colors.accent} />
          ) : incomingRequests.length === 0 ? (
            <Text style={styles.metaText}>現在の申請はありません。</Text>
          ) : (
            incomingRequests.map((request) => (
              <View key={request.requestId} style={styles.listCard}>
                <Text style={styles.listTitle}>{request.from.displayName}</Text>
                <Text style={styles.pendingMetaText}>
                  @{request.from.userId} ／ {formatDateTime(request.createdAt)}
                </Text>
                <View style={styles.actionRow}>
                  <PressableScale
                    hapticStyle="medium"
                    style={styles.primaryButton}
                    onPress={() => {
                      void acceptRequest(request.requestId);
                    }}
                  >
                    <Text style={styles.primaryButtonLabel}>承認</Text>
                  </PressableScale>
                  <PressableScale
                    style={styles.secondaryButton}
                    onPress={() => {
                      void rejectRequest(request.requestId);
                    }}
                  >
                    <Text style={styles.secondaryButtonLabel}>拒否</Text>
                  </PressableScale>
                </View>
              </View>
            ))
          )}
        </View>

        {outgoingRequests.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>送信中の申請</Text>
            {outgoingRequests.map((request) => (
              <View key={request.requestId} style={styles.listCard}>
                <Text style={styles.listTitle}>{request.to.displayName}</Text>
                <Text style={styles.pendingMetaText}>
                  @{request.to.userId} ／ {formatDateTime(request.createdAt)} に送信
                </Text>
                <PressableScale
                  style={styles.secondaryButton}
                  onPress={() => {
                    void cancelRequest(request.requestId);
                  }}
                >
                  <Text style={styles.secondaryButtonLabel}>取消</Text>
                </PressableScale>
              </View>
            ))}
          </View>
        ) : null}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: colors.pageBg,
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
  pendingMetaText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  memberRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  pulseAnchor: {
    bottom: -2,
    position: 'absolute',
    right: -2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  avatarLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accentStrong,
  },
  memberBody: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberStatus: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  memberMetaLine: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  listCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.nestedSurface,
    borderWidth: 1,
    borderColor: colors.nestedBorder,
    gap: 6,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.accent,
    flexGrow: 1,
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
    flexGrow: 1,
  },
  secondaryButtonLabel: {
    color: colors.ink,
    fontWeight: '700',
  },
  invitePanel: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.accentTint,
  },
  inviteUrl: {
    color: colors.accentStrong,
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  statusBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: colors.nestedBorder,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
});
