/* 繁星课堂 → 英语看板 Chrome 扩展 · popup.js
 *
 * 核心流程:
 * 1. 用户点「抓取当前页面」→ executeScript 注入 scrapePage() 到课程页
 * 2. scrapePage() 返回 {title, items: [{cn, en, type}]}
 * 3. popup 展示预览 + 3 种导出(打开看板 / 复制 / 下载 .md)
 * 4. 「一键导入看板」把格式化内容 URL-编码后附到看板地址作为 ?fx-import=
 *    看板页加载时 app.js 会检测该参数,自动填入输入框
 */

const DEFAULT_DASHBOARD = 'file:///C:/Users/admin/Desktop/AI--/english-dashboard/index.html';

const $ = (id) => document.getElementById(id);

/* ---------- 存取用户设置 ---------- */
async function getDashboardUrl() {
  const { dashboardUrl } = await chrome.storage.local.get('dashboardUrl');
  return dashboardUrl || DEFAULT_DASHBOARD;
}
async function setDashboardUrl(url) {
  await chrome.storage.local.set({ dashboardUrl: url });
}

/* ---------- toast ---------- */
function toast(msg, ms = 1500) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'toast show';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/* ---------- utf8 ↔ base64(URL 安全) ---------- */
function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/* ==================================================================
 * 抓取函数(在页面上下文运行,通过 chrome.scripting 注入)
 * 注意:这个函数里不能引用外部变量,全部自包含
 * ================================================================== */
function scrapePage() {
  const CN_RE = /[\u4e00-\u9fa5]/;
  const EN_WORD_RE = /[a-zA-Z]{2,}/;

  // 1) 所有可见元素
  const isVisible = (el) => {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const st = getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden' && parseFloat(st.opacity || '1') > 0.1;
  };

  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = (n.nodeValue || '').replace(/\s+/g, ' ').trim();
    if (!t || t.length < 2) continue;
    const parent = n.parentElement;
    if (!parent) continue;
    const tag = parent.tagName;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) continue;
    if (!isVisible(parent)) continue;
    textNodes.push({ text: t, el: parent });
  }

  // 2) 分类:中文 / 英文 / 混合
  const cnBlocks = [];
  const enBlocks = [];
  const mixBlocks = [];
  textNodes.forEach((n) => {
    const hasCN = CN_RE.test(n.text);
    const hasEN = EN_WORD_RE.test(n.text);
    if (hasCN && hasEN) mixBlocks.push(n);
    else if (hasCN) cnBlocks.push(n);
    else if (hasEN && n.text.length >= 3) enBlocks.push(n);
  });

  const items = [];
  const seen = new Set();
  const addItem = (cn, en, src) => {
    cn = cn.trim().replace(/^[-*•·]+\s*/, '');
    en = en.trim().replace(/^[-*•·]+\s*/, '');
    if (!cn || !en) return;
    if (cn.length > 200 || en.length > 300) return;
    // 过滤垃圾:纯标点、纯数字、包含敏感 UI 文字
    if (!CN_RE.test(cn)) return;
    if (!EN_WORD_RE.test(en)) return;
    const uiBlackList = /^(首页|我的|登录|登出|返回|收藏|分享|评论|点赞|购买|下载|播放|暂停|全屏|菜单|设置|home|back|login|search|menu|settings)$/i;
    if (uiBlackList.test(cn) || uiBlackList.test(en)) return;
    const key = cn + '|' + en;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ cn, en, src });
  };

  // 策略 A:一行里同时有 CN 和 EN(最常见,如"确认 confirm"或"中: X | 英: Y")
  mixBlocks.forEach((b) => {
    const text = b.text;
    // A1. 明确的分隔符
    const delims = [' | ', ' ｜ ', ' / ', ' :: ', ' → ', ' - ', ' — ', ':', ':'];
    for (const d of delims) {
      if (text.includes(d)) {
        const parts = text.split(d).map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const cnPart = parts.find((p) => CN_RE.test(p) && !EN_WORD_RE.test(p.replace(/[a-zA-Z\s]/g, ''))) || parts[0];
          const enPart = parts.find((p) => EN_WORD_RE.test(p) && !CN_RE.test(p)) || parts[parts.length - 1];
          if (cnPart !== enPart && CN_RE.test(cnPart) && EN_WORD_RE.test(enPart)) {
            addItem(cnPart, enPart, 'mix-delim');
            return;
          }
        }
      }
    }
    // A2. CN 后紧跟 EN(无显式分隔符,比如"确认confirm"或"确认 confirm")
    const m = text.match(/^([\u4e00-\u9fa5][\u4e00-\u9fa5\s、,，。!?]*?)\s*([a-zA-Z][a-zA-Z\s',.!?-]{2,})\s*$/);
    if (m) {
      addItem(m[1], m[2], 'mix-adjacent');
      return;
    }
    // A3. EN 后紧跟 CN(反过来)
    const m2 = text.match(/^([a-zA-Z][a-zA-Z\s',.!?-]{2,})\s+([\u4e00-\u9fa5][\u4e00-\u9fa5\s、,，。!?]*)\s*$/);
    if (m2) {
      addItem(m2[2], m2[1], 'mix-adjacent');
      return;
    }
  });

  // 策略 B:CN 块紧邻 EN 块(兄弟节点 / 父子节点)
  // 按 DOM 顺序收集所有"主要"CN/EN 块,允许对面语种少量渗透(比如中文里夹 "CEO")
  const ordered = [];
  const countCN = (s) => (s.match(/[\u4e00-\u9fa5]/g) || []).length;
  const countEN = (s) => (s.match(/[a-zA-Z]/g) || []).length;
  textNodes.forEach((n) => {
    const cn = countCN(n.text);
    const en = countEN(n.text);
    // "CN 为主":中文字符数 >= 英文字符数,且至少 2 个中文字符
    if (cn >= 2 && cn >= en) ordered.push({ ...n, kind: 'cn' });
    // "EN 为主":英文字符数严格多于中文,且英文至少 3 个
    else if (en >= 3 && en > cn) ordered.push({ ...n, kind: 'en' });
  });
  for (let i = 0; i < ordered.length - 1; i++) {
    const a = ordered[i];
    const b = ordered[i + 1];
    if (a.kind === 'cn' && b.kind === 'en') {
      // 确认两者在 DOM 上"比较近"(共同祖先 ≤ 3 层)
      let la = a.el, lb = b.el, close = false;
      for (let k = 0; k < 4; k++) {
        if (la && la.contains(b.el)) { close = true; break; }
        if (lb && lb.contains(a.el)) { close = true; break; }
        la = la?.parentElement;
        lb = lb?.parentElement;
      }
      if (close || a.el.parentElement === b.el.parentElement) {
        addItem(a.text, b.text, 'sibling');
      }
    } else if (a.kind === 'en' && b.kind === 'cn') {
      if (a.el.parentElement === b.el.parentElement) {
        addItem(b.text, a.text, 'sibling');
      }
    }
  }

  // 策略 C:[data-*] 或 class 名暗示的双语容器
  document.querySelectorAll('[class*="translate"], [class*="bilingual"], [class*="subtitle"], [data-cn], [data-en]')
    .forEach((box) => {
      const cn = box.getAttribute('data-cn') || box.querySelector('[class*="cn"], [class*="chinese"], [lang*="zh"]')?.textContent;
      const en = box.getAttribute('data-en') || box.querySelector('[class*="en"], [class*="english"], [lang*="en"]')?.textContent;
      if (cn && en) addItem(cn, en, 'bilingual-container');
    });

  // 为每条猜类型
  const guessType = (en) => {
    const et = en.trim();
    if (/[.?!。？！]$/.test(et) || et.split(/\s+/).length >= 6) return 'sentence';
    if (et.split(/\s+/).length <= 2) return 'word';
    return 'phrase';
  };
  items.forEach((it) => { it.type = guessType(it.en); });

  return {
    title: document.title || '',
    url: location.href,
    items,
    // 原始候选前 80 条做调试看
    raw: textNodes.slice(0, 80).map((n) => n.text).filter((t) => t.length < 200),
  };
}

/* ==================================================================
 * UI 控制
 * ================================================================== */
let lastResult = null;

async function handleScrape() {
  const btn = $('scrape-btn');
  btn.disabled = true;
  btn.textContent = '⏳ 抓取中...';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error('找不到当前标签');
    // 排除 chrome:// 等
    if (/^(chrome|edge|about|file):/.test(tab.url) && !/\.html$/.test(tab.url)) {
      if (tab.url.startsWith('file:') && !tab.url.endsWith('.html')) {
        throw new Error('当前标签页不是繁星课堂页面');
      }
    }
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapePage,
    });
    lastResult = result;
    renderResult(result);
  } catch (err) {
    console.error('scrape error', err);
    toast('抓取失败:' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 抓取当前页面';
  }
}

function renderResult(r) {
  $('capture-section').classList.add('hidden');
  if (!r.items || r.items.length === 0) {
    $('empty-section').classList.remove('hidden');
    // 存 raw 以便复制
    return;
  }
  $('result-section').classList.remove('hidden');

  $('page-title').textContent = r.title || '(无标题)';
  const total = r.items.length;
  const cn = r.items.filter((i) => i.type === 'word' || i.type === 'phrase').length;
  const sent = r.items.filter((i) => i.type === 'sentence').length;
  $('stat-count').textContent = `${total} 条`;
  $('stat-cn').textContent = `句 ${sent}`;
  $('stat-en').textContent = `词/短语 ${cn}`;
  $('stat-pairs').textContent = `来源 ${new Set(r.items.map((i) => i.src)).size} 种`;

  const list = $('preview-list');
  list.innerHTML = r.items.slice(0, 10).map((it) => {
    const typeLabel = { sentence: '句', word: '词', phrase: '短语' }[it.type] || '?';
    return `
      <div class="preview-item">
        <span class="pi-type">${typeLabel}</span>
        <span class="pi-cn">${escapeHtml(it.cn)}</span>
        <span class="pi-en">${escapeHtml(it.en)}</span>
      </div>
    `;
  }).join('');

  $('raw-dump').textContent = (r.raw || []).join('\n');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

/* ---------- 格式化为看板粘贴格式 ---------- */
function toDashboardMd(r) {
  const lines = [];
  const sentences = r.items.filter((i) => i.type === 'sentence');
  const words = r.items.filter((i) => i.type === 'word');
  const phrases = r.items.filter((i) => i.type === 'phrase');

  if (sentences.length) {
    lines.push('## 句子 Sentences');
    sentences.forEach((s) => lines.push(`- ${s.cn} | ${s.en}`));
    lines.push('');
  }
  if (words.length) {
    lines.push('## 单词 Words');
    words.forEach((s) => lines.push(`- ${s.cn} | ${s.en}`));
    lines.push('');
  }
  if (phrases.length) {
    lines.push('## 短语 Phrases');
    phrases.forEach((s) => lines.push(`- ${s.cn} | ${s.en}`));
    lines.push('');
  }
  return lines.join('\n');
}

/* ---------- 三种导出 ---------- */
async function handleImport() {
  if (!lastResult) return;
  const md = toDashboardMd(lastResult);
  // 1) 先复制做兜底
  try {
    await navigator.clipboard.writeText(md);
  } catch (e) {
    console.warn('clipboard failed', e);
  }
  // 2) 打开看板并附参数
  const dashUrl = $('dashboard-url').value.trim() || DEFAULT_DASHBOARD;
  await setDashboardUrl(dashUrl);
  const title = lastResult.title || `繁星 ${new Date().toISOString().slice(0,10)}`;
  const encoded = utf8ToB64(md);
  // URL 超长就降级到"只复制"模式
  let target;
  if (encoded.length < 8000) {
    const sep = dashUrl.includes('?') ? '&' : '?';
    target = `${dashUrl}${sep}fx-import=${encodeURIComponent(encoded)}&fx-title=${encodeURIComponent(title)}`;
  } else {
    target = dashUrl;
    toast('内容较大,已复制到剪贴板,打开看板后粘贴即可');
  }
  await chrome.tabs.create({ url: target });
}

async function handleCopy() {
  if (!lastResult) return;
  const md = toDashboardMd(lastResult);
  await navigator.clipboard.writeText(md);
  toast('✅ 已复制,去看板粘贴');
}

function handleDownload() {
  if (!lastResult) return;
  const md = toDashboardMd(lastResult);
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fanxing-${date}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
  toast('📤 已下载');
}

async function handleCopyRaw() {
  if (!lastResult) return;
  const all = (lastResult.raw || []).join('\n');
  await navigator.clipboard.writeText(all);
  toast('✅ 页面全文已复制');
}

/* ==================================================================
 * 启动
 * ================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  const url = await getDashboardUrl();
  $('dashboard-url').value = url;

  $('scrape-btn').addEventListener('click', handleScrape);
  $('import-btn').addEventListener('click', handleImport);
  $('copy-btn').addEventListener('click', handleCopy);
  $('download-btn').addEventListener('click', handleDownload);
  $('retry-btn').addEventListener('click', () => {
    $('empty-section').classList.add('hidden');
    $('capture-section').classList.remove('hidden');
  });
  $('copy-raw-btn').addEventListener('click', handleCopyRaw);

  $('open-dashboard').addEventListener('click', async (e) => {
    e.preventDefault();
    const dashUrl = $('dashboard-url').value.trim() || DEFAULT_DASHBOARD;
    await chrome.tabs.create({ url: dashUrl });
  });

  $('settings').addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm('重置扩展设置?(会把看板地址还原)')) {
      await chrome.storage.local.clear();
      $('dashboard-url').value = DEFAULT_DASHBOARD;
      toast('已重置');
    }
  });

  $('dashboard-url').addEventListener('change', () => {
    setDashboardUrl($('dashboard-url').value.trim());
  });
});
