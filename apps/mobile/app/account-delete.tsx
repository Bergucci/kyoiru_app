import { Redirect } from 'expo-router';

export default function LegacyAccountDeleteRoute() {
  return <Redirect href={'/(tabs)/settings/account-delete' as never} />;
}
