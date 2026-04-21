import { Redirect, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { resolveMediaUrl, toApiErrorMessage } from '../../../src/lib/api';
import { useApi } from '../../../src/lib/use-api';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';
import { KeyboardAwareScrollView } from '../../../src/ui/KeyboardAwareScrollView';
import { PressableScale } from '../../../src/components';

interface FriendSummary {
  friendshipId: string;
  friend: { userId: string; displayName: string; avatarUrl: string | null };
}

interface GroupSummary {
  groupId: string;
}

export default function CreateGroupScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { session } = useSession();

  const [step, setStep] = useState<1 | 2>(1);
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<'friends' | 'family'>('friends');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (step === 1) {
      navigation.setOptions({
        title: '友達を選択',
        headerRight: () => (
          <PressableScale onPress={goNext} hitSlop={12}>
            <Text style={styles.headerButton}>次へ</Text>
          </PressableScale>
        ),
      });
    } else {
      navigation.setOptions({
        title: 'グループを作成',
        headerRight: undefined,
      });
    }
  }, [step]);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const { request } = useApi();

  useEffect(() => {
    void (async () => {
      try {
        setLoadingFriends(true);
        const res = await request<FriendSummary[]>('/friends', {});
        setFriends(res);
      } catch (error) {
        Alert.alert('友達の取得に失敗しました', toApiErrorMessage(error));
      } finally {
        setLoadingFriends(false);
      }
    })();
  }, []);

  const toggleFriend = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const goNext = () => {
    setStep(2);
    setSearch('');
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('入力不足', 'グループ名を入力してください。');
      return;
    }
    try {
      setCreating(true);
      const response = await request<GroupSummary>('/groups', {
        method: 'POST',
        body: {
          name: groupName.trim(),
          type: groupType,
          initialMemberUserIds: Array.from(selectedIds),
        },
      });
      router.replace({
        pathname: '/(tabs)/home/groups/[groupId]',
        params: { groupId: response.groupId },
      } as never);
    } catch (error) {
      Alert.alert('グループ作成に失敗しました', toApiErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const selectedFriends = friends.filter((f) => selectedIds.has(f.friend.userId));
  const filteredFriends = friends.filter(
    (f) =>
      !selectedIds.has(f.friend.userId) &&
      f.friend.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Step 1: 友達選択 ──────────────────────────────────────────
  if (step === 1) {
    return (
      <View style={styles.flex}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="名前で検索"
            placeholderTextColor={colors.hint}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>

        {selectedFriends.length > 0 && (
          <View style={styles.chipRow}>
            {selectedFriends.map((f) => (
              <PressableScale
                key={f.friendshipId}
                style={styles.chip}
                onPress={() => { toggleFriend(f.friend.userId); }}
              >
                <Text style={styles.chipText}>{f.friend.displayName}</Text>
                <Text style={styles.chipRemove}>✕</Text>
              </PressableScale>
            ))}
          </View>
        )}

        {loadingFriends ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={colors.accent} />
        ) : friends.length === 0 ? (
          <Text style={styles.emptyText}>友達を追加するとメンバーに招待できます。</Text>
        ) : filteredFriends.length === 0 && search ? (
          <Text style={styles.emptyText}>「{search}」に一致する友達がいません</Text>
        ) : (
          <FlatList
            data={filteredFriends}
            keyExtractor={(item) => item.friendshipId}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <PressableScale
                style={styles.friendRow}
                onPress={() => {
                  toggleFriend(item.friend.userId);
                  setSearch('');
                }}
              >
                <View style={styles.friendAvatar}>
                  {resolveMediaUrl(item.friend.avatarUrl) ? (
                    <Image
                      source={{ uri: resolveMediaUrl(item.friend.avatarUrl) }}
                      style={styles.friendAvatarImage}
                    />
                  ) : (
                    <Text style={styles.friendAvatarText}>
                      {item.friend.displayName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={styles.friendName}>{item.friend.displayName}</Text>
                {selectedIds.has(item.friend.userId) && (
                  <View style={styles.checkMark}>
                    <Text style={styles.checkMarkText}>✓</Text>
                  </View>
                )}
              </PressableScale>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        <PressableScale style={styles.nextButton} onPress={goNext}>
          <Text style={styles.nextButtonLabel}>
            次へ{selectedFriends.length > 0 ? `（${selectedFriends.length}人選択中）` : ''}
          </Text>
        </PressableScale>
      </View>
    );
  }

  // ── Step 2: グループ名・種別入力 ──────────────────────────────
  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.step2}>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>グループ名</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="グループ名を入力"
          placeholderTextColor={colors.hint}
          autoFocus
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>グループの種類</Text>
        <View style={styles.segment}>
          <PressableScale
            style={[styles.segmentBtn, groupType === 'friends' && styles.segmentBtnActive]}
            onPress={() => { setGroupType('friends'); }}
          >
            <Text style={[styles.segmentLabel, groupType === 'friends' && styles.segmentLabelActive]}>
              友人・恋人
            </Text>
          </PressableScale>
          <PressableScale
            style={[styles.segmentBtn, groupType === 'family' && styles.segmentBtnActive]}
            onPress={() => { setGroupType('family'); }}
          >
            <Text style={[styles.segmentLabel, groupType === 'family' && styles.segmentLabelActive]}>
              家族
            </Text>
          </PressableScale>
        </View>
      </View>

      {selectedFriends.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>招待するメンバー（{selectedFriends.length}人）</Text>
          <View style={styles.chipRowStatic}>
            {selectedFriends.map((f) => (
              <View key={f.friendshipId} style={styles.chipStatic}>
                <Text style={styles.chipText}>{f.friend.displayName}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <PressableScale
        hapticStyle="medium"
        style={[styles.primaryButton, creating && styles.disabled]}
        disabled={creating}
        onPress={() => { void createGroup(); }}
      >
        {creating ? (
          <ActivityIndicator color="#fffdf8" />
        ) : (
          <Text style={styles.primaryButtonLabel}>グループを作成する</Text>
        )}
      </PressableScale>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.pageBg },
  headerButton: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 16,
    marginRight: 4,
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.nestedSurface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accentTint,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.accentStrong },
  chipRemove: { fontSize: 11, color: colors.accent, fontWeight: '700' },
  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 14,
    marginTop: 80,
    paddingHorizontal: 32,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    gap: 12,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarImage: { width: 44, height: 44, borderRadius: 22 },
  friendAvatarText: { fontSize: 18, fontWeight: '700', color: colors.accentStrong },
  friendName: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.ink },
  checkMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMarkText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.nestedBorder, marginLeft: 76 },
  nextButton: {
    margin: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: colors.accent,
  },
  nextButtonLabel: { color: '#fffdf8', fontWeight: '700', fontSize: 16 },
  step2: { padding: 20, gap: 16, backgroundColor: colors.pageBg },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.ink },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
  },
  segmentBtnActive: { backgroundColor: colors.white },
  segmentLabel: { color: colors.muted, fontWeight: '600' },
  segmentLabelActive: { color: colors.ink },
  chipRowStatic: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipStatic: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: colors.accent,
  },
  primaryButtonLabel: { color: '#fffdf8', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.6 },
});
