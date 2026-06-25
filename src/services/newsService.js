// 新闻热点服务 - 刷新不重复，失败自动重试，24小时去重
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocale } from '../i18n';

// 中文模式API
const API_SOURCES = [
  { name: '百度', platform: 'baidu', url: 'https://orz.ai/api/v1/dailynews?platform=baidu' },
  { name: '微博', platform: 'weibo', url: 'https://orz.ai/api/v1/dailynews?platform=weibo' },
  { name: '知乎', platform: 'zhihu', url: 'https://orz.ai/api/v1/dailynews?platform=zhihu' },
];

const FALLBACK_APIS = [
  { name: '百度', platform: 'baidu', url: 'https://api.vvhan.com/api/hotList/baiduHot', parser: 'vvhan' },
  { name: '微博', platform: 'weibo', url: 'https://api.vvhan.com/api/hotList/wbHot', parser: 'vvhan' },
  { name: '知乎', platform: 'zhihu', url: 'https://api.vvhan.com/api/hotList/zhihuHot', parser: 'vvhan' },
];

// 英文模式API
const EN_API_SOURCES = [
  { name: 'Hacker News', platform: 'hn', url: 'https://hn.algolia.com/api/v1/search?tags=front_page', parser: 'hn' },
  { name: 'Reddit', platform: 'reddit', url: 'https://www.reddit.com/r/popular/hot.json?limit=10', parser: 'reddit' },
];

const ITEMS_PER_SOURCE = 3;
const STORAGE_KEY = '@mianmian_shown_news';
const EXPIRE_MS = 24 * 60 * 60 * 1000;

let consecutiveFailures = 0;
let lastNews = [];
let cachedShownTitles = null;

async function getShownTitles() {
  const now = Date.now();
  if (cachedShownTitles) {
    const valid = cachedShownTitles.filter(r => now - r.ts < EXPIRE_MS);
    if (valid.length !== cachedShownTitles.length) cachedShownTitles = valid;
    return valid;
  }
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    const records = data ? JSON.parse(data) : [];
    const valid = records.filter(r => now - r.ts < EXPIRE_MS);
    cachedShownTitles = valid;
    return valid;
  } catch {
    cachedShownTitles = [];
    return [];
  }
}

async function addShownTitles(titles) {
  try {
    const records = await getShownTitles();
    const now = Date.now();
    const existing = new Set(records.map(r => r.title));
    for (const t of titles) {
      if (!existing.has(t)) {
        records.push({ title: t, ts: now });
      }
    }
    const cleaned = records.filter(r => now - r.ts < EXPIRE_MS);
    cachedShownTitles = cleaned;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {}
}

async function fetchWithRetry(url, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36' },
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return null;
      }
      return await res.json();
    } catch (e) {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function fetchSource(source) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json, text/plain, */*', 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36' },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    
    if (source.parser === 'hn') {
      const json = await res.json();
      if (json?.hits) return json.hits.map(h => ({ title: h.title || '', platform: source.name })).filter(i => i.title);
      return [];
    }
    if (source.parser === 'reddit') {
      const json = await res.json();
      if (json?.data?.children) return json.data.children.map(c => ({ title: c.data?.title || '', platform: source.name })).filter(i => i.title);
      return [];
    }
    
    const json = await res.json();
    if (!json || !json.data || !Array.isArray(json.data)) return [];
    return json.data.map(item => ({ title: item.title || '', platform: source.name })).filter(item => item.title);
  } catch (e) {
    return [];
  }
}

async function fetchFallbackSource(fallback) {
  try {
    const json = await fetchWithRetry(fallback.url);
    if (!json) return [];
    let items = [];
    if (fallback.parser === 'vvhan' && json.data && Array.isArray(json.data)) {
      items = json.data.map(i => i.title || i.name || '').filter(Boolean);
    }
    return items.map(title => ({
      title,
      platform: fallback.name,
    }));
  } catch (e) {
    return [];
  }
}

function pickFromSources(allNews, excludeTitles) {
  const locale = getLocale();
  const isEnglish = locale === 'en';
  const sources = isEnglish ? EN_API_SOURCES : API_SOURCES;
  
  const selected = [];
  const pickedTitles = new Set();
  for (const src of sources) {
    const items = allNews.filter(n => n.platform === src.name);
    let count = 0;
    for (const item of items) {
      if (count >= ITEMS_PER_SOURCE) break;
      if (!excludeTitles.has(item.title) && !pickedTitles.has(item.title)) {
        selected.push(item);
        pickedTitles.add(item.title);
        count++;
      }
    }
  }
  if (selected.length < 6) {
    for (const item of allNews) {
      if (selected.length >= 6) break;
      if (!excludeTitles.has(item.title) && !pickedTitles.has(item.title)) {
        selected.push(item);
        pickedTitles.add(item.title);
      }
    }
  }
  return selected.slice(0, 6);
}

async function fetchAllSources() {
  const locale = getLocale();
  const isEnglish = locale === 'en';
  const sources = isEnglish ? EN_API_SOURCES : API_SOURCES;
  
  const results = await Promise.allSettled(
    sources.map(src => fetchSource(src))
  );
  let allNews = [];
  const failedPlatforms = [];
  results.forEach((result, i) => {
    const src = sources[i];
    if (result.status === 'fulfilled' && result.value.length > 0) {
      allNews = allNews.concat(result.value);
    } else {
      failedPlatforms.push(src.name);
    }
  });

  // 主API全部失败时，尝试备用API（仅中文模式）
  if (!isEnglish && allNews.length === 0 && failedPlatforms.length === sources.length) {
    const fallbackResults = await Promise.allSettled(
      FALLBACK_APIS.map(fb => fetchFallbackSource(fb))
    );
    fallbackResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allNews = allNews.concat(result.value);
      }
    });
  }

  return { allNews, failedPlatforms };
}

export const fetchHotNews = async () => {
  try {
    const { allNews, failedPlatforms } = await fetchAllSources();
    const locale = getLocale();
    const isEnglish = locale === 'en';
    const sources = isEnglish ? EN_API_SOURCES : API_SOURCES;

    if (allNews.length === 0) {
      consecutiveFailures++;
      return { news: lastNews, failedPlatforms: sources.map(s => s.name), error: isEnglish ? 'All APIs failed' : '所有接口请求失败', hide: consecutiveFailures >= 2 };
    }

    consecutiveFailures = 0;
    const records = await getShownTitles();
    const exclude = new Set(records.map(r => r.title));
    let selected = pickFromSources(allNews, exclude);

    if (selected.length === 0 && allNews.length > 0) {
      selected = pickFromSources(allNews, new Set());
    }

    if (selected.length > 0) {
      await addShownTitles(selected.map(s => s.title));
    }
    lastNews = selected.length > 0 ? selected : lastNews;
    const error = failedPlatforms.length > 0 ? `${failedPlatforms.join(', ')} failed` : null;
    return { news: lastNews, failedPlatforms, error, hide: false };
  } catch (e) {
    consecutiveFailures++;
    const locale = getLocale();
    const isEnglish = locale === 'en';
    const sources = isEnglish ? EN_API_SOURCES : API_SOURCES;
    return { news: lastNews, failedPlatforms: sources.map(s => s.name), error: isEnglish ? 'Network request failed' : '网络请求失败', hide: consecutiveFailures >= 2 };
  }
};

export const forceRefreshNews = async () => {
  try {
    consecutiveFailures = 0;
    const { allNews, failedPlatforms } = await fetchAllSources();
    const locale = getLocale();
    const isEnglish = locale === 'en';
    const sources = isEnglish ? EN_API_SOURCES : API_SOURCES;

    if (allNews.length === 0) {
      return { news: lastNews, failedPlatforms: sources.map(s => s.name), error: isEnglish ? 'All APIs failed' : '所有接口请求失败', hide: false };
    }

    const records = await getShownTitles();
    const exclude = new Set(records.map(r => r.title));
    let selected = pickFromSources(allNews, exclude);

    if (selected.length === 0) {
      selected = pickFromSources(allNews, new Set());
    }

    if (selected.length > 0) {
      await addShownTitles(selected.map(s => s.title));
    }

    const currentTitles = new Set(lastNews.map(n => n.title));
    lastNews = selected.length > 0 ? selected : lastNews;
    const noNew = selected.length > 0 && selected.every(n => currentTitles.has(n.title));
    const error = failedPlatforms.length > 0 ? `${failedPlatforms.join(', ')} failed` : null;
    return { news: lastNews, failedPlatforms, error, hide: false, noNew };
  } catch (e) {
    const locale = getLocale();
    const isEnglish = locale === 'en';
    const sources = isEnglish ? EN_API_SOURCES : API_SOURCES;
    return { news: lastNews, failedPlatforms: sources.map(s => s.name), error: isEnglish ? 'Network request failed' : '网络请求失败', hide: false };
  }
};

export default fetchHotNews;
