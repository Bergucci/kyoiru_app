import { Redirect } from 'expo-router';

export default function LegacyHelpRoute() {
  return <Redirect href={'/(tabs)/settings/help' as never} />;
}
