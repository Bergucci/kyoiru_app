const dateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return '未記録';
  }

  const date = value instanceof Date ? value : new Date(value);
  return dateTimeFormatter.format(date);
}

export function toGroupTypeLabel(type: string): string {
  return type === 'family' ? '家族向け' : '友人・恋人向け';
}

export function toAliveStateLabel(state: string | null | undefined): string {
  switch (state) {
    case 'checked_in':
      return '今日反応済み';
    case 'pending':
      return 'まだ未反応';
    case 'overdue':
      return '要確認';
    case 'monitor_alert':
      return '見守り通知中';
    default:
      return '表示なし';
  }
}

export function toMonitoringStageLabel(stage: string): string {
  switch (stage) {
    case 'monitor_stage_1':
      return '第1段階';
    case 'monitor_stage_2':
      return '第2段階';
    case 'monitor_stage_3':
      return '第3段階';
    default:
      return '平常時';
  }
}

export function toEntitlementLabel(status: string): string {
  switch (status) {
    case 'active':
      return '利用中';
    case 'grace':
      return '猶予期間';
    case 'expired':
      return '期限切れ';
    default:
      return '未契約';
  }
}

export function toMonitoringRoleLabel(role: string): string {
  return role === 'watcher' ? '見守る側' : '見守られる側';
}

export function toMonitoringStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return '承認待ち';
    case 'active':
      return '有効';
    case 'rejected':
      return '拒否済み';
    case 'cancelled':
      return '取消済み';
    case 'revoked':
      return '同意撤回済み';
    case 'stopped':
      return '停止中';
    default:
      return status;
  }
}

export function toGpsShareModeLabel(mode: string): string {
  switch (mode) {
    case 'off':
      return '共有しない';
    case 'on_overdue':
      return '未反応時のみ参照可能';
    case 'always':
      return '常時共有';
    default:
      return mode;
  }
}

export function toCheckinTemplateLabel(template: string): string {
  switch (template) {
    case 'morning':
      return '朝のみ';
    case 'morning_evening':
      return '朝・夜';
    case 'morning_noon_evening':
      return '朝・昼・夜';
    default:
      return template;
  }
}

export function toGroupNotificationLevelLabel(level: string): string {
  switch (level) {
    case 'loose':
      return 'ゆるい';
    case 'normal':
      return 'ふつう';
    case 'caring':
      return '気にかける';
    default:
      return level;
  }
}

export function toIdSearchVisibilityLabel(value: string): string {
  return value === 'private' ? 'OFF' : 'ON';
}

export function toAuthProviderLabel(provider: string): string {
  switch (provider) {
    case 'apple':
      return 'Apple';
    case 'google':
      return 'Google';
    case 'line':
      return 'LINE';
    case 'email':
      return 'メール';
    default:
      return provider;
  }
}
