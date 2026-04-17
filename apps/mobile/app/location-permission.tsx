import { Redirect } from 'expo-router';

export default function LegacyLocationPermissionRoute() {
  return <Redirect href={'/(tabs)/settings/location-permission' as never} />;
}
