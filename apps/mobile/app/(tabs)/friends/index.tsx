import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiRequest, toApiErrorMessage } from '../../../src/lib/api';
import { formatDateTime } from '../../../src/lib/format';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';

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
  if (url) {
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: radius }} />;
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
      void prepareInvite(false);
    }
  }, [session?.accessToken]);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const currentSession = session;

  async function loadFriendsTab(isPullRefresh = false) {
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [friendsResponse, incoming, outgoing] = await Promise.all([
        apiRequest<FriendSummary[]>('/friends', {
          token: currentSession.accessToken,
        }),
        apiRequest<FriendRequestListItem[]>('/friends/requests/incoming', {
          token: currentSession.accessToken,
        }),
        apiRequest<FriendRequestListItem[]>('/friends/requests/outgoing', {
          token: currentSession.accessToken,
        }),
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
      const results = await apiRequest<UserSearchResult[]>(
        `/friends/search?userId=${encodeURIComponent(searchQuery.trim())}`,
        {
          token: currentSession.accessToken,
        },
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
      await apiRequest('/friends/requests', {
        method: 'POST',
        token: currentSession.accessToken,
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
      await apiRequest(`/friends/requests/${requestId}/accept`, {
        method: 'POST',
        token: currentSession.accessToken,
      });
      await loadFriendsTab();
    } catch (error) {
      Alert.alert('承認に失敗しました', toApiErrorMessage(error));
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      await apiRequest(`/friends/requests/${requestId}/reject`, {
        method: 'POST',
        token: currentSession.accessToken,
      });
      await loadFriendsTab();
    } catch (error) {
      Alert.alert('拒否に失敗しました', toApiErrorMessage(error));
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      await apiRequest(`/friends/requests/${requestId}/cancel`, {
        method: 'POST',
        token: currentSession.accessToken,
      });
      await loadFriendsTab();
    } catch (error) {
      Alert.alert('取消に失敗しました', toApiErrorMessage(error));
    }
  };

  const prepareInvite = async (reissue = false) => {
    try {
      setPreparingInvite(true);
      const response = await apiRequest<FriendInviteLinkResponse>(
        reissue ? '/friends/invite-links/reissue' : '/friends/invite-links',
        {
          method: 'POST',
          token: currentSession.accessToken,
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
    <ScrollView
      style={styles.screen}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadFriendsTab(true)}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>友達</Text>
          <Text style={styles.heroText}>
            「今日いる」を共有できる相手をここで管理します。
          </Text>
        </View>

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
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => {
                    void Share.share({ message: inviteLink.shareText });
                  }}
                >
                  <Text style={styles.primaryButtonLabel}>リンクを共有</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    void Share.share({ message: inviteLink.inviteUrl });
                  }}
                >
                  <Text style={styles.secondaryButtonLabel}>コピー</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>友達追加</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="userId を入力"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Pressable
            style={[styles.primaryButton, searching && styles.buttonDisabled]}
            disabled={searching}
            onPress={() => {
              void searchUsers();
            }}
          >
            <Text style={styles.primaryButtonLabel}>検索する</Text>
          </Pressable>
          {searching ? <ActivityIndicator color={colors.accent} /> : null}
          {searchResults.map((result) => (
            <View key={result.userId} style={styles.listCard}>
              <View style={styles.memberRow}>
                <Avatar url={result.avatarUrl} name={result.displayName || result.userId} />
                <View style={styles.memberBody}>
                  <Text style={styles.listTitle}>{result.displayName}</Text>
                  <Text style={styles.metaText}>@{result.userId}</Text>
                </View>
              </View>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  void sendRequest(result.userId);
                }}
              >
                <Text style={styles.secondaryButtonLabel}>友達申請を送る</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>友達一覧</Text>
          {loading ? (
            <ActivityIndicator color={colors.accent} />
          ) : friends.length === 0 ? (
            <Text style={styles.metaText}>まだ友達は追加されていません。</Text>
          ) : (
            friends.map((item) => (
              <Pressable
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
                  <Avatar url={item.friend.avatarUrl} name={item.friend.displayName || item.friend.userId} />
                  <View style={styles.memberBody}>
                    <Text style={styles.listTitle}>{item.friend.displayName}</Text>
                    <Text style={styles.memberStatus}>
                      {item.latestCheckinAt ? '今日反応済み' : 'まだ未反応'}
                    </Text>
                    <Text style={styles.memberMetaLine}>
                      {formatFriendActivity(item)}
                      {item.latestMood ? ` ／ 気分: ${item.latestMood}` : ''}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
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
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => {
                      void acceptRequest(request.requestId);
                    }}
                  >
                    <Text style={styles.primaryButtonLabel}>承認</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => {
                      void rejectRequest(request.requestId);
                    }}
                  >
                    <Text style={styles.secondaryButtonLabel}>拒否</Text>
                  </Pressable>
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
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    void cancelRequest(request.requestId);
                  }}
                >
                  <Text style={styles.secondaryButtonLabel}>取消</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
    </ScrollView>
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
});
