import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { toApiErrorMessage } from '../../../src/lib/api';
import { useApi } from '../../../src/lib/use-api';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';
import { KeyboardAwareScrollView } from '../../../src/ui/KeyboardAwareScrollView';

const CATEGORIES = [
  '一般的なご質問',
  'バグ・不具合のご報告',
  'アカウントについて',
  '有料プランについて',
  'プライバシーについて',
  'その他',
];

export default function ContactScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { request } = useApi();
  const [name, setName] = useState(session?.user.displayName ?? '');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('入力エラー', 'お名前を入力してください。');
      return;
    }
    if (!email.trim()) {
      Alert.alert('入力エラー', 'メールアドレスを入力してください。');
      return;
    }
    if (!category) {
      Alert.alert('入力エラー', 'お問い合わせ種別を選択してください。');
      return;
    }
    if (!message.trim()) {
      Alert.alert('入力エラー', 'お問い合わせ内容を入力してください。');
      return;
    }

    setSending(true);
    try {
      await request('/contact', {
        method: 'POST',
        body: { name: name.trim(), email: email.trim(), category, message: message.trim() },
      });
      Alert.alert(
        'お問い合わせを受け付けました',
        '内容を確認の上、担当者よりご連絡いたします。',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert('送信エラー', toApiErrorMessage(error));
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAwareScrollView outerStyle={styles.flex} contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>お問い合わせ</Text>
          <Text style={styles.cardBody}>
            ご質問・ご要望は下記フォームよりお送りください。担当者より3営業日以内にご返信いたします。
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>お名前 <Text style={styles.required}>必須</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="例：山田 太郎"
            placeholderTextColor={colors.hint}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            maxLength={100}
          />

          <Text style={[styles.label, styles.labelTop]}>メールアドレス <Text style={styles.required}>必須</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="例：example@email.com"
            placeholderTextColor={colors.hint}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            maxLength={254}
          />

          <Text style={[styles.label, styles.labelTop]}>お問い合わせ種別 <Text style={styles.required}>必須</Text></Text>
          <View style={styles.categoryList}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipSelected]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextSelected]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, styles.labelTop]}>お問い合わせ内容 <Text style={styles.required}>必須</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="ご質問・ご要望の内容をできるだけ詳しくご記入ください。"
            placeholderTextColor={colors.hint}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={3000}
          />
          <Text style={styles.charCount}>{message.length} / 3000</Text>
        </View>

        <Pressable
          style={[styles.submitButton, sending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>送信する</Text>
          )}
        </Pressable>

        <Text style={styles.notice}>
          ※ お問い合わせいただいた内容は、回答のためにのみ利用いたします。
        </Text>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  container: {
    padding: 20,
    gap: 16,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  labelTop: {
    marginTop: 14,
  },
  required: {
    color: '#e53935',
    fontSize: 12,
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.pageBg,
  },
  textArea: {
    height: 140,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: colors.hint,
    textAlign: 'right',
    marginTop: 4,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.pageBg,
  },
  categoryChipSelected: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  categoryChipText: {
    fontSize: 13,
    color: colors.muted,
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.ink,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  notice: {
    fontSize: 12,
    color: colors.hint,
    textAlign: 'center',
    lineHeight: 18,
  },
});
