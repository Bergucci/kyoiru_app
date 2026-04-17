const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = __dirname.replace(/[\\/]test$/, '');

function read(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function expectIncludes(source, snippet, label) {
  assert.equal(
    source.includes(snippet),
    true,
    `${label} is missing snippet: ${snippet}`,
  );
}

function expectExcludes(source, snippet, label) {
  assert.equal(
    source.includes(snippet),
    false,
    `${label} unexpectedly contains snippet: ${snippet}`,
  );
}

function main() {
  const rootLayout = read('app/_layout.tsx');
  const rootIndex = read('app/index.tsx');
  const authLogin = read('app/(auth)/login.tsx');
  const socialLoginUtil = read('src/lib/social-login.ts');
  const tabsLayout = read('app/(tabs)/_layout.tsx');
  const homeScreen = read('app/(tabs)/home/index.tsx');
  const groupDetailScreen = read('app/(tabs)/home/groups/[groupId].tsx');
  const friendsScreen = read('app/(tabs)/friends/index.tsx');
  const monitoringLayout = read('app/(tabs)/monitoring/_layout.tsx');
  const monitoringScreen = read('app/(tabs)/monitoring/index.tsx');
  const monitoringDetailScreen = read('app/(tabs)/monitoring/[relationshipId].tsx');
  const settingsIndex = read('app/(tabs)/settings/index.tsx');
  const settingsProfile = read('app/(tabs)/settings/profile.tsx');
  const settingsAccount = read('app/(tabs)/settings/account.tsx');
  const settingsUserId = read('app/(tabs)/settings/user-id.tsx');
  const settingsNotifications = read('app/(tabs)/settings/notifications.tsx');
  const settingsSubscriptionManagement = read(
    'app/(tabs)/settings/subscription-management.tsx',
  );
  const blocksScreen = read('app/(tabs)/settings/blocks.tsx');
  const accountDeleteScreen = read('app/(tabs)/settings/account-delete.tsx');
  const friendInviteScreen = read('app/friend-invites/[token].tsx');

  expectIncludes(rootLayout, 'name="(auth)"', 'root layout');
  expectIncludes(rootLayout, 'name="(tabs)"', 'root layout');
  expectIncludes(rootLayout, 'name="initial-profile"', 'root layout');
  expectIncludes(rootLayout, 'name="friend-invites/[token]"', 'root layout');

  expectIncludes(rootIndex, "Redirect href={'/(auth)/login' as never}", 'root index');
  expectIncludes(rootIndex, "Redirect href={'/(tabs)/home' as never}", 'root index');
  expectExcludes(rootIndex, 'Release Readiness', 'root index');

  expectIncludes(authLogin, "/auth/login", 'auth login');
  expectIncludes(authLogin, "/auth/register", 'auth login');
  expectIncludes(authLogin, 'Apple / LINE / Google / メール', 'auth login');
  expectIncludes(socialLoginUtil, '/auth/${provider}', 'social login util');
  expectIncludes(socialLoginUtil, 'apple:', 'social login util');
  expectIncludes(socialLoginUtil, 'google:', 'social login util');
  expectIncludes(socialLoginUtil, 'line:', 'social login util');
  expectIncludes(socialLoginUtil, 'identityToken', 'social login util');
  expectIncludes(socialLoginUtil, 'idToken', 'social login util');
  expectIncludes(socialLoginUtil, 'accessToken', 'social login util');

  expectIncludes(tabsLayout, 'name="home"', 'tabs layout');
  expectIncludes(tabsLayout, 'name="friends"', 'tabs layout');
  expectIncludes(tabsLayout, 'name="monitoring"', 'tabs layout');
  expectIncludes(tabsLayout, 'name="settings"', 'tabs layout');

  expectIncludes(homeScreen, "/groups',", 'home screen');
  expectIncludes(homeScreen, "/me/checkins/history", 'home screen');
  expectIncludes(homeScreen, "/me/checkins/today", 'home screen');
  expectIncludes(homeScreen, "/me/mood-stamp", 'home screen');
  expectIncludes(groupDetailScreen, 'isInteractive', 'group detail screen');
  expectIncludes(groupDetailScreen, '参加中', 'group detail screen');

  expectIncludes(friendsScreen, "/friends',", 'friends screen');
  expectIncludes(friendsScreen, '/friends/search?', 'friends screen');
  expectIncludes(friendsScreen, '/friends/requests/incoming', 'friends screen');
  expectIncludes(friendsScreen, '/friends/requests/outgoing', 'friends screen');
  expectIncludes(friendsScreen, '/friends/invite-links', 'friends screen');
  expectIncludes(friendsScreen, 'LINE で送る', 'friends screen');

  expectIncludes(monitoringLayout, 'name="[relationshipId]"', 'monitoring layout');
  expectIncludes(monitoringScreen, '/monitoring/requests', 'monitoring screen');
  expectIncludes(
    monitoringScreen,
    '/monitoring/requests/incoming',
    'monitoring screen',
  );
  expectIncludes(
    monitoringScreen,
    '/monitoring/requests/outgoing',
    'monitoring screen',
  );
  expectIncludes(monitoringScreen, '/billing/entitlement', 'monitoring screen');
  expectIncludes(monitoringScreen, "/monitoring',", 'monitoring screen');
  expectIncludes(monitoringScreen, '/monitoring/dashboard', 'monitoring screen');
  expectIncludes(
    monitoringScreen,
    '/emergency-contact/final-stage',
    'monitoring screen',
  );
  expectIncludes(
    monitoringDetailScreen,
    '/monitoring/${relationshipId}/settings',
    'monitoring detail screen',
  );
  expectIncludes(
    monitoringDetailScreen,
    '/monitoring/${relationshipId}/emergency-contact',
    'monitoring detail screen',
  );
  expectIncludes(
    monitoringDetailScreen,
    '/monitoring/${relationshipId}/checkin-settings',
    'monitoring detail screen',
  );
  expectIncludes(
    monitoringDetailScreen,
    '/monitoring/${relationshipId}/revoke',
    'monitoring detail screen',
  );

  expectIncludes(settingsIndex, '/(tabs)/settings/profile', 'settings index');
  expectIncludes(settingsIndex, '/(tabs)/settings/account', 'settings index');
  expectIncludes(settingsIndex, '/(tabs)/settings/notifications', 'settings index');
  expectIncludes(
    settingsIndex,
    '/(tabs)/settings/subscription-management',
    'settings index',
  );
  expectIncludes(settingsIndex, '/(tabs)/settings/blocks', 'settings index');
  expectIncludes(settingsProfile, '/auth/profile', 'settings profile');
  expectIncludes(settingsAccount, '/auth/account-settings', 'settings account');
  expectIncludes(settingsUserId, '/auth/account-settings', 'settings user-id');
  expectIncludes(
    settingsNotifications,
    '/groups/${group.groupId}/notification-settings',
    'settings notifications',
  );
  expectIncludes(
    settingsSubscriptionManagement,
    '/billing/entitlement',
    'settings subscription management',
  );
  expectIncludes(
    settingsSubscriptionManagement,
    '/billing/subscription-copy',
    'settings subscription management',
  );
  expectIncludes(blocksScreen, "/blocks',", 'blocks screen');
  expectIncludes(accountDeleteScreen, "/account',", 'account delete screen');
  expectIncludes(friendInviteScreen, '/friend-invites/${token}', 'friend invite screen');

  console.log('PASS mobile app main-flow checks');
}

main();
