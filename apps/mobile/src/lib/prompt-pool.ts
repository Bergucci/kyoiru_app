/// apps/api/src/daily-prompts/prompt-pool.ts と同キーで表示テキストを揃える。
/// サーバーから降ってくる promptKey に対して question と choices を解決する。
export interface PromptChoice {
  key: string;
  label: string;
}

export interface PromptDefinition {
  key: string;
  question: string;
  choices: readonly PromptChoice[];
}

export const PROMPT_POOL: readonly PromptDefinition[] = [
  {
    key: 'energy_today',
    question: '今日の元気度は？',
    choices: [
      { key: 'sleepy', label: '😴 ねむ' },
      { key: 'meh', label: '😐 ふつう' },
      { key: 'good', label: '🙂 いい' },
      { key: 'fire', label: '🔥 最高' },
    ],
  },
  {
    key: 'where_now',
    question: '今どこにいる？',
    choices: [
      { key: 'home', label: '🏠 家' },
      { key: 'outside', label: '🚶 外' },
      { key: 'work', label: '🏢 仕事・学校' },
      { key: 'bed', label: '🛏 布団' },
    ],
  },
  {
    key: 'week_mood',
    question: '今週どんな感じ？',
    choices: [
      { key: 'great', label: '😃 最高' },
      { key: 'ok', label: '🙂 ふつう' },
      { key: 'tired', label: '😮\u200d💨 疲れ' },
      { key: 'rough', label: '🥺 大変' },
    ],
  },
  {
    key: 'lunch_done',
    question: 'お昼もう食べた？',
    choices: [
      { key: 'yes', label: '✅ 食べた' },
      { key: 'later', label: '⌛ これから' },
      { key: 'skip', label: '❌ とばす' },
    ],
  },
  {
    key: 'music_mood',
    question: '今日の気分の音楽は？',
    choices: [
      { key: 'pop', label: '🎵 ポップ' },
      { key: 'calm', label: '🎧 静か' },
      { key: 'hype', label: '🔥 ノリノリ' },
      { key: 'silent', label: '🤫 なし' },
    ],
  },
  {
    key: 'sleep_last',
    question: '昨日の睡眠は？',
    choices: [
      { key: 'great', label: '😴 ぐっすり' },
      { key: 'ok', label: '🙂 まあまあ' },
      { key: 'bad', label: '😵 あまり' },
    ],
  },
  {
    key: 'weekend_plan',
    question: '次の休みどうする？',
    choices: [
      { key: 'out', label: '🚶 出かける' },
      { key: 'home', label: '🏠 家でゆっくり' },
      { key: 'friends', label: '👥 誰かと会う' },
      { key: 'unsure', label: '🤔 未定' },
    ],
  },
  {
    key: 'coffee_or_tea',
    question: 'コーヒー派？お茶派？',
    choices: [
      { key: 'coffee', label: '☕ コーヒー' },
      { key: 'tea', label: '🍵 お茶' },
      { key: 'water', label: '💧 お水' },
      { key: 'other', label: '🧃 ほか' },
    ],
  },
  {
    key: 'morning_feel',
    question: '今朝の調子は？',
    choices: [
      { key: 'sharp', label: '⚡ シャキッ' },
      { key: 'slow', label: '🐢 ゆっくり' },
      { key: 'tough', label: '🥲 重め' },
    ],
  },
  {
    key: 'today_effort',
    question: '今日どのくらいがんばる？',
    choices: [
      { key: 'full', label: '💪 フルパワー' },
      { key: 'steady', label: '🙂 ほどほど' },
      { key: 'rest', label: '🛋 休む日' },
    ],
  },
  {
    key: 'weather_vibe',
    question: '今日の天気、気分的には？',
    choices: [
      { key: 'sunny', label: '☀️ いい感じ' },
      { key: 'cloudy', label: '☁️ どんより' },
      { key: 'rainy', label: '🌧 しっとり' },
      { key: 'cold', label: '🧥 さむい' },
    ],
  },
  {
    key: 'stress_level',
    question: '今日のストレス度は？',
    choices: [
      { key: 'low', label: '😌 少なめ' },
      { key: 'mid', label: '😐 ふつう' },
      { key: 'high', label: '🫠 多め' },
    ],
  },
  {
    key: 'next_meal',
    question: '次ご飯、何食べたい？',
    choices: [
      { key: 'rice', label: '🍚 ご飯もの' },
      { key: 'noodle', label: '🍜 麺' },
      { key: 'bread', label: '🍞 パン' },
      { key: 'sweet', label: '🍰 甘いもの' },
    ],
  },
  {
    key: 'screen_time',
    question: '今日スマホ見すぎ？',
    choices: [
      { key: 'ok', label: '🙂 ちょうどいい' },
      { key: 'much', label: '📱 見すぎた' },
      { key: 'less', label: '📵 控えめ' },
    ],
  },
  {
    key: 'body_feel',
    question: '体の調子は？',
    choices: [
      { key: 'good', label: '💪 絶好調' },
      { key: 'ok', label: '🙂 まあまあ' },
      { key: 'sore', label: '🥲 だるい' },
    ],
  },
  {
    key: 'talk_today',
    question: '今日だれかと話した？',
    choices: [
      { key: 'many', label: '👥 たくさん' },
      { key: 'some', label: '🙂 少し' },
      { key: 'none', label: '🤐 ひとりだった' },
    ],
  },
  {
    key: 'outside_time',
    question: '今日の外出時間は？',
    choices: [
      { key: 'long', label: '🌳 長め' },
      { key: 'short', label: '🚶 短め' },
      { key: 'zero', label: '🏠 ゼロ' },
    ],
  },
  {
    key: 'snack_today',
    question: '今日おやつ食べた？',
    choices: [
      { key: 'yes', label: '🍪 食べた' },
      { key: 'later', label: '⌛ これから' },
      { key: 'no', label: '🙅 食べてない' },
    ],
  },
  {
    key: 'focus_level',
    question: '集中できてる？',
    choices: [
      { key: 'deep', label: '🎯 バッチリ' },
      { key: 'okay', label: '🙂 まあまあ' },
      { key: 'scattered', label: '🌀 散漫' },
    ],
  },
  {
    key: 'tonight_plan',
    question: '今夜の予定は？',
    choices: [
      { key: 'chill', label: '🛋 のんびり' },
      { key: 'work', label: '💻 作業' },
      { key: 'out', label: '🌃 外出' },
      { key: 'early', label: '🛏 早寝' },
    ],
  },
  {
    key: 'kindness_today',
    question: '今日、自分にやさしくできた？',
    choices: [
      { key: 'yes', label: '🤗 できた' },
      { key: 'trying', label: '🙂 まあまあ' },
      { key: 'not_yet', label: '🥲 これから' },
    ],
  },
];

const PROMPT_BY_KEY = new Map<string, PromptDefinition>(
  PROMPT_POOL.map((prompt) => [prompt.key, prompt]),
);

export function getPromptDefinition(key: string): PromptDefinition | null {
  return PROMPT_BY_KEY.get(key) ?? null;
}
