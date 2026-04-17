import { Redirect } from 'expo-router';
import { useSession } from '../src/session/session-context';

export default function IndexScreen() {
  const { session } = useSession();

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  return <Redirect href={'/(tabs)/home' as never} />;
}
