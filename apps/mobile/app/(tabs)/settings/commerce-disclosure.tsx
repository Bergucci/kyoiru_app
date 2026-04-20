import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../src/ui/theme';

const items: [string, string][] = [
  ['販売事業者', '（事業者名をここに記載）'],
  ['運営責任者', '（氏名をここに記載）'],
  ['所在地', '〒000-0000 東京都（住所をここに記載）'],
  ['電話番号', 'お問い合わせフォームよりご連絡ください'],
  ['メールアドレス', '設定画面の「ヘルプ・お問い合わせ」よりご連絡ください'],
  ['販売価格', '各プランのサブスクリプション料金（アプリ内に表示）'],
  ['支払方法', 'Apple App Store / Google Play の決済システムによる支払い'],
  ['支払時期', '各ストアの規定に従います'],
  ['サービス提供時期', '決済確認後、即時'],
  ['返品・キャンセル', 'デジタルコンテンツの性質上、原則として返金・キャンセルは承っておりません。各ストアの規定に従います。'],
];

export default function CommerceDisclosureScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.intro}>
          特定商取引法第11条に基づき、以下の通り表示します。
        </Text>
      </View>

      <View style={styles.card}>
        {items.map(([label, value], index) => (
          <View key={label} style={[styles.row, index < items.length - 1 && styles.rowBorder]}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
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
    gap: 0,
  },
  intro: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
  row: {
    paddingVertical: 14,
    gap: 4,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.nestedBorder,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  value: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
});
