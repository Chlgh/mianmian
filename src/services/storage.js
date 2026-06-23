// 存储服务 - 使用 AsyncStorage（Expo SDK 56 兼容版）
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  CONVERSATIONS: '@aiall_conversations',
  ACCOUNTS: '@aiall_accounts',
  SETTINGS: '@aiall_settings',
};

// 写锁，防止并发读写竞态条件
const writeLocks = {};
const acquireLock = async (key) => {
  while (writeLocks[key]) {
    await new Promise(r => setTimeout(r, 20));
  }
  writeLocks[key] = true;
};
const releaseLock = (key) => { writeLocks[key] = false; };

// ==================== 对话管理 ====================

const computeConvStats = (conv) => {
  const msgs = conv.messages || [];
  const assistantMsgs = msgs.filter(m => m.role === 'assistant');
  const uniqueModels = new Set(assistantMsgs.map(m => m.modelId).filter(Boolean));
  const modelCount = uniqueModels.size || assistantMsgs.length;
  const successModels = new Set(assistantMsgs.filter(m => m.success !== false).map(m => m.modelId).filter(Boolean));
  const successCount = successModels.size || assistantMsgs.filter(m => m.success !== false).length;
  return { modelCount, successCount };
};

export const migrateAllConversations = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.CONVERSATIONS);
    if (!data) return;
    const conversations = JSON.parse(data);
    let changed = false;
    for (const conv of conversations) {
      const { modelCount, successCount } = computeConvStats(conv);
      if (conv.modelCount !== modelCount || conv.successCount !== successCount) {
        conv.modelCount = modelCount;
        conv.successCount = successCount;
        changed = true;
      }
    }
    if (changed) {
      await AsyncStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(conversations));
    }
  } catch (e) {}
};

export const getConversations = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.CONVERSATIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取对话列表失败:', error.message);
    return [];
  }
};

export const saveConversation = async (conversation) => {
  await acquireLock(KEYS.CONVERSATIONS);
  try {
    const conversations = await getConversations();
    const index = conversations.findIndex(c => c.id === conversation.id);
    if (index >= 0) {
      conversations[index] = { ...conversations[index], ...conversation, updatedAt: Date.now() };
    } else {
      conversations.unshift(conversation);
    }
    await AsyncStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(conversations));
    return true;
  } catch (error) {
    console.error('保存对话失败:', error.message);
    return false;
  } finally {
    releaseLock(KEYS.CONVERSATIONS);
  }
};

export const deleteConversation = async (conversationId) => {
  await acquireLock(KEYS.CONVERSATIONS);
  try {
    const conversations = await getConversations();
    const filtered = conversations.filter(c => c.id !== conversationId);
    await AsyncStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('删除对话失败:', error.message);
    return false;
  } finally {
    releaseLock(KEYS.CONVERSATIONS);
  }
};

export const clearAllConversations = async () => {
  await acquireLock(KEYS.CONVERSATIONS);
  try {
    await AsyncStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify([]));
    return true;
  } catch (error) {
    console.error('清空对话失败:', error.message);
    return false;
  } finally {
    releaseLock(KEYS.CONVERSATIONS);
  }
};

export const cleanOldConversations = async () => {
  await acquireLock(KEYS.CONVERSATIONS);
  try {
    const conversations = await getConversations();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filtered = conversations.filter(c => {
      const t = c.updatedAt || c.createdAt;
      if (!t) return true;
      return t > thirtyDaysAgo;
    });
    if (filtered.length < conversations.length) {
      await AsyncStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(filtered));
    }
    return filtered;
  } catch (error) {
    console.error('清理过期对话失败:', error.message);
    return [];
  } finally {
    releaseLock(KEYS.CONVERSATIONS);
  }
};

// ==================== 账号管理 ====================

export const getAccounts = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.ACCOUNTS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    return getDefaultAccounts();
  } catch (error) {
    console.error('获取账号列表失败:', error.message);
    try { await AsyncStorage.removeItem(KEYS.ACCOUNTS); } catch (e) {}
    return getDefaultAccounts();
  }
};

export const saveAccounts = async (accounts) => {
  await acquireLock(KEYS.ACCOUNTS);
  try {
    const json = JSON.stringify(accounts);
    await AsyncStorage.setItem(KEYS.ACCOUNTS, json);
    return true;
  } catch (error) {
    console.error('保存账号失败:', error.message);
    return false;
  } finally {
    releaseLock(KEYS.ACCOUNTS);
  }
};

export const updateModelAccount = async (modelId, config) => {
  await acquireLock(KEYS.ACCOUNTS);
  try {
    const accounts = await getAccounts();
    const idx = accounts.findIndex(a => a.id === modelId);
    if (idx >= 0) {
      accounts[idx] = { ...accounts[idx], ...config };
      await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
      return true;
    }
    return false;
  } catch (error) {
    console.error('更新模型配置失败:', error.message);
    return false;
  } finally {
    releaseLock(KEYS.ACCOUNTS);
  }
};

const getDefaultAccounts = () => [
  { id: 'openai', name: 'OpenAI', apiEndpoint: 'https://api.openai.com/v1/chat/completions', apiKey: '', model: 'gpt-4o', enabled: true, color: '#10A37F', format: 'openai', webSearch: true },
  { id: 'claude', name: 'Claude', apiEndpoint: 'https://api.anthropic.com/v1/messages', apiKey: '', model: 'claude-sonnet-4-20250514', enabled: true, color: '#D97706', format: 'claude', webSearch: true },
  { id: 'gemini', name: 'Gemini', apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', apiKey: '', model: 'gemini-2.0-flash', enabled: true, color: '#0066FF', format: 'gemini', webSearch: true },
  { id: 'deepseek', name: 'DeepSeek', apiEndpoint: 'https://api.deepseek.com/chat/completions', apiKey: '', model: 'deepseek-chat', enabled: true, color: '#6366F1', format: 'openai', webSearch: true },
  { id: 'moonshot', name: 'Kimi', apiEndpoint: 'https://api.moonshot.cn/v1/chat/completions', apiKey: '', model: 'moonshot-v1-8k', enabled: true, color: '#AF52DE', format: 'openai', webSearch: true },
];

// ==================== 设置 ====================

export const getSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : { autoSave: true, autoClean: true, cleanDays: 30, language: 'zh-CN' };
  } catch (error) {
    return { autoSave: true, autoClean: true, cleanDays: 30, language: 'zh-CN' };
  }
};

export const saveSettings = async (settings) => {
  await acquireLock(KEYS.SETTINGS);
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('保存设置失败:', error.message);
    return false;
  } finally {
    releaseLock(KEYS.SETTINGS);
  }
};

// ==================== 引导弹窗 ====================

export const getGuideShown = async () => {
  try {
    return await AsyncStorage.getItem('@aiall_guide_shown') === 'true';
  } catch {
    return false;
  }
};

export const setGuideShown = async () => {
  try {
    await AsyncStorage.setItem('@aiall_guide_shown', 'true');
  } catch {}
};

export default {
  getConversations, saveConversation, deleteConversation, clearAllConversations, cleanOldConversations,
  getAccounts, saveAccounts, updateModelAccount,
  getSettings, saveSettings,
  getGuideShown, setGuideShown,
};