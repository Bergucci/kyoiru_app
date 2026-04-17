const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { setTimeout: sleep } = require('node:timers/promises');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { FastifyAdapter } = require('@nestjs/platform-fastify');

const execFileAsync = promisify(execFile);
const apiRoot = __dirname.replace(/[\\/]test$/, '');
const dockerContainerName = 'kyoiru-step9-e2e-postgres';
const postgresPort = '55432';
const databaseUrl = `postgresql://kyoiru:kyoiru@127.0.0.1:${postgresPort}/kyoiru_step9_e2e`;
const bannedPhrases = [
  '必ず気づけます',
  '命を守ります',
  '絶対に安全です',
  '事故を防ぎます',
  '確実に異常を検知します',
];

process.chdir(apiRoot);
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_ACCESS_SECRET = 'step9-test-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '30d';
process.env.APPLE_CLIENT_ID = 'test.apple.client';
process.env.GOOGLE_CLIENT_ID = 'test.google.client';
process.env.LINE_CHANNEL_ID = 'test-line-channel';
process.env.REVENUECAT_MONITORING_ENTITLEMENT_KEY = 'monitoring_plan';
process.env.REVENUECAT_MONITORING_PLAN_NAME = '見守りプラン';
process.env.REVENUECAT_WEBHOOK_AUTH_HEADER = 'Bearer step9-webhook';
process.env.LEGAL_PRIVACY_POLICY_URL = 'https://example.test/privacy';
process.env.LEGAL_TERMS_OF_SERVICE_URL = 'https://example.test/terms';
process.env.LEGAL_COMMERCE_DISCLOSURE_URL =
  'https://example.test/legal/commercial-transactions';
process.env.LEGAL_SUPPORT_URL = 'https://example.test/support';

const { AppModule } = require('../dist/app.module.js');
const { PrismaService } = require('../dist/prisma/prisma.service.js');
const {
  FreeUnreactedNotificationService,
} = require('../dist/notifications/free-unreacted-notification.service.js');
const {
  MonitoringAlertService,
} = require('../dist/monitoring/monitoring-alert.service.js');
const {
  AccountDeletionSchedulerService,
} = require('../dist/account/account-deletion-scheduler.service.js');
const {
  AppleVerifyService,
} = require('../dist/auth/social/apple-verify.service.js');
const {
  GoogleVerifyService,
} = require('../dist/auth/social/google-verify.service.js');
const {
  LineVerifyService,
} = require('../dist/auth/social/line-verify.service.js');

const socialStubs = {
  apple: { verify: async (token) => `apple-subject:${token}` },
  google: { verify: async (token) => `google-subject:${token}` },
  line: { verify: async (token) => `line-subject:${token}` },
};

const results = {
  passed: [],
  failed: [],
};

const state = {
  app: null,
  prisma: null,
  freeNotificationService: null,
  monitoringAlertService: null,
  accountDeletionScheduler: null,
  baseUrl: '',
  users: {},
  groupId: null,
  monitoringRelationshipId: null,
};

async function runCommand(file, args, options = {}) {
  try {
    return await execFileAsync(file, args, {
      cwd: apiRoot,
      env: {
        ...process.env,
        ...(options.env ?? {}),
      },
      timeout: options.timeoutMs ?? 180000,
    });
  } catch (error) {
    if (options.ignoreFailure) {
      return error;
    }
    throw error;
  }
}

async function setupDatabaseContainer() {
  await runCommand('docker', ['rm', '-f', dockerContainerName], {
    ignoreFailure: true,
  });

  await runCommand('docker', [
    'run',
    '--name',
    dockerContainerName,
    '-e',
    'POSTGRES_USER=kyoiru',
    '-e',
    'POSTGRES_PASSWORD=kyoiru',
    '-e',
    'POSTGRES_DB=kyoiru_step9_e2e',
    '-p',
    `${postgresPort}:5432`,
    '-d',
    'postgres:16-alpine',
  ]);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const ready = await runCommand(
      'bash',
      [
        '-lc',
        `PGPASSWORD=kyoiru pg_isready -h 127.0.0.1 -p ${postgresPort} -U kyoiru`,
      ],
      { ignoreFailure: true, timeoutMs: 10000 },
    );

    if (!ready.code && /accepting connections/.test(ready.stdout)) {
      await runCommand('bash', [
        '-lc',
        `PGPASSWORD=kyoiru psql "${databaseUrl}" -c 'select 1'`,
      ]);
      return;
    }

    await sleep(1000);
  }

  throw new Error('Postgres container did not become ready in time');
}

async function migrateDatabase() {
  await runCommand('corepack', [
    'pnpm',
    '--filter',
    '@kyoiru/api',
    'db:migrate:deploy',
  ]);
}

async function createApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(AppleVerifyService)
    .useValue(socialStubs.apple)
    .overrideProvider(GoogleVerifyService)
    .useValue(socialStubs.google)
    .overrideProvider(LineVerifyService)
    .useValue(socialStubs.line)
    .compile();

  const app = moduleRef.createNestApplication(new FastifyAdapter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  await app.listen(0, '127.0.0.1');

  state.app = app;
  state.prisma = app.get(PrismaService);
  state.freeNotificationService = app.get(FreeUnreactedNotificationService);
  state.monitoringAlertService = app.get(MonitoringAlertService);
  state.accountDeletionScheduler = app.get(AccountDeletionSchedulerService);
  state.baseUrl = await app.getUrl();
}

async function shutdown() {
  if (state.prisma) {
    await state.prisma.$disconnect();
  }

  if (state.app) {
    await state.app.close();
  }

  await runCommand('docker', ['rm', '-f', dockerContainerName], {
    ignoreFailure: true,
  });
}

async function request(method, path, options = {}) {
  const headers = {
    ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
    ...(options.headers ?? {}),
  };

  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${state.baseUrl}${path}`, {
    method,
    headers,
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  let body = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return {
    status: response.status,
    body,
    text,
  };
}

function expectStatus(response, expectedStatus, detail) {
  assert.equal(
    response.status,
    expectedStatus,
    `${detail}: expected ${expectedStatus}, got ${response.status} (${response.text})`,
  );
}

function expectBannedPhrasesAbsent(payload, label) {
  const serialized = JSON.stringify(payload);
  for (const phrase of bannedPhrases) {
    assert.equal(
      serialized.includes(phrase),
      false,
      `${label} unexpectedly contained banned phrase: ${phrase}`,
    );
  }
}

function notePass(label) {
  results.passed.push(label);
  console.log(`PASS ${label}`);
}

function noteFail(label, error, severity = 'medium') {
  results.failed.push({
    label,
    severity,
    message: error instanceof Error ? error.message : String(error),
  });
  console.error(`FAIL ${label}`);
  console.error(error);
}

async function runStep(label, fn, severity = 'medium') {
  try {
    await fn();
    notePass(label);
  } catch (error) {
    noteFail(label, error, severity);
  }
}

async function withFrozenTime(isoString, fn) {
  const realDate = Date;
  const fixed = new realDate(isoString);

  class FrozenDate extends realDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fixed.getTime());
        return;
      }
      super(...args);
    }

    static now() {
      return fixed.getTime();
    }

    static parse(value) {
      return realDate.parse(value);
    }

    static UTC(...args) {
      return realDate.UTC(...args);
    }
  }

  global.Date = FrozenDate;
  try {
    return await fn();
  } finally {
    global.Date = realDate;
  }
}

async function registerEmailUser({
  key,
  email,
  password = 'Password123!',
  userId,
  displayName,
  avatarUrl,
}) {
  const registerResponse = await request('POST', '/auth/register', {
    body: { email, password },
  });
  expectStatus(registerResponse, 201, `register ${key}`);

  const pendingUser = registerResponse.body.user;
  const initialProfileResponse = await request('PATCH', '/auth/initial-profile', {
    token: registerResponse.body.accessToken,
    body: {
      displayName,
      userId,
      ...(avatarUrl ? { avatarUrl } : {}),
    },
  });
  expectStatus(initialProfileResponse, 200, `initial profile ${key}`);

  const loginResponse = await request('POST', '/auth/login', {
    body: { email, password },
  });
  expectStatus(loginResponse, 200, `login ${key}`);

  const user = {
    key,
    id: pendingUser.id,
    email,
    password,
    accessToken: loginResponse.body.accessToken,
    refreshToken: loginResponse.body.refreshToken,
    user: loginResponse.body.user,
  };

  state.users[key] = user;
  return user;
}

async function registerSocialUser({
  key,
  provider,
  tokenField,
  tokenValue,
  userId,
  displayName,
}) {
  const loginResponse = await request('POST', `/auth/${provider}`, {
    body: {
      [tokenField]: tokenValue,
    },
  });
  expectStatus(loginResponse, 200, `${provider} login ${key}`);

  const initialProfileResponse = await request('PATCH', '/auth/initial-profile', {
    token: loginResponse.body.accessToken,
    body: {
      displayName,
      userId,
    },
  });
  expectStatus(initialProfileResponse, 200, `${provider} initial profile ${key}`);

  const user = {
    key,
    id: loginResponse.body.user.id,
    accessToken: loginResponse.body.accessToken,
    refreshToken: loginResponse.body.refreshToken,
    user: initialProfileResponse.body,
  };
  state.users[key] = user;
  return user;
}

async function sendRevenueCatEvent(event, expectedStatus = 200) {
  const response = await request('POST', '/billing/revenuecat/webhook', {
    headers: {
      authorization: process.env.REVENUECAT_WEBHOOK_AUTH_HEADER,
    },
    body: {
      api_version: '1.0',
      event,
    },
  });
  expectStatus(response, expectedStatus, `RevenueCat event ${event.id}`);
  return response.body;
}

async function grantMonitoringEntitlement(userId, overrides = {}) {
  const nowMs = Date.now();
  return sendRevenueCatEvent({
    id: `evt-active-${userId}-${nowMs}`,
    type: 'INITIAL_PURCHASE',
    app_user_id: `uuid:${userId}`,
    entitlement_id: 'monitoring_plan',
    event_timestamp_ms: nowMs,
    expiration_at_ms: nowMs + 7 * 24 * 60 * 60 * 1000,
    grace_period_expiration_at_ms: null,
    period_type: 'TRIAL',
    is_trial_conversion: false,
    store: 'app_store',
    environment: 'SANDBOX',
    ...overrides,
  });
}

async function createPushToken(userId, suffix) {
  return state.prisma.pushToken.create({
    data: {
      userId,
      token: `ExponentPushToken[${suffix}]`,
      platform: 'ios',
    },
  });
}

async function testPublicReviewEndpoints() {
  const legalLinks = await request('GET', '/legal-links');
  expectStatus(legalLinks, 200, 'GET /legal-links');
  assert.ok(legalLinks.body.privacyPolicyUrl);
  assert.ok(legalLinks.body.termsOfServiceUrl);
  assert.ok(legalLinks.body.commerceDisclosureUrl);
  assert.ok(legalLinks.body.supportUrl);

  const locationCopy = await request('GET', '/location-permission-copy');
  expectStatus(locationCopy, 200, 'GET /location-permission-copy');
  expectBannedPhrasesAbsent(locationCopy.body, 'location-permission-copy');

  const subscriptionCopy = await request('GET', '/billing/subscription-copy');
  expectStatus(subscriptionCopy, 200, 'GET /billing/subscription-copy');
  assert.equal(subscriptionCopy.body.planName, '見守りプラン');
  assert.equal(subscriptionCopy.body.priceDisplay, '月額 980 円');
  assert.equal(subscriptionCopy.body.freeTrial, '7 日間無料トライアル');
  assert.equal(subscriptionCopy.body.autoRenew, '自動更新');
  expectBannedPhrasesAbsent(subscriptionCopy.body, 'subscription-copy');
}

async function testAuthFlows() {
  const emailUser = await registerEmailUser({
    key: 'emailMain',
    email: 'email-main@example.com',
    userId: 'emailMain',
    displayName: 'Email Main',
  });

  const meResponse = await request('GET', '/auth/me', {
    token: emailUser.accessToken,
  });
  expectStatus(meResponse, 200, 'GET /auth/me');
  assert.equal(meResponse.body.userId, 'emailMain');

  await registerSocialUser({
    key: 'appleUser',
    provider: 'apple',
    tokenField: 'identityToken',
    tokenValue: 'apple-login-token',
    userId: 'appleUser',
    displayName: 'Apple User',
  });

  await registerSocialUser({
    key: 'googleUser',
    provider: 'google',
    tokenField: 'idToken',
    tokenValue: 'google-login-token',
    userId: 'googleUser',
    displayName: 'Google User',
  });

  await registerSocialUser({
    key: 'lineUser',
    provider: 'line',
    tokenField: 'accessToken',
    tokenValue: 'line-login-token',
    userId: 'lineUser',
    displayName: 'Line User',
  });
}

async function bootstrapMainUsers() {
  await registerEmailUser({
    key: 'watcher',
    email: 'watcher@example.com',
    userId: 'watcherUser',
    displayName: 'Watcher User',
  });
  await registerEmailUser({
    key: 'target',
    email: 'target@example.com',
    userId: 'targetUser',
    displayName: 'Target User',
  });
  await registerEmailUser({
    key: 'friendSender',
    email: 'friend-sender@example.com',
    userId: 'friendSender',
    displayName: 'Friend Sender',
  });
  await registerEmailUser({
    key: 'friendReceiver',
    email: 'friend-receiver@example.com',
    userId: 'friendReceiver',
    displayName: 'Friend Receiver',
  });
  await registerEmailUser({
    key: 'rejectedReceiver',
    email: 'rejected-receiver@example.com',
    userId: 'rejectedReceiver',
    displayName: 'Rejected Receiver',
  });
  await registerEmailUser({
    key: 'pendingCancelTarget',
    email: 'cancel-target@example.com',
    userId: 'cancelTarget',
    displayName: 'Cancel Target',
  });
  await registerEmailUser({
    key: 'privateUser',
    email: 'private-user@example.com',
    userId: 'friendPrivate',
    displayName: 'Private User',
  });
  await registerEmailUser({
    key: 'blockedUser',
    email: 'blocked-user@example.com',
    userId: 'friendBlocked',
    displayName: 'Blocked User',
  });
  await registerEmailUser({
    key: 'joiner',
    email: 'joiner@example.com',
    userId: 'joinerUser',
    displayName: 'Joiner User',
  });
  await registerEmailUser({
    key: 'blockedJoiner',
    email: 'blocked-joiner@example.com',
    userId: 'blockedJoiner',
    displayName: 'Blocked Joiner',
  });
  await registerEmailUser({
    key: 'deleteUser',
    email: 'delete-user@example.com',
    userId: 'deleteUser',
    displayName: 'Delete User',
  });
  await registerEmailUser({
    key: 'deleteTarget',
    email: 'delete-target@example.com',
    userId: 'deleteTarget',
    displayName: 'Delete Target',
  });

  await state.prisma.user.update({
    where: { id: state.users.privateUser.id },
    data: {
      idSearchVisibility: 'private',
    },
  });
}

async function testFriendFlows() {
  const sender = state.users.friendSender;
  const receiver = state.users.friendReceiver;
  const privateUser = state.users.privateUser;
  const blockedUser = state.users.blockedUser;

  const blockResponse = await request('POST', '/blocks', {
    token: blockedUser.accessToken,
    body: {
      targetUserId: sender.user.userId,
    },
  });
  expectStatus(blockResponse, 201, 'block sender from blockedUser');

  const searchResponse = await request('GET', '/friends/search?userId=friend', {
    token: sender.accessToken,
  });
  expectStatus(searchResponse, 200, 'friend search');
  const searchableUserIds = searchResponse.body.map((item) => item.userId);
  assert.equal(searchableUserIds.includes(privateUser.user.userId), false);
  assert.equal(searchableUserIds.includes(blockedUser.user.userId), false);
  assert.equal(searchableUserIds.includes(receiver.user.userId), true);

  const sendRequestResponse = await request('POST', '/friends/requests', {
    token: sender.accessToken,
    body: {
      targetUserId: receiver.user.userId,
    },
  });
  expectStatus(sendRequestResponse, 201, 'send friend request');

  const incomingResponse = await request('GET', '/friends/requests/incoming', {
    token: receiver.accessToken,
  });
  expectStatus(incomingResponse, 200, 'incoming friend requests');
  assert.equal(incomingResponse.body[0].requestId, sendRequestResponse.body.requestId);

  const acceptResponse = await request(
    'POST',
    `/friends/requests/${sendRequestResponse.body.requestId}/accept`,
    {
      token: receiver.accessToken,
    },
  );
  expectStatus(acceptResponse, 200, 'accept friend request');

  const rejectSendResponse = await request('POST', '/friends/requests', {
    token: sender.accessToken,
    body: {
      targetUserId: state.users.rejectedReceiver.user.userId,
    },
  });
  expectStatus(rejectSendResponse, 201, 'send rejectable request');

  const rejectResponse = await request(
    'POST',
    `/friends/requests/${rejectSendResponse.body.requestId}/reject`,
    {
      token: state.users.rejectedReceiver.accessToken,
    },
  );
  expectStatus(rejectResponse, 200, 'reject friend request');

  const revertResponse = await request(
    'POST',
    `/friends/requests/${rejectSendResponse.body.requestId}/reject-revert`,
    {
      token: state.users.rejectedReceiver.accessToken,
    },
  );
  expectStatus(revertResponse, 200, 'revert rejected friend request');

  const cancelSendResponse = await request('POST', '/friends/requests', {
    token: sender.accessToken,
    body: {
      targetUserId: state.users.pendingCancelTarget.user.userId,
    },
  });
  expectStatus(cancelSendResponse, 201, 'send cancellable request');

  const cancelResponse = await request(
    'POST',
    `/friends/requests/${cancelSendResponse.body.requestId}/cancel`,
    {
      token: sender.accessToken,
    },
  );
  expectStatus(cancelResponse, 200, 'cancel friend request');
}

async function testGroupFlows() {
  const creator = state.users.friendSender;
  const initialFriend = state.users.friendReceiver;
  const joiner = state.users.joiner;
  const blockedJoiner = state.users.blockedJoiner;

  const createGroupResponse = await request('POST', '/groups', {
    token: creator.accessToken,
    body: {
      name: 'Main Group',
      type: 'friends',
      initialMemberUserIds: [initialFriend.user.userId],
    },
  });
  expectStatus(createGroupResponse, 201, 'create group');
  state.groupId = createGroupResponse.body.groupId;

  const notificationSettingsResponse = await request(
    'PATCH',
    `/groups/${state.groupId}/notification-settings`,
    {
      token: creator.accessToken,
      body: {
        notificationLevel: 'caring',
      },
    },
  );
  expectStatus(notificationSettingsResponse, 200, 'update notification settings');

  const issueInviteResponse = await request(
    'POST',
    `/groups/${state.groupId}/invite-links`,
    {
      token: creator.accessToken,
    },
  );
  expectStatus(issueInviteResponse, 201, 'issue invite link');
  const initialToken = issueInviteResponse.body.token;

  const reissueInviteResponse = await request(
    'POST',
    `/groups/${state.groupId}/invite-links/reissue`,
    {
      token: creator.accessToken,
    },
  );
  expectStatus(reissueInviteResponse, 201, 'reissue invite link');
  assert.notEqual(reissueInviteResponse.body.token, initialToken);

  const previewResponse = await request(
    'GET',
    `/group-invites/${reissueInviteResponse.body.token}`,
    {
      token: joiner.accessToken,
    },
  );
  expectStatus(previewResponse, 200, 'preview invite');
  assert.equal(previewResponse.body.joinable, true);

  const joinResponse = await request(
    'POST',
    `/group-invites/${reissueInviteResponse.body.token}/join`,
    {
      token: joiner.accessToken,
    },
  );
  expectStatus(joinResponse, 200, 'join invite');

  const blockedGroupResponse = await request('POST', '/groups', {
    token: creator.accessToken,
    body: {
      name: 'Blocked Group',
      type: 'friends',
      initialMemberUserIds: [initialFriend.user.userId],
    },
  });
  expectStatus(blockedGroupResponse, 201, 'create blocked group');

  const blockedInviteResponse = await request(
    'POST',
    `/groups/${blockedGroupResponse.body.groupId}/invite-links`,
    {
      token: creator.accessToken,
    },
  );
  expectStatus(blockedInviteResponse, 201, 'issue blocked invite');

  const creatorBlocksJoiner = await request('POST', '/blocks', {
    token: creator.accessToken,
    body: {
      targetUserId: blockedJoiner.user.userId,
    },
  });
  expectStatus(creatorBlocksJoiner, 201, 'block blockedJoiner');

  const blockedPreview = await request(
    'GET',
    `/group-invites/${blockedInviteResponse.body.token}`,
    {
      token: blockedJoiner.accessToken,
    },
  );
  expectStatus(blockedPreview, 200, 'blocked preview');
  assert.equal(blockedPreview.body.joinable, false);

  const blockedJoin = await request(
    'POST',
    `/group-invites/${blockedInviteResponse.body.token}/join`,
    {
      token: blockedJoiner.accessToken,
    },
  );
  expectStatus(blockedJoin, 422, 'blocked join');
}

async function testDailyAliveFlows() {
  const target = state.users.target;

  await withFrozenTime('2026-04-17T05:30:00+09:00', async () => {
    const checkInResponse = await request('POST', '/me/checkins/today', {
      token: target.accessToken,
    });
    expectStatus(checkInResponse, 201, 'checkin before 6 JST');
    assert.equal(checkInResponse.body.businessDateJst, '2026-04-16');
  });

  await withFrozenTime('2026-04-17T06:30:00+09:00', async () => {
    const checkInResponse = await request('POST', '/me/checkins/today', {
      token: target.accessToken,
    });
    expectStatus(checkInResponse, 201, 'checkin after 6 JST');
    assert.equal(checkInResponse.body.businessDateJst, '2026-04-17');

    const duplicateCheckin = await request('POST', '/me/checkins/today', {
      token: target.accessToken,
    });
    expectStatus(duplicateCheckin, 409, 'duplicate checkin');

    const moodResponse = await request('POST', '/me/mood-stamp', {
      token: target.accessToken,
      body: {
        mood: '元気',
      },
    });
    expectStatus(moodResponse, 201, 'set mood');

    const deleteMood = await request('DELETE', '/me/mood-stamp', {
      token: target.accessToken,
    });
    expectStatus(deleteMood, 204, 'delete mood');

    const resetMood = await request('POST', '/me/mood-stamp', {
      token: target.accessToken,
      body: {
        mood: '眠い',
      },
    });
    expectStatus(resetMood, 409, 'reset deleted mood');
  });

  const historyResponse = await request('GET', '/me/checkins/history', {
    token: target.accessToken,
  });
  expectStatus(historyResponse, 200, 'checkin history');
  assert.ok(historyResponse.body.days.length >= 2);
}

async function testFreeNotificationFlows() {
  const creator = state.users.friendSender;
  const normalGroup = await request('POST', '/groups', {
    token: creator.accessToken,
    body: {
      name: 'Normal Group',
      type: 'friends',
      initialMemberUserIds: [state.users.friendReceiver.user.userId],
    },
  });
  expectStatus(normalGroup, 201, 'create normal group');

  const looseGroup = await request('POST', '/groups', {
    token: creator.accessToken,
    body: {
      name: 'Loose Group',
      type: 'friends',
    },
  });
  expectStatus(looseGroup, 201, 'create loose group');

  await request(
    'PATCH',
    `/groups/${normalGroup.body.groupId}/notification-settings`,
    {
      token: creator.accessToken,
      body: {
        notificationLevel: 'normal',
      },
    },
  );

  await request(
    'PATCH',
    `/groups/${looseGroup.body.groupId}/notification-settings`,
    {
      token: creator.accessToken,
      body: {
        notificationLevel: 'loose',
      },
    },
  );

  await withFrozenTime('2026-04-17T21:00:00+09:00', async () => {
    const deliveries = await state.freeNotificationService.reserveDueNotifications(
      new Date(),
    );
    const phases = deliveries.map((delivery) => delivery.phase);
    assert.equal(phases.includes('caring_21'), true);
    assert.equal(phases.includes('normal_next_morning'), false);

    const duplicateDeliveries =
      await state.freeNotificationService.reserveDueNotifications(new Date());
    assert.equal(duplicateDeliveries.length, 0);
  });

  await withFrozenTime('2026-04-18T06:00:00+09:00', async () => {
    const deliveries = await state.freeNotificationService.reserveDueNotifications(
      new Date(),
    );
    const phases = deliveries.map((delivery) => delivery.phase);
    assert.equal(phases.includes('normal_next_morning'), true);
    assert.equal(phases.includes('caring_next_morning'), true);
    const looseDeliveryExists = deliveries.some(
      (delivery) => delivery.groupId === looseGroup.body.groupId,
    );
    assert.equal(looseDeliveryExists, false);
  });
}

async function testMonitoringAndBillingFlows() {
  const watcher = state.users.watcher;
  const target = state.users.target;

  await state.prisma.dailyMoodStamp.deleteMany({
    where: {
      userId: target.id,
    },
  });
  await state.prisma.dailyCheckin.deleteMany({
    where: {
      userId: target.id,
    },
  });
  await state.prisma.dailyCheckin.create({
    data: {
      userId: target.id,
      businessDateJst: '2026-04-16',
      checkedInAt: new Date('2026-04-16T08:00:00+09:00'),
    },
  });

  const initialEntitlement = await request('GET', '/billing/entitlement', {
    token: watcher.accessToken,
  });
  expectStatus(initialEntitlement, 200, 'initial entitlement');
  assert.equal(initialEntitlement.body.status, 'inactive');

  await grantMonitoringEntitlement(watcher.id);

  const activeEntitlement = await request('GET', '/billing/entitlement', {
    token: watcher.accessToken,
  });
  expectStatus(activeEntitlement, 200, 'active entitlement');
  assert.equal(activeEntitlement.body.status, 'active');
  assert.equal(activeEntitlement.body.isActiveForFeatures, true);

  const duplicateEventId = `evt-duplicate-${watcher.id}`;
  const duplicateBodyA = await sendRevenueCatEvent({
    id: duplicateEventId,
    type: 'RENEWAL',
    app_user_id: `uuid:${watcher.id}`,
    entitlement_id: 'monitoring_plan',
    event_timestamp_ms: Date.now() + 1000,
    expiration_at_ms: Date.now() + 8 * 24 * 60 * 60 * 1000,
    store: 'app_store',
    environment: 'SANDBOX',
  });
  assert.equal(duplicateBodyA.status, 'processed');

  const duplicateBodyB = await sendRevenueCatEvent({
    id: duplicateEventId,
    type: 'RENEWAL',
    app_user_id: `uuid:${watcher.id}`,
    entitlement_id: 'monitoring_plan',
    event_timestamp_ms: Date.now() + 1000,
    expiration_at_ms: Date.now() + 8 * 24 * 60 * 60 * 1000,
    store: 'app_store',
    environment: 'SANDBOX',
  });
  assert.equal(duplicateBodyB.status, 'duplicate');

  const graceResponse = await sendRevenueCatEvent({
    id: `evt-grace-${watcher.id}`,
    type: 'BILLING_ISSUE',
    app_user_id: `uuid:${watcher.id}`,
    entitlement_id: 'monitoring_plan',
    event_timestamp_ms: Date.now() + 2000,
    expiration_at_ms: Date.now() - 1000,
    grace_period_expiration_at_ms: Date.now() + 2 * 24 * 60 * 60 * 1000,
    store: 'app_store',
    environment: 'SANDBOX',
  });
  assert.equal(graceResponse.status, 'processed');

  const graceEntitlement = await request('GET', '/billing/entitlement', {
    token: watcher.accessToken,
  });
  expectStatus(graceEntitlement, 200, 'grace entitlement');
  assert.equal(graceEntitlement.body.status, 'grace');
  assert.equal(graceEntitlement.body.isActiveForFeatures, true);

  const startRequestResponse = await request('POST', '/monitoring/requests', {
    token: watcher.accessToken,
    body: {
      targetUserId: target.user.userId,
    },
  });
  expectStatus(startRequestResponse, 201, 'start monitoring request');
  state.monitoringRelationshipId = startRequestResponse.body.id;

  const outgoingPending = await request('GET', '/monitoring/requests/outgoing', {
    token: watcher.accessToken,
  });
  expectStatus(outgoingPending, 200, 'outgoing monitoring requests');
  assert.equal(outgoingPending.body[0].status, 'pending');

  const approveResponse = await request(
    'POST',
    `/monitoring/requests/${state.monitoringRelationshipId}/approve`,
    {
      token: target.accessToken,
    },
  );
  expectStatus(approveResponse, 200, 'approve monitoring request');

  const updateCheckinSettings = await request(
    'PATCH',
    `/monitoring/${state.monitoringRelationshipId}/checkin-settings`,
    {
      token: target.accessToken,
      body: {
        checkinFrequency: 2,
        checkinTemplate: 'morning_evening',
      },
    },
  );
  expectStatus(updateCheckinSettings, 200, 'update monitoring checkin settings');

  const updateEmergencyContact = await request(
    'PUT',
    `/monitoring/${state.monitoringRelationshipId}/emergency-contact`,
    {
      token: target.accessToken,
      body: {
        name: 'Emergency Person',
        phoneNumber: '09012345678',
        relationship: 'family',
      },
    },
  );
  expectStatus(updateEmergencyContact, 200, 'upsert emergency contact');

  const watcherNormalContact = await request(
    'GET',
    `/monitoring/${state.monitoringRelationshipId}/emergency-contact`,
    {
      token: watcher.accessToken,
    },
  );
  expectStatus(watcherNormalContact, 403, 'watcher cannot read normal emergency contact');

  await withFrozenTime('2026-04-17T21:00:00+09:00', async () => {
    const dashboard = await request('GET', '/monitoring/dashboard', {
      token: watcher.accessToken,
    });
    expectStatus(dashboard, 200, 'dashboard at stage1');
    const row = dashboard.body.find(
      (item) => item.relationshipId === state.monitoringRelationshipId,
    );
    assert.equal(row.currentStage, 'monitor_stage_1');
    assert.equal(row.canOpenLocationCheck, false);

    const stage1Deliveries =
      await state.monitoringAlertService.reserveDueNotifications(new Date());
    assert.equal(stage1Deliveries.some((item) => item.phase === 'monitor_stage_1'), true);
    const duplicateDeliveries =
      await state.monitoringAlertService.reserveDueNotifications(new Date());
    assert.equal(duplicateDeliveries.length, 0);
  });

  await withFrozenTime('2026-04-18T11:00:00+09:00', async () => {
    const finalStageBeforeNoon = await request(
      'GET',
      `/monitoring/${state.monitoringRelationshipId}/emergency-contact/final-stage`,
      {
        token: watcher.accessToken,
      },
    );
    expectStatus(finalStageBeforeNoon, 404, 'final-stage before noon');
  });

  await withFrozenTime('2026-04-18T06:00:00+09:00', async () => {
    const dashboard = await request('GET', '/monitoring/dashboard', {
      token: watcher.accessToken,
    });
    expectStatus(dashboard, 200, 'dashboard at stage2');
    const row = dashboard.body.find(
      (item) => item.relationshipId === state.monitoringRelationshipId,
    );
    assert.equal(row.currentStage, 'monitor_stage_2');
    assert.equal(row.canOpenLocationCheck, true);

    const stage2Deliveries =
      await state.monitoringAlertService.reserveDueNotifications(new Date());
    assert.equal(stage2Deliveries.some((item) => item.phase === 'monitor_stage_2'), true);
  });

  await withFrozenTime('2026-04-18T12:00:00+09:00', async () => {
    const dashboard = await request('GET', '/monitoring/dashboard', {
      token: watcher.accessToken,
    });
    expectStatus(dashboard, 200, 'dashboard at stage3');
    const row = dashboard.body.find(
      (item) => item.relationshipId === state.monitoringRelationshipId,
    );
    assert.equal(row.currentStage, 'monitor_stage_3');
    assert.equal(row.canOpenLocationCheck, true);

    const finalStageContact = await request(
      'GET',
      `/monitoring/${state.monitoringRelationshipId}/emergency-contact/final-stage`,
      {
        token: watcher.accessToken,
      },
    );
    expectStatus(finalStageContact, 200, 'final-stage at noon');
    assert.equal(finalStageContact.body.emergencyContact.name, 'Emergency Person');

    const stage3Deliveries =
      await state.monitoringAlertService.reserveDueNotifications(new Date());
    assert.equal(stage3Deliveries.some((item) => item.phase === 'monitor_stage_3'), true);
  });

  const staleResponse = await sendRevenueCatEvent({
    id: `evt-stale-${watcher.id}`,
    type: 'INITIAL_PURCHASE',
    app_user_id: `uuid:${watcher.id}`,
    entitlement_id: 'monitoring_plan',
    event_timestamp_ms: Date.now() - 10 * 24 * 60 * 60 * 1000,
    expiration_at_ms: Date.now() + 24 * 60 * 60 * 1000,
    store: 'app_store',
    environment: 'SANDBOX',
  });
  assert.equal(staleResponse.status, 'ignored');
  assert.equal(staleResponse.reason, 'stale_event');

  const expireResponse = await sendRevenueCatEvent({
    id: `evt-expired-${watcher.id}`,
    type: 'EXPIRATION',
    app_user_id: `uuid:${watcher.id}`,
    entitlement_id: 'monitoring_plan',
    event_timestamp_ms: Date.now() + 3000,
    expiration_at_ms: Date.now() - 1000,
    grace_period_expiration_at_ms: null,
    store: 'app_store',
    environment: 'SANDBOX',
  });
  assert.equal(expireResponse.status, 'processed');

  const postExpireEntitlement = await request('GET', '/billing/entitlement', {
    token: watcher.accessToken,
  });
  expectStatus(postExpireEntitlement, 200, 'expired entitlement');
  assert.equal(postExpireEntitlement.body.status, 'expired');
  assert.equal(postExpireEntitlement.body.isActiveForFeatures, false);

  const relationshipAfterExpiry = await request(
    'GET',
    `/monitoring/${state.monitoringRelationshipId}`,
    {
      token: watcher.accessToken,
    },
  );
  expectStatus(relationshipAfterExpiry, 200, 'relationship after expiry');
  assert.equal(relationshipAfterExpiry.body.status, 'stopped');
  assert.equal(relationshipAfterExpiry.body.isEffectivelyActive, false);
}

async function testAccountDeletionFlows() {
  const deleteUser = state.users.deleteUser;
  const deleteTarget = state.users.deleteTarget;

  await grantMonitoringEntitlement(deleteUser.id, {
    id: `evt-active-delete-${deleteUser.id}`,
    event_timestamp_ms: Date.now() + 50000,
  });

  await createPushToken(deleteUser.id, 'delete-user');

  const monitoringStart = await request('POST', '/monitoring/requests', {
    token: deleteUser.accessToken,
    body: {
      targetUserId: deleteTarget.user.userId,
    },
  });
  expectStatus(monitoringStart, 201, 'start deletion monitoring request');

  const monitoringApprove = await request(
    'POST',
    `/monitoring/requests/${monitoringStart.body.id}/approve`,
    {
      token: deleteTarget.accessToken,
    },
  );
  expectStatus(monitoringApprove, 200, 'approve deletion monitoring request');

  const deleteResponse = await request('DELETE', '/account', {
    token: deleteUser.accessToken,
  });
  expectStatus(deleteResponse, 200, 'DELETE /account');
  assert.equal(deleteResponse.body.status, 'scheduled');

  const authMeAfterDelete = await request('GET', '/auth/me', {
    token: deleteUser.accessToken,
  });
  expectStatus(authMeAfterDelete, 401, 'old access token rejected after delete');

  const loginAfterDelete = await request('POST', '/auth/login', {
    body: {
      email: deleteUser.email,
      password: deleteUser.password,
    },
  });
  expectStatus(loginAfterDelete, 401, 'login rejected after delete');

  const refreshAfterDelete = await request('POST', '/auth/refresh', {
    body: {
      refreshToken: deleteUser.refreshToken,
    },
  });
  expectStatus(refreshAfterDelete, 401, 'refresh rejected after delete');

  const stoppedRelationship = await request(
    'GET',
    `/monitoring/${monitoringStart.body.id}`,
    {
      token: deleteTarget.accessToken,
    },
  );
  expectStatus(stoppedRelationship, 200, 'deletion stopped monitoring relationship');
  assert.equal(stoppedRelationship.body.status, 'stopped');

  const deletionRequest = await state.prisma.accountDeletionRequest.findUnique({
    where: {
      userId: deleteUser.id,
    },
  });
  assert.ok(deletionRequest);

  await withFrozenTime(
    new Date(deletionRequest.purge24hAfter.getTime() + 1000).toISOString(),
    async () => {
      const jobResult = await state.accountDeletionScheduler.runDueTasks(new Date());
      assert.equal(jobResult.purge24hUsers.includes(deleteUser.id), true);
    },
  );

  const remainingPushTokens = await state.prisma.pushToken.count({
    where: {
      userId: deleteUser.id,
    },
  });
  assert.equal(remainingPushTokens, 0);
}

function printSummary() {
  console.log('\n=== Step 9 API E2E Summary ===');
  console.log(`Passed: ${results.passed.length}`);
  for (const label of results.passed) {
    console.log(`  - ${label}`);
  }

  console.log(`Failed: ${results.failed.length}`);
  for (const failure of results.failed) {
    console.log(`  - [${failure.severity}] ${failure.label}: ${failure.message}`);
  }
}

async function main() {
  try {
    await setupDatabaseContainer();
    await migrateDatabase();
    await createApp();

    await runStep('public review endpoints', testPublicReviewEndpoints, 'high');
    await runStep('auth flows', testAuthFlows, 'high');
    await runStep('bootstrap main users', bootstrapMainUsers, 'high');
    await runStep('friend flows', testFriendFlows, 'medium');
    await runStep('group flows', testGroupFlows, 'medium');
    await runStep('daily alive flows', testDailyAliveFlows, 'medium');
    await runStep('free notification flows', testFreeNotificationFlows, 'medium');
    await runStep('monitoring and billing flows', testMonitoringAndBillingFlows, 'high');
    await runStep('account deletion flows', testAccountDeletionFlows, 'high');
  } finally {
    printSummary();
    await shutdown();
  }

  if (results.failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  noteFail('runner bootstrap', error, 'high');
  printSummary();
  await shutdown();
  process.exitCode = 1;
});
