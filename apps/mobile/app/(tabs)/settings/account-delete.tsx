import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { toApiErrorMessage } from '../../../src/lib/api';
import { useApi } from '../../../src/lib/use-api';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';

const immediateStops = [
  'ログイン停止',
  'refresh token 失効',
  'push 停止',
  '見守り停止',
  '位置収集停止',
];

const retentionSummary = [
  '24時間以内: 位置履歴 / 最終位置 / 通知キュー / push token',
  '30日以内: プロフィール / auth identities / 友達関係 / グループ所属 / 生存報告 / 気分スタンプ / 見守り設定 / 緊急連絡先 / 招待リンク',
  '180日保持: block 履歴 / 緊急連絡先閲覧ログなどの監査ログ',
  '7年保持: billing / refund / tax records',
];

export default function AccountDeleteScreen() {
  const router = useRouter();
  const { session, clearSession } = useSession();
  const [submitting, setSubmitting] = useState(false);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const { request } = useApi();
  const currentSession = session;

  const executeDelete = async () => {
    try {
      setSubmitting(true);
      await request('/account', {
        method: 'DELETE',
      });

      Alert.alert(
        '退会を受け付けました',
        '即時停止を実行し、ローカルセッションを破棄して初期画面へ戻ります。',
        [
          {
            text: 'OK',
            onPress: () => {
              clearSession();
              router.replace('/(auth)/login' as never);
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('退会に失敗しました', toApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>アカウント削除</Text>
      <Text style={styles.subtitle}>
        退会時は即時停止を先に行い、その後の削除は保持期限に沿って進めます。
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>即時停止</Text>
        {immediateStops.map((item) => (
          <Text key={item} style={styles.body}>
            • {item}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>保持期限</Text>
        {retentionSummary.map((item) => (
          <Text key={item} style={styles.body}>
            • {item}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>最終確認</Text>
        <Text style={styles.body}>
          現在ログイン中の @{currentSession.user.userId} のセッションから、そのまま
          `DELETE /account` を実行します。
        </Text>
        <Pressable
          style={[styles.deleteButton, submitting && styles.buttonDisabled]}
          disabled={submitting}
          onPress={() => {
            Alert.alert(
              '退会を実行しますか',
              '退会後はログイン停止、push 停止、見守り停止、位置収集停止を即時実行します。',
              [
                { text: 'キャンセル', style: 'cancel' },
                {
                  text: '退会する',
                  style: 'destructive',
                  onPress: () => {
                    void executeDelete();
                  },
                },
              ],
            );
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff7ee" />
          ) : (
            <Text style={styles.deleteLabel}>退会を実行する</Text>
          )}
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#5b241d',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#7f5a53',
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.danger,
  },
  deleteLabel: {
    color: '#fff7ee',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
