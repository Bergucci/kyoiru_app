import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiRequest, toApiErrorMessage } from '../../../src/lib/api';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';

interface LocationPermissionCopy {
  title: string;
  purpose: string;
  consentRequired: boolean;
  activationRule: string;
  emergencyContactVisibility: string;
}

export default function LocationPermissionScreen() {
  const { session } = useSession();
  const [copy, setCopy] = useState<LocationPermissionCopy | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    void apiRequest<LocationPermissionCopy>('/location-permission-copy')
      .then((response) => {
        setCopy(response);
        setErrorText(null);
      })
      .catch((error) => {
        setErrorText(toApiErrorMessage(error));
      });
  }, []);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{copy?.title ?? '位置情報の説明'}</Text>
        <Text style={styles.heroText}>
          OS 権限の許可前に、用途と同意条件を先に説明する画面です。
        </Text>
      </View>

      {errorText ? (
        <View style={styles.card}>
          <Text style={styles.body}>{errorText}</Text>
        </View>
      ) : null}

      {copy ? (
        <View style={styles.card}>
          {[copy.purpose, copy.activationRule, copy.emergencyContactVisibility].map(
            (item) => (
              <View key={item} style={styles.row}>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.body}>{item}</Text>
              </View>
            ),
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: '#f6f1e7',
  },
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#325c50',
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fffdf8',
  },
  heroText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#d8e8e1',
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    color: colors.accent,
  },
  body: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
});
