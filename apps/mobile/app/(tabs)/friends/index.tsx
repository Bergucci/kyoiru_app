import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
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

export default function FriendsTabScreen() {
  const { session } = useSession();
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestListItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
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

  async function loadFriendsTab() {
    try {
      setLoading(true);
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
      Alert.alert('申請を送信しました', `@${targetUserId} へ友達申請を送りました。`);
      await loadFriendsTab();
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>友達</Text>
        <Text style={styles.heroText}>
          既存友達、友達追加、承認待ち、招待リンク共有をここから扱えます。
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>友達一覧</Text>
          <Pressable onPress={() => void loadFriendsTab()}>
            <Text style={styles.refreshText}>再読込</Text>
          </Pressable>
        </View>
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
              <Text style={styles.listTitle}>{item.friend.displayName}</Text>
              <Text style={styles.metaText}>@{item.friend.userId}</Text>
              <Text style={styles.metaText}>
                友達になった日: {formatDateTime(item.friendedAt)}
              </Text>
            </Pressable>
          ))
        )}
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
            <Text style={styles.listTitle}>{result.displayName}</Text>
            <Text style={styles.metaText}>@{result.userId}</Text>
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
        <Text style={styles.sectionTitle}>受信した申請</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : incomingRequests.length === 0 ? (
          <Text style={styles.metaText}>現在の申請はありません。</Text>
        ) : (
          incomingRequests.map((request) => (
            <View key={request.requestId} style={styles.listCard}>
              <Text style={styles.listTitle}>{request.from.displayName}</Text>
              <Text style={styles.metaText}>@{request.from.userId}</Text>
              <Text style={styles.metaText}>
                受信日時: {formatDateTime(request.createdAt)}
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

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>送信中の申請</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : outgoingRequests.length === 0 ? (
          <Text style={styles.metaText}>送信中の申請はありません。</Text>
        ) : (
          outgoingRequests.map((request) => (
            <View key={request.requestId} style={styles.listCard}>
              <Text style={styles.listTitle}>{request.to.displayName}</Text>
              <Text style={styles.metaText}>@{request.to.userId}</Text>
              <Text style={styles.metaText}>
                送信日時: {formatDateTime(request.createdAt)}
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
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>友達追加用リンク</Text>
        <Text style={styles.metaText}>
          LINE 共有や外部共有で使う 30 日 / 1 回限りのリンクです。
        </Text>
        {inviteLink ? (
          <>
            <Text selectable style={styles.inviteUrl}>
              {inviteLink.inviteUrl}
            </Text>
            <Text style={styles.metaText}>
              有効期限: {formatDateTime(inviteLink.expiresAt)}
            </Text>
            <View style={styles.actionRow}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  void Share.share({ message: inviteLink.shareText });
                }}
              >
                <Text style={styles.secondaryButtonLabel}>共有</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  void Linking.openURL(inviteLink.lineShareUrl);
                }}
              >
                <Text style={styles.secondaryButtonLabel}>LINE で送る</Text>
              </Pressable>
            </View>
          </>
        ) : null}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.primaryButton, preparingInvite && styles.buttonDisabled]}
            disabled={preparingInvite}
            onPress={() => {
              void prepareInvite(false);
            }}
          >
            <Text style={styles.primaryButtonLabel}>招待リンクを用意する</Text>
          </Pressable>
          {inviteLink ? (
            <Pressable
              style={[styles.secondaryButton, preparingInvite && styles.buttonDisabled]}
              disabled={preparingInvite}
              onPress={() => {
                void prepareInvite(true);
              }}
            >
              <Text style={styles.secondaryButtonLabel}>再発行</Text>
            </Pressable>
          ) : null}
        </View>
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
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.accentStrong,
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fffdf8',
  },
  heroText: {
    fontSize: 14,
    lineHeight: 21,
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
    fontWeight: '700',
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
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
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
  inviteUrl: {
    color: colors.accentStrong,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
