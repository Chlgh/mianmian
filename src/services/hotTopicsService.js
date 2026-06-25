// 热点话题服务 - 聚合多个免费API获取网络热点
// 支持多平台：微博、知乎、百度、抖音、头条、B站、36氪、澎湃新闻等
// 英文模式：Hacker News、Google News、Reddit
import { t, getLocale } from '../i18n';

// 所有可用的免费热点API列表（无需API Key）
const getNewsSources = () => [
  // === 韩小韩API系列（最稳定，CORS友好）===
  { id: 'vvhan-weibo',     name: t('news.source.weibo'), url: 'https://api.vvhan.com/api/hotList/wbHot', parser: parseVVHan },
  { id: 'vvhan-zhihu',     name: t('news.source.zhihu'), url: 'https://api.vvhan.com/api/hotList/zhihuHot', parser: parseVVHan },
  { id: 'vvhan-baidu',     name: t('news.source.baidu'), url: 'https://api.vvhan.com/api/hotList/baiduHot', parser: parseVVHan },
  { id: 'vvhan-douyin',    name: t('news.source.douyin'), url: 'https://api.vvhan.com/api/hotList/douyinHot', parser: parseVVHan },
  { id: 'vvhan-toutiao',   name: t('news.source.toutiao'), url: 'https://api.vvhan.com/api/hotList/toutiao', parser: parseVVHan },
  { id: 'vvhan-bili',      name: t('news.source.bili'), url: 'https://api.vvhan.com/api/hotList/biliHot', parser: parseVVHan },
  { id: 'vvhan-36kr',      name: t('news.source.kr36'), url: 'https://api.vvhan.com/api/hotList/36kr', parser: parseVVHan },
  { id: 'vvhan-thepaper',  name: t('news.source.thepaper'), url: 'https://api.vvhan.com/api/hotList/thepaper', parser: parseVVHan },
  { id: 'vvhan-history',   name: t('news.source.history'), url: 'https://api.vvhan.com/api/hotList/history', parser: parseVVHan },
  // === 其他免费API（备选）===
  { id: 'tenapi',          name: t('news.source.comprehensive'), url: 'https://tenapi.cn/v2/hotlist', parser: parseTenAPI },
  { id: 'aoau-zhihu',      name: t('news.source.zhihuHot'), url: 'https://api.aoau.top/api/zhihu/hot', parser: parseGeneric },
  { id: '52vmy-zhihu',     name: t('news.source.zhihuTrending'), url: 'https://api.52vmy.cn/api/wl/zhihu', parser: parse52vmy },
  { id: 'knmsn',           name: t('news.source.aggregate'), url: 'https://www.knmsn.cn/api/hotlist', parser: parseKnmsn },
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

// 国际新闻API解析器
function parseHackerNews(data) {
  if (data?.hits && Array.isArray(data.hits)) {
    return data.hits.map(h => h.title).filter(Boolean);
  }
  return [];
}

function parseGoogleNews(xml) {
  const titles = [];
  const matches = xml.matchAll(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/gi);
  for (const m of matches) {
    const t = m[1].trim();
    if (t && t !== 'Google News') titles.push(t);
  }
  return titles;
}

function parseReddit(data) {
  if (data?.data?.children && Array.isArray(data.data.children)) {
    return data.data.children.map(c => c.data?.title).filter(Boolean);
  }
  return [];
}

// 英文模式国际新闻API
const getInternationalSources = () => [
  { id: 'hn', name: t('news.en.source.hn'), url: 'https://hn.algolia.com/api/v1/search?tags=front_page', parser: parseHackerNews },
  { id: 'reddit', name: t('news.en.source.reddit'), url: 'https://www.reddit.com/r/popular/hot.json?limit=10', parser: parseReddit },
];

// 英文模式备用话题
const getEnglishFallbackTopics = () => [
  { text: t('news.en.fallback.ai'), emoji: '🤖' },
  { text: t('news.en.fallback.tech'), emoji: '🚀' },
  { text: t('news.en.fallback.world'), emoji: '🌍' },
  { text: t('news.en.fallback.science'), emoji: '🔬' },
  { text: t('news.en.fallback.startup'), emoji: '💼' },
  { text: t('news.en.fallback.culture'), emoji: '🎨' },
];

// 内置备用热点（所有API都失败时使用）
const getFallbackTopics = () => [
  { text: t('news.fallback.ai'), emoji: '🤖' },
  { text: t('news.fallback.news'), emoji: '🔥' },
  { text: t('news.fallback.tech'), emoji: '🚀' },
  { text: t('news.fallback.topic'), emoji: '💡' },
  { text: t('news.fallback.digital'), emoji: '📱' },
  { text: t('news.fallback.entertainment'), emoji: '🎬' },
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
  const locale = getLocale();
  const isEnglish = locale === 'en';
  
  // 英文模式使用国际新闻API
  if (isEnglish) {
    return fetchInternationalTopics(maxItems);
  }
  
  // 中文模式使用国内API
  return fetchChineseTopics(maxItems);
}

async function fetchInternationalTopics(maxItems) {
  const apis = getInternationalSources();
  const allItems = [];
  const seenTexts = new Set();

  for (const api of apis) {
    if (allItems.length >= maxItems * 2) break;
    try {
      const response = await fetch(api.url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json, text/plain, */*' },
      });
      if (!response.ok) continue;
      
      let items;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('xml') || contentType.includes('text')) {
        const text = await response.text();
        items = api.parser(text);
      } else {
        const data = await response.json();
        items = api.parser(data);
      }
      
      if (!items || items.length === 0) continue;
      for (const item of items) {
        if (!item || seenTexts.has(item.substring(0, 8))) continue;
        seenTexts.add(item.substring(0, 8));
        allItems.push({ text: item, emoji: '📰', source: api.name });
        if (allItems.length >= maxItems * 2) break;
      }
    } catch (e) {
      console.log(`[HotTopics] International API ${api.id} failed:`, e.message);
    }
  }

  if (allItems.length < maxItems) {
    for (const fb of getEnglishFallbackTopics()) {
      if (allItems.length >= maxItems) break;
      const key = fb.text.substring(0, 8);
      if (!seenTexts.has(key)) {
        seenTexts.add(key);
        allItems.push({ text: fb.text, emoji: fb.emoji, source: t('news.source.builtin') });
      }
    }
  }

  return allItems.slice(0, maxItems).map(item => ({
    ...item,
    display: `${item.emoji} ${truncate(item.text)}`,
    full: item.text,
  }));
}

async function fetchChineseTopics(maxItems) {
  // 随机打乱API顺序，轮流使用避免单一依赖
  const shuffledApis = [...getNewsSources()].sort(() => Math.random() - 0.5);
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
    for (const fb of getFallbackTopics()) {
      if (allItems.length >= maxItems) break;
      const key = fb.text.substring(0, 6);
      if (!seenTexts.has(key)) {
        seenTexts.add(key);
        allItems.push({ text: fb.text, emoji: fb.emoji, source: t('news.source.builtin') });
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
  const api = getNewsSources().find(a => a.id === `vvhan-${platformId}`);
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
  getNewsSources,
};