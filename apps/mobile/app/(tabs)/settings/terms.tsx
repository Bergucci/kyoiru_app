import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../src/ui/theme';

export default function TermsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.updated}>最終更新日：2026年4月20日　施行日：2026年4月20日</Text>
        <Text style={styles.body}>
          本利用規約（以下「本規約」）は、株式会社corecty（以下「当社」）が提供するスマートフォンアプリケーション「Kyoiru」（以下「本サービス」）の利用条件を定めるものです。本サービスをご利用になる前に、必ず本規約をお読みいただき、同意した上でご利用ください。本サービスを利用された場合、本規約に同意したものとみなします。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第1条（定義）</Text>
        <Text style={styles.body}>
          本規約において使用する用語の定義は以下のとおりとします。{'\n\n'}
          （1）「利用者」：本サービスを利用するすべての個人{'\n'}
          （2）「アカウント」：本サービスを利用するために登録された利用者の識別情報{'\n'}
          （3）「コンテンツ」：利用者が本サービスに投稿・送信・共有するチェックイン情報、気分スタンプ、テキスト、画像その他一切の情報{'\n'}
          （4）「有料プラン」：月額または年額の料金を支払うことで利用できるサブスクリプション機能
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第2条（利用資格・利用登録）</Text>
        <Text style={styles.body}>
          1. 本サービスは13歳以上の方がご利用いただけます。13歳未満の方の利用は固くお断りします。{'\n\n'}
          2. 13歳以上18歳未満の未成年者は、保護者の同意を得た上でご利用ください。{'\n\n'}
          3. 利用者は、登録情報として真実・正確・最新の情報を入力・登録するものとします。{'\n\n'}
          4. 当社は、以下に該当すると判断した場合、利用登録を拒否または取り消すことができます。{'\n'}
          　・過去に本規約違反等により利用停止または登録抹消された場合{'\n'}
          　・登録情報に虚偽・誤記・記入漏れがある場合{'\n'}
          　・その他、当社が利用登録を適当でないと判断した場合
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第3条（アカウント管理）</Text>
        <Text style={styles.body}>
          1. 利用者は、自己のアカウント情報（パスワード等）を適切に管理・保管する責任を負います。{'\n\n'}
          2. アカウント情報を第三者に譲渡・貸与・共有することはできません。{'\n\n'}
          3. アカウントの不正使用が発覚した場合、または不正使用のおそれがある場合は、直ちに当社にご連絡ください。{'\n\n'}
          4. 第三者によるアカウントの不正使用によって生じた損害について、当社に故意または重大な過失がある場合を除き、当社は責任を負いません。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第4条（サービスの内容）</Text>
        <Text style={styles.body}>
          1. 本サービスは、利用者がチェックインや気分スタンプを通じて現在の状況を友達・見守り相手と共有できるコミュニケーションアプリです。{'\n\n'}
          2. 本サービスが提供する主な機能は以下のとおりです。{'\n'}
          　・チェックイン機能・気分スタンプの投稿・共有{'\n'}
          　・友達追加・友達リスト管理{'\n'}
          　・見守り機能（対象者の安否確認）{'\n'}
          　・プッシュ通知によるリアルタイム通知{'\n\n'}
          3. 一部の機能は有料プランへの加入が必要です。機能の詳細および料金はアプリ内に表示します。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第5条（有料プラン・料金・支払）</Text>
        <Text style={styles.body}>
          1. 有料プランの料金は、Apple App StoreまたはGoogle Play Store（以下「各ストア」）上に表示する金額（消費税込み）とします。{'\n\n'}
          2. 支払いは各ストアの決済システムを通じて行われます。クレジットカードその他各ストアが定める支払方法を利用できます。{'\n\n'}
          3. 有料プランは自動更新サブスクリプションです。更新期間終了の24時間前までにキャンセルしない限り、自動的に更新されます。{'\n\n'}
          4. 更新料金は、更新期間終了の24時間前以内に課金されます。{'\n\n'}
          5. 料金の変更は、次回更新時から適用されます。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第6条（キャンセル・返金）</Text>
        <Text style={styles.body}>
          1. 有料プランのキャンセルは、各ストアのサブスクリプション管理画面から行ってください。{'\n\n'}
          2. キャンセル後も、現在の課金期間終了まで有料プランの機能を利用できます。{'\n\n'}
          3. デジタルコンテンツ・サービスの性質上、原則として料金の返金はいたしません。ただし、各ストアの返金ポリシーに基づく返金請求はその限りではありません。各ストアの規定に従い対応します。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第7条（禁止事項）</Text>
        <Text style={styles.body}>
          利用者は、本サービスの利用にあたり以下の行為を行ってはなりません。{'\n\n'}
          （1）他の利用者に対するハラスメント・誹謗中傷・脅迫・差別的発言{'\n'}
          （2）虚偽・誇大な情報の投稿・拡散{'\n'}
          （3）他者のプライバシーを侵害する行為（無断での位置情報の共有・追跡を含む）{'\n'}
          （4）他者の著作権・商標権・肖像権その他知的財産権を侵害する行為{'\n'}
          （5）本サービスを通じた勧誘・宣伝・広告活動（当社が許可した場合を除く）{'\n'}
          （6）本サービスのリバースエンジニアリング・逆アセンブル・改ざん・複製{'\n'}
          （7）当社または第三者のシステムへの不正アクセス・クラッキング行為{'\n'}
          （8）自動化されたツールやボットを使用したアクセス・操作{'\n'}
          （9）複数アカウントの不正作成・運用{'\n'}
          （10）法令・公序良俗に違反する行為{'\n'}
          （11）犯罪行為に関連する行為または犯罪行為を促進する行為{'\n'}
          （12）未成年者への性的・暴力的コンテンツの提供{'\n'}
          （13）その他、当社が不適切と合理的に判断する行為
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第8条　見守り機能に関する特則</Text>
        <Text style={styles.body}>
          1. 見守り機能は、相手の同意に基づき利用するものです。相手の同意なく見守りを行うことはできません。{'\n\n'}
          2. 見守り機能を通じて得た情報（位置情報・安否情報等）を、目的外に利用・第三者へ提供することを禁じます。{'\n\n'}
          3. 当社は、見守り機能の提供により安全・安心を保証するものではありません。見守り機能はあくまでもコミュニケーション補助ツールであり、緊急時には必ず公的機関（警察・消防等）にご連絡ください。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第9条（コンテンツの権利）</Text>
        <Text style={styles.body}>
          1. 利用者が本サービスに投稿・送信したコンテンツの著作権は、利用者に帰属します。{'\n\n'}
          2. 利用者は当社に対し、本サービスの提供・運営・改善に必要な範囲で、コンテンツを無償で利用する権利（複製・改変・公衆送信等）を許諾するものとします。{'\n\n'}
          3. 利用者は、投稿するコンテンツが第三者の権利を侵害しないことを保証するものとします。権利侵害が生じた場合、利用者が自己の費用と責任において解決するものとします。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第10条（知的財産権）</Text>
        <Text style={styles.body}>
          本サービスのアプリケーション、デザイン、ロゴ、テキスト、機能その他一切のコンテンツに関する著作権・商標権その他の知的財産権は、当社または正当な権利者に帰属します。当社の事前の書面による許可なく、これらを複製・転用・転載・改変することを禁じます。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第11条（利用停止・登録抹消）</Text>
        <Text style={styles.body}>
          1. 当社は、利用者が本規約に違反した場合、または以下に該当すると判断した場合、事前通知なく利用停止・アカウント削除等の措置を講じることができます。{'\n'}
          　・本規約の禁止事項に該当する行為を行った場合{'\n'}
          　・当社または第三者に損害を与えたまたは与えるおそれがある場合{'\n'}
          　・本サービスの運営を妨害した場合{'\n'}
          　・その他、当社が利用継続を不適切と判断した場合{'\n\n'}
          2. 当社が行った利用停止・登録抹消措置について、当社は損害賠償その他一切の責任を負いません。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第12条（サービスの変更・停止・終了）</Text>
        <Text style={styles.body}>
          1. 当社は、サービスの内容を予告なく変更・追加・削除することがあります。{'\n\n'}
          2. 当社は、以下の場合にサービスの全部または一部を停止することがあります。{'\n'}
          　・システムの保守・点検{'\n'}
          　・天災・停電その他不可抗力による障害{'\n'}
          　・その他、当社が必要と判断した場合{'\n\n'}
          3. 当社がサービスを終了する場合、利用者に対して事前にアプリ内または電子メール等により通知します（緊急時を除く）。{'\n\n'}
          4. サービスの変更・停止・終了によって利用者に生じた損害について、当社に故意または重大な過失がある場合を除き、当社は責任を負いません。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第13条（免責事項）</Text>
        <Text style={styles.body}>
          1. 本サービスは現状有姿（as-is）で提供されます。当社は、本サービスの継続性・正確性・完全性・特定目的への適合性について保証しません。{'\n\n'}
          2. 利用者間のトラブルについては、利用者間で解決するものとし、当社はその責任を負いません。{'\n\n'}
          3. 本サービスは見守り・安全の確保を保証するものではありません。緊急時には公的機関（警察・消防等）にご連絡ください。{'\n\n'}
          4. 外部サービス（App Store、Google Play、LINE、Apple、Googleなど）の障害・仕様変更等による影響について、当社は責任を負いません。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第14条（損害賠償）</Text>
        <Text style={styles.body}>
          当社が利用者に対して損害賠償責任を負う場合（故意または重過失による場合）、その賠償額は、当該利用者が直近3ヶ月間に本サービスに対して支払った利用料金の総額を上限とします。ただし、消費者契約法その他強行法規により本条が無効とされる場合はこの限りではありません。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第15条（利用規約の変更）</Text>
        <Text style={styles.body}>
          当社は、以下の場合に本規約を変更することがあります。{'\n\n'}
          （1）本規約の変更が利用者の一般の利益に適合する場合{'\n'}
          （2）本規約の変更が、変更の必要性、変更後の内容の相当性その他の変更に係る事情に照らして合理的な場合{'\n\n'}
          変更の内容・施行日は、アプリ内への掲示または電子メール等により事前にお知らせします。変更後も本サービスをご利用になった場合、変更後の規約に同意したものとみなします。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第16条（分離可能性）</Text>
        <Text style={styles.body}>
          本規約のいずれかの条項が法令により無効または執行不能とされた場合でも、その他の条項は引き続き有効に存続します。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>第17条（準拠法・管轄裁判所）</Text>
        <Text style={styles.body}>
          本規約は日本法に準拠し、日本法に従って解釈されます。本サービスに関して紛争が生じた場合は、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>お問い合わせ</Text>
        <Text style={styles.body}>
          株式会社corecty{'\n'}
          メールアドレス：kyoiru.app@gmail.com
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
