// 热点话题服务 - 聚合多个免费API获取网络热点
// 支持多平台：微博、知乎、百度、抖音、头条、B站、36氪、澎湃新闻等

// 所有可用的免费热点API列表（无需API Key）
const HOT_API_LIST = [
  // === 韩小韩API系列（最稳定，CORS友好）===
  { id: 'vvhan-weibo',     name: '微博热搜', url: 'https://api.vvhan.com/api/hotList/wbHot', parser: parseVVHan },
  { id: 'vvhan-zhihu',     name: '知乎热榜', url: 'https://api.vvhan.com/api/hotList/zhihuHot', parser: parseVVHan },
  { id: 'vvhan-baidu',     name: '百度热搜', url: 'https://api.vvhan.com/api/hotList/baiduHot', parser: parseVVHan },
  { id: 'vvhan-douyin',    name: '抖音热榜', url: 'https://api.vvhan.com/api/hotList/douyinHot', parser: parseVVHan },
  { id: 'vvhan-toutiao',   name: '头条热榜', url: 'https://api.vvhan.com/api/hotList/toutiao', parser: parseVVHan },
  { id: 'vvhan-bili',      name: 'B站热榜', url: 'https://api.vvhan.com/api/hotList/biliHot', parser: parseVVHan },
  { id: 'vvhan-36kr',      name: '36氪热榜', url: 'https://api.vvhan.com/api/hotList/36kr', parser: parseVVHan },
  { id: 'vvhan-thepaper',  name: '澎湃热榜', url: 'https://api.vvhan.com/api/hotList/thepaper', parser: parseVVHan },
  { id: 'vvhan-history',   name: '历史上的今天', url: 'https://api.vvhan.com/api/hotList/history', parser: parseVVHan },
  // === 其他免费API（备选）===
  { id: 'tenapi',          name: '综合热搜', url: 'https://tenapi.cn/v2/hotlist', parser: parseTenAPI },
  { id: 'aoau-zhihu',      name: '知乎热搜', url: 'https://api.aoau.top/api/zhihu/hot', parser: parseGeneric },
  { id: '52vmy-zhihu',     name: '知乎热点', url: 'https://api.52vmy.cn/api/wl/zhihu', parser: parse52vmy },
  { id: 'knmsn',           name: '热点聚合', url: 'https://www.knmsn.cn/api/hotlist', parser: parseKnmsn },
];

// 解析韩小韩API响应格式
function parseVVHan(data) {
  // 格式: { success: true, data: [ { title: '...', ... } ] }
  if (data?.data && Array.isArray(data.data)) {
    return data.data.map(i => i.title || i.name || i.word || i.sentence || '').filter(Boolean);
  }
  return [];
}

// 解析十安API响应格式
function parseTenAPI(data) {
  // 格式: { data: { list: [ { title: '...' } ] } }
  if (data?.data?.list && Array.isArray(data.data.list)) {
    return data.data.list.map(i => i.title || i.name || '').filter(Boolean);
  }
  return [];
}

// 解析通用格式（直接返回数组或data字段）
function parseGeneric(data) {
  if (Array.isArray(data)) {
    return data.map(i => i.title || i.name || i.word || '').filter(Boolean);
  }
  if (data?.data && Array.isArray(data.data)) {
    return data.data.map(i => i.title || i.name || i.word || '').filter(Boolean);
  }
  // 尝试找到第一个数组字段
  for (const key of Object.keys(data || {})) {
    if (Array.isArray(data[key]) && data[key].length > 0) {
      const first = data[key][0];
      if (typeof first === 'string') return data[key].filter(Boolean);
      if (typeof first === 'object') {
        const items = data[key].map(i => i.title || i.name || i.word || '').filter(Boolean);
        if (items.length > 0) return items;
      }
    }
  }
  return [];
}

// 解析52vmy格式
function parse52vmy(data) {
  // 格式: { code: 200, data: [...] }
  if (data?.data && Array.isArray(data.data)) {
    return data.data.map(i => {
      if (typeof i === 'string') return i;
      return i.title || i.name || i.word || '';
    }).filter(Boolean);
  }
  return [];
}

// 解析knmsn格式
function parseKnmsn(data) {
  // 格式: { code: 200, list: [ { title: '...' } ] }
  if (data?.list && Array.isArray(data.list)) {
    return data.list.map(i => i.title || i.name || '').filter(Boolean);
  }
  return [];
}

// 去重工具：基于前N个字符去重
function deduplicate(items, keyLen = 6) {
  const seen = new Set();
  return items.filter(item => {
    const key = typeof item === 'string' ? item.substring(0, keyLen) : String(item).substring(0, keyLen);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Emoji映射表
const PLATFORM_EMOJIS = {
  'vvhan-weibo':    '🔥',
  'vvhan-zhihu':    '💡',
  'vvhan-baidu':    '📰',
  'vvhan-douyin':   '🎵',
  'vvhan-toutiao':  '📱',
  'vvhan-bili':     '🎮',
  'vvhan-36kr':     '📈',
  'vvhan-thepaper': '📰',
  'vvhan-history':  '📅',
};

const FALLBACK_EMOJIS = ['🔥', '💡', '🚀', '📱', '🎮', '🎬', '📈', '⚽', '🎨', '💻', '⚛️', '🤖', '🔬'];

// 内置备用热点（所有API都失败时使用）
const FALLBACK_TOPICS = [
  { text: 'AI技术最新突破', emoji: '🤖' },
  { text: '今日热点新闻', emoji: '🔥' },
  { text: '科技前沿动态', emoji: '🚀' },
  { text: '热门话题讨论', emoji: '💡' },
  { text: '数码新品发布', emoji: '📱' },
  { text: '影视资讯速递', emoji: '🎬' },
];

// 截断并添加省略号
function truncate(text, maxLen = 18) {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '…' : text;
}

/**
 * 获取热点话题
 * @param {number} maxItems - 最多返回条数（默认6）
 * @returns {Promise<Array<{text: string, emoji: string, source: string}>>}
 */
export async function fetchHotTopics(maxItems = 6) {
  // 随机打乱API顺序，轮流使用避免单一依赖
  const shuffledApis = [...HOT_API_LIST].sort(() => Math.random() - 0.5);
  // 优先使用韩小韩系列
  const vvhanApis = shuffledApis.filter(a => a.id.startsWith('vvhan-'));
  const otherApis = shuffledApis.filter(a => !a.id.startsWith('vvhan-'));
  const orderedApis = [...vvhanApis, ...otherApis];

  const allItems = [];
  const seenTexts = new Set();

  // 逐个尝试API（不并行，避免同时超时导致整体失败）
  for (const api of orderedApis) {
    if (allItems.length >= maxItems * 2) break; // 已有足够数据

    try {
      const response = await fetch(api.url, {
        signal: AbortSignal.timeout(6000),
        headers: { 'Accept': 'application/json, text/plain, */*' },
      });
      
      if (!response.ok) continue;
      
      const text = await response.text();
      const data = JSON.parse(text);
      const items = api.parser(data);
      
      if (!items || items.length === 0) continue;

      // 去重后加入
      for (const item of items) {
        if (!item || seenTexts.has(item.substring(0, 6))) continue;
        seenTexts.add(item.substring(0, 6));
        const emoji = PLATFORM_EMOJIS[api.id] || FALLBACK_EMOJIS[allItems.length % FALLBACK_EMOJIS.length];
        allItems.push({
          text: item,
          emoji,
          source: api.name,
        });
        if (allItems.length >= maxItems * 2) break;
      }
    } catch (e) {
      // 单个API失败不影响整体
      console.log(`[HotTopics] API ${api.id} failed:`, e.message);
    }
  }

  // 如果收集到的数据不足，混入备用热点
  if (allItems.length < maxItems) {
    for (const fb of FALLBACK_TOPICS) {
      if (allItems.length >= maxItems) break;
      const key = fb.text.substring(0, 6);
      if (!seenTexts.has(key)) {
        seenTexts.add(key);
        allItems.push({ text: fb.text, emoji: fb.emoji, source: '内置' });
      }
    }
  }

  // 截取并格式化
  const result = allItems.slice(0, maxItems).map(item => ({
    ...item,
    display: `${item.emoji} ${truncate(item.text)}`,
    full: item.text,
  }));

  return result;
}

/**
 * 获取指定平台的热点
 * @param {string} platformId - 平台ID: weibo | zhihu | baidu | douyin | toutiao | bili | 36kr | thepaper | history
 * @returns {Promise<Array>}
 */
export async function fetchPlatformHotTopics(platformId) {
  const api = HOT_API_LIST.find(a => a.id === `vvhan-${platformId}`);
  if (!api) return [];

  try {
    const response = await fetch(api.url, {
      signal: AbortSignal.timeout(6000),
      headers: { 'Accept': 'application/json, text/plain, */*' },
    });
    if (!response.ok) return [];
    const text = await response.text();
    const data = JSON.parse(text);
    const items = api.parser(data);
    return items.slice(0, 15).map((item, i) => ({
      text: item,
      rank: i + 1,
      source: api.name,
    }));
  } catch (e) {
    return [];
  }
}

export default {
  fetchHotTopics,
  fetchPlatformHotTopics,
  HOT_API_LIST,
};