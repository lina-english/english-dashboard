# 英语学习看板 · English Dashboard

一个本地 HTML 看板，集成方法论阅读 + 五种学习检测 + 进度追踪。背后接 Claude Code 的
translation-training / speech-training / logic-training skills 做深度反馈。

## 快速开始

1. 双击 `index.html` 用 **Chrome** 或 **Edge** 打开（Firefox 不支持录音）
2. 上方三个锚点：📚 方法 / 🎤 检测 / 📊 进度
3. 练习完后，按钮会把 prompt 复制到剪贴板，粘贴到 Claude Code 对话框即可

## 五种学习模式

| 模式 | 功能 | 后端依赖 |
|---|---|---|
| 🎙️ 录音检测 | 浏览器实时转文字 + 生成分析指令 | Web Speech API（纯前端）+ Claude |
| 🔄 翻译检测 | 粘贴中文，脱壳法 5 步拆解 | `translation-training` skill |
| ✉️ 邮件润色 | 草稿 → 地道商务邮件 + 改动解释 | Claude（prompt 已写好） |
| 🎤 演讲稿 | Ramp → Roadmap → PoDs → Dessert 完整框架 | `speech-training` skill |
| 📇 术语卡片 | 食品设备 + 商务通用词汇抽卡 | 纯前端（localStorage 记进度） |

## 目录结构

```
english-dashboard/
├── index.html          主页面
├── styles.css          样式
├── app.js              交互逻辑
├── data/
│   ├── methods.json    方法论内容（脱壳法 / 演讲结构 / 金字塔）
│   └── vocab.json      术语卡片数据
└── README.md           本文档
```

## 给学员的使用方式

1. 把整个 `english-dashboard/` 文件夹拷到自己电脑
2. 确保 Claude Code 已安装，skills 已生效
3. 双击 `index.html` 开始练习

> 方法论内容和词汇都可以自己改 — 编辑 `data/methods.json` 和 `data/vocab.json` 即可，不用改代码。

## 常见问题

**Q: 录音按钮不工作？**
- 确认浏览器是 Chrome / Edge
- 确认给了麦克风权限（地址栏左边有权限图标）
- 第一次用会弹出权限弹窗，选"允许"

**Q: 今日记录会保存到什么地方？**
- `localStorage`，跟浏览器绑定。换浏览器或清缓存会丢
- 每天自动归零（单词记忆进度保留）

**Q: 怎么定制自己的场景？**
- 每个检测模块都有"场景""目的""关系"下拉框，选最接近的即可
- 生成的 prompt 可以粘贴后再手动调整
