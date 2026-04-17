import { Redirect } from 'expo-router';

export default function LegacySubscriptionRoute() {
  return <Redirect href={'/(tabs)/settings/subscription-info' as never} />;
}
