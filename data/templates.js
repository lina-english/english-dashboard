/* 场景模板数据 · 三大商务场景的完整学习材料
 * 每个场景：目标 + 对话结构 + 完整示范 + 核心句型 + 文化 Tips
 * 修改后刷新即可，不用改代码
 */
window.TEMPLATES_DATA = {
  "templates": [
    /* ============== 场景 1：跟客户介绍产品 ============== */
    {
      "id": "customer-intro",
      "icon": "🤝",
      "title": "跟客户介绍产品",
      "subtitle": "Introducing Products to Customers",
      "color": "#0066b3",
      "scenario": "展会/拜访/产品演示。客户第一次接触你家产品，或正在比较多家供应商。",
      "goal": "让客户在 10 分钟内理解：我们是谁、这款产品为什么适合你、下一步做什么。",
      "structure": [
        "Opening · 热身 + 建立氛围（30 秒）",
        "Understanding · 先问再说——了解客户痛点（2 分钟）",
        "Feature → Benefit · 功能对应到他的痛点（3 分钟）",
        "Proof · 一个具体客户案例做背书（1 分钟）",
        "Call to Action · 明确下一步动作（30 秒）"
      ],
      "sampleDialogue": "Thank you for taking the time to meet with me today. I'm Lina from ITW FEG, and I'd like to walk you through our latest combi oven — the XR-500 series.\n\nBefore I dive in, could you share a bit about your current operation? What's your daily production volume, and what challenges are you running into with your existing equipment?\n\n[Customer responds]\n\nGot it — that gives me a much clearer picture. Based on what you just shared, I think the XR-500 is a strong fit for three reasons.\n\nFirst, it's designed for high-volume operations — up to 400 meals per hour with consistent quality. That directly addresses the bottleneck you mentioned during peak hours.\n\nSecond, it uses 20% less energy than the industry average. For a kitchen your size, that translates to roughly $3,000 in annual savings.\n\nThird, our after-sales team is based here in Shenzhen, so installation and training typically happen within one week of delivery — not the six to eight weeks you might be used to.\n\nOne of our customers, a bakery chain with 30 outlets across the Greater Bay Area, rolled out the XR-500 last year. Within the first quarter, they saw a 15% lift in kitchen throughput and zero downtime incidents.\n\nWould you be open to scheduling a live demo at your site next week? I can bring one of our technical specialists so we can answer any detailed questions on the spot.",
      "sampleDialogueCn": "感谢您今天抽时间见我。我是 ITW FEG 的 Lina，想跟您详细介绍一下我们最新的多功能蒸烤箱——XR-500 系列。\n\n在我开始之前，能先简单介绍下您目前的运营情况吗？您每天的产量大概多少？您现在用的设备遇到哪些挑战？\n\n[客户回答]\n\n明白了——这让我对情况有了更清晰的了解。基于您刚才分享的内容，我认为 XR-500 非常适合您，理由有三个。\n\n第一，它专为高产量场景设计——每小时可做 400 份餐食，质量稳定。这正好解决了您提到的高峰时段产能瓶颈问题。\n\n第二，它比行业平均水平省 20% 的电。以您这个规模的厨房来算，大概每年能省下 3,000 美金。\n\n第三，我们的售后团队就在深圳，所以安装调试和培训通常在发货后一周内就能完成——而不是您过去习惯的 6 到 8 周。\n\n我们有一家客户，是大湾区一家拥有 30 家门店的烘焙连锁，去年引入了 XR-500。第一个季度就实现了厨房吞吐量 15% 的提升，并且零停机故障。\n\n您愿意安排下周在您那边做一次现场演示吗？我可以带一位技术专家一起过去，任何细节问题都能当场回答。",
      "keyPatterns": [
        { "en": "Thank you for taking the time to meet with me today.", "cn": "谢谢您今天抽时间跟我见面。", "usage": "开场 · 礼貌 + 建立氛围" },
        { "en": "I'd like to walk you through...", "cn": "我想跟您详细介绍一下……", "usage": "引入产品 · 比 \"introduce\" 更专业" },
        { "en": "Could you share a bit about your current operation?", "cn": "能简单介绍下您现在的运作情况吗？", "usage": "了解客户 · 先听再说" },
        { "en": "What challenges are you running into with...?", "cn": "您在……方面遇到什么挑战？", "usage": "挖痛点 · 比 \"problem\" 更委婉" },
        { "en": "Based on what you just shared, I think X is a strong fit because...", "cn": "基于您刚说的，我认为 X 非常合适，因为……", "usage": "需求到方案的衔接 · 必须引用客户原话" },
        { "en": "That directly addresses the [pain point] you mentioned.", "cn": "这正好解决了您提到的……", "usage": "功能 → 痛点 · 必须明确对应" },
        { "en": "That translates to roughly $X in annual savings.", "cn": "这大约能每年节省 X 美金。", "usage": "把数据变成钱 · 说服力拉满" },
        { "en": "One of our customers... saw a X% increase in...", "cn": "我们的一位客户……实现了 X% 的提升。", "usage": "案例背书 · 要具体到数字" },
        { "en": "Within the first quarter, they saw...", "cn": "在第一个季度内他们就……", "usage": "强调见效快 · 缓解客户疑虑" },
        { "en": "Would you be open to scheduling a live demo at your site?", "cn": "您愿意安排一次到您那边的现场演示吗？", "usage": "推进下一步 · 比 \"can we meet?\" 更专业" },
        { "en": "I can bring one of our technical specialists.", "cn": "我可以带上我们的技术专家一起过去。", "usage": "加码诚意 · 表示重视" },
        { "en": "Answer any detailed questions on the spot.", "cn": "现场回答任何细节问题。", "usage": "消除客户犹豫 · 体现专业" }
      ],
      "culturalTips": [
        "不要一上来就推销产品 — 先问 2-3 个问题了解客户，哪怕 5 分钟也值得",
        "数字和案例永远比形容词有说服力 — \"20% 节能\"比\"节能效果好\"有力 10 倍",
        "说功能时一定要对应回客户提过的痛点（\"... addresses the issue you mentioned about...\"）",
        "不要说 \"we are the best\" — 欧美客户听这种话会本能抗拒，用 \"one of our customers saw...\" 更可信",
        "结尾一定要有明确的 next step — 不要用 \"let's keep in touch\" 这种空话，用 \"schedule a demo / send you a proposal / arrange a call next Tuesday\""
      ],
      "grammarPoints": [
        {
          "title": "would like to do · 商务首选",
          "point": "\"I'd like to...\" 比 \"I want to...\" 更礼貌、更职业。商务场合几乎必须用 would like。",
          "example": "✅ I'd like to walk you through our latest model.\n❌ I want to show you our model.（口气太强）"
        },
        {
          "title": "现在进行时表\"持续困扰\"",
          "point": "\"are you running into\"（现在进行时）比 \"do you have\" 更生动——强调问题是\"正在遇到、还没解决\"的状态。",
          "example": "✅ What challenges are you running into?（你现在正在头疼的是什么？）\n一般现在时：What problems do you have?（比较中性）"
        },
        {
          "title": "Based on + what 从句",
          "point": "商务过渡最常用的衔接。后接名词短语或 what 引导的从句，把客户输入和你的方案自然连起来。",
          "example": "Based on what you just shared, I think... is a strong fit.\nBased on your production volume, I'd recommend..."
        },
        {
          "title": "be designed for / be based in · 被动语态替代 have",
          "point": "英文商务表达偏爱被动语态突出产品/团队\"专门为…而…\"的意味，比 \"it has\" 更专业。",
          "example": "✅ It's designed for high-volume operations.\n✅ Our team is based in Shenzhen.\n(不说：It has a design for... / Our team has a base in...)"
        },
        {
          "title": "X translates to Y · 把数据转化成钱",
          "point": "translate to 这里不是\"翻译\"，是\"换算成/意味着\"。把抽象数据变成客户能感知的钱。销售必备。",
          "example": "20% less energy translates to roughly $3,000 in annual savings.（省 20% 电，意味着每年省 3000 美金）"
        },
        {
          "title": "Would you be open to + 动名词",
          "point": "最委婉的邀约句式。be open to 后面只能接名词/动名词（-ing），不是动词原形。记住这个陷阱。",
          "example": "✅ Would you be open to scheduling a demo?\n❌ Would you be open to schedule a demo?（错）"
        },
        {
          "title": "so (that) 从句 · 口语中省略 that",
          "point": "\"so\" 当\"以便\"讲时，书面是 \"so that\"，口语和非正式邮件中常省略 that，听起来更自然。",
          "example": "I can bring a specialist so we can answer questions on the spot.\n= ... so that we can answer ..."
        }
      ]
    },

    /* ============== 场景 2：跟领导汇报工作 ============== */
    {
      "id": "boss-report",
      "icon": "📊",
      "title": "跟领导汇报工作",
      "subtitle": "Reporting to Your Boss",
      "color": "#d97706",
      "scenario": "周例会 / 月度汇报 / 项目进展 / 季度复盘 / 紧急问题升级。老板时间有限，要结论先行。",
      "goal": "1 分钟内让老板听到结论 → 5 分钟内听到要点 → 留 5 分钟给他问问题。不要流水账。",
      "structure": [
        "Headline · 一句话结论 + 今天要讲什么（20 秒）",
        "Results · 先报喜——关键数据 + 达成情况（1 分钟）",
        "Challenges · 再报忧——遇到什么、已经在怎么处理（2 分钟）",
        "Ask · 最重要——我需要你的什么支持（30 秒）",
        "Next Steps · 我打算怎么做（1 分钟）"
      ],
      "sampleDialogue": "Good morning. I'd like to walk you through the Q1 update for the Shenzhen region. I'll cover three things: our sales performance, the main challenges we're facing, and what I need from you to hit our Q2 target.\n\nStarting with the results — we closed Q1 at 108% of target. Revenue hit 4.2 million, driven largely by three new accounts in the bakery chain segment. Our gross margin held steady at 35%, which is right in line with the plan.\n\nThat said, there are two concerns I want to flag. First, our lead times have stretched from 8 to 11 weeks due to supplier delays. I've had three customer escalations this month alone, and if this continues, we risk losing two key accounts. Second, my team is now running 20% under headcount after the January departures — and we're going into our busiest quarter.\n\nLooking ahead, I see two things that would really help us hit Q2. First, could you help me push the operations team on the supplier issue? Even a one-week reduction in lead time would close most of the customer complaints. Second, I'd like approval to hire two new account managers by end of April — I have candidates in the pipeline ready to move.\n\nMy plan is to personally handle the two at-risk accounts this week, and kick off the hiring process once I have your green light. I've put the detailed numbers in the deck I shared earlier. Happy to go deeper on any point.",
      "sampleDialogueCn": "早上好。我想跟您汇报一下深圳大区的 Q1 情况。我会讲三件事：销售业绩、目前面临的主要挑战、以及我需要您什么支持来完成 Q2 目标。\n\n先说结果——我们 Q1 完成了目标的 108%。营收达到 420 万，主要由烘焙连锁板块的三个新客户驱动。毛利率保持在 35%，完全符合计划。\n\n不过，有两个问题我想提一下。第一，我们的交期从 8 周延长到了 11 周，主要是供应商延误。这个月我已经收到三次客户升级投诉，如果继续下去，我们可能会失去两个关键客户。第二，在一月份几位同事离职之后，我的团队现在缺员 20%——偏偏我们又要进入全年最忙的季度。\n\n往前看，有两件事如果能推动的话，对我们 Q2 冲目标帮助很大。第一，您能帮我推一下运营团队处理供应商问题吗？哪怕交期缩短一周，就能解决大部分客户投诉。第二，我想申请四月底前招两位新的客户经理——我这边已经有候选人 ready 了。\n\n我的计划是本周先亲自处理那两个有流失风险的客户，等您批准就启动招聘。详细数据都在我之前发的报告里。任何一点需要深入讨论都可以。",
      "keyPatterns": [
        { "en": "I'd like to walk you through the [period/topic] update.", "cn": "我想跟您汇报一下……更新。", "usage": "开场 · 比 \"I want to report\" 更顺" },
        { "en": "I'll cover three things: X, Y, and Z.", "cn": "我会讲三件事：X、Y、Z。", "usage": "路线图 · 让老板有预期" },
        { "en": "We closed Q1 at 108% of target.", "cn": "我们 Q1 完成了目标的 108%。", "usage": "业绩先行 · 直接给数字" },
        { "en": "Driven largely by [reason].", "cn": "主要由……驱动。", "usage": "归因 · 让老板知道 why" },
        { "en": "Right in line with the plan.", "cn": "完全符合计划。", "usage": "讲稳定性 · 比 \"as expected\" 更专业" },
        { "en": "There are two concerns I want to flag.", "cn": "有两个问题我想提一下。", "usage": "报忧 · \"flag\" 比 \"report a problem\" 轻很多" },
        { "en": "If this continues, we risk [consequence].", "cn": "如果继续下去，我们可能会……", "usage": "说风险 · 不夸张但引起重视" },
        { "en": "Looking ahead, I see two things that would help us...", "cn": "往前看，我觉得有两件事能帮我们……", "usage": "转到求助 · 有建设性" },
        { "en": "Could you help me push [team] on [issue]?", "cn": "您能帮我推一下 [team] 的 [issue] 吗？", "usage": "求资源 · 比 \"can you solve this\" 专业 10 倍" },
        { "en": "I'd like approval to [action].", "cn": "我想申请批准……", "usage": "要权限 · 直接但不冒犯" },
        { "en": "My plan is to..., and kick off [X] once I have your green light.", "cn": "我的计划是……，等您批准后启动 X。", "usage": "表执行力 · 让老板觉得你在 drive 事情" },
        { "en": "Happy to go deeper on any point.", "cn": "任何一点需要深入讨论都可以。", "usage": "收尾 · 比 \"any questions?\" 更主动" }
      ],
      "culturalTips": [
        "结论先行 — 不要用 \"我花了 3 个月做了一堆事，过程是这样的…… 所以结论是\"，要直接 \"we closed at 108%\"",
        "数字是你的盾牌 — 尽量给精确数字（108%、$3,000、20%），不要用 \"很多\" \"不错\" \"还可以\"",
        "报忧要带方案 — 说问题时立刻说已经在做什么，别让老板替你想解决方案",
        "\"Ask\" 要具体 — 不要说 \"I need more support\"，要说 \"I need 2 headcount approval\" 或 \"I need you to push operations on X\"",
        "英美老板喜欢 directness — 不要客套铺垫太久，\"I'd like to flag a concern\" 就够了，不用 \"I'm really sorry but unfortunately...\""
      ],
      "grammarPoints": [
        {
          "title": "cover 作\"涉及/讲述\"",
          "point": "\"I'll cover three things\" 比 \"I will talk about\" 更职场。cover 有\"覆盖、涉及\"之意，简洁有力。",
          "example": "I'll cover three things: results, challenges, and what I need from you.\n对比：I'm going to talk about... (太口语)"
        },
        {
          "title": "过去分词做后置定语：driven by / led by",
          "point": "\"Revenue hit 4.2M, driven largely by three new accounts\" —— driven 引导的短语修饰前面的名词，简洁归因。省掉 which was。",
          "example": "Revenue hit 4.2M, driven by new accounts.\n= Revenue, which was driven by new accounts, hit 4.2M.\n（后者太啰嗦）"
        },
        {
          "title": "hold steady / hold up · 短语动词",
          "point": "hold steady = 保持稳定（尤其数据）。汇报数据高频词。类似的还有 hold up（撑得住）、hold off（推迟）。",
          "example": "Our gross margin held steady at 35%.\nSales held up despite the market downturn."
        },
        {
          "title": "flag 作动词 · \"标记、提出关注\"",
          "point": "比 raise / report 轻松得多。\"There's a concern I want to flag\" 意思是\"有个问题我想先挂个号\"。",
          "example": "There are two concerns I want to flag.\nI wanted to flag this before our Monday review."
        },
        {
          "title": "if..., we risk + 名词/-ing",
          "point": "说潜在风险的标杆句式。risk 后面不跟 to do，直接跟动名词或名词结果。",
          "example": "✅ If this continues, we risk losing two accounts.\n❌ we risk to lose two accounts.（错）"
        },
        {
          "title": "push [team] on [issue] · 推动他人",
          "point": "push on 是商务委婉地说\"你去催一下\"。push someone on something 是固定搭配。",
          "example": "Could you help me push the operations team on the supplier issue?\nI'll push Finance on the budget approval."
        },
        {
          "title": "once + 从句（现在时表将来）",
          "point": "once 引导的从句中，即使指的是未来的事，仍然用现在时（一般或完成），不用 will。",
          "example": "✅ I'll kick off hiring once I have your green light.\n❌ once I will have your green light.（错）"
        },
        {
          "title": "Happy to... · 主语省略",
          "point": "口语 / 非正式商务中，I'm 经常省略。\"Happy to go deeper\" = \"I'm happy to go deeper\"。显得干脆、不拖沓。",
          "example": "Happy to go deeper on any point.\nHappy to take any questions.\n(口语省主语让语气更轻)"
        }
      ]
    },

    /* ============== 场景 3：跟同事进行交流 ============== */
    {
      "id": "peer-chat",
      "icon": "💬",
      "title": "跟同事进行交流",
      "subtitle": "Collaborating with Peers",
      "color": "#059669",
      "scenario": "三种常见情境：① 快速求助（要 5 分钟） ② 跨部门推进（追进度） ③ 日常寒暄建立关系。",
      "goal": "把事情推进+保持关系同时做。不要太正式（像跟老板说话），也不要太随意（像朋友）。",
      "structure": [
        "情境 A · Quick Ask（快速求助）· 开门见山 + 明确时间预期",
        "情境 B · Cross-Department（跨部门推进）· Follow-up + 明确截止日期",
        "情境 C · Casual Chat（闲聊关系）· 3 分钟话题转工作"
      ],
      "sampleDialogue": "--- A. Quick Ask（走到同事工位） ---\n\nHey Mike, do you have 5 minutes? I need a quick gut check on the quotation I'm sending to ABC Food Tech this afternoon. Specifically, the warranty terms — can we commit to 18 months on this one, or should I stick with the standard 12? I don't want to over-promise.\n\n[Mike responds]\n\nGot it, that makes sense. I'll go with 12 and mention we can revisit after the first year. Thanks for the heads up.\n\n\n--- B. Cross-Department（Teams / Email 追进度） ---\n\nHi Sarah, just following up on the XR-500 customization request from last week. Quick status check — are we on track to finalize the design by Friday? I'm planning to send the updated quote to the customer Monday morning, so I'd need your sign-off by end of day Thursday at the latest. Let me know if anything is blocking you on my side.\n\n\n--- C. Casual Chat（茶水间 / 午餐） ---\n\nHey, how was your weekend? ... Oh nice, Sanya — that sounds amazing, I've been wanting to go. Hey by the way, are you joining the training session on Friday? I heard they're bringing in someone from marketing to walk us through the new product positioning. Should be useful for us on the sales side too.",
      "sampleDialogueCn": "--- A. Quick Ask（走到同事工位）---\n\n嘿 Mike，你有 5 分钟吗？我想让你帮我快速确认下今天下午要发给 ABC Food Tech 的报价单。主要是保修期——这个客户我们可以承诺 18 个月吗，还是我按标准的 12 个月来？我不想承诺过头。\n\n[Mike 回答]\n\n明白了，有道理。我就按 12 个月来，然后提一句第一年之后可以再议。谢谢提醒。\n\n\n--- B. Cross-Department（Teams / Email 追进度）---\n\nHi Sarah，跟进一下上周提的 XR-500 定制化需求。快速确认下进度——我们还能按计划周五前敲定设计吗？我打算周一早上把更新后的报价发给客户，所以最晚需要你周四下班前确认。如果我这边有什么挡住你的，告诉我。\n\n\n--- C. Casual Chat（茶水间 / 午餐）---\n\n嘿，周末怎么样？……哦不错，三亚听起来很棒，我也一直想去。对了，你参加周五的培训吗？听说会请市场部的同事过来给我们讲新产品定位，对我们销售这边应该也挺有用。",
      "keyPatterns": [
        { "en": "Do you have 5 minutes?", "cn": "有 5 分钟吗？", "usage": "快速求助开场 · 给出明确时长，对方更愿意答应" },
        { "en": "I need a quick gut check on...", "cn": "我想让你帮我快速看一下……", "usage": "求确认 · \"gut check\" 地道且谦虚" },
        { "en": "Can we commit to X, or should I stick with Y?", "cn": "我们能承诺 X 吗，还是我按 Y 来？", "usage": "给选项 · 比让对方想方案效率高" },
        { "en": "I don't want to over-promise.", "cn": "我不想承诺过头。", "usage": "解释动机 · 显示你在为公司着想" },
        { "en": "Thanks for the heads up.", "cn": "谢谢提醒。", "usage": "道谢 · 比 \"thank you\" 口语化 自然" },
        { "en": "Just following up on...", "cn": "跟进一下……", "usage": "追进度开场 · 不施压" },
        { "en": "Quick status check — are we on track to...?", "cn": "快速确认下进度，我们还能按时……吗？", "usage": "明确询问 · 聚焦结果而非过程" },
        { "en": "I'd need your sign-off by end of day Thursday at the latest.", "cn": "我最晚需要你在周四下班前确认。", "usage": "给死线 · \"at the latest\" 是关键" },
        { "en": "Let me know if anything is blocking you on my side.", "cn": "如果我这边有什么挡住你的，告诉我。", "usage": "主动担责 · 好同事的标志" },
        { "en": "How was your weekend?", "cn": "周末过得怎么样？", "usage": "闲聊经典开场 · 周一早上必问" },
        { "en": "Hey by the way, are you joining...?", "cn": "对了，你会参加……吗？", "usage": "从闲聊转工作 · 自然过渡" },
        { "en": "Should be useful for us on the [department/role] side.", "cn": "对我们……这边应该挺有用的。", "usage": "拉近关系 · 强调共同利益" }
      ],
      "culturalTips": [
        "Quick Ask 必须给时长 — \"do you have 5 minutes\" 比 \"can I ask you something\" 成功率高得多",
        "Follow-up 不等于催 — 用 \"just following up\" / \"quick status check\"，不要用 \"why haven't you...\"",
        "给截止日期要说 \"at the latest\" — 对方理解为弹性而不是硬顶，更容易配合",
        "闲聊不是浪费时间 — 英美文化里 2 分钟 small talk 是合作的润滑剂，周一必问 weekend、周五必聊 weekend plan",
        "用 \"hey\" 不要用 \"hello\" 开头邮件/Teams — 同事之间 \"hello\" 会显得过于正式"
      ],
      "grammarPoints": [
        {
          "title": "Do you have...？· 美式用 have，不用 got",
          "point": "美式英语用 \"Do you have 5 minutes?\"。英式会说 \"Have you got 5 minutes?\"。同事/客户场合用 have 最安全。",
          "example": "✅ Do you have 5 minutes?\n🇬🇧 Have you got 5 minutes?（英式）\n❌ You have 5 minutes?（语调对也能用，但不够规范）"
        },
        {
          "title": "gut check · 口语习语",
          "point": "字面\"直觉检查\"，地道意思是\"请你帮我快速把关，看有没有明显问题\"。同事间高频，显得你谦虚又高效。",
          "example": "I need a quick gut check on this proposal.\nCan I get a gut check on these numbers before I send them?"
        },
        {
          "title": "stick with · 短语动词 · \"坚持某选择\"",
          "point": "stick with + 方案/人 = 继续用某方案、跟定某人。和 stick to 含义接近但 stick with 更口语。",
          "example": "I'll stick with the standard 12 months.（按标准 12 个月来）\nLet's stick with the current plan.\n✅ stick with him / stick to the schedule"
        },
        {
          "title": "heads up · 名词习语 · \"提醒、预告\"",
          "point": "\"Thanks for the heads up\" = 谢谢提醒。\"Just a heads up\" = 温馨提示一下。商务邮件/IM 极高频。",
          "example": "Thanks for the heads up.\nJust a heads up — the office will be closed Monday.\nGave him a heads up about the meeting.（提前跟他说了一下）"
        },
        {
          "title": "just + 动名词 · 软化语气",
          "point": "\"just following up\"、\"just checking in\" 开头，让对方不觉得被催。just 在这里是\"就是想\"\"顺便\"的意思。",
          "example": "Just following up on the request.\nJust checking in — are we still on for Friday?\nJust wanted to flag this before you send it."
        },
        {
          "title": "on track to + 动词原形 · 进度询问",
          "point": "on track = 在轨道上/按计划。to 后接动词原形，不是 -ing 也不是 will。标杆句式。",
          "example": "✅ Are we on track to finalize the design by Friday?\n❌ on track to finalizing（错）\n❌ on track to will finalize（错）"
        },
        {
          "title": "by end of day · 截止时间表达",
          "point": "by end of day + 星期 = 到某天下班前。注意：end of day 这里是名词短语，前面不加 the（商务惯用）。缩写 EOD。",
          "example": "by end of day Thursday = 周四下班前\nby EOD Monday = 周一下班前\n✅ I'd need your sign-off by end of day Thursday at the latest."
        },
        {
          "title": "at the latest · 副词短语",
          "point": "放在时间点之后，表示\"最晚不过\"。比 \"not later than\" 简洁自然，给对方留有\"提前交也行\"的暗示。",
          "example": "Send it to me by Friday at the latest.\nI need this by 5pm at the latest."
        },
        {
          "title": "blocking you on my side · 协作用语",
          "point": "动名词短语。\"on my side\" = 我这边。字面\"挡住你（工作）\"，意思是\"我这边有什么没给你的\"。主动担责的好同事。",
          "example": "Let me know if anything is blocking you on my side.\nI'm blocked on the data from Finance.（我这边卡在财务那边的数据上）"
        },
        {
          "title": "Should be useful · 省略主语",
          "point": "口语中 It/This/That 作主语时常被省略。\"Should be useful\" = It should be useful。显得轻松自然。",
          "example": "Should be useful for us on the sales side.\nSounds good to me.（= That sounds good to me）\nWorks for me.（= That works for me，\"对我来说没问题\"）"
        }
      ]
    }
  ]
};
