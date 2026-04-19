/* ============== 英语学习看板 · 核心逻辑 ==============
 * 模块：
 *   - initMethods()      加载方法区
 *   - initRecording()    Web Speech API 录音
 *   - initCopyTools()    翻译/邮件/演讲 → 生成 prompt 复制到剪贴板
 *   - initFlashcards()   术语卡片
 *   - initStats()        今日进度 localStorage
 * ================================================== */

const STORAGE_KEY = 'english-dashboard-v1';

/* ---------- 全局状态 ---------- */
const state = {
  methods: null,
  vocab: null,
  templates: null,
  currentCategory: null,
  currentCardIndex: 0,
  cardsFlipped: false,
  recognition: null,
  isRecording: false,
  stats: loadStats()
};

/* ---------- 工具函数 ---------- */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadStats() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const today = todayStr();
  const empty = { date: today, translation: 0, email: 0, speech: 0, recording: 0, template: 0, cards: {}, remembered: 0 };
  if (!raw) return empty;
  try {
    const data = JSON.parse(raw);
    if (data.date !== today) {
      // 新的一天——重置计数器，但保留单词记忆进度
      return { ...empty, cards: data.cards || {}, remembered: data.remembered || 0 };
    }
    return { ...empty, ...data };
  } catch (e) {
    return empty;
  }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.stats));
}

function incStat(key) {
  state.stats[key] = (state.stats[key] || 0) + 1;
  saveStats();
  renderStats();
}

function toast(msg, duration = 2000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

/* ---------- 语音朗读（TTS） ---------- */
const speech = {
  voice: null,
  rate: 0.9,
  currentUtterance: null,

  init() {
    if (!('speechSynthesis' in window)) {
      console.warn('speechSynthesis not supported');
      return;
    }
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // 优先：美音女声 → 美音任意 → 任意英音
      this.voice =
        voices.find(v => v.lang === 'en-US' && /female|zira|samantha|karen|allison|aria/i.test(v.name)) ||
        voices.find(v => v.lang === 'en-US') ||
        voices.find(v => v.lang.startsWith('en')) ||
        null;
    };
    loadVoices();
    if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  },

  speak(text, opts = {}) {
    if (!('speechSynthesis' in window)) {
      toast('当前浏览器不支持朗读');
      return null;
    }
    this.stop();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    if (this.voice) u.voice = this.voice;
    u.rate = opts.rate != null ? opts.rate : this.rate;
    u.pitch = 1.0;
    if (opts.onEnd) u.onend = opts.onEnd;
    this.currentUtterance = u;
    speechSynthesis.speak(u);
    return u;
  },

  stop() {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  },

  // 按句切分并逐句播放；支持高亮回调和句间停顿
  playSequence(sentences, opts = {}) {
    this.stop();
    const rate = opts.rate != null ? opts.rate : this.rate;
    const pauseMs = opts.pauseMs || 300;
    const onSentence = opts.onSentence || (() => {});
    const onDone = opts.onDone || (() => {});

    let i = 0;
    let cancelled = false;

    const speakNext = () => {
      if (cancelled) return;
      if (i >= sentences.length) {
        onDone();
        return;
      }
      onSentence(i, sentences[i]);
      this.speak(sentences[i], {
        rate,
        onEnd: () => {
          i++;
          setTimeout(speakNext, pauseMs);
        }
      });
    };
    speakNext();

    // 返回取消器
    return { cancel: () => { cancelled = true; this.stop(); } };
  },

  // 切分句子（. ! ? 后）
  splitSentences(text) {
    // 保留分隔符，按 . ! ? 切（考虑"Ms. / Mr." 等缩写会有误判，但演示文本里一般 OK）
    return text
      .split(/(?<=[.!?])\s+(?=[A-Z\[])/g)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
};

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (_) {
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}

/* ===== 一键开练：复制 prompt + 打开 claude.ai 网页版预填好 =====
 * 设计目标：手机和电脑都能直接练，不再依赖 Claude Code 桌面端。
 *   - claude.ai/new?q=<encoded prompt> 会把 prompt 预填到对话框
 *   - URL 编码后过长（>6000 字符）就退化成"只复制"，到了页面手动粘
 *   - 同时把 prompt 复制到剪贴板做兜底
 *   - 必须在 click handler 同步路径里调 window.open，否则会被弹窗拦截
 */
function sendToClaude(prompt) {
  // 同步先复制 + 同步开窗口（必须在用户手势内）
  copyToClipboard(prompt);  // 不 await，避免阻塞 window.open
  const encoded = encodeURIComponent(prompt);
  const url = encoded.length < 6000
    ? `https://claude.ai/new?q=${encoded}`
    : 'https://claude.ai/new';
  // _blank: 桌面浏览器开新 tab，iOS PWA 会弹出系统 Safari
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  return { opened: !!opened, truncated: encoded.length >= 6000 };
}

/* ============== 1. 方法区 ============== */
function initMethods() {
  state.methods = window.METHODS_DATA;
  if (!state.methods) {
    console.error('METHODS_DATA not loaded');
    return;
  }

  const container = document.getElementById('methods-container');
  container.innerHTML = '';

  state.methods.methods.forEach((m) => {
    const card = document.createElement('article');
    card.className = 'method-card';
    card.style.borderTopColor = m.color;

    const stepsHtml = m.steps.map((s) => `
      <div class="method-step" style="border-left-color: ${m.color}">
        <div class="step-name">${s.name}</div>
        <div class="step-desc">${s.description}</div>
        <ul class="step-points">
          ${s.key_points.map((p) => `<li>${p}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="method-title">${m.title}</div>
      <div class="method-subtitle">${m.subtitle}</div>
      <p class="method-intro">${m.intro}</p>
      <div class="toggle-hint"></div>
      <div class="method-steps">${stepsHtml}</div>
    `;

    card.addEventListener('click', () => card.classList.toggle('expanded'));
    container.appendChild(card);
  });
}

/* ============== 1.5 场景模板 ============== */
function initTemplates() {
  state.templates = window.TEMPLATES_DATA;
  if (!state.templates) {
    console.error('TEMPLATES_DATA not loaded');
    return;
  }

  const container = document.getElementById('templates-container');
  container.innerHTML = '';

  state.templates.templates.forEach((t) => {
    const card = document.createElement('article');
    card.className = 'template-card';
    card.style.borderLeftColor = t.color;

    const structureHtml = t.structure.map((s) => `<li>${escapeHtml(s)}</li>`).join('');
    const patternsHtml = t.keyPatterns.map((p, idx) => `
      <tr>
        <td class="pattern-speak" data-label=""><button class="speak-btn speak-btn-inline" data-speak-pattern="${t.id}:${idx}" title="朗读此句">🔊</button></td>
        <td class="pattern-en" data-label="英文">${escapeHtml(p.en)}</td>
        <td class="pattern-cn" data-label="中文">${escapeHtml(p.cn)}</td>
        <td class="pattern-usage" data-label="用法">${escapeHtml(p.usage)}</td>
      </tr>
    `).join('');
    const tipsHtml = t.culturalTips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('');

    // 按段对照渲染：英文段 + 下一段中文（折叠态只显示英文）
    const enParagraphs = t.sampleDialogue.split('\n\n');
    const cnParagraphs = (t.sampleDialogueCn || '').split('\n\n');
    const bilingualHtml = enParagraphs.map((en, i) => `
      <div class="dlg-para">
        <div class="dlg-en">${escapeHtml(en)}</div>
        <div class="dlg-cn">${escapeHtml(cnParagraphs[i] || '')}</div>
      </div>
    `).join('');

    const grammarHtml = (t.grammarPoints || []).map((g) => `
      <div class="grammar-card">
        <div class="grammar-title">📐 ${escapeHtml(g.title)}</div>
        <div class="grammar-point">${escapeHtml(g.point)}</div>
        <pre class="grammar-example">${escapeHtml(g.example)}</pre>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="tmpl-header">
        <span class="tmpl-icon">${t.icon}</span>
        <div>
          <div class="tmpl-title">${escapeHtml(t.title)}</div>
          <div class="tmpl-subtitle">${escapeHtml(t.subtitle)}</div>
        </div>
      </div>
      <div class="tmpl-scenario"><b>场景：</b>${escapeHtml(t.scenario)}</div>
      <div class="tmpl-goal"><b>🎯 目标：</b>${escapeHtml(t.goal)}</div>
      <button class="tmpl-toggle" data-target="content-${t.id}">📖 展开完整模板 ▼</button>
      <div id="content-${t.id}" class="tmpl-content hidden">
        <div class="tmpl-section-title">📋 对话结构</div>
        <ol class="tmpl-structure">${structureHtml}</ol>

        <div class="tmpl-section-title">💬 完整对话示范</div>
        <div class="dialogue-controls">
          <button class="dialogue-btn" data-dialogue-action="play" data-tid="${t.id}">▶ 朗读整段</button>
          <button class="dialogue-btn" data-dialogue-action="sentence" data-tid="${t.id}">🎯 逐句跟读</button>
          <button class="dialogue-btn dialogue-btn-stop" data-dialogue-action="stop">⏹ 停止</button>
          <button class="dialogue-btn dialogue-btn-toggle" data-bilingual-toggle="${t.id}" data-on="false">🌏 显示中文对照</button>
          <label class="dialogue-speed">
            速度：
            <select data-speed-select="${t.id}">
              <option value="0.75">慢 0.75x</option>
              <option value="0.9" selected>标准 0.9x</option>
              <option value="1.0">正常 1.0x</option>
            </select>
          </label>
        </div>
        <div class="sample-dialogue" id="dialogue-${t.id}">${bilingualHtml}</div>

        <div class="tmpl-section-title">🔑 核心句型（${t.keyPatterns.length}）· 点 🔊 朗读</div>
        <table class="patterns-table">
          <thead>
            <tr>
              <th style="width:40px"></th>
              <th style="width:40%">英文</th>
              <th style="width:28%">中文</th>
              <th style="width:28%">用法 / 场景</th>
            </tr>
          </thead>
          <tbody>${patternsHtml}</tbody>
        </table>

        <div class="tmpl-section-title">🌏 文化 Tips</div>
        <ul class="cultural-tips">${tipsHtml}</ul>

        ${grammarHtml ? `
        <div class="tmpl-section-title">📐 语法关键点（${t.grammarPoints.length}）</div>
        <div class="grammar-list">${grammarHtml}</div>
        ` : ''}

        <div class="tmpl-test-bar">
          <div class="tmpl-test-bar-text">学完了？让 Claude 出 5 道题检测一下掌握程度 👉</div>
          <button class="tmpl-test-btn" data-test-id="${t.id}">🚀 开始自测</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // 展开/收起 + 朗读按钮 + 自测按钮
  container.addEventListener('click', (e) => {
    const toggle = e.target.closest('.tmpl-toggle');
    if (toggle) {
      const target = document.getElementById(toggle.dataset.target);
      const isHidden = target.classList.toggle('hidden');
      toggle.textContent = isHidden ? '📖 展开完整模板 ▼' : '📖 收起 ▲';
      return;
    }

    // 自测按钮
    const testBtn = e.target.closest('.tmpl-test-btn');
    if (testBtn) {
      generateTestPrompt(testBtn.dataset.testId);
      return;
    }

    // 句型朗读按钮
    const speakPattern = e.target.closest('[data-speak-pattern]');
    if (speakPattern) {
      const [tid, idx] = speakPattern.dataset.speakPattern.split(':');
      const tmpl = state.templates.templates.find(x => x.id === tid);
      if (tmpl) {
        const pattern = tmpl.keyPatterns[parseInt(idx, 10)];
        if (pattern) speech.speak(pattern.en, { rate: 0.9 });
      }
      return;
    }

    // 对话控制
    const dlgBtn = e.target.closest('[data-dialogue-action]');
    if (dlgBtn) {
      const action = dlgBtn.dataset.dialogueAction;
      const tid = dlgBtn.dataset.tid;
      handleDialogueAction(action, tid);
      return;
    }

    // 中英对照切换
    const biToggle = e.target.closest('[data-bilingual-toggle]');
    if (biToggle) {
      const tid = biToggle.dataset.bilingualToggle;
      const on = biToggle.dataset.on === 'true';
      const dialogueEl = document.getElementById(`dialogue-${tid}`);
      if (dialogueEl) {
        dialogueEl.classList.toggle('show-cn', !on);
        biToggle.dataset.on = String(!on);
        biToggle.textContent = !on ? '🌏 隐藏中文对照' : '🌏 显示中文对照';
      }
      return;
    }
  });
}

// 当前对话播放状态
let currentDialoguePlayer = null;

function handleDialogueAction(action, tid) {
  if (action === 'stop') {
    if (currentDialoguePlayer) currentDialoguePlayer.cancel();
    currentDialoguePlayer = null;
    clearDialogueHighlight();
    return;
  }

  const tmpl = state.templates.templates.find(x => x.id === tid);
  if (!tmpl) return;
  const speedSel = document.querySelector(`[data-speed-select="${tid}"]`);
  const rate = speedSel ? parseFloat(speedSel.value) : 0.9;

  if (action === 'play') {
    // 一次性朗读整段
    if (currentDialoguePlayer) currentDialoguePlayer.cancel();
    speech.speak(tmpl.sampleDialogue, { rate });
    toast('▶ 开始朗读，点 ⏹ 停止');
  } else if (action === 'sentence') {
    // 逐句跟读：按段保留中英对照，英文部分按句切分+高亮
    if (currentDialoguePlayer) currentDialoguePlayer.cancel();
    const dialogueEl = document.getElementById(`dialogue-${tid}`);
    const enParas = tmpl.sampleDialogue.split('\n\n');
    const cnParas = (tmpl.sampleDialogueCn || '').split('\n\n');

    // 扁平化所有句子（跨段落），同时把每段的英文区拆成句 span
    const allSentences = [];
    const paraHtml = enParas.map((en, pi) => {
      const sents = speech.splitSentences(en);
      const sentHtml = sents.map((s) => {
        const i = allSentences.length;
        allSentences.push(s);
        return `<span class="dlg-sent" data-i="${i}">${escapeHtml(s)}</span>`;
      }).join(' ');
      return `<div class="dlg-para">
        <div class="dlg-en">${sentHtml}</div>
        <div class="dlg-cn">${escapeHtml(cnParas[pi] || '')}</div>
      </div>`;
    }).join('');
    dialogueEl.innerHTML = paraHtml;

    toast('🎯 逐句播放，每句后停 1.5 秒跟读');
    currentDialoguePlayer = speech.playSequence(allSentences, {
      rate,
      pauseMs: 1500,
      onSentence: (i) => {
        clearDialogueHighlight();
        const span = dialogueEl.querySelector(`[data-i="${i}"]`);
        if (span) {
          span.classList.add('dlg-sent-active');
          span.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      },
      onDone: () => {
        clearDialogueHighlight();
        currentDialoguePlayer = null;
        toast('✅ 跟读完成');
      }
    });
  }
}

function clearDialogueHighlight() {
  document.querySelectorAll('.dlg-sent-active').forEach(el => el.classList.remove('dlg-sent-active'));
}

async function generateTestPrompt(templateId) {
  const t = state.templates.templates.find((x) => x.id === templateId);
  if (!t) return;

  const patternsText = t.keyPatterns
    .map((p, i) => `  ${i + 1}. ${p.en} — ${p.cn}（${p.usage}）`)
    .join('\n');

  const prompt = `我刚学完 **「${t.title}」** 场景模板，请给我出一套自测题检测掌握程度。

【场景】${t.scenario}
【目标】${t.goal}

【我学过的核心句型】
${patternsText}

【完整英文示范我已经读过】
${t.sampleDialogue.slice(0, 300)}...

请出 5 道题，题型如下：
1. **中译英 × 2** — 给一个中文句子，让我用学过的句型翻成英文（场景要贴合 ${t.title}）
2. **情景填空 × 1** — 给一段残缺的英文对话，关键位置留空让我补齐
3. **情景造句 × 1** — 给一个具体情境，让我用指定句型完成一段话
4. **纠错题 × 1** — 给一段有 2-3 处不地道表达的英文，让我改正并说明原因

**重要**：
- 一次性出完 5 道题，**等我全部答完再批改**
- 批改时具体说"这个好在哪""这里建议怎么改，因为……"
- 每道题批改后给一个"带走的表达"
- 最后给整体反馈：我对这个场景的掌握度（1-10 分）+ 下一步该重点练什么

请用中文出题+批改，英文部分保留英文。`;

  const result = sendToClaude(prompt);
  if (result.opened) {
    toast(result.truncated
      ? '✅ Claude 已打开！prompt 已复制，粘贴即可'
      : '✅ Claude 已打开，可直接开始自测', 3000);
    incStat('template');
  } else {
    // 弹窗被拦：只复制
    toast('⚠️ 浏览器拦截了新窗口，prompt 已复制，请手动打开 claude.ai', 4000);
  }
}

/* ============== 2. 录音检测 ============== */
function initRecording() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const startBtn = document.getElementById('rec-start');
  const stopBtn = document.getElementById('rec-stop');
  const status = document.getElementById('rec-status');
  const transcript = document.getElementById('rec-transcript');
  const copyBtn = document.getElementById('rec-copy-prompt');
  const clearBtn = document.getElementById('rec-clear');
  const contextInput = document.getElementById('rec-context');

  if (!SpeechRecognition) {
    status.textContent = '❌ 当前浏览器不支持';
    status.style.background = '#fee2e2';
    status.style.color = '#b91c1c';
    startBtn.disabled = true;
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  state.recognition = recognition;

  let finalText = '';

  recognition.onstart = () => {
    state.isRecording = true;
    status.textContent = '录音中... 开始说英文';
    status.classList.add('recording');
    startBtn.disabled = true;
    stopBtn.disabled = false;
  };

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalText += result[0].transcript + ' ';
      } else {
        interim += result[0].transcript;
      }
    }
    transcript.innerHTML = finalText + `<span style="color:#98a1b3">${interim}</span>`;
  };

  recognition.onerror = (event) => {
    status.textContent = `⚠️ ${event.error}`;
    status.classList.remove('recording');
    state.isRecording = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    // 常见错误提示
    if (event.error === 'not-allowed') {
      toast('请允许浏览器使用麦克风', 3500);
    } else if (event.error === 'no-speech') {
      toast('没检测到语音，再试一次', 2500);
    }
  };

  recognition.onend = () => {
    state.isRecording = false;
    status.textContent = '已停止';
    status.classList.remove('recording');
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };

  startBtn.addEventListener('click', () => {
    finalText = transcript.textContent.trim();
    if (finalText) finalText += ' ';
    try {
      recognition.start();
    } catch (e) {
      toast('录音启动失败：' + e.message, 3000);
    }
  });

  stopBtn.addEventListener('click', () => {
    recognition.stop();
  });

  copyBtn.addEventListener('click', async () => {
    const text = (transcript.textContent || '').trim();
    if (!text) {
      toast('还没有转写内容，先录一段英文吧');
      return;
    }
    const context = contextInput.value.trim() || '日常商务英文表达';
    const prompt = `我正在练习英语口语（商务场景）。请帮我分析以下这段录音转写（可能有语音识别错误，请你智能判断我的原意）：

【场景】${context}

【我说的英文】
${text}

请从这几个角度反馈：
1. 🎯 表达是否地道？哪些用词不符合商务场景？
2. 📐 语法错误（只列影响理解的那些）
3. 🗣️ 有没有更自然 / 更专业的说法？给 2-3 个可替换版本
4. 🌟 一句话总结我这次表达的亮点

请用中文反馈，引用我原话来具体说明。`;

    const result = sendToClaude(prompt);
    if (result.opened) {
      toast(result.truncated
        ? '✅ Claude 已打开！转写已复制，粘贴即可'
        : '✅ Claude 已打开，AI 反馈马上就来', 3000);
      incStat('recording');
    } else {
      toast('⚠️ 浏览器拦截了新窗口，prompt 已复制，请手动打开 claude.ai', 4000);
    }
  });

  clearBtn.addEventListener('click', () => {
    transcript.innerHTML = '';
    finalText = '';
    contextInput.value = '';
    status.textContent = '未启动';
  });
}

/* ============== 3. 翻译 / 邮件 / 演讲——一键复制 ============== */
function initCopyTools() {
  // 翻译
  document.querySelector('[data-copy="translation"]').addEventListener('click', async () => {
    const source = document.getElementById('trans-source').value.trim();
    const audience = document.getElementById('trans-audience').value;
    const level = document.getElementById('trans-level').value;
    const mode = document.getElementById('trans-mode').value;

    if (!source) {
      toast('先粘贴要翻译的中文');
      return;
    }

    const modeInstruction = mode === '教练'
      ? '请用 **教练模式** 带我一步步走脱壳法 5 步，每步等我回答再往下。'
      : '请用 **快速模式** 直接给出翻译，并解释每一步（Filtering / 脱壳 / 逻辑显化 / KISS / 文化适配）你做了什么调整、为什么。';

    const prompt = `翻译训练

【中文原文】
${source}

【给谁看/听】${audience}
【我的英语水平】${level}

${modeInstruction}`;

    const result = sendToClaude(prompt);
    if (result.opened) {
      toast(result.truncated
        ? '✅ Claude 已打开！原文已复制，粘贴即可'
        : '✅ Claude 已打开，开始翻译训练', 3000);
      incStat('translation');
    } else {
      toast('⚠️ 浏览器拦截了新窗口，prompt 已复制，请手动打开 claude.ai', 4000);
    }
  });

  // 邮件
  document.querySelector('[data-copy="email"]').addEventListener('click', async () => {
    const source = document.getElementById('email-source').value.trim();
    const purpose = document.getElementById('email-purpose').value;
    const tone = document.getElementById('email-tone').value;

    if (!source) {
      toast('先粘贴邮件内容');
      return;
    }

    const prompt = `请帮我把这封邮件润色成地道、专业的商务英语。

【原邮件（中文或半成品英文）】
${source}

【邮件目的】${purpose}
【收件关系】${tone}

请这样回复：
1. 📧 **润色后的完整邮件**（包含主题、问候、正文、结尾）
2. 🔍 **逐段改动说明**：原文写了什么 → 改成什么 → 为什么改（解释选词/句式/语气）
3. 💡 **今天带走的 3 个表达**：可以直接套用到下次邮件的句型

请用中文解释改动原因。`;

    const result = sendToClaude(prompt);
    if (result.opened) {
      toast(result.truncated
        ? '✅ Claude 已打开！邮件已复制，粘贴即可'
        : '✅ Claude 已打开，开始润色邮件', 3000);
      incStat('email');
    } else {
      toast('⚠️ 浏览器拦截了新窗口，prompt 已复制，请手动打开 claude.ai', 4000);
    }
  });

  // 演讲
  document.querySelector('[data-copy="speech"]').addEventListener('click', async () => {
    const topic = document.getElementById('speech-topic').value.trim();
    const audience = document.getElementById('speech-audience').value.trim();
    const duration = document.getElementById('speech-duration').value;
    const structure = document.getElementById('speech-structure').value;
    const material = document.getElementById('speech-material').value.trim();

    if (!topic || !audience) {
      toast('先填主题和听众');
      return;
    }

    const prompt = `演讲训练（快速模式）

【演讲主题】${topic}
【听众】${audience}
【时长】${duration}
【结构类型】${structure}
${material ? `\n【已有素材/要点】\n${material}` : ''}

请用 speech-training skill 的快速模式直接搭一版完整框架，包括：
- 受众画像（一句话）
- Communication Outline（Focus / Relevance / KISS）
- Ramp（开头 hook + 具体用词）
- Roadmap
- PoD 1 / PoD 2 / PoD 3（或 Executive Summary）
- Dessert（跟 Ramp 呼应）
- Q&A 预判（3 个问题 + 应对要点）

最后给出 **两个版本**：A. Bullet Points 提示版 / B. 完整英文逐字稿。`;

    const result = sendToClaude(prompt);
    if (result.opened) {
      toast(result.truncated
        ? '✅ Claude 已打开！素材已复制，粘贴即可'
        : '✅ Claude 已打开，开始搭演讲稿', 3000);
      incStat('speech');
    } else {
      toast('⚠️ 浏览器拦截了新窗口，prompt 已复制，请手动打开 claude.ai', 4000);
    }
  });

  // 清空按钮
  document.querySelectorAll('[data-clear]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.clear;
      document.querySelectorAll(`#${tool}-panel input, #${tool}-panel textarea`).forEach((el) => {
        if (el.type === 'text' || el.tagName === 'TEXTAREA') el.value = '';
      });
    });
  });
}

/* ============== 4. 商务英语学习 · 三模式系统 ============== */
function initFlashcards() {
  state.vocab = window.VOCAB_DATA;
  if (!state.vocab) {
    console.error('VOCAB_DATA not loaded');
    return;
  }
  state.vocabMode = 'flashcard';
  // 兼容老数据：cardMeta 记录每张卡片的 lastSeen / status
  if (!state.stats.cardMeta) state.stats.cardMeta = {};

  const tabsContainer = document.getElementById('vocab-category-tabs');
  tabsContainer.innerHTML = '';

  state.vocab.categories.forEach((cat, idx) => {
    const tab = document.createElement('div');
    tab.className = 'category-tab';
    tab.textContent = cat.name;
    tab.dataset.catId = cat.id;
    if (cat.color) tab.style.setProperty('--cat-color', cat.color);
    if (idx === 0) tab.classList.add('active');
    tab.addEventListener('click', () => selectCategory(cat.id));
    tabsContainer.appendChild(tab);
  });

  selectCategory(state.vocab.categories[0].id);

  // ===== 模式切换 =====
  document.querySelectorAll('.vocab-modes .mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchVocabMode(btn.dataset.mode));
  });

  // ===== 卡片翻转 · 翻到英文面自动朗读 =====
  document.getElementById('flashcard').addEventListener('click', (e) => {
    if (e.target.closest('.speak-btn')) return;
    const card = document.getElementById('flashcard');
    card.classList.toggle('flipped');
    if (card.classList.contains('flipped')) {
      const en = document.getElementById('card-en').textContent.trim();
      if (en) setTimeout(() => speech.speak(en), 200);
    } else {
      speech.stop();
    }
  });

  // ===== 朗读按钮 =====
  document.getElementById('speak-word').addEventListener('click', (e) => {
    e.stopPropagation();
    const en = document.getElementById('card-en').textContent.trim();
    if (en) speech.speak(en, { rate: 0.9 });
  });
  document.getElementById('speak-word-slow').addEventListener('click', (e) => {
    e.stopPropagation();
    const en = document.getElementById('card-en').textContent.trim();
    if (en) speech.speak(en, { rate: 0.7 });
  });
  document.getElementById('speak-example').addEventListener('click', (e) => {
    e.stopPropagation();
    const ex = document.getElementById('card-example').textContent.trim();
    if (ex) speech.speak(ex, { rate: 0.85 });
  });

  // ===== 控制按钮 =====
  document.getElementById('card-prev').addEventListener('click', () => changeCard(-1));
  document.getElementById('card-next').addEventListener('click', () => changeCard(1));
  document.getElementById('card-remember').addEventListener('click', () => markCard(true));
  document.getElementById('card-forget').addEventListener('click', () => markCard(false));

  // ===== 词汇表模式：搜索（防抖 120ms，避免每次按键都重渲 123 条 → 屏闪） =====
  const searchInput = document.getElementById('vocab-search');
  if (searchInput) {
    let searchTimer = null;
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => renderGlossary(val), 120);
    });
  }
  const searchClear = document.getElementById('vocab-search-clear');
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      renderGlossary('');
      searchInput.focus();
    });
  }

  // ===== 词汇表 / 复习 模式：委托点击 =====
  document.getElementById('vocab-glossary-content').addEventListener('click', handleVocabListClick);
  document.getElementById('vocab-review-content').addEventListener('click', handleVocabListClick);
}

function switchVocabMode(mode) {
  state.vocabMode = mode;
  document.querySelectorAll('.vocab-modes .mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  document.querySelectorAll('.vocab-view').forEach((view) => {
    view.classList.add('hidden');
  });
  const current = document.getElementById(`vocab-view-${mode}`);
  if (current) current.classList.remove('hidden');

  if (mode === 'glossary') {
    renderGlossary(document.getElementById('vocab-search').value || '');
  } else if (mode === 'review') {
    renderReview();
  }
  // 停掉正在播放的朗读
  speech.stop();
}

/* ===== 词卡模式 ===== */
function selectCategory(catId) {
  state.currentCategory = catId;
  state.currentCardIndex = 0;
  document.querySelectorAll('.category-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.catId === catId);
  });
  renderCard();
}

function getCurrentCategoryItems() {
  if (!state.vocab) return [];
  const cat = state.vocab.categories.find((c) => c.id === state.currentCategory);
  return cat ? cat.items : [];
}

function renderCard() {
  const items = getCurrentCategoryItems();
  if (items.length === 0) return;

  const idx = state.currentCardIndex;
  const item = items[idx];
  const key = `${state.currentCategory}:${idx}`;
  const isRemembered = state.stats.cards[key] === true;

  document.getElementById('card-cn').textContent = item.cn;
  document.getElementById('card-en').textContent = item.en;
  document.getElementById('card-example').textContent = item.example || '';
  document.getElementById('flashcard').classList.remove('flipped');

  document.getElementById('card-progress').textContent =
    `第 ${idx + 1} / ${items.length} 张  ·  ${isRemembered ? '✅ 已记住' : '⚪ 未标记'}`;

  // 标记 lastSeen（让复习队列能算出"多久没看了"）
  touchCardMeta(key);
}

function changeCard(delta) {
  const items = getCurrentCategoryItems();
  if (items.length === 0) return;
  state.currentCardIndex = (state.currentCardIndex + delta + items.length) % items.length;
  renderCard();
}

function markCard(remembered) {
  const key = `${state.currentCategory}:${state.currentCardIndex}`;
  const wasRemembered = state.stats.cards[key] === true;

  if (remembered) {
    state.stats.cards[key] = true;
    if (!wasRemembered) {
      state.stats.remembered = (state.stats.remembered || 0) + 1;
      toast('记住了一个 👍');
    }
  } else {
    state.stats.cards[key] = false;
    if (wasRemembered) {
      state.stats.remembered = Math.max(0, (state.stats.remembered || 0) - 1);
    }
    toast('标为需要再练');
  }
  setCardStatus(key, remembered ? 'remembered' : 'forgot');
  saveStats();
  renderStats();

  // 自动下一张
  setTimeout(() => changeCard(1), 300);
}

/* ===== 卡片元数据（lastSeen + status）===== */
function touchCardMeta(key) {
  if (!state.stats.cardMeta) state.stats.cardMeta = {};
  const meta = state.stats.cardMeta[key] || {};
  meta.lastSeen = Date.now();
  state.stats.cardMeta[key] = meta;
  saveStats();
}
function setCardStatus(key, status) {
  if (!state.stats.cardMeta) state.stats.cardMeta = {};
  const meta = state.stats.cardMeta[key] || {};
  meta.status = status;
  meta.lastSeen = Date.now();
  state.stats.cardMeta[key] = meta;
}

/* ===== 模式 B · 词汇表（参考 / 搜索）===== */
function renderGlossary(searchTerm) {
  const term = (searchTerm || '').trim().toLowerCase();
  const container = document.getElementById('vocab-glossary-content');
  const statsEl = document.getElementById('vocab-glossary-stats');
  // 记住滚动位置（Safari/Chrome 的 tool-panel 会 scroll）
  const panel = container.closest('.tool-panel');
  const prevScroll = panel ? panel.scrollTop : 0;
  container.innerHTML = '';

  let totalItems = 0;
  let matchedItems = 0;

  state.vocab.categories.forEach((cat) => {
    const matches = cat.items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        if (!term) return true;
        return (
          item.cn.toLowerCase().includes(term) ||
          item.en.toLowerCase().includes(term) ||
          (item.example && item.example.toLowerCase().includes(term))
        );
      });

    totalItems += cat.items.length;
    matchedItems += matches.length;

    if (matches.length === 0) return;

    const section = document.createElement('div');
    section.className = 'glossary-section';
    section.style.setProperty('--cat-color', cat.color || '#0066b3');
    section.innerHTML = `
      <div class="glossary-section-header">
        <span class="glossary-cat-name">${cat.name}</span>
        <span class="glossary-cat-count">${matches.length}${term ? ` / ${cat.items.length}` : ''} 条</span>
      </div>
      <div class="glossary-items">
        ${matches.map(({ item, idx }) => renderGlossaryItem(cat.id, idx, item, term)).join('')}
      </div>
    `;
    container.appendChild(section);
  });

  if (term && matchedItems === 0) {
    container.innerHTML = `<div class="glossary-empty">没有匹配"${escapeHtml(searchTerm)}"的条目<br><small>试试用英文关键词或更短的中文</small></div>`;
  }

  statsEl.textContent = term
    ? `找到 ${matchedItems} / ${totalItems} 条`
    : `共 ${totalItems} 条商务英语 · 分 ${state.vocab.categories.length} 类`;

  // 恢复滚动位置
  if (panel && prevScroll > 0) {
    requestAnimationFrame(() => { panel.scrollTop = prevScroll; });
  }
}

function renderGlossaryItem(catId, idx, item, term) {
  const key = `${catId}:${idx}`;
  const status = state.stats.cardMeta?.[key]?.status;
  const remembered = state.stats.cards[key] === true;
  const statusIcon = remembered ? '✅' : (status === 'forgot' ? '🔄' : '⚪');
  const exampleHtml = item.example
    ? `<div class="glossary-example">${highlight(item.example, term)}</div>`
    : '';
  return `
    <div class="glossary-item" data-key="${key}">
      <div class="glossary-item-main">
        <div class="glossary-item-top">
          <span class="glossary-status">${statusIcon}</span>
          <span class="glossary-cn">${highlight(item.cn, term)}</span>
        </div>
        <div class="glossary-en">${highlight(item.en, term)}</div>
        ${exampleHtml}
      </div>
      <div class="glossary-item-actions">
        <button class="speak-btn speak-btn-sm" data-speak="en" data-key="${key}" title="朗读英文">🔊</button>
        <button class="speak-btn speak-btn-sm" data-speak="slow" data-key="${key}" title="慢速">🐢</button>
        <button class="speak-btn speak-btn-sm" data-speak="example" data-key="${key}" title="朗读例句">📖</button>
        <button class="mark-mini-btn ${remembered ? 'active' : ''}" data-mark="remember" data-key="${key}" title="记住了">✅</button>
        <button class="mark-mini-btn ${status === 'forgot' ? 'active' : ''}" data-mark="forget" data-key="${key}" title="需要再练">🔄</button>
      </div>
    </div>
  `;
}

function highlight(text, term) {
  if (!term) return escapeHtml(text);
  const safe = escapeHtml(text);
  const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(safeTerm, 'ig'), (match) => `<mark>${match}</mark>`);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

/* ===== 模式 C · 复习队列 ===== */
function getReviewQueue() {
  // 规则：
  //  1) 标记为 "forgot" 的 (最优先)
  //  2) 从未见过的 (lastSeen 为空)
  //  3) 超过 3 天没看过的 (就算标为记住了也要复习)
  // 同时排除今天已经标为"记住"且今天刚看过的（避免刚标完又出现）
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const queue = [];

  state.vocab.categories.forEach((cat) => {
    cat.items.forEach((item, idx) => {
      const key = `${cat.id}:${idx}`;
      const meta = state.stats.cardMeta?.[key];
      const remembered = state.stats.cards[key] === true;
      const lastSeen = meta?.lastSeen || 0;
      const status = meta?.status;
      const ageMs = now - lastSeen;

      let priority = null;
      let reason = '';
      if (status === 'forgot') {
        priority = 1;
        reason = '需要再练';
      } else if (!lastSeen) {
        priority = 2;
        reason = '还没学过';
      } else if (ageMs > THREE_DAYS) {
        priority = 3;
        const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
        reason = `${days} 天没看了`;
      }
      if (priority != null) {
        queue.push({ cat, item, idx, key, priority, reason, remembered });
      }
    });
  });

  // 按优先级排序
  queue.sort((a, b) => a.priority - b.priority);
  return queue;
}

function renderReview() {
  const queue = getReviewQueue();
  const summary = document.getElementById('vocab-review-summary');
  const container = document.getElementById('vocab-review-content');

  if (queue.length === 0) {
    summary.innerHTML = `<div class="review-empty-hero">🎉 太棒了！<br><small>所有卡片都在掌控中，暂时没有要复习的。</small></div>`;
    container.innerHTML = '';
    return;
  }

  const p1 = queue.filter((q) => q.priority === 1).length;
  const p2 = queue.filter((q) => q.priority === 2).length;
  const p3 = queue.filter((q) => q.priority === 3).length;

  summary.innerHTML = `
    <div class="review-summary-cards">
      <div class="review-stat review-stat-urgent">
        <div class="review-stat-num">${p1}</div>
        <div class="review-stat-lbl">🔄 需要再练</div>
      </div>
      <div class="review-stat review-stat-new">
        <div class="review-stat-num">${p2}</div>
        <div class="review-stat-lbl">⚪ 还没学</div>
      </div>
      <div class="review-stat review-stat-rusty">
        <div class="review-stat-num">${p3}</div>
        <div class="review-stat-lbl">⏳ 3+ 天没看</div>
      </div>
    </div>
    <div class="review-tip">💡 按紧急程度排好，一条一条看即可。点 ✅ 标为记住，点 🔄 继续保留在队列里。</div>
  `;

  container.innerHTML = queue.map(({ cat, item, idx, key, reason, priority, remembered }) => {
    const icon = priority === 1 ? '🔄' : priority === 2 ? '⚪' : '⏳';
    return `
      <div class="review-item" data-key="${key}" style="--cat-color:${cat.color || '#0066b3'}">
        <div class="review-item-head">
          <span class="review-cat-tag">${cat.name}</span>
          <span class="review-reason">${icon} ${reason}</span>
        </div>
        <div class="review-item-body">
          <div class="review-cn">${escapeHtml(item.cn)}</div>
          <div class="review-en">${escapeHtml(item.en)}</div>
          ${item.example ? `<div class="review-example">${escapeHtml(item.example)}</div>` : ''}
        </div>
        <div class="review-item-actions">
          <button class="speak-btn speak-btn-sm" data-speak="en" data-key="${key}">🔊 词</button>
          <button class="speak-btn speak-btn-sm" data-speak="example" data-key="${key}">📖 例句</button>
          <button class="mark-mini-btn ${remembered ? 'active' : ''}" data-mark="remember" data-key="${key}">✅ 记住了</button>
          <button class="mark-mini-btn" data-mark="forget" data-key="${key}">🔄 再练</button>
        </div>
      </div>
    `;
  }).join('');
}

/* ===== 委托点击：词汇表 / 复习 列表的按钮 ===== */
function handleVocabListClick(e) {
  const speakBtn = e.target.closest('[data-speak]');
  if (speakBtn) {
    e.stopPropagation();
    const key = speakBtn.dataset.key;
    const speakType = speakBtn.dataset.speak;
    const item = findItemByKey(key);
    if (!item) return;
    if (speakType === 'en') speech.speak(item.en, { rate: 0.9 });
    else if (speakType === 'slow') speech.speak(item.en, { rate: 0.7 });
    else if (speakType === 'example' && item.example) speech.speak(item.example, { rate: 0.85 });
    touchCardMeta(key);
    return;
  }

  const markBtn = e.target.closest('[data-mark]');
  if (markBtn) {
    e.stopPropagation();
    const key = markBtn.dataset.key;
    const markType = markBtn.dataset.mark;
    const remembered = markType === 'remember';
    const wasRemembered = state.stats.cards[key] === true;

    if (remembered) {
      state.stats.cards[key] = true;
      if (!wasRemembered) {
        state.stats.remembered = (state.stats.remembered || 0) + 1;
        toast('记住了一个 👍');
      }
      setCardStatus(key, 'remembered');
    } else {
      state.stats.cards[key] = false;
      if (wasRemembered) {
        state.stats.remembered = Math.max(0, (state.stats.remembered || 0) - 1);
      }
      setCardStatus(key, 'forgot');
      toast('放入复习队列');
    }
    saveStats();
    renderStats();

    // 刷新当前视图
    if (state.vocabMode === 'glossary') {
      renderGlossary(document.getElementById('vocab-search').value || '');
    } else if (state.vocabMode === 'review') {
      renderReview();
    }
    return;
  }
}

function findItemByKey(key) {
  if (!key || !state.vocab) return null;
  const [catId, idxStr] = key.split(':');
  const cat = state.vocab.categories.find((c) => c.id === catId);
  if (!cat) return null;
  return cat.items[parseInt(idxStr, 10)];
}

/* ============== 5. 进度区 ============== */
function renderStats() {
  const s = state.stats;
  const grid = document.getElementById('stats-grid');
  const totalToday = (s.translation || 0) + (s.email || 0) + (s.speech || 0) + (s.recording || 0) + (s.template || 0);

  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${totalToday}</div>
      <div class="stat-label">今日练习次数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${s.recording || 0}</div>
      <div class="stat-label">🎙️ 录音</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${s.translation || 0}</div>
      <div class="stat-label">🔄 翻译</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${s.email || 0}</div>
      <div class="stat-label">✉️ 邮件</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${s.speech || 0}</div>
      <div class="stat-label">🎤 演讲</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${s.template || 0}</div>
      <div class="stat-label">📖 模板自测</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${s.remembered || 0}</div>
      <div class="stat-label">📇 累计记住单词</div>
    </div>
  `;
}

/* ============== 6. 面板 open/close ============== */
function initPanels() {
  document.querySelectorAll('[data-action="open"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      document.getElementById(targetId).classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    });
  });

  document.querySelectorAll('[data-action="close"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.tool-panel').classList.add('hidden');
      document.body.style.overflow = '';
    });
  });

  // 点击面板外关闭
  document.querySelectorAll('.tool-panel').forEach((panel) => {
    panel.addEventListener('click', (e) => {
      if (e.target === panel) {
        panel.classList.add('hidden');
        document.body.style.overflow = '';
      }
    });
  });

  // Esc 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.tool-panel:not(.hidden)').forEach((p) => {
        p.classList.add('hidden');
      });
      document.body.style.overflow = '';
    }
  });
}

/* ============== 7. 重置按钮 ============== */
function initResetButtons() {
  document.getElementById('reset-stats').addEventListener('click', () => {
    if (!confirm('确认重置今日的练习记录？（单词记忆进度会保留）')) return;
    state.stats.translation = 0;
    state.stats.email = 0;
    state.stats.speech = 0;
    state.stats.recording = 0;
    state.stats.template = 0;
    saveStats();
    renderStats();
    toast('已重置今日记录');
  });

  document.getElementById('reset-vocab').addEventListener('click', () => {
    if (!confirm('确认重置所有单词记忆进度？这个不可撤销。')) return;
    state.stats.cards = {};
    state.stats.remembered = 0;
    saveStats();
    renderStats();
    renderCard();
    toast('已重置单词进度');
  });
}

/* ==================================================================
 * ============== 繁星课堂模块（Fanxing Class）====================
 * 入口:用户在 #fanxing 章节粘贴每天的课堂笔记,存 localStorage
 * 解析:auto-detect 句子 / 单词 / 短语
 * 练习:整句翻译 / 关键词填空 / AI 问答 / 单词闪卡
 * 掌握度:new → practicing → mastered(连对 2 次)
 * ================================================================== */

const FANXING_KEY = 'fanxing-notes-v1';

// 繁星模块的运行时状态(独立于 state,便于排查)
const fx = {
  days: {},              // date string → day object
  currentDate: '',       // 当前正在编辑/练习的日期
  // 当前各练习模式的游标
  transIdx: 0,
  transQueue: [],
  transRevealed: false,
  clozeIdx: 0,
  clozeQueue: [],
  clozeAnswered: false,
  fcIdx: 0,
  fcQueue: [],
  fcFlipped: false,
};

/* ---------- 持久化 ---------- */
function loadFanxing() {
  try {
    const raw = localStorage.getItem(FANXING_KEY);
    if (!raw) return { days: {}, currentDate: todayStr() };
    const data = JSON.parse(raw);
    return {
      days: data.days || {},
      currentDate: data.currentDate || todayStr(),
    };
  } catch (e) {
    console.warn('[fanxing] load failed, starting fresh', e);
    return { days: {}, currentDate: todayStr() };
  }
}

function saveFanxing() {
  const payload = { days: fx.days, currentDate: fx.currentDate };
  localStorage.setItem(FANXING_KEY, JSON.stringify(payload));
}

/* ---------- 解析粘贴内容 ---------- */
// 解析规则:
//   - 分隔符:|  、 ｜、 →、 ->、 — 、 – 、 — 、 ::
//   - 区块标题:含 "句子/sentence" / "单词/word/vocab" / "短语/phrase/idiom"
//   - 没分区的话按字数/有无空格自动判断类型
//   - 返回 { items: [...], rawStats: {sentences, words, phrases} }
const FX_DELIMS = /\s*(?:\||｜|→|->|—|–|::|\t)\s*/;
const FX_BULLET = /^[\s]*(?:[-*•·]|\d+[.、)])\s*/;

function detectSection(line) {
  // 先检短语(因为 "phrase" 要在 sentence 之前判断,避免被误判)
  const t = line.toLowerCase();
  if (/短语|词组|phrase|idiom|expression/.test(t)) return 'phrase';
  if (/单词|词汇|word|vocab/.test(t)) return 'word';
  if (/句子|整句|sentence/.test(t)) return 'sentence';
  return null;
}

function guessType(cn, en) {
  // 启发式:有句末标点或词数多 → 句子;1-2 个词 → 单词;其他 → 短语
  if (/[.?!。？！]$/.test(en.trim()) || en.trim().split(/\s+/).length >= 6) return 'sentence';
  const words = en.trim().split(/\s+/).length;
  if (words <= 2) return 'word';
  return 'phrase';
}

function makeItemId(type, cn, en) {
  // 短哈希,便于二次粘贴时保留 mastery
  const str = `${type}|${cn}|${en}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return `${type.charAt(0)}-${(h >>> 0).toString(36)}`;
}

function parseFanxingContent(text) {
  const lines = text.split(/\r?\n/);
  let currentSection = null;
  const items = [];
  const seen = new Set();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 标题行:# ## ### 或者被 / :: 分隔的小标题
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      const s = detectSection(headingMatch[1]);
      if (s) currentSection = s;
      continue;
    }
    // 纯引用 ">" 或分割线跳过
    if (/^(>|---+|===+)/.test(line)) continue;

    // bullet + 主内容
    const content = line.replace(FX_BULLET, '');
    if (!FX_DELIMS.test(content)) continue;
    const parts = content.split(FX_DELIMS).map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    // 第一段是 cn,后面合并成 en(允许 en 里有逗号)
    const cn = parts[0];
    const en = parts.slice(1).join(' / ');
    if (!cn || !en) continue;

    const type = currentSection || guessType(cn, en);
    const id = makeItemId(type, cn, en);
    if (seen.has(id)) continue;
    seen.add(id);

    items.push({
      id,
      type,
      cn,
      en,
      mastery: 'new',
      streak: 0,
      lastSeen: 0,
      attempts: 0,
    });
  }

  const stats = {
    sentence: items.filter((i) => i.type === 'sentence').length,
    word: items.filter((i) => i.type === 'word').length,
    phrase: items.filter((i) => i.type === 'phrase').length,
    total: items.length,
  };
  return { items, stats };
}

/* ---------- 日期 / 导入 / 导出 ---------- */
function getOrCreateDay(date) {
  if (!fx.days[date]) {
    fx.days[date] = {
      date,
      title: '',
      items: [],
      raw: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  return fx.days[date];
}

function mergeParsedIntoDay(day, parsed) {
  // 保留已有 mastery/streak,按 id 合并
  const existing = new Map(day.items.map((i) => [i.id, i]));
  const merged = [];
  for (const p of parsed.items) {
    const old = existing.get(p.id);
    if (old) {
      // 内容相同 → 保留旧进度
      merged.push({ ...p, mastery: old.mastery, streak: old.streak, lastSeen: old.lastSeen, attempts: old.attempts });
    } else {
      merged.push(p);
    }
  }
  day.items = merged;
  day.updatedAt = Date.now();
}

function dayToMarkdown(day) {
  const lines = [];
  lines.push(`# ${day.title || `Day ${day.date}`}`);
  lines.push('');
  lines.push(`> 日期:${day.date}`);
  lines.push('');

  const sentences = day.items.filter((i) => i.type === 'sentence');
  const words = day.items.filter((i) => i.type === 'word');
  const phrases = day.items.filter((i) => i.type === 'phrase');

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

function downloadFile(filename, content, mime = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

/* ---------- 掌握度更新 ---------- */
function markFxItem(item, correct) {
  if (!item) return;
  item.attempts = (item.attempts || 0) + 1;
  item.lastSeen = Date.now();
  if (correct) {
    item.streak = (item.streak || 0) + 1;
    if (item.streak >= 2) item.mastery = 'mastered';
    else item.mastery = 'practicing';
  } else {
    item.streak = 0;
    item.mastery = 'practicing';
  }
  saveFanxing();
  renderFanxingSummary();
}

function masteryChip(m) {
  if (m === 'mastered') return '✅ 已掌握';
  if (m === 'practicing') return '🔄 练习中';
  return '⚪ 新';
}

/* ---------- 今日面板渲染 ---------- */
function getCurrentDay() {
  return fx.days[fx.currentDate];
}

function renderFanxingSummary() {
  const day = getCurrentDay();
  const titleEl = document.getElementById('fx-day-title');
  const statsEl = document.getElementById('fx-day-stats');
  const histEl = document.getElementById('fx-history');

  if (!day || day.items.length === 0) {
    titleEl.textContent = fx.currentDate + ' · 还没内容';
    statsEl.innerHTML = '<span class="fx-stat-empty">粘贴笔记到左边,点「保存」</span>';
  } else {
    titleEl.textContent = day.title || fx.currentDate;
    const total = day.items.length;
    const mastered = day.items.filter((i) => i.mastery === 'mastered').length;
    const practicing = day.items.filter((i) => i.mastery === 'practicing').length;
    const nu = total - mastered - practicing;
    statsEl.innerHTML = `
      <span class="fx-stat-chip">共 ${total} 条</span>
      <span class="fx-stat-chip fx-chip-new">⚪ 新 ${nu}</span>
      <span class="fx-stat-chip fx-chip-prac">🔄 练习中 ${practicing}</span>
      <span class="fx-stat-chip fx-chip-done">✅ 已掌握 ${mastered}</span>
    `;
  }

  // 历史日期切换
  const dates = Object.keys(fx.days).sort().reverse();
  if (dates.length === 0) {
    histEl.innerHTML = '';
  } else {
    histEl.innerHTML =
      '<div class="fx-history-label">切换日期:</div>' +
      dates
        .map((d) => {
          const active = d === fx.currentDate ? ' active' : '';
          const count = fx.days[d].items.length;
          return `<button class="fx-history-btn${active}" data-fx-date="${d}">${d} (${count})</button>`;
        })
        .join('');
    histEl.querySelectorAll('.fx-history-btn').forEach((b) => {
      b.addEventListener('click', () => {
        fx.currentDate = b.dataset.fxDate;
        saveFanxing();
        loadDayToEditor();
      });
    });
  }
}

function loadDayToEditor() {
  const day = fx.days[fx.currentDate] || { title: '', raw: '' };
  document.getElementById('fx-date').value = fx.currentDate;
  document.getElementById('fx-title').value = day.title || '';
  document.getElementById('fx-input').value = day.raw || '';
  updateParsePreview();
  renderFanxingSummary();
}

function updateParsePreview() {
  const text = document.getElementById('fx-input').value;
  const preview = document.getElementById('fx-parse-preview');
  if (!text.trim()) {
    preview.innerHTML = '';
    return;
  }
  const parsed = parseFanxingContent(text);
  if (parsed.stats.total === 0) {
    preview.innerHTML = '<div class="fx-preview-warn">⚠️ 没解析出任何内容。检查一下每行是不是有 <code>|</code> 分隔。</div>';
    return;
  }
  preview.innerHTML = `
    <div class="fx-preview-ok">
      ✅ 解析到 <b>${parsed.stats.total}</b> 条 ·
      句子 ${parsed.stats.sentence} · 单词 ${parsed.stats.word} · 短语 ${parsed.stats.phrase}
    </div>
  `;
}

/* ---------- URL 自动导入(Chrome 扩展用) ----------
 * 扩展抓好内容后,会打开看板并附 ?fx-import=<base64> &fx-title=<url-encoded>
 * 这里检测参数、填入、尝试自动保存
 */
function b64ToUtf8(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function handleFanxingImportFromUrl() {
  const params = new URLSearchParams(location.search);
  const raw = params.get('fx-import');
  if (!raw) return false;
  try {
    const md = b64ToUtf8(raw);
    const title = params.get('fx-title') || '';
    const inputEl = document.getElementById('fx-input');
    const titleEl = document.getElementById('fx-title');
    inputEl.value = md;
    if (title && !titleEl.value) titleEl.value = title;
    updateParsePreview();
    // 自动触发保存(一键流程)
    const parsed = parseFanxingContent(md);
    if (parsed.stats.total > 0) {
      const day = getOrCreateDay(fx.currentDate);
      day.title = title || day.title;
      day.raw = md;
      mergeParsedIntoDay(day, parsed);
      saveFanxing();
      renderFanxingSummary();
      toast(`📥 从扩展自动导入并保存了 ${parsed.stats.total} 条`);
    } else {
      toast('📥 从扩展导入了内容,但解析为空,检查后手动保存');
    }
    // 清除 URL 参数,避免刷新重复导入
    history.replaceState(null, '', location.pathname);
    // 滚动到繁星区
    setTimeout(() => {
      document.getElementById('fanxing').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    return true;
  } catch (e) {
    console.warn('[fanxing] URL import failed', e);
    toast('⚠️ 扩展导入失败:' + e.message);
    return false;
  }
}

/* ---------- 主入口 ---------- */
function initFanxing() {
  const loaded = loadFanxing();
  fx.days = loaded.days;
  fx.currentDate = loaded.currentDate || todayStr();

  // 日期默认今天
  const dateInput = document.getElementById('fx-date');
  if (!dateInput.value) dateInput.value = fx.currentDate;

  dateInput.addEventListener('change', () => {
    fx.currentDate = dateInput.value;
    saveFanxing();
    loadDayToEditor();
  });

  // 标题保存
  document.getElementById('fx-title').addEventListener('input', (e) => {
    const day = getOrCreateDay(fx.currentDate);
    day.title = e.target.value;
  });

  // 输入实时解析预览(debounce)
  let previewTimer = null;
  document.getElementById('fx-input').addEventListener('input', () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updateParsePreview, 150);
  });

  // 保存
  document.getElementById('fx-save').addEventListener('click', () => {
    const text = document.getElementById('fx-input').value;
    const title = document.getElementById('fx-title').value;
    if (!text.trim()) {
      toast('先粘点东西再保存哇 😅');
      return;
    }
    const parsed = parseFanxingContent(text);
    if (parsed.stats.total === 0) {
      toast('一条都没解析出来。检查格式:每行 中文 | English');
      return;
    }
    const day = getOrCreateDay(fx.currentDate);
    day.title = title;
    day.raw = text;
    mergeParsedIntoDay(day, parsed);
    saveFanxing();
    renderFanxingSummary();
    toast(`💾 已保存 ${parsed.stats.total} 条内容`);
  });

  // 导出 .md
  document.getElementById('fx-export').addEventListener('click', () => {
    const day = getCurrentDay();
    if (!day || day.items.length === 0) {
      toast('今天还没数据,保存后再导出');
      return;
    }
    downloadFile(`fanxing-${fx.currentDate}.md`, dayToMarkdown(day));
    toast('📤 已下载 .md 文件');
  });

  // 填入示例
  document.getElementById('fx-template').addEventListener('click', () => {
    const example = `## 句子 Sentences
- 我需要跟客户确认下周交付时间 | I need to confirm the delivery schedule with the client next week.
- 这个方案需要得到 CEO 批准 | This proposal requires approval from the CEO.
- 我们正在跟进仓库的库存问题 | We are following up on the inventory issue at the warehouse.

## 单词 Words
- 确认 | confirm
- 批准 | approval
- 交付 | delivery
- 仓库 | warehouse
- 跟进 | follow up

## 短语 Phrases
- 跟进进度 | follow up on the progress
- 请求延期 | request an extension
- 按时完成 | complete on schedule`;
    document.getElementById('fx-input').value = example;
    updateParsePreview();
    toast('📋 已填入示例,点「保存」入库');
  });

  // 清空
  document.getElementById('fx-clear').addEventListener('click', () => {
    if (!confirm('清空当前输入框?(已保存的数据不会动)')) return;
    document.getElementById('fx-input').value = '';
    updateParsePreview();
  });

  loadDayToEditor();

  // 检查 URL 参数:扩展自动导入
  handleFanxingImportFromUrl();

  // 面板打开时刷新
  document.querySelectorAll('#fanxing [data-action="open"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (target === 'fx-translation-panel') initFxTranslation();
      else if (target === 'fx-cloze-panel') initFxCloze();
      else if (target === 'fx-qa-panel') initFxQA();
      else if (target === 'fx-flashcard-panel') initFxFlashcard();
    });
  });
}

/* ============== Fanxing 练习模式 1 · 整句翻译 ============== */
function buildFxSentenceQueue() {
  const day = getCurrentDay();
  if (!day) return [];
  // 优先级:practicing > new > mastered
  const sentences = day.items.filter((i) => i.type === 'sentence');
  const prio = { practicing: 1, new: 2, mastered: 3 };
  return [...sentences].sort((a, b) => (prio[a.mastery] || 9) - (prio[b.mastery] || 9));
}

function initFxTranslation() {
  fx.transQueue = buildFxSentenceQueue();
  fx.transIdx = 0;
  fx.transRevealed = false;

  const empty = document.getElementById('fx-trans-empty');
  const body = document.getElementById('fx-trans-body');
  if (fx.transQueue.length === 0) {
    empty.classList.remove('hidden');
    body.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  body.classList.remove('hidden');

  renderFxTrans();

  // 绑定事件(防重复:只绑一次用 dataset 标记)
  const reveal = document.getElementById('fx-trans-reveal');
  if (!reveal.dataset.bound) {
    reveal.dataset.bound = '1';
    reveal.addEventListener('click', () => {
      fx.transRevealed = true;
      document.getElementById('fx-trans-answer').classList.remove('hidden');
    });
    document.getElementById('fx-trans-speak').addEventListener('click', () => {
      const item = fx.transQueue[fx.transIdx];
      if (item) speech.speak(item.en);
    });
    document.getElementById('fx-trans-send').addEventListener('click', () => {
      const item = fx.transQueue[fx.transIdx];
      if (!item) return;
      const userEn = document.getElementById('fx-trans-input').value.trim();
      const prompt =
`我是 ITW FEG 的销售经理 Lina,正在练习整句翻译。

【中文】
${item.cn}

【标准答案(课堂笔记)】
${item.en}

【我的翻译】
${userEn || '(未填写)'}

请做 3 件事:
1. 指出我翻译的具体问题(语法 / 用词 / 地道度)
2. 给一个更地道的商务表达
3. 基于同一个句子结构,给我 2 个类似场景(食品设备销售)的例句让我练习`;
      const r = sendToClaude(prompt);
      toast(r.opened ? '🚀 已打开 Claude 网页' : '🚀 已复制,粘到 Claude');
      incStat('translation');
    });
    document.getElementById('fx-trans-correct').addEventListener('click', () => {
      markFxItem(fx.transQueue[fx.transIdx], true);
      toast('✅ 记上了');
      nextFxTrans();
    });
    document.getElementById('fx-trans-wrong').addEventListener('click', () => {
      markFxItem(fx.transQueue[fx.transIdx], false);
      toast('❌ 下次再战');
      nextFxTrans();
    });
    document.getElementById('fx-trans-next').addEventListener('click', nextFxTrans);
  }
}

function renderFxTrans() {
  const item = fx.transQueue[fx.transIdx];
  if (!item) return;
  document.getElementById('fx-trans-idx').textContent = `${fx.transIdx + 1} / ${fx.transQueue.length}`;
  document.getElementById('fx-trans-mastery').textContent = masteryChip(item.mastery);
  document.getElementById('fx-trans-cn').textContent = item.cn;
  document.getElementById('fx-trans-en').textContent = item.en;
  document.getElementById('fx-trans-input').value = '';
  document.getElementById('fx-trans-answer').classList.add('hidden');
  fx.transRevealed = false;
}

function nextFxTrans() {
  if (fx.transQueue.length === 0) return;
  fx.transIdx = (fx.transIdx + 1) % fx.transQueue.length;
  renderFxTrans();
}

/* ============== Fanxing 练习模式 2 · 关键词填空 ============== */
const CLOZE_STOPWORDS = new Set([
  'i','you','he','she','it','we','they','me','him','her','us','them','my','your','his','their','our','its',
  'a','an','the','this','that','these','those',
  'is','am','are','was','were','be','been','being',
  'do','does','did','done','doing',
  'have','has','had','having',
  'will','would','shall','should','can','could','may','might','must',
  'in','on','at','to','from','of','with','for','by','about','as','into','through','during','before','after',
  'and','but','or','nor','so','yet','if','then','else','than',
  'not','no','too','very','just','also','only','really','such','own','same','each','every','any','some','all','both','few','more','most','other','several','own'
]);

function pickClozeWords(en) {
  // 拿 1~2 个长度 ≥ 4 的非 stopword 做空
  const tokens = en.split(/(\W+)/);  // 保留标点以便重组
  const candidates = [];
  tokens.forEach((t, i) => {
    const w = t.toLowerCase();
    if (/^[a-z]+$/i.test(t) && t.length >= 4 && !CLOZE_STOPWORDS.has(w)) {
      candidates.push({ token: t, i, len: t.length });
    }
  });
  // 按长度降序取前 2
  candidates.sort((a, b) => b.len - a.len);
  const picked = candidates.slice(0, Math.min(2, Math.max(1, Math.floor(candidates.length / 3 + 1))));
  const pickedIdx = new Set(picked.map((p) => p.i));
  return { tokens, pickedIdx, answers: picked.map((p) => p.token) };
}

function initFxCloze() {
  fx.clozeQueue = buildFxSentenceQueue();
  fx.clozeIdx = 0;
  fx.clozeAnswered = false;

  const empty = document.getElementById('fx-cloze-empty');
  const body = document.getElementById('fx-cloze-body');
  if (fx.clozeQueue.length === 0) {
    empty.classList.remove('hidden');
    body.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  body.classList.remove('hidden');

  renderFxCloze();

  const check = document.getElementById('fx-cloze-check');
  if (!check.dataset.bound) {
    check.dataset.bound = '1';
    check.addEventListener('click', () => {
      const item = fx.clozeQueue[fx.clozeIdx];
      if (!item || !item._cloze) return;
      const inputs = document.querySelectorAll('#fx-cloze-sentence .fx-cloze-input');
      let allCorrect = true;
      inputs.forEach((inp) => {
        const user = (inp.value || '').trim().toLowerCase();
        const ans = inp.dataset.answer.toLowerCase();
        if (user === ans) {
          inp.classList.add('fx-cloze-ok');
          inp.classList.remove('fx-cloze-bad');
        } else {
          inp.classList.add('fx-cloze-bad');
          inp.classList.remove('fx-cloze-ok');
          allCorrect = false;
        }
      });
      const res = document.getElementById('fx-cloze-result');
      res.classList.remove('hidden');
      if (allCorrect) {
        res.innerHTML = `<div class="fx-result-ok">🎉 全对!<br><small>${escapeHtml(item.en)}</small></div>`;
        markFxItem(item, true);
      } else {
        res.innerHTML = `<div class="fx-result-bad">❌ 有错.<br><small>完整答案:${escapeHtml(item.en)}</small></div>`;
        markFxItem(item, false);
      }
      fx.clozeAnswered = true;
    });
    document.getElementById('fx-cloze-reveal').addEventListener('click', () => {
      const item = fx.clozeQueue[fx.clozeIdx];
      if (!item) return;
      const res = document.getElementById('fx-cloze-result');
      res.classList.remove('hidden');
      res.innerHTML = `<div class="fx-result-neutral">👁 ${escapeHtml(item.en)}</div>`;
      document.querySelectorAll('#fx-cloze-sentence .fx-cloze-input').forEach((inp) => {
        inp.value = inp.dataset.answer;
        inp.classList.add('fx-cloze-revealed');
      });
    });
    document.getElementById('fx-cloze-speak').addEventListener('click', () => {
      const item = fx.clozeQueue[fx.clozeIdx];
      if (item) speech.speak(item.en);
    });
    document.getElementById('fx-cloze-next').addEventListener('click', () => {
      if (fx.clozeQueue.length === 0) return;
      fx.clozeIdx = (fx.clozeIdx + 1) % fx.clozeQueue.length;
      renderFxCloze();
    });
  }
}

function renderFxCloze() {
  const item = fx.clozeQueue[fx.clozeIdx];
  if (!item) return;
  document.getElementById('fx-cloze-idx').textContent = `${fx.clozeIdx + 1} / ${fx.clozeQueue.length}`;
  document.getElementById('fx-cloze-mastery').textContent = masteryChip(item.mastery);
  document.getElementById('fx-cloze-cn').textContent = item.cn;

  const { tokens, pickedIdx } = pickClozeWords(item.en);
  item._cloze = { tokens, pickedIdx };

  const sentEl = document.getElementById('fx-cloze-sentence');
  sentEl.innerHTML = tokens
    .map((t, i) => {
      if (pickedIdx.has(i)) {
        const width = Math.max(60, t.length * 12);
        return `<input type="text" class="fx-cloze-input" data-answer="${escapeHtml(t)}" style="width:${width}px" />`;
      }
      return escapeHtml(t);
    })
    .join('');

  document.getElementById('fx-cloze-result').classList.add('hidden');
  fx.clozeAnswered = false;
}

/* ============== Fanxing 练习模式 3 · AI 问答 ============== */
function initFxQA() {
  const day = getCurrentDay();
  const empty = document.getElementById('fx-qa-empty');
  const body = document.getElementById('fx-qa-body');
  if (!day || day.items.length === 0) {
    empty.classList.remove('hidden');
    body.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  body.classList.remove('hidden');

  const send = document.getElementById('fx-qa-send');
  if (!send.dataset.bound) {
    send.dataset.bound = '1';
    send.addEventListener('click', () => {
      const d = getCurrentDay();
      if (!d) return;
      const style = document.getElementById('fx-qa-style').value;
      const countRaw = document.getElementById('fx-qa-count').value;

      let items = d.items;
      if (style === 'weak') {
        items = items.filter((i) => i.mastery !== 'mastered');
      }
      if (countRaw !== 'all') {
        const n = parseInt(countRaw, 10);
        items = items.slice(0, n);
      }
      if (items.length === 0) {
        toast('没有符合条件的内容');
        return;
      }

      const sentences = items.filter((i) => i.type === 'sentence');
      const words = items.filter((i) => i.type === 'word');
      const phrases = items.filter((i) => i.type === 'phrase');

      const listBlock = [];
      if (sentences.length) {
        listBlock.push('【今天的句子】');
        sentences.forEach((s, i) => listBlock.push(`${i + 1}. ${s.cn} → ${s.en}`));
      }
      if (words.length) {
        listBlock.push('\n【今天的单词】');
        words.forEach((w, i) => listBlock.push(`${i + 1}. ${w.cn} = ${w.en}`));
      }
      if (phrases.length) {
        listBlock.push('\n【今天的短语】');
        phrases.forEach((p, i) => listBlock.push(`${i + 1}. ${p.cn} = ${p.en}`));
      }

      const taskMap = {
        random: '请综合出题:随机混合中译英 / 造句 / 换种说法 3 种题型',
        translation: '请把上面所有"中文"出成中译英题,我做完后给我批改反馈',
        create: '请用上面的词和短语组合,造 5 个新的商务英语句子(ITW 销售场景),先给中文再给英文',
        scenario: '请把上面的内容放进"我给欧洲客户介绍 ITW FEG 烘焙设备 / 食品加工设备"的真实业务对话里,做 5 轮角色扮演',
        weak: '我还没掌握上面这些.请只针对它们出题,题型灵活,反馈要具体指出我哪里容易错',
      };
      const task = taskMap[style] || taskMap.random;

      const prompt =
`我是 ITW FEG 深圳的销售经理 Lina,正在用繁星课堂 + 自己做的英语看板练习.

下面是我今天(${d.date})学的内容.${task}

${listBlock.join('\n')}

要求:
- 用中英混排,中文说题目 / 反馈,英文是要练的内容
- 每题做完就立刻给我反馈,不要一次性出完再批
- 反馈里如果有我用错的词,额外告诉我 ITW 销售场景下怎么说更地道`;

      const r = sendToClaude(prompt);
      toast(r.opened ? '🚀 已打开 Claude 网页' : '🚀 已复制,粘到 Claude');
      incStat('translation');
    });
  }
}

/* ============== Fanxing 练习模式 4 · 单词/短语闪卡 ============== */
function buildFxFlashcardQueue() {
  const day = getCurrentDay();
  if (!day) return [];
  const items = day.items.filter((i) => i.type === 'word' || i.type === 'phrase');
  // 过滤掉已掌握的(除非全掌握了)
  const unmastered = items.filter((i) => i.mastery !== 'mastered');
  return unmastered.length > 0 ? unmastered : items;
}

function initFxFlashcard() {
  fx.fcQueue = buildFxFlashcardQueue();
  fx.fcIdx = 0;
  fx.fcFlipped = false;

  const empty = document.getElementById('fx-fc-empty');
  const body = document.getElementById('fx-fc-body');
  if (fx.fcQueue.length === 0) {
    empty.classList.remove('hidden');
    body.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  body.classList.remove('hidden');

  renderFxFc();

  const card = document.getElementById('fx-fc-card');
  if (!card.dataset.bound) {
    card.dataset.bound = '1';
    card.addEventListener('click', (e) => {
      // 避免朗读按钮触发翻面
      if (e.target.closest('.speak-btn')) return;
      fx.fcFlipped = !fx.fcFlipped;
      card.classList.toggle('flipped', fx.fcFlipped);
    });

    document.getElementById('fx-fc-prev').addEventListener('click', () => changeFxFc(-1));
    document.getElementById('fx-fc-next').addEventListener('click', () => changeFxFc(1));

    document.getElementById('fx-fc-correct').addEventListener('click', () => {
      markFxItem(fx.fcQueue[fx.fcIdx], true);
      toast('✅ 记住了');
      changeFxFc(1);
    });
    document.getElementById('fx-fc-wrong').addEventListener('click', () => {
      markFxItem(fx.fcQueue[fx.fcIdx], false);
      toast('❌ 明天再来');
      changeFxFc(1);
    });

    document.getElementById('fx-fc-speak').addEventListener('click', (e) => {
      e.stopPropagation();
      const it = fx.fcQueue[fx.fcIdx];
      if (it) speech.speak(it.en);
    });
    document.getElementById('fx-fc-speak-slow').addEventListener('click', (e) => {
      e.stopPropagation();
      const it = fx.fcQueue[fx.fcIdx];
      if (it) speech.speak(it.en, { rate: 0.55 });
    });
  }
}

function renderFxFc() {
  const item = fx.fcQueue[fx.fcIdx];
  if (!item) return;
  document.getElementById('fx-fc-idx').textContent = `${fx.fcIdx + 1} / ${fx.fcQueue.length}`;
  document.getElementById('fx-fc-mastery').textContent = masteryChip(item.mastery);
  document.getElementById('fx-fc-cn').textContent = item.cn;
  document.getElementById('fx-fc-en').textContent = item.en;
  const card = document.getElementById('fx-fc-card');
  fx.fcFlipped = false;
  card.classList.remove('flipped');
}

function changeFxFc(delta) {
  if (fx.fcQueue.length === 0) return;
  fx.fcIdx = (fx.fcIdx + delta + fx.fcQueue.length) % fx.fcQueue.length;
  renderFxFc();
}

/* ============== 启动 ============== */
document.addEventListener('DOMContentLoaded', () => {
  speech.init();
  initMethods();
  initTemplates();
  initRecording();
  initCopyTools();
  initFlashcards();
  initFanxing();
  initPanels();
  initResetButtons();
  renderStats();
});
