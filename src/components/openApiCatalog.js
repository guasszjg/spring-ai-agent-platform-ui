// Complete Open API v1 Specification Catalog for Developer Documentation & Live Debugger

export const OPEN_API_GROUPS = [
  {
    id: 'chat',
    name: '智能体对话 (Chat)',
    icon: 'fa-regular fa-comments',
    iconColor: '#60a5fa',
    endpoints: [
      {
        id: 'chat-messages',
        name: '发起智能体对话',
        method: 'POST',
        path: '/chat-messages',
        scope: 'chat',
        description: '向指定智能体发送问答提示词，支持单次同步 JSON 响应与 SSE 流式实时打字机输出，自动注入绑定的私有知识库切片上下文及护栏过滤。',
        bodyFields: [
          { name: 'agentId', type: 'string', required: true, default: 'agent_sample_01', description: '目标调用的智能体 ID (必填)' },
          { name: 'query', type: 'string', required: true, default: '你好，请介绍一下平台功能和你可以做什么？', description: '用户发送给智能体的问题或指令提示词 (必填)' },
          { name: 'conversationId', type: 'string', required: false, default: '', description: '关联的历史会话 ID，留空则服务端自动新建会话' },
          { name: 'stream', type: 'boolean', required: false, default: 'false', description: '是否使用 SSE 流式输出 (text/event-stream)' },
          { name: 'knowledgeBaseIds', type: 'array[string]', required: false, default: '[]', description: '本次对话临时指定增强引用的知识库 ID 数组' },
          { name: 'temperature', type: 'number', required: false, default: '0.7', description: '采样温度 (0.0~2.0)，数值越大越具创造力' }
        ],
        exampleBody: JSON.stringify({
          agentId: "agent_sample_01",
          query: "你好，请介绍一下企业私有知识库与多智能体协同能力？",
          conversationId: "",
          stream: false,
          knowledgeBaseIds: [],
          temperature: 0.7
        }, null, 2),
        exampleResponse: JSON.stringify({
          code: 200,
          message: "success",
          data: {
            conversationId: "conv_9a2bc1d8",
            messageId: "msg_88320145",
            agentId: "agent_sample_01",
            answer: "您好！本平台支持企业级私有知识库 RAG 混合语义检索与高可用智能体编排...",
            promptTokens: 145,
            completionTokens: 86,
            totalTokens: 231,
            citations: [
              {
                kbId: "kb_enterprise_manual",
                title: "企业智能体规范.pdf",
                snippet: "智能体可通过开放接口与外部系统无缝协同..."
              }
            ]
          }
        }, null, 2)
      }
    ]
  },
  {
    id: 'agents',
    name: '智能体管理 (Agents)',
    icon: 'fa-solid fa-robot',
    iconColor: '#c084fc',
    endpoints: [
      {
        id: 'agents-list',
        name: '查询已授权智能体列表',
        method: 'GET',
        path: '/agents',
        scope: 'agents:read',
        description: '分页获取当前凭证具备访问与调用权限的智能体资产清单。',
        queryParams: [
          { name: 'page', type: 'integer', required: false, default: '1', description: '页码，从 1 开始' },
          { name: 'size', type: 'integer', required: false, default: '10', description: '每页记录数 (最大 100)' },
          { name: 'keyword', type: 'string', required: false, default: '', description: '按智能体名称或标识模糊检索' }
        ],
        exampleResponse: JSON.stringify({
          code: 200,
          message: "success",
          data: {
            total: 2,
            page: 1,
            size: 10,
            records: [
              {
                id: "agent_001",
                name: "企业智能问答助手",
                code: "kb_assistant",
                category: "知识库客服",
                avatar: "🤖",
                status: "RUNNING",
                modelName: "Qwen/Qwen2.5-72B-Instruct",
                temperature: 0.7,
                description: "解答日常公司规章、报销与 IT 支持问题",
                boundKnowledgeBases: ["kb_hr_rules", "kb_finance"],
                updatedAt: "2026-09-10T14:20:00"
              }
            ]
          }
        }, null, 2)
      },
      {
        id: 'agents-get',
        name: '获取智能体详情 (脱敏)',
        method: 'GET',
        path: '/agents/{id}',
        scope: 'agents:read',
        description: '获取指定智能体的公开配置。出于企业安全与版权防护考虑，原始系统提示词 (System Prompt) 与第三方凭证已被自动安全脱敏。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'agent_001', description: '智能体唯一 ID' }
        ],
        exampleResponse: JSON.stringify({
          code: 200,
          message: "success",
          data: {
            id: "agent_001",
            name: "企业智能问答助手",
            code: "kb_assistant",
            category: "知识库客服",
            status: "RUNNING",
            modelName: "Qwen/Qwen2.5-72B-Instruct",
            temperature: 0.7,
            description: "解答日常公司规章、报销与 IT 支持问题",
            boundKnowledgeBases: ["kb_hr_rules"]
          }
        }, null, 2)
      },
      {
        id: 'agents-create',
        name: '创建新智能体',
        method: 'POST',
        path: '/agents',
        scope: 'agents:write',
        description: '通过开放接口在当前开发者租户下注册并创建一个新的智能体。',
        bodyFields: [
          { name: 'name', type: 'string', required: true, default: '售后技术顾问', description: '智能体显示名称' },
          { name: 'code', type: 'string', required: true, default: 'tech_support_v1', description: '全局唯一英文/数字代号' },
          { name: 'category', type: 'string', required: false, default: '通用智能', description: '业务分类' },
          { name: 'modelName', type: 'string', required: false, default: 'Qwen/Qwen2.5-72B-Instruct', description: '调度模型名称' },
          { name: 'temperature', type: 'number', required: false, default: '0.7', description: '生成温度 (0.0~2.0)' },
          { name: 'description', type: 'string', required: false, default: '为客户提供快速售后诊断与排错指南', description: '简要介绍' },
          { name: 'systemPrompt', type: 'string', required: false, default: '你是一名资深技术支持专家，请用专业而亲切的口吻回答问题。', description: '引导提示词' }
        ],
        exampleBody: JSON.stringify({
          name: "售后技术顾问",
          code: "tech_support_v1",
          category: "产品支持",
          modelName: "Qwen/Qwen2.5-72B-Instruct",
          temperature: 0.7,
          description: "为客户提供快速售后诊断与排错指南",
          systemPrompt: "你是一名资深技术支持专家，请用专业而亲切的口吻回答问题。"
        }, null, 2),
        exampleResponse: JSON.stringify({
          code: 200,
          message: "智能体创建成功",
          data: {
            id: "agent_new_987",
            name: "售后技术顾问",
            code: "tech_support_v1",
            status: "IDLE",
            modelName: "Qwen/Qwen2.5-72B-Instruct"
          }
        }, null, 2)
      },
      {
        id: 'agents-update',
        name: '修改智能体配置',
        method: 'PUT',
        path: '/agents/{id}',
        scope: 'agents:write',
        description: '更新指定智能体的名称、描述、运行参数及提示词。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'agent_001', description: '目标智能体 ID' }
        ],
        bodyFields: [
          { name: 'name', type: 'string', required: false, default: '售后技术顾问(更新)', description: '修改后的名称' },
          { name: 'temperature', type: 'number', required: false, default: '0.5', description: '修改后的温度' },
          { name: 'description', type: 'string', required: false, default: '更新后的说明', description: '修改后的简述' }
        ],
        exampleBody: JSON.stringify({
          name: "售后技术顾问(更新)",
          temperature: 0.5,
          description: "优化了诊断流程的高级技术顾问"
        }, null, 2),
        exampleResponse: JSON.stringify({
          code: 200,
          message: "智能体已更新",
          data: {
            id: "agent_001",
            name: "售后技术顾问(更新)",
            temperature: 0.5
          }
        }, null, 2)
      },
      {
        id: 'agents-delete',
        name: '删除智能体',
        method: 'DELETE',
        path: '/agents/{id}',
        scope: 'agents:write',
        description: '永久删除指定的智能体资产。删除前请确认无正在运行的终端任务依赖。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'agent_001', description: '待删除的智能体 ID' }
        ],
        exampleResponse: JSON.stringify({
          code: 200,
          message: "智能体已删除",
          data: null
        }, null, 2)
      },
      {
        id: 'agents-publish',
        name: '发布智能体上线',
        method: 'POST',
        path: '/agents/{id}/publish',
        scope: 'agents:write',
        description: '将智能体状态切换为 RUNNING，允许外部开放 API 和终端调用。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'agent_001', description: '智能体 ID' }
        ],
        exampleResponse: JSON.stringify({
          code: 200,
          message: "智能体已发布上线",
          data: { id: "agent_001", status: "RUNNING" }
        }, null, 2)
      },
      {
        id: 'agents-pause',
        name: '暂停智能体下线',
        method: 'POST',
        path: '/agents/{id}/pause',
        scope: 'agents:write',
        description: '将智能体状态切换为 IDLE (闲置下线)，暂停外部调用。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'agent_001', description: '智能体 ID' }
        ],
        exampleResponse: JSON.stringify({
          code: 200,
          message: "智能体已下线暂停",
          data: { id: "agent_001", status: "IDLE" }
        }, null, 2)
      },
      {
        id: 'agents-get-kb',
        name: '查询智能体绑定的知识库',
        method: 'GET',
        path: '/agents/{id}/knowledge-bases',
        scope: 'agents:read',
        description: '获取指定智能体当前已关联绑定的所有私有知识库清单。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'agent_001', description: '智能体 ID' }
        ],
        exampleResponse: JSON.stringify({
          code: 200,
          message: "success",
          data: [
            {
              id: "kb_finance_01",
              name: "财务与报销规范库",
              documentCount: 8,
              description: "包含公司2026最新出差与报销标准"
            }
          ]
        }, null, 2)
      },
      {
        id: 'agents-bind-kb',
        name: '批量绑定知识库到智能体',
        method: 'PUT',
        path: '/agents/{id}/knowledge-bases',
        scope: 'agents:bind_kb',
        description: '覆盖设置该智能体所关联绑定的知识库集合，对话时将统一检索这些知识库。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'agent_001', description: '智能体 ID' }
        ],
        bodyFields: [
          { name: 'knowledgeBaseIds', type: 'array[string]', required: true, default: '[]', description: '待绑定的知识库唯一 ID 数组' }
        ],
        exampleBody: JSON.stringify({
          knowledgeBaseIds: ["kb_finance_01", "kb_hr_rules"]
        }, null, 2),
        exampleResponse: JSON.stringify({
          code: 200,
          message: "知识库绑定更新成功",
          data: ["kb_finance_01", "kb_hr_rules"]
        }, null, 2)
      }
    ]
  },
  {
    id: 'kb',
    name: '私有知识库与 RAG (Knowledge)',
    icon: 'fa-solid fa-book-bookmark',
    iconColor: '#34d399',
    endpoints: [
      {
        id: 'kb-list',
        name: '查询知识库列表',
        method: 'GET',
        path: '/knowledge-bases',
        scope: 'kb:read',
        description: '分页拉取当前租户下的私有知识库集合列表。',
        queryParams: [
          { name: 'page', type: 'integer', required: false, default: '1', description: '页码' },
          { name: 'size', type: 'integer', required: false, default: '10', description: '每页条数' }
        ],
        exampleResponse: JSON.stringify({
          code: 200,
          message: "success",
          data: {
            total: 3,
            records: [
              {
                id: "kb_finance_01",
                name: "财务报销规范",
                description: "企业财务报销与差旅标准",
                docCount: 5,
                updatedAt: "2026-09-10T12:00:00"
              }
            ]
          }
        }, null, 2)
      },
      {
        id: 'kb-create',
        name: '创建知识库集合',
        method: 'POST',
        path: '/knowledge-bases',
        scope: 'kb:write',
        description: '创建一个新的私有知识库，用于存储文档切片与问答对。',
        bodyFields: [
          { name: 'name', type: 'string', required: true, default: '售后技术案例库', description: '知识库名称' },
          { name: 'description', type: 'string', required: false, default: '汇总客户典型技术问题与故障诊断方案', description: '知识库简介' },
          { name: 'embeddingModel', type: 'string', required: false, default: 'BAAI/bge-large-zh-v1.5', description: '向量模型标识' }
        ],
        exampleBody: JSON.stringify({
          name: "售后技术案例库",
          description: "汇总客户典型技术问题与故障诊断方案",
          embeddingModel: "BAAI/bge-large-zh-v1.5"
        }, null, 2),
        exampleResponse: JSON.stringify({
          code: 200,
          message: "知识库创建成功",
          data: {
            id: "kb_tech_support",
            name: "售后技术案例库"
          }
        }, null, 2)
      },
      {
        id: 'kb-upload-doc',
        name: '上传切片文档 (Multipart)',
        method: 'POST',
        path: '/knowledge-bases/{id}/documents',
        scope: 'kb:write',
        isMultipart: true,
        description: '上传原文档文件并自动执行文本清洗、智能切片与向量化存储，支持 PDF/TXT/MD/DOCX 格式。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'kb_finance_01', description: '知识库 ID' }
        ],
        bodyFields: [
          { name: 'file', type: 'file', required: true, default: '', description: '上传的文档原文件二进制流 (最大 50MB)' },
          { name: 'chunkSize', type: 'integer', required: false, default: '500', description: '分块大小 (字符数)' },
          { name: 'overlapSize', type: 'integer', required: false, default: '50', description: '重叠字数 (防止上下文断层)' }
        ],
        exampleResponse: JSON.stringify({
          code: 200,
          message: "文档切片入库成功",
          data: {
            documentId: "doc_88991122",
            fileName: "enterprise_rules_2026.pdf",
            chunksCount: 42,
            vectorized: true
          }
        }, null, 2)
      },
      {
        id: 'kb-retrieve',
        name: '语义检索召回测试',
        method: 'POST',
        path: '/knowledge-bases/{id}/retrieve',
        scope: 'kb:read',
        description: '向指定知识库发送自然语言问题，执行语义向量相似度计算并召回相关切片。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'kb_finance_01', description: '知识库 ID' }
        ],
        bodyFields: [
          { name: 'query', type: 'string', required: true, default: '出差住宿费发票遗失如何报销？', description: '检索词或测试问题' },
          { name: 'topK', type: 'integer', required: false, default: '3', description: '召回最相关的切片条数 (1~20)' },
          { name: 'similarityThreshold', type: 'number', required: false, default: '0.6', description: '最低相似度过滤门槛 (0.0~1.0)' }
        ],
        exampleBody: JSON.stringify({
          query: "出差住宿费发票遗失如何报销？",
          topK: 3,
          similarityThreshold: 0.6
        }, null, 2),
        exampleResponse: JSON.stringify({
          code: 200,
          message: "success",
          data: [
            {
              chunkId: "chk_001",
              score: 0.892,
              content: "第四条 住宿费发票如遇特殊情况遗失，需由入住酒店开具加盖公章的结账流水单...",
              metadata: { source: "2026财务制度.pdf", page: 12 }
            },
            {
              chunkId: "chk_002",
              score: 0.781,
              content: "第十条 差旅报销审批流说明：经部门主管核准后提交财务中心...",
              metadata: { source: "2026财务制度.pdf", page: 15 }
            }
          ]
        }, null, 2)
      },
      {
        id: 'kb-add-faq',
        name: '录入精准问答对 (FAQ)',
        method: 'POST',
        path: '/knowledge-bases/{id}/faqs',
        scope: 'kb:write',
        description: '向知识库直接录入精准问答对，提高特定业务场景下的命中精度与回答确定性。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'kb_finance_01', description: '知识库 ID' }
        ],
        bodyFields: [
          { name: 'question', type: 'string', required: true, default: '日常办公用品如何申领？', description: '标准问题' },
          { name: 'answer', type: 'string', required: true, default: '每周三下午可在 OA 提交申领工单，审批通过后至行政部 302 领取。', description: '标准答案' },
          { name: 'tags', type: 'array[string]', required: false, default: '["行政", "物资"]', description: '问答对标签' }
        ],
        exampleBody: JSON.stringify({
          question: "日常办公用品如何申领？",
          answer: "每周三下午可在 OA 提交申领工单，审批通过后至行政部 302 领取。",
          tags: ["行政", "物资"]
        }, null, 2),
        exampleResponse: JSON.stringify({
          code: 200,
          message: "FAQ 保存成功",
          data: { id: "faq_99112", question: "日常办公用品如何申领？" }
        }, null, 2)
      }
    ]
  },
  {
    id: 'conversations',
    name: '会话与历史消息 (Conversations)',
    icon: 'fa-solid fa-clock-rotate-left',
    iconColor: '#fbbf24',
    endpoints: [
      {
        id: 'conv-list',
        name: '查询历史会话列表',
        method: 'GET',
        path: '/conversations',
        scope: 'conversations:read',
        description: '分页获取当前凭证或开发者账号的历史会话记录列表。',
        queryParams: [
          { name: 'page', type: 'integer', required: false, default: '1', description: '页码' },
          { name: 'size', type: 'integer', required: false, default: '10', description: '每页条数' },
          { name: 'agentId', type: 'string', required: false, default: '', description: '按智能体 ID 筛选' }
        ],
        exampleResponse: JSON.stringify({
          code: 200,
          message: "success",
          data: {
            total: 15,
            records: [
              {
                id: "conv_a8b9c1d2",
                title: "关于差旅报销标准的咨询",
                agentId: "agent_001",
                createdAt: "2026-09-10T11:20:00",
                messageCount: 6
              }
            ]
          }
        }, null, 2)
      },
      {
        id: 'conv-messages',
        name: '获取会话消息历史',
        method: 'GET',
        path: '/conversations/{id}/messages',
        scope: 'conversations:read',
        description: '按时间正序拉取指定会话下的全部问答消息上下文。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'conv_a8b9c1d2', description: '会话 ID' }
        ],
        queryParams: [
          { name: 'limit', type: 'integer', required: false, default: '50', description: '最大消息条数' }
        ],
        exampleResponse: JSON.stringify({
          code: 200,
          message: "success",
          data: [
            { id: "msg_01", role: "USER", content: "出差住宿上限是多少？", createdAt: "2026-09-10T11:20:01" },
            { id: "msg_02", role: "ASSISTANT", content: "一线城市上限为每晚 500 元。", createdAt: "2026-09-10T11:20:03" }
          ]
        }, null, 2)
      },
      {
        id: 'conv-delete',
        name: '删除会话及历史消息',
        method: 'DELETE',
        path: '/conversations/{id}',
        scope: 'conversations:read',
        description: '删除指定的会话以及会话中的所有历史消息。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'conv_a8b9c1d2', description: '会话 ID' }
        ],
        exampleResponse: JSON.stringify({
          code: 200,
          message: "会话已删除",
          data: null
        }, null, 2)
      }
    ]
  },
  {
    id: 'usage',
    name: '用量统计与审计 (Usage)',
    icon: 'fa-solid fa-chart-pie',
    iconColor: '#22d3ee',
    endpoints: [
      {
        id: 'usage-summary',
        name: '查询用量指标概览',
        method: 'GET',
        path: '/usage/summary',
        scope: 'usage:read',
        description: '查询指定时间段内当前租户或凭证的累计调用量、对话数、Token 消耗、拦截数等事实汇总。',
        queryParams: [
          { name: 'from', type: 'string', required: false, default: '2026-08-11', description: '起始日期 (YYYY-MM-DD)' },
          { name: 'to', type: 'string', required: false, default: '2026-09-10', description: '截止日期 (YYYY-MM-DD)' }
        ],
        exampleResponse: JSON.stringify({
          code: 200,
          message: "success",
          data: {
            calls: 1420,
            chatCalls: 980,
            messages: 1960,
            promptTokens: 284000,
            completionTokens: 142500,
            denied: 12,
            errors: 2,
            latencySumMs: 512000,
            from: "2026-08-11",
            to: "2026-09-10"
          }
        }, null, 2)
      },
      {
        id: 'usage-daily',
        name: '按日多维事实用量清单',
        method: 'GET',
        path: '/usage/daily',
        scope: 'usage:read',
        description: '拉取按日期、智能体、凭证、终端细分聚合的多维日级事实用量列表。',
        queryParams: [
          { name: 'from', type: 'string', required: false, default: '2026-09-01', description: '起始日期 (YYYY-MM-DD)' },
          { name: 'to', type: 'string', required: false, default: '2026-09-10', description: '截止日期 (YYYY-MM-DD)' }
        ],
        exampleResponse: JSON.stringify({
          code: 200,
          message: "success",
          data: [
            {
              statDate: "2026-09-10",
              agentId: "agent_001",
              apiKeyId: "key_9921",
              clientCredentialId: "DEV-SN-001",
              calls: 120,
              chatCalls: 100,
              messages: 200,
              promptTokens: 25000,
              completionTokens: 14000,
              denied: 1,
              errors: 0,
              latencySumMs: 42000
            }
          ]
        }, null, 2)
      },
      {
        id: 'audit-events',
        name: '检索安全审计事件流',
        method: 'GET',
        path: '/audit/events',
        scope: 'usage:read',
        description: '检索租户发生的安全审计事件记录流，支持按结果状态筛选。',
        queryParams: [
          { name: 'from', type: 'string', required: false, default: '', description: '起始日期' },
          { name: 'to', type: 'string', required: false, default: '', description: '截止日期' },
          { name: 'result', type: 'string', required: false, default: '', description: '过滤结果: SUCCESS 或 DENIED' }
        ],
        exampleResponse: JSON.stringify({
          code: 200,
          message: "success",
          data: [
            {
              id: "ev_887711",
              occurredAt: "2026-09-10T14:32:10",
              action: "OPEN_CHAT",
              result: "DENIED",
              reasonCode: "sensitive_content",
              resourceType: "AGENT",
              resourceId: "agent_001"
            }
          ]
        }, null, 2)
      }
    ]
  },
  {
    id: 'account',
    name: '外部对接与通知 (Account)',
    icon: 'fa-solid fa-link',
    iconColor: '#f43f5e',
    endpoints: [
      {
        id: 'account-info',
        name: '查询当前调用者账号信息',
        method: 'GET',
        path: '/account',
        scope: 'account:read',
        description: '查看当前 API Key 归属的开发者身份、所属租户组织及授权 Scope 清单。',
        exampleResponse: JSON.stringify({
          code: 200,
          message: "success",
          data: {
            userId: "usr_developer_01",
            username: "developer",
            role: "DEVELOPER",
            keyScopes: ["chat", "agents:read", "kb:read", "usage:read"]
          }
        }, null, 2)
      },
      {
        id: 'account-bind',
        name: '入站外部账号绑定',
        method: 'POST',
        path: '/account/bind-identity',
        scope: 'account:write',
        description: '将外部第三方应用或设备平台用户唯一标识与当前开发者账户完成入站绑定。',
        bodyFields: [
          { name: 'providerCode', type: 'string', required: true, default: 'iot_platform', description: '外部通道编码' },
          { name: 'externalId', type: 'string', required: true, default: 'ext_user_88992', description: '外部系统用户唯一标识' },
          { name: 'displayName', type: 'string', required: false, default: '物联网网关-终端操作员', description: '外部显示名称' }
        ],
        exampleBody: JSON.stringify({
          providerCode: "iot_platform",
          externalId: "ext_user_88992",
          displayName: "物联网网关-终端操作员"
        }, null, 2),
        exampleResponse: JSON.stringify({
          code: 200,
          message: "外部账号绑定已记录",
          data: {
            id: "id_ext_01",
            providerCode: "iot_platform",
            externalId: "ext_user_88992",
            status: "ACTIVE"
          }
        }, null, 2)
      },
      {
        id: 'account-webhook',
        name: '接收外部系统 Webhook 通知',
        method: 'POST',
        path: '/account/webhook',
        scope: '公开接收',
        description: '接收外部第三方系统推送的事件通知，支持在请求头携带 X-Signature 密钥验签。',
        bodyFields: [
          { name: 'event', type: 'string', required: true, default: 'device.status_changed', description: '事件名称' },
          { name: 'timestamp', type: 'integer', required: true, default: '1725964800', description: '事件时间戳' },
          { name: 'payload', type: 'object', required: true, default: '{}', description: '事件自定义载荷' }
        ],
        exampleBody: JSON.stringify({
          event: "device.status_changed",
          timestamp: 1725964800,
          payload: {
            deviceId: "DEV-SN-001",
            status: "ONLINE",
            ip: "192.168.1.10"
          }
        }, null, 2),
        exampleResponse: JSON.stringify({
          code: 200,
          message: "Webhook processed successfully",
          data: { received: true }
        }, null, 2)
      }
    ]
  }
]

export const ALL_ENDPOINTS = OPEN_API_GROUPS.flatMap(g => g.endpoints)
