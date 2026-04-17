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
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';

interface BlockListItem {
  blockId: string;
  blockedAt: string;
  target: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export default function BlocksScreen() {
  const { session } = useSession();
  const [blocks, setBlocks] = useState<BlockListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.accessToken) {
      void loadBlocks();
    }
  }, [session?.accessToken]);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const currentSession = session;

  async function loadBlocks() {
    try {
      setLoading(true);
      const response = await apiRequest<BlockListItem[]>('/blocks', {
        token: currentSession.accessToken,
      });
      setBlocks(response);
    } catch (error) {
      Alert.alert('block 一覧の取得に失敗しました', toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const unblock = async (blockId: string) => {
    try {
      await apiRequest(`/blocks/${blockId}`, {
        method: 'DELETE',
        token: currentSession.accessToken,
      });
      await loadBlocks();
    } catch (error) {
      Alert.alert('block 解除に失敗しました', toApiErrorMessage(error));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>block 一覧</Text>
        <Text style={styles.body}>
          解除後も友達関係や見守り設定は自動復元されません。
        </Text>
      </View>

      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : blocks.length === 0 ? (
          <Text style={styles.body}>現在 block している相手はいません。</Text>
        ) : (
          blocks.map((block) => (
            <View key={block.blockId} style={styles.blockRow}>
              <View style={styles.blockBody}>
                <Text style={styles.blockName}>{block.target.displayName}</Text>
                <Text style={styles.body}>@{block.target.userId}</Text>
              </View>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  void unblock(block.blockId);
                }}
              >
                <Text style={styles.secondaryLabel}>解除</Text>
              </Pressable>
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
  blockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#f9f4eb',
  },
  blockBody: {
    flex: 1,
    gap: 4,
  },
  blockName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#ebe3d6',
  },
  secondaryLabel: {
    color: colors.ink,
    fontWeight: '700',
  },
});
