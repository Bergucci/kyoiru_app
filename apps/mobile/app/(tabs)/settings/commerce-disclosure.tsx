import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../src/ui/theme';

const items: [string, string][] = [
  ['販売事業者', '株式会社corecty'],
  ['代表者名', '加藤優介'],
  ['所在地', '〒154-0024 東京都世田谷区三軒茶屋2丁目11-14'],
  ['電話番号', '080-2058-8901\n受付時間：平日10:00〜18:00 / 土日祝日・年末年始を除く'],
  ['メールアドレス', 'kyoiru.app@gmail.com'],
  ['販売URL', 'App Store / Google Play（各ストアの本サービスページ）'],
  ['販売価格', '各サブスクリプションプランの料金はアプリ内の購入画面に税込み価格で表示します。\n（料金はApp Store / Google Play の表示価格に従います。）'],
  ['販売価格以外の費用', '通信料・パケット代は利用者のご負担となります。'],
  ['支払方法', 'Apple App Store の決済システム（iOS端末）\nGoogle Play の決済システム（Android端末）\n※クレジットカードその他各ストアが定める支払方法をご利用いただけます。'],
  ['支払時期', '各ストアの規定に従います。\nサブスクリプションは初回購入時に課金され、以降は更新期間ごとに自動課金されます。'],
  ['サービスの提供時期', '決済確認後、即時にご利用いただけます。'],
  ['サブスクリプションの更新', '有料プランは自動更新サブスクリプションです。\n現在の更新期間終了の24時間前までにキャンセルしない限り、自動的に更新されます。'],
  ['解約・キャンセル方法', '各ストアのサブスクリプション管理画面から解約手続きを行ってください。\n・iOS：「設定」→「Apple ID」→「サブスクリプション」\n・Android：「Google Play」→「定期購入」\nキャンセル後も当該課金期間の終了まで機能をご利用いただけます。'],
  ['返品・返金', 'デジタルコンテンツ・サービスの性質上、原則として返金・キャンセルは承っておりません。\nただし、各ストアの返金ポリシーに従った返金請求はその限りではありません。\n詳細は各ストアのサポートページをご確認ください。'],
  ['動作環境', 'iOS 16.0以上 / Android 10以上を推奨します。\n対応状況はApp Store / Google Playの本サービスページをご確認ください。'],
  ['サービス提供期間', '当社がサービスを継続して提供する期間とします。\nサービスを終了する場合は事前にアプリ内または電子メール等でお知らせします。'],
];

export default function CommerceDisclosureScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.intro}>
          特定商取引に関する法律第11条（通信販売についての広告）および第42条（役務提供契約）に基づき、以下の通り表示します。
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

      <View style={styles.card}>
        <Text style={styles.label}>お問い合わせ先</Text>
        <Text style={styles.value}>
          本表記に関するご質問・ご不明点は下記までご連絡ください。{'\n'}
          メール：kyoiru.app@gmail.com{'\n'}
          電話：080-2058-8901{'\n'}
          受付時間：平日10:00〜18:00（土日祝日・年末年始を除く）
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
    gap: 0,
  },
  intro: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
  row: {
    paddingVertical: 14,
    gap: 6,
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
