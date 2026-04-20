import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../src/ui/theme';

export default function TermsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.updated}>最終更新日：2026年4月20日</Text>
        <Text style={styles.body}>
          本規約は、Kyoiru（以下「本サービス」）の利用条件を定めるものです。ご利用前に必ずお読みください。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第1条（利用登録）</Text>
        <Text style={styles.body}>
          本サービスは13歳以上の方がご利用いただけます。登録の際は正確な情報をご入力ください。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第2条（禁止事項）</Text>
        <Text style={styles.body}>
          以下の行為を禁止します。{'\n\n'}
          ・他のユーザーへの嫌がらせ・脅迫行為{'\n'}
          ・虚偽の情報の登録・送信{'\n'}
          ・サービスの不正利用・リバースエンジニアリング{'\n'}
          ・法令・公序良俗に反する行為{'\n'}
          ・その他、当社が不適切と判断する行為
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第3条（サービスの変更・停止）</Text>
        <Text style={styles.body}>
          当社は、事前通知なくサービスの内容を変更、または停止する場合があります。これによって生じた損害について、当社は責任を負いません。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第4条（免責事項）</Text>
        <Text style={styles.body}>
          本サービスは現状有姿で提供されます。サービスの継続性・正確性・完全性を保証するものではありません。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第5条（準拠法・管轄）</Text>
        <Text style={styles.body}>
          本規約は日本法に準拠します。紛争が生じた場合は、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
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
