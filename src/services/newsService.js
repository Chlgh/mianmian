// 新闻热点服务 - 刷新不重复，失败自动重试，24小时去重
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_SOURCES = [
  { name: '百度', platform: 'baidu', url: 'https://orz.ai/api/v1/dailynews?platform=baidu' },
  { name: '微博', platform: 'weibo', url: 'https://orz.ai/api/v1/dailynews?platform=weibo' },
  { name: '知乎', platform: 'zhihu', url: 'https://orz.ai/api/v1/dailynews?platform=zhihu' },
];

// 备用API（orz.ai不可用时使用）
const FALLBACK_APIS = [
  { name: '百度', platform: 'baidu', url: 'https://api.vvhan.com/api/hotList/baiduHot', parser: 'vvhan' },
  { name: '微博', platform: 'weibo', url: 'https://api.vvhan.com/api/hotList/wbHot', parser: 'vvhan' },
  { name: '知乎', platform: 'zhihu', url: 'https://api.vvhan.com/api/hotList/zhihuHot', parser: 'vvhan' },
];

const ITEMS_PER_SOURCE = 2;
const STORAGE_KEY = '@aiall_shown_news';
const EXPIRE_MS = 24 * 60 * 60 * 1000;

let consecutiveFailures = 0;
let lastNews = [];
let cachedShownTitles = null;

async function getShownTitles() {
  if (cachedShownTitles) return cachedShownTitles;
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    const records = data ? JSON.parse(data) : [];
    const now = Date.now();
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
    const json = await fetchWithRetry(source.url);
    if (!json) return [];
    if (!json.data || !Array.isArray(json.data)) return [];
    return json.data.map(item => ({
      title: item.title || '',
      platform: source.name,
    })).filter(item => item.title);
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
  const selected = [];
  const pickedTitles = new Set();
  for (const src of API_SOURCES) {
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
  const results = await Promise.allSettled(
    API_SOURCES.map(src => fetchSource(src))
  );
  let allNews = [];
  const failedPlatforms = [];
  results.forEach((result, i) => {
    const src = API_SOURCES[i];
    if (result.status === 'fulfilled' && result.value.length > 0) {
      allNews = allNews.concat(result.value);
    } else {
      failedPlatforms.push(src.name);
    }
  });

  // 主API全部失败时，尝试备用API
  if (allNews.length === 0 && failedPlatforms.length === API_SOURCES.length) {
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

    if (allNews.length === 0) {
      consecutiveFailures++;
      return { news: lastNews, failedPlatforms: API_SOURCES.map(s => s.name), error: '所有接口请求失败', hide: consecutiveFailures >= 2 };
    }

    consecutiveFailures = 0;
    const records = await getShownTitles();
    const exclude = new Set(records.map(r => r.title));
    const selected = pickFromSources(allNews, exclude);
    if (selected.length > 0) {
      await addShownTitles(selected.map(s => s.title));
    }
    lastNews = selected.length > 0 ? selected : lastNews;
    const error = failedPlatforms.length > 0 ? `${failedPlatforms.join('、')}请求失败` : null;
    return { news: lastNews, failedPlatforms, error, hide: false };
  } catch (e) {
    consecutiveFailures++;
    return { news: lastNews, failedPlatforms: API_SOURCES.map(s => s.name), error: '网络请求失败', hide: consecutiveFailures >= 2 };
  }
};

export const forceRefreshNews = async () => {
  try {
    consecutiveFailures = 0;
    const { allNews, failedPlatforms } = await fetchAllSources();

    if (allNews.length === 0) {
      return { news: lastNews, failedPlatforms: API_SOURCES.map(s => s.name), error: '所有接口请求失败', hide: false };
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
    lastNews = selected;
    const noNew = selected.length > 0 && selected.every(n => currentTitles.has(n.title));
    const error = failedPlatforms.length > 0 ? `${failedPlatforms.join('、')}请求失败` : null;
    return { news: lastNews, failedPlatforms, error, hide: false, noNew };
  } catch (e) {
    return { news: lastNews, failedPlatforms: API_SOURCES.map(s => s.name), error: '网络请求失败', hide: false };
  }
};

export default fetchHotNews;
