import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../src/ui/theme';

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.updated}>最終更新日：2026年4月20日　施行日：2026年4月20日</Text>
        <Text style={styles.body}>
          株式会社corecty（以下「当社」）は、当社が提供するスマートフォンアプリケーション「Kyoiru」（以下「本サービス」）において、利用者の個人情報を適切に取り扱うため、個人情報の保護に関する法律（以下「個人情報保護法」）その他関連法令を遵守し、以下のプライバシーポリシー（以下「本ポリシー」）を定めます。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第1条　事業者情報</Text>
        <Text style={styles.body}>
          事業者名：株式会社corecty{'\n'}
          代表者：加藤優介{'\n'}
          所在地：〒154-0024 東京都世田谷区三軒茶屋2丁目11-14{'\n'}
          お問い合わせ：kyoiru.app@gmail.com
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第2条　取得する個人情報の項目</Text>
        <Text style={styles.body}>
          当社は、本サービスの提供にあたり、以下の個人情報を取得します。{'\n\n'}
          【利用者が直接提供する情報】{'\n'}
          ・氏名または表示名（ニックネーム）{'\n'}
          ・メールアドレス（メールアドレス登録の場合）{'\n'}
          ・パスワード（ハッシュ化して保存）{'\n'}
          ・プロフィール画像{'\n\n'}
          【ソーシャルログイン連携により取得する情報】{'\n'}
          ・LINE、Apple ID、Googleアカウントから提供されるプロフィール情報（表示名、メールアドレス、識別子）{'\n\n'}
          【本サービスの利用を通じて自動的に取得する情報】{'\n'}
          ・チェックイン情報・気分スタンプ等の投稿ログ{'\n'}
          ・位置情報（利用者が明示的に許可した場合のみ）{'\n'}
          ・プッシュ通知トークン{'\n'}
          ・デバイス情報（OS種別・バージョン、デバイスID）{'\n'}
          ・アクセスログ（接続日時、IPアドレス）{'\n'}
          ・アプリの利用状況・操作ログ（クラッシュレポートを含む）
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第3条　個人情報の利用目的</Text>
        <Text style={styles.body}>
          取得した個人情報は、以下の目的の範囲内で利用します。{'\n\n'}
          （1）本サービスの提供・運営・維持・改善{'\n'}
          （2）利用者の認証およびアカウント管理{'\n'}
          （3）友達機能・見守り機能の実現（チェックイン情報の共有など）{'\n'}
          （4）プッシュ通知の配信{'\n'}
          （5）サブスクリプション管理および決済処理{'\n'}
          （6）利用者からのお問い合わせ対応{'\n'}
          （7）不正利用の検知・防止・セキュリティ確保{'\n'}
          （8）サービスに関する重要なお知らせの送付{'\n'}
          （9）利用状況の分析・統計処理によるサービス品質の向上{'\n'}
          （10）法令に基づく対応
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第4条　第三者提供</Text>
        <Text style={styles.body}>
          当社は、以下のいずれかに該当する場合を除き、利用者の同意を得ずに個人情報を第三者に提供しません。{'\n\n'}
          （1）法令に基づく場合{'\n'}
          （2）人の生命、身体または財産の保護のために必要がある場合であって、利用者の同意を得ることが困難な場合{'\n'}
          （3）公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、利用者の同意を得ることが困難な場合{'\n'}
          （4）国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第5条　業務委託先への提供</Text>
        <Text style={styles.body}>
          当社は、本サービスの運営に必要な範囲で、個人情報の取り扱いを外部の業務委託先に委託する場合があります。この場合、当社は委託先に対し必要かつ適切な監督を行います。{'\n\n'}
          主な利用サービス・委託先：{'\n'}
          ・Amazon Web Services（インフラ基盤）{'\n'}
          ・Apple Inc.（決済・プッシュ通知）{'\n'}
          ・Google LLC（決済・プッシュ通知・ログイン認証）{'\n'}
          ・LINE株式会社（ログイン認証）{'\n'}
          ・Expo / Sentry（クラッシュレポート・アプリ配信）
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第6条　位置情報の取り扱い</Text>
        <Text style={styles.body}>
          本サービスは、見守り機能の提供のために位置情報を利用します。位置情報の取得はOSの権限設定で利用者が許可した場合に限り行います。位置情報は本サービスの機能提供目的以外に利用しません。利用者はOSの設定からいつでも位置情報の提供を停止できます。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第7条　未成年者の個人情報</Text>
        <Text style={styles.body}>
          本サービスは13歳以上を対象としています。13歳未満の方は本サービスをご利用いただけません。13歳以上18歳未満の方は、保護者の同意を得た上でご利用ください。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第8条　安全管理措置</Text>
        <Text style={styles.body}>
          当社は、個人情報の漏えい・滅失・毀損の防止のため、以下の安全管理措置を講じます。{'\n\n'}
          ・通信の暗号化（TLS）{'\n'}
          ・パスワードのハッシュ化（平文保存禁止）{'\n'}
          ・アクセス権限の管理・制限{'\n'}
          ・定期的なセキュリティレビュー{'\n'}
          ・不正アクセス検知の仕組みの整備
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第9条　保存期間と削除</Text>
        <Text style={styles.body}>
          当社は、利用目的の達成に必要な期間、個人情報を保存します。利用者がアカウント削除を実行した場合、関連するすべての個人情報を速やかに削除します。ただし、以下の場合は法令の定める期間、保存する場合があります。{'\n\n'}
          ・法令上の義務がある場合{'\n'}
          ・紛争・問い合わせ対応のために必要な場合（最長1年間）{'\n'}
          ・不正利用防止のために必要な場合
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第10条　開示・訂正・削除等のご請求</Text>
        <Text style={styles.body}>
          利用者は、当社が保有する自己の個人情報について、個人情報保護法に基づき以下の請求を行うことができます。{'\n\n'}
          ・利用目的の通知{'\n'}
          ・開示（第三者提供記録を含む）{'\n'}
          ・内容の訂正・追加・削除{'\n'}
          ・利用の停止・消去{'\n'}
          ・第三者への提供の停止{'\n\n'}
          ご請求は下記お問い合わせ先までメールにてご連絡ください。本人確認を行った上で、法令の定める期間内（原則14日以内）に対応いたします。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第11条　Cookie・分析ツールの利用</Text>
        <Text style={styles.body}>
          本サービス（アプリ）はCookieを直接使用しませんが、サービス品質向上のためクラッシュレポートや利用状況の分析ツールを利用する場合があります。収集される情報は統計的処理を行い、個人を特定する目的では利用しません。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第12条　プライバシーポリシーの変更</Text>
        <Text style={styles.body}>
          当社は、法令の変更またはサービス内容の変更等により、本ポリシーを変更することがあります。重要な変更を行う場合は、アプリ内通知またはメール等の方法でご連絡します。変更後のポリシーはアプリ内に掲載した時点で効力を生じます。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第13条　お問い合わせ</Text>
        <Text style={styles.body}>
          個人情報の取り扱いに関するご質問・ご要望は、下記までご連絡ください。{'\n\n'}
          事業者名：株式会社corecty{'\n'}
          担当：個人情報保護担当{'\n'}
          メールアドレス：kyoiru.app@gmail.com{'\n\n'}
          お問い合わせへの回答は、内容を確認の上、14日以内を目安にご連絡いたします。
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
