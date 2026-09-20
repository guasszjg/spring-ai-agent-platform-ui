export function toDebugTool(view) {
  if (!view) return null
  return {
    id: view.id,
    code: view.code,
    name: view.name,
    prefix: view.prefix,
    title: view.title,
    icon: view.icon,
    iconClass: view.iconClass || 'icon-orange',
    customIcon: view.customIcon || undefined,
    help: view.help,
    enabled: true,
    description: view.description,
    config: { ...(view.config || {}) },
    category: view.category,
    hasApiKey: !!view.hasApiKey
  }
}

export function matchSavedTool(saved, catalog) {
  if (!saved || !catalog?.length) return null
  return catalog.find(t =>
    (saved.id && t.id === saved.id)
    || (saved.code && t.code === saved.code)
    || t.name === saved.name
  ) || null
}

export function categoryLabel(category) {
  if (category === 'SEARCH') return '联网检索'
  if (category === 'CUSTOM') return '自定义'
  return '时间工具'
}

export const FALLBACK_PLATFORM_TOOLS = [
  {
    id: 'tool-time-convert-timezone',
    code: 'time_convert_timezone',
    name: '时区转换',
    title: '时区转换',
    prefix: 'time',
    category: 'TIME',
    icon: 'fa-solid fa-clock',
    iconClass: 'icon-orange',
    help: '将指定时间在不同时区（如北京、纽约、伦敦等）之间进行转换计算',
    description: '将指定时间在不同时区之间进行换算转换。例如将北京时间转换为纽约时间、东京时间或伦敦时间。',
    config: { timezone: 'Asia/Shanghai', format: 'yyyy-MM-dd HH:mm:ss' },
    enabled: true,
    builtin: true
  },
  {
    id: 'tool-time-timestamp-converter',
    code: 'time_timestamp_converter',
    name: '时间戳转换',
    title: '时间戳转换',
    prefix: 'time',
    category: 'TIME',
    icon: 'fa-solid fa-clock',
    iconClass: 'icon-orange',
    help: '毫秒级/秒级 Unix 时间戳与标准日期时间字符串相互转换',
    description: 'Unix时间戳与格式化时间字符串之间的相互转换。可将秒级/毫秒级时间戳转为日期时间，或将日期时间转为时间戳。',
    config: { timezone: 'Asia/Shanghai', format: 'yyyy-MM-dd HH:mm:ss' },
    enabled: true,
    builtin: true
  },
  {
    id: 'tool-time-get-current-time',
    code: 'time_get_current_time',
    name: '获取当前时间',
    title: '获取当前时间',
    prefix: 'time',
    category: 'TIME',
    icon: 'fa-solid fa-clock',
    iconClass: 'icon-orange',
    help: '获取当前系统的精确年月日、时分秒与时区时间',
    description: '获取指定时区的当前精确日期和时间（包含年月日、时分秒以及星期几）。当用户询问当前时间、现在几点、今天几号等问题时调用。',
    config: { timezone: 'Asia/Shanghai', format: 'yyyy-MM-dd HH:mm:ss' },
    enabled: true,
    builtin: true
  },
  {
    id: 'tool-time-date-calculator',
    code: 'time_date_calculator',
    name: '获取时间戳',
    title: '获取时间戳',
    prefix: 'time',
    category: 'TIME',
    icon: 'fa-solid fa-clock',
    iconClass: 'icon-orange',
    help: '计算日期偏移与两个日期相隔天数',
    description: '计算两个日期之间相隔的天数，或者计算基准日期增加/减少若干天后的新日期。',
    config: { timezone: 'Asia/Shanghai', format: 'yyyy-MM-dd HH:mm:ss' },
    enabled: true,
    builtin: true
  },
  {
    id: 'tool-time-calculate-weekday',
    code: 'time_calculate_weekday',
    name: '星期几计算器',
    title: '星期几计算器',
    prefix: 'time',
    category: 'TIME',
    icon: 'fa-solid fa-calendar-days',
    iconClass: 'icon-orange',
    help: '计算历史上或未来的任意特定日期属于星期几',
    description: '计算历史上或未来的某个具体日期是星期几。当用户询问某一天是周几或星期几时调用。',
    config: { timezone: 'Asia/Shanghai', format: 'yyyy-MM-dd HH:mm:ss' },
    enabled: true,
    builtin: true
  },
  {
    id: 'tool-bocha-web-search',
    code: 'bocha_web_search',
    name: '联网检索',
    title: 'Bocha Web Search',
    prefix: 'bocha',
    category: 'SEARCH',
    icon: 'fa-solid fa-globe',
    iconClass: 'icon-bocha-badge',
    customIcon: 'bocha',
    help: '博查 AI 搜索引擎，提供全网实时网页、新闻与知识检索',
    description: '博查 AI 联网搜索引擎。当用户询问最新时事、实时天气、新闻事件、实时数据或任何需要获取最新互联网真实信息的场景时调用。',
    config: { count: 5, freshness: 'noLimit', summary: true },
    enabled: true,
    builtin: true,
    hasApiKey: false
  }
]

export function timezoneLabel(tz) {
  const map = {
    'Asia/Shanghai': '北京时间',
    UTC: 'UTC',
    'America/New_York': '美东时间',
    'Europe/London': '伦敦时间',
    'Asia/Tokyo': '东京时间'
  }
  return map[tz] || tz || '北京时间'
}

export function freshnessLabel(value) {
  const map = {
    noLimit: '不限时间',
    oneDay: '近24小时',
    oneWeek: '近一周',
    oneMonth: '近一月',
    oneYear: '近一年'
  }
  return map[value] || '不限时间'
}
