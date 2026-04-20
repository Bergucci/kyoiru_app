import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../src/ui/theme';

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.updated}>最終更新日：2026年4月20日</Text>
        <Text style={styles.body}>
          Kyoiru（以下「本サービス」）は、利用者のプライバシーを尊重し、個人情報の保護に努めます。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>1. 取得する情報</Text>
        <Text style={styles.body}>
          本サービスは以下の情報を取得します。{'\n\n'}
          ・メールアドレス、パスワード（メール登録の場合）{'\n'}
          ・SNSアカウント情報（LINE・Apple・Google でのログイン時）{'\n'}
          ・表示名・ユーザーID・プロフィール画像{'\n'}
          ・チェックイン・気分スタンプ等の利用ログ{'\n'}
          ・デバイスのプッシュ通知トークン
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2. 利用目的</Text>
        <Text style={styles.body}>
          取得した情報は以下の目的で利用します。{'\n\n'}
          ・サービスの提供・運営{'\n'}
          ・友達・見守り機能の実現{'\n'}
          ・プッシュ通知の配信{'\n'}
          ・不正利用の防止・セキュリティ向上{'\n'}
          ・サービス改善のための統計分析
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>3. 第三者提供</Text>
        <Text style={styles.body}>
          法令に基づく場合を除き、利用者の同意なく第三者に個人情報を提供しません。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>4. データの保管・削除</Text>
        <Text style={styles.body}>
          アカウント削除を行うと、関連するすべての個人データを削除します。一部のデータは法的義務により一定期間保持する場合があります。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>5. お問い合わせ</Text>
        <Text style={styles.body}>
          プライバシーに関するご質問は、設定画面の「ヘルプ・お問い合わせ」よりご連絡ください。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: colors.pageBg,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  updated: {
    fontSize: 12,
    color: colors.hint,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
});
