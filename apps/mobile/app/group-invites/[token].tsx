import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiRequest, toApiErrorMessage } from '../../src/lib/api';
import { useApi } from '../../src/lib/use-api';
import { toGroupTypeLabel } from '../../src/lib/format';
import { useSession } from '../../src/session/session-context';
import { colors } from '../../src/ui/theme';

interface GroupInvitePreview {
  groupId: string;
  groupName: string;
  type: string;
  iconUrl: string | null;
  joinable: boolean;
}

interface GroupInviteJoinResult {
  groupId: string;
  status: string;
}

export default function GroupInviteScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session } = useSession();
  const { request } = useApi();
  const [preview, setPreview] = useState<GroupInvitePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (session?.accessToken && token) {
      void loadPreview();
    }
  }, [token, session?.accessToken]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const response = await request<GroupInvitePreview>(`/group-invites/${token}`, {});
      setPreview(response);
      setErrorText(null);
    } catch (error) {
      setErrorText(toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async () => {
    try {
      setJoining(true);
      const result = await request<GroupInviteJoinResult>(`/group-invites/${token}/join`, {
        method: 'POST',
      });
      router.replace({
        pathname: '/(tabs)/home/groups/[groupId]',
        params: { groupId: result.groupId },
      } as never);
    } catch (error) {
      setErrorText(toApiErrorMessage(error));
    } finally {
      setJoining(false);
    }
  };

  if (!session) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>グループ招待</Text>
          <Text style={styles.body}>
            このリンクを使うにはログインが必要です。ログイン後に再度このリンクを開いてください。
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => { router.replace('/(auth)/login' as never); }}
          >
            <Text style={styles.primaryButtonLabel}>ログイン画面へ</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>グループ招待</Text>

        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : errorText ? (
          <Text style={styles.body}>{errorText}</Text>
        ) : preview ? (
          <>
            <View style={styles.groupInfo}>
              <View style={styles.groupIcon}>
                <Text style={styles.groupIconText}>
                  {preview.groupName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.groupBody}>
                <Text style={styles.groupName}>{preview.groupName}</Text>
                <Text style={styles.body}>{toGroupTypeLabel(preview.type)}</Text>
              </View>
            </View>

            <Text style={styles.body}>
              {preview.joinable
                ? 'このグループに参加しますか？'
                : 'この招待リンクは現在利用できません。'}
            </Text>

            <Pressable
              style={[
                styles.primaryButton,
                (!preview.joinable || joining) && styles.buttonDisabled,
              ]}
              disabled={!preview.joinable || joining}
              onPress={() => { void joinGroup(); }}
            >
              {joining ? (
                <ActivityIndicator color="#fffdf8" />
              ) : (
                <Text style={styles.primaryButtonLabel}>グループに参加する</Text>
              )}
            </Pressable>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.pageBg,
    flexGrow: 1,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  groupIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIconText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.accentStrong,
  },
  groupBody: {
    flex: 1,
    gap: 4,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
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
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
