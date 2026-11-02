// 开放接口 /open/v1 文档目录：「接入文档」页与在线调试共用。字段、参数与示例须与后端控制器保持一致。

// 统一响应结构：{ success, message, data }
const ok = (data, message = '操作成功') => JSON.stringify({ success: true, message, data }, null, 2)
const body = (obj) => JSON.stringify(obj, null, 2)

const MEMORY_TURNS_DESC = '上下文记忆轮数 (0~10)。0 = 关闭，每次只发当前问题，最省 token；需要连续追问时设 2~3，调用对话接口时带回 conversation_id 即可'

const AGENT_SAMPLE = {
  id: 'agent-2e839a1c',
  name: '售后技术顾问',
  avatar: '🤖',
  category: '产品支持',
  description: '为客户提供快速售后诊断与排错指南',
  modelName: 'deepseek-v4-flash',
  memoryTurns: 0,
  status: 'RUNNING',
  isSystem: false,
  ownerUsername: 'developer',
  knowledgeBaseIds: ['kb-7f3a91c2'],
  createdAt: '2026-11-02T10:20:00',
  updatedAt: '2026-11-02T10:20:00'
}

const KB_SAMPLE = {
  id: 'kb-7f3a91c2',
  name: '广告机产品手册',
  description: '安装、发布节目、常见故障排查',
  avatar: '📚',
  provider: 'SPRING_AI',
  documentCount: 6,
  wordCount: 39658,
  faqCount: 12,
  enabled: true,
  searchMethod: 'hybrid_search',
  topK: 3,
  scoreThreshold: 0.5
}

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
        description: '向智能体提问。blocking 返回完整 JSON；streaming 以 SSE 边生成边推送，事件依次为 message（answer 为一段文本，依次拼接）、message_end（含 model、tokens_used、latency_ms），输出命中护栏时为 guardrail，失败时为 error。平台会自动检索智能体绑定的知识库，并做输入 / 输出安全检查。',
        bodyFields: [
          { name: 'agent_id', type: 'string', required: false, default: 'agent-2e839a1c', description: '目标智能体 ID 或编码（兼容 agentId）。凭证范围只有一个智能体时可省略' },
          { name: 'message', type: 'string', required: true, default: '广告机怎么发布节目？', description: '用户问题（兼容 query、prompt、input、content、question）' },
          { name: 'response_mode', type: 'string', required: false, default: 'blocking', description: 'blocking：返回完整 JSON；streaming：SSE 流式输出（不传时默认 streaming）' },
          { name: 'conversation_id', type: 'string', required: false, default: '', description: '会话 ID。智能体开启上下文记忆 (memoryTurns > 0) 时，传入上一轮返回的 conversation_id 即可接着追问，平台自动带上最近 N 轮问答；同一会话须使用相同的 user。记忆关闭时只用于日志归档' },
          { name: 'user', type: 'string', required: false, default: 'device-SN001', description: '终端用户标识（兼容 end_user），用于审计、用量统计与会话归属；上下文记忆只读取同一 user 的会话' }
        ],
        exampleBody: body({
          agent_id: 'agent-2e839a1c',
          message: '广告机怎么发布节目？',
          response_mode: 'blocking',
          conversation_id: '',
          user: 'device-SN001'
        }),
        exampleResponse: ok({
          conversation_id: 'conv-5f0c2a9e81d34b7a',
          message_id: 'msg-1a2b3c4d',
          reply: '发布节目分三步：1. 在节目管理中选择节目；2. 进入日程安排设置播放时间；3. 选择终端并点击发布。',
          model: 'deepseek-v4-flash',
          tool_called: null,
          tokens_used: 1230,
          latency_ms: 1520,
          created_at: 1793600000,
          request_id: 'req_8f2c1d0e9b7a6c5d'
        }, 'success')
      },
      {
        id: 'chat-stop',
        name: '停止生成（暂未实现）',
        method: 'POST',
        path: '/chat-messages/{taskId}/stop',
        scope: 'chat',
        description: '预留接口，目前固定返回 501 not_supported。需要中途停止时，直接断开流式连接即可，平台会随之停止生成。',
        pathParams: [
          { name: 'taskId', type: 'string', required: true, default: 'msg-1a2b3c4d', description: '任务 ID' }
        ],
        exampleResponse: JSON.stringify({ success: false, message: '停止生成尚未接入上游取消，taskId=msg-1a2b3c4d', data: { code: 'not_supported' } }, null, 2)
      },
      {
        id: 'status',
        name: '服务状态',
        method: 'GET',
        path: '/status',
        scope: '任意有效凭证',
        description: '检查开放接口是否可用、凭证是否有效。',
        exampleResponse: ok({ version: 'open-v1', status: 'RUNNING', timestamp: 1793600000000 })
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
        description: '返回当前凭证可见的全部智能体（凭证限定了智能体范围时只返回范围内的）。不分页。',
        exampleResponse: ok([AGENT_SAMPLE])
      },
      {
        id: 'agents-get',
        name: '获取智能体详情',
        method: 'GET',
        path: '/agents/{id}',
        scope: 'agents:read',
        description: '获取智能体的公开配置。系统提示词与第三方凭证不会返回。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'agent-2e839a1c', description: '智能体 ID' }
        ],
        exampleResponse: ok(AGENT_SAMPLE)
      },
      {
        id: 'agents-create',
        name: '创建新智能体',
        method: 'POST',
        path: '/agents',
        scope: 'agents:write',
        description: '在凭证所属开发者名下创建智能体。',
        bodyFields: [
          { name: 'name', type: 'string', required: true, default: '售后技术顾问', description: '智能体名称' },
          { name: 'code', type: 'string', required: false, default: 'tech_support_v1', description: '业务编码，全局唯一（字母、数字、下划线）' },
          { name: 'category', type: 'string', required: false, default: '通用智能', description: '业务分类' },
          { name: 'description', type: 'string', required: false, default: '为客户提供快速售后诊断与排错指南', description: '简介' },
          { name: 'systemPrompt', type: 'string', required: false, default: '你是一名资深技术支持专家，请用专业而亲切的口吻回答问题。', description: '系统提示词' },
          { name: 'modelName', type: 'string', required: false, default: 'deepseek-v4-flash', description: '指定模型；不填时跟随模型网关的默认通道' },
          { name: 'temperature', type: 'number', required: false, default: '0.7', description: '采样温度 (0~2)' },
          { name: 'memoryTurns', type: 'integer', required: false, default: '0', description: MEMORY_TURNS_DESC },
          { name: 'knowledgeBaseIds', type: 'array[string]', required: false, default: '[]', description: '要绑定的知识库 ID，需要对这些知识库有使用权限' }
        ],
        exampleBody: body({
          name: '售后技术顾问',
          code: 'tech_support_v1',
          category: '产品支持',
          description: '为客户提供快速售后诊断与排错指南',
          systemPrompt: '你是一名资深技术支持专家，请用专业而亲切的口吻回答问题。',
          temperature: 0.7,
          memoryTurns: 3
        }),
        exampleResponse: ok({ ...AGENT_SAMPLE, memoryTurns: 3, knowledgeBaseIds: [] }, '创建成功')
      },
      {
        id: 'agents-update',
        name: '修改智能体配置',
        method: 'PUT',
        path: '/agents/{id}',
        scope: 'agents:write',
        description: '只更新传入的字段，未传的保持不变。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'agent-2e839a1c', description: '智能体 ID' }
        ],
        bodyFields: [
          { name: 'name', type: 'string', required: false, default: '售后技术顾问（新版）', description: '名称' },
          { name: 'description', type: 'string', required: false, default: '优化了诊断流程', description: '简介' },
          { name: 'systemPrompt', type: 'string', required: false, default: '', description: '系统提示词（修改会记录一个提示词版本）' },
          { name: 'temperature', type: 'number', required: false, default: '0.5', description: '采样温度 (0~2)' },
          { name: 'memoryTurns', type: 'integer', required: false, default: '0', description: MEMORY_TURNS_DESC }
        ],
        exampleBody: body({
          name: '售后技术顾问（新版）',
          temperature: 0.5,
          memoryTurns: 0
        }),
        exampleResponse: ok({ ...AGENT_SAMPLE, name: '售后技术顾问（新版）' }, '更新成功')
      },
      {
        id: 'agents-delete',
        name: '删除智能体',
        method: 'DELETE',
        path: '/agents/{id}',
        scope: 'agents:write',
        description: '永久删除智能体。删除前请确认没有终端仍在调用它。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'agent-2e839a1c', description: '智能体 ID' }
        ],
        exampleResponse: ok({ id: 'agent-2e839a1c' }, '删除成功')
      },
      {
        id: 'agents-publish',
        name: '发布智能体上线',
        method: 'POST',
        path: '/agents/{id}/publish',
        scope: 'agents:write',
        description: '状态改为 RUNNING，允许被对话接口调用。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'agent-2e839a1c', description: '智能体 ID' }
        ],
        exampleResponse: ok({ ...AGENT_SAMPLE, status: 'RUNNING' }, '状态已变更为 RUNNING')
      },
      {
        id: 'agents-pause',
        name: '停用智能体',
        method: 'POST',
        path: '/agents/{id}/pause',
        scope: 'agents:write',
        description: '状态改为 DISABLED，对话接口调用会返回 agent_not_running。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'agent-2e839a1c', description: '智能体 ID' }
        ],
        exampleResponse: ok({ ...AGENT_SAMPLE, status: 'DISABLED' }, '状态已变更为 DISABLED')
      },
      {
        id: 'agents-get-kb',
        name: '查询智能体绑定的知识库',
        method: 'GET',
        path: '/agents/{id}/knowledge-bases',
        scope: 'agents:read',
        description: '返回智能体当前绑定的知识库。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'agent-2e839a1c', description: '智能体 ID' }
        ],
        exampleResponse: ok([
          { id: 'kb-7f3a91c2', name: '广告机产品手册', avatar: '📚', provider: 'SPRING_AI', documentCount: 6 }
        ])
      },
      {
        id: 'agents-bind-kb',
        name: '设置智能体绑定的知识库',
        method: 'PUT',
        path: '/agents/{id}/knowledge-bases',
        scope: 'agents:bind_kb',
        description: '用传入的列表整体替换智能体绑定的知识库，传空数组即解绑全部。同一智能体只能绑定同一来源（自建或 Dify）的知识库，混合绑定返回 400 mixed_knowledge_sources。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'agent-2e839a1c', description: '智能体 ID' }
        ],
        bodyFields: [
          { name: 'knowledge_base_ids', type: 'array[string]', required: true, default: '["kb-7f3a91c2"]', description: '知识库 ID 列表' }
        ],
        exampleBody: body({ knowledge_base_ids: ['kb-7f3a91c2'] }),
        exampleResponse: ok({ knowledge_base_ids: ['kb-7f3a91c2'] }, '知识库绑定更新成功')
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
        description: '返回凭证所属开发者可见的知识库（最多 1000 个）。不分页。',
        exampleResponse: ok([KB_SAMPLE])
      },
      {
        id: 'kb-get',
        name: '获取知识库详情',
        method: 'GET',
        path: '/knowledge-bases/{id}',
        scope: 'kb:read',
        description: '获取知识库配置与统计（文档数、字数、FAQ 数等）。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'kb-7f3a91c2', description: '知识库 ID' }
        ],
        exampleResponse: ok(KB_SAMPLE)
      },
      {
        id: 'kb-create',
        name: '创建知识库',
        method: 'POST',
        path: '/knowledge-bases',
        scope: 'kb:write',
        description: '自建知识库（SPRING_AI）统一使用模型网关中生效的向量模型；Dify 知识库需要先在模型网关接入 Dify 并测试通过。',
        bodyFields: [
          { name: 'name', type: 'string', required: true, default: '广告机产品手册', description: '知识库名称' },
          { name: 'description', type: 'string', required: false, default: '安装、发布节目、常见故障排查', description: '简介' },
          { name: 'provider', type: 'string', required: false, default: 'SPRING_AI', description: 'SPRING_AI（自建，默认）或 DIFY' },
          { name: 'searchMethod', type: 'string', required: false, default: 'hybrid_search', description: '检索方式：hybrid_search（混合，默认）、semantic_search（向量）、full_text_search（关键词）' },
          { name: 'topK', type: 'integer', required: false, default: '3', description: '每次召回的切片数' },
          { name: 'scoreThreshold', type: 'number', required: false, default: '0.5', description: '相似度阈值 (0~1)' }
        ],
        exampleBody: body({
          name: '广告机产品手册',
          description: '安装、发布节目、常见故障排查',
          provider: 'SPRING_AI'
        }),
        exampleResponse: ok({ ...KB_SAMPLE, documentCount: 0, wordCount: 0, faqCount: 0 }, '创建成功')
      },
      {
        id: 'kb-update',
        name: '修改知识库配置',
        method: 'PUT',
        path: '/knowledge-bases/{id}',
        scope: 'kb:write',
        description: '只更新传入的字段。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'kb-7f3a91c2', description: '知识库 ID' }
        ],
        bodyFields: [
          { name: 'name', type: 'string', required: false, default: '广告机产品手册（2026 版）', description: '名称' },
          { name: 'description', type: 'string', required: false, default: '', description: '简介' },
          { name: 'enabled', type: 'boolean', required: false, default: 'true', description: '是否启用' },
          { name: 'searchMethod', type: 'string', required: false, default: 'hybrid_search', description: '检索方式' },
          { name: 'topK', type: 'integer', required: false, default: '3', description: '召回切片数' },
          { name: 'scoreThreshold', type: 'number', required: false, default: '0.5', description: '相似度阈值 (0~1)' },
          { name: 'vectorWeight', type: 'number', required: false, default: '0.7', description: '混合检索中向量得分权重' },
          { name: 'keywordWeight', type: 'number', required: false, default: '0.3', description: '混合检索中关键词得分权重' }
        ],
        exampleBody: body({ name: '广告机产品手册（2026 版）', topK: 4 }),
        exampleResponse: ok({ ...KB_SAMPLE, name: '广告机产品手册（2026 版）', topK: 4 }, '更新成功')
      },
      {
        id: 'kb-delete',
        name: '删除知识库',
        method: 'DELETE',
        path: '/knowledge-bases/{id}',
        scope: 'kb:write',
        description: '删除知识库及其文档、切片和 FAQ。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'kb-7f3a91c2', description: '知识库 ID' }
        ],
        exampleResponse: ok({ id: 'kb-7f3a91c2' }, '删除成功')
      },
      {
        id: 'kb-upload-doc',
        name: '上传文档 (Multipart)',
        method: 'POST',
        path: '/knowledge-bases/{id}/documents',
        scope: 'kb:write',
        isMultipart: true,
        description: '上传一个文件，平台自动解析、切片并向量化。单个文件不超过 15 MB；支持 PDF、DOCX、XLSX、XLS、CSV、HTML、HTM、TXT、MD、MDX、MARKDOWN、VTT、PROPERTIES。扫描版 PDF 需要在模型网关配置 OCR。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'kb-7f3a91c2', description: '知识库 ID' }
        ],
        bodyFields: [
          { name: 'file', type: 'file', required: true, default: '', description: '文档文件（表单字段名 file）' }
        ],
        exampleResponse: ok([
          { id: 'doc-3c9e17ab', name: '广告机使用手册.pdf', wordCount: 39658, indexingStatus: 'completed' }
        ], '上传成功')
      },
      {
        id: 'kb-list-docs',
        name: '查询知识库文档',
        method: 'GET',
        path: '/knowledge-bases/{id}/documents',
        scope: 'kb:read',
        description: '分页查询知识库中的文档及索引状态。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'kb-7f3a91c2', description: '知识库 ID' }
        ],
        queryParams: [
          { name: 'page', type: 'integer', required: false, default: '1', description: '页码' },
          { name: 'size', type: 'integer', required: false, default: '20', description: '每页条数' }
        ],
        exampleResponse: ok({
          total: 1,
          page: 1,
          size: 20,
          records: [{ id: 'doc-3c9e17ab', name: '广告机使用手册.pdf', wordCount: 39658, indexingStatus: 'completed' }]
        })
      },
      {
        id: 'kb-delete-doc',
        name: '删除文档',
        method: 'DELETE',
        path: '/knowledge-bases/{id}/documents/{docId}',
        scope: 'kb:write',
        description: '删除文档及其切片。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'kb-7f3a91c2', description: '知识库 ID' },
          { name: 'docId', type: 'string', required: true, default: 'doc-3c9e17ab', description: '文档 ID' }
        ],
        exampleResponse: ok({ doc_id: 'doc-3c9e17ab' }, '文档删除成功')
      },
      {
        id: 'kb-retrieve',
        name: '检索召回测试',
        method: 'POST',
        path: '/knowledge-bases/{id}/retrieve',
        scope: 'kb:read',
        description: '用一个问题检索知识库，返回召回的切片及得分，用于验证知识库效果。检索方式与阈值使用知识库自身的配置。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'kb-7f3a91c2', description: '知识库 ID' }
        ],
        bodyFields: [
          { name: 'query', type: 'string', required: true, default: '广告机怎么发布节目？', description: '检索问题' },
          { name: 'top_k', type: 'integer', required: false, default: '3', description: '返回的切片数' }
        ],
        exampleBody: body({ query: '广告机怎么发布节目？', top_k: 3 }),
        exampleResponse: ok([
          {
            chunkId: 'chk-91a0',
            documentId: 'doc-3c9e17ab',
            sourceName: '广告机使用手册.pdf',
            pageNumber: 12,
            content: '选择节目后进入日程安排页：先设定开始与结束时间……',
            score: 0.86,
            vectorScore: 0.82,
            keywordScore: 0.64,
            matchType: 'HYBRID'
          }
        ])
      },
      {
        id: 'kb-list-faqs',
        name: '查询问答对 (FAQ)',
        method: 'GET',
        path: '/knowledge-bases/{id}/faqs',
        scope: 'kb:read',
        description: '分页查询知识库中的问答对。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'kb-7f3a91c2', description: '知识库 ID' }
        ],
        queryParams: [
          { name: 'page', type: 'integer', required: false, default: '1', description: '页码' },
          { name: 'size', type: 'integer', required: false, default: '20', description: '每页条数' }
        ],
        exampleResponse: ok({
          total: 1,
          page: 1,
          size: 20,
          records: [{ id: 'faq-5d21', question: '开机黑屏怎么办？', answer: '请先检查电源适配器……', category: '故障排查', enabled: true }]
        })
      },
      {
        id: 'kb-add-faq',
        name: '录入问答对 (FAQ)',
        method: 'POST',
        path: '/knowledge-bases/{id}/faqs',
        scope: 'kb:write',
        description: '录入固定问题的标准答案，比上传文档命中更准。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'kb-7f3a91c2', description: '知识库 ID' }
        ],
        bodyFields: [
          { name: 'question', type: 'string', required: true, default: '开机黑屏怎么办？', description: '标准问题' },
          { name: 'answer', type: 'string', required: true, default: '请先检查电源适配器是否接好，再长按电源键 3 秒重启。', description: '标准答案' },
          { name: 'category', type: 'string', required: false, default: '故障排查', description: '分类（默认「通用问答」）' }
        ],
        exampleBody: body({
          question: '开机黑屏怎么办？',
          answer: '请先检查电源适配器是否接好，再长按电源键 3 秒重启。',
          category: '故障排查'
        }),
        exampleResponse: ok({ id: 'faq-5d21', question: '开机黑屏怎么办？', answer: '请先检查电源适配器是否接好，再长按电源键 3 秒重启。', category: '故障排查', enabled: true }, '创建问答成功')
      },
      {
        id: 'kb-update-faq',
        name: '修改问答对 (FAQ)',
        method: 'PUT',
        path: '/knowledge-bases/{id}/faqs/{faqId}',
        scope: 'kb:write',
        description: '只更新传入的字段；enabled=false 可临时停用该问答对。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'kb-7f3a91c2', description: '知识库 ID' },
          { name: 'faqId', type: 'string', required: true, default: 'faq-5d21', description: '问答对 ID' }
        ],
        bodyFields: [
          { name: 'question', type: 'string', required: false, default: '', description: '标准问题' },
          { name: 'answer', type: 'string', required: false, default: '请检查电源适配器与电源线，仍不亮请联系售后。', description: '标准答案' },
          { name: 'category', type: 'string', required: false, default: '', description: '分类' },
          { name: 'enabled', type: 'boolean', required: false, default: 'true', description: '是否启用' }
        ],
        exampleBody: body({ answer: '请检查电源适配器与电源线，仍不亮请联系售后。' }),
        exampleResponse: ok({ id: 'faq-5d21', question: '开机黑屏怎么办？', answer: '请检查电源适配器与电源线，仍不亮请联系售后。', category: '故障排查', enabled: true }, '更新问答成功')
      },
      {
        id: 'kb-delete-faq',
        name: '删除问答对 (FAQ)',
        method: 'DELETE',
        path: '/knowledge-bases/{id}/faqs/{faqId}',
        scope: 'kb:write',
        description: '删除问答对。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'kb-7f3a91c2', description: '知识库 ID' },
          { name: 'faqId', type: 'string', required: true, default: 'faq-5d21', description: '问答对 ID' }
        ],
        exampleResponse: ok({ faq_id: 'faq-5d21' }, '删除问答成功')
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
        name: '查询会话列表',
        method: 'GET',
        path: '/conversations',
        scope: 'conversations:read',
        description: '查询凭证范围内智能体的会话，可按智能体和终端用户筛选。不分页。',
        queryParams: [
          { name: 'agent_id', type: 'string', required: false, default: '', description: '按智能体 ID 筛选' },
          { name: 'end_user', type: 'string', required: false, default: '', description: '按终端用户（对话时传的 user）筛选' }
        ],
        exampleResponse: ok([
          {
            id: 'conv-5f0c2a9e81d34b7a',
            agentId: 'agent-2e839a1c',
            title: '广告机怎么发布节目？',
            account: 'device-SN001',
            messageCount: 4,
            lastModel: 'deepseek-v4-flash',
            totalTokens: 2480,
            createdAt: '2026-11-02T10:20:00',
            updatedAt: '2026-11-02T10:21:30'
          }
        ])
      },
      {
        id: 'conv-messages',
        name: '获取会话消息',
        method: 'GET',
        path: '/conversations/{id}/messages',
        scope: 'conversations:read',
        description: '按时间正序返回会话中的全部消息。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'conv-5f0c2a9e81d34b7a', description: '会话 ID' }
        ],
        exampleResponse: ok([
          { id: 'm-01', conversationId: 'conv-5f0c2a9e81d34b7a', role: 'user', content: '广告机怎么发布节目？', createdAt: '2026-11-02T10:20:00' },
          { id: 'm-02', conversationId: 'conv-5f0c2a9e81d34b7a', role: 'assistant', content: '发布节目分三步……', model: 'deepseek-v4-flash', latencyMs: 1520, tokensUsed: 1230, createdAt: '2026-11-02T10:20:01' }
        ])
      },
      {
        id: 'conv-delete',
        name: '删除会话',
        method: 'DELETE',
        path: '/conversations/{id}',
        scope: 'chat 或 conversations:read',
        description: '删除会话及其全部消息。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'conv-5f0c2a9e81d34b7a', description: '会话 ID' }
        ],
        exampleResponse: ok({ id: 'conv-5f0c2a9e81d34b7a' }, '会话已删除')
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
        name: '查询用量概览',
        method: 'GET',
        path: '/usage/summary',
        scope: 'usage:read',
        description: '指定日期范围内凭证所属开发者的调用量、对话数、Token 消耗、拦截与错误数汇总。',
        queryParams: [
          { name: 'from', type: 'string', required: false, default: '2026-10-01', description: '起始日期 (YYYY-MM-DD)' },
          { name: 'to', type: 'string', required: false, default: '2026-10-31', description: '截止日期 (YYYY-MM-DD)' }
        ],
        exampleResponse: ok({
          calls: 1420,
          chatCalls: 980,
          messages: 1960,
          promptTokens: 284000,
          completionTokens: 142500,
          denied: 12,
          errors: 2,
          latencySumMs: 512000,
          from: '2026-10-01',
          to: '2026-10-31'
        })
      },
      {
        id: 'usage-daily',
        name: '按日用量明细',
        method: 'GET',
        path: '/usage/daily',
        scope: 'usage:read',
        description: '按日期、智能体、凭证、终端细分的日级用量。',
        queryParams: [
          { name: 'from', type: 'string', required: false, default: '2026-10-25', description: '起始日期 (YYYY-MM-DD)' },
          { name: 'to', type: 'string', required: false, default: '2026-10-31', description: '截止日期 (YYYY-MM-DD)' }
        ],
        exampleResponse: ok([
          {
            statDate: '2026-10-31',
            agentId: 'agent-2e839a1c',
            apiKeyId: 'oak-1f2e3d4c5b6a7980',
            clientCredentialId: 'cli-01',
            calls: 120,
            chatCalls: 100,
            messages: 200,
            promptTokens: 25000,
            completionTokens: 14000,
            denied: 1,
            errors: 0,
            latencySumMs: 42000
          }
        ])
      },
      {
        id: 'audit-events',
        name: '查询安全审计事件',
        method: 'GET',
        path: '/audit/events',
        scope: 'usage:read',
        description: '查询凭证所属开发者的安全审计事件，可按结果筛选。',
        queryParams: [
          { name: 'from', type: 'string', required: false, default: '', description: '起始日期 (YYYY-MM-DD)' },
          { name: 'to', type: 'string', required: false, default: '', description: '截止日期 (YYYY-MM-DD)' },
          { name: 'result', type: 'string', required: false, default: '', description: '结果筛选，如 SUCCESS、DENIED、BLOCKED' }
        ],
        exampleResponse: ok([
          {
            id: 'ev_887711',
            occurredAt: '2026-10-31T14:32:10',
            action: 'chat.denied',
            result: 'DENIED',
            reasonCode: 'agent_out_of_scope',
            resourceType: 'AGENT',
            resourceId: 'agent-2e839a1c'
          }
        ])
      }
    ]
  },
  {
    id: 'account',
    name: '账号与外部身份 (Account)',
    icon: 'fa-solid fa-link',
    iconColor: '#f43f5e',
    endpoints: [
      {
        id: 'account-info',
        name: '查询凭证所属账号',
        method: 'GET',
        path: '/account',
        scope: 'account:read',
        description: '返回凭证所属开发者的账号信息及已绑定的外部身份。',
        exampleResponse: ok({
          id: 'u-developer',
          username: 'developer',
          nickname: '开发者',
          role: 'DEVELOPER',
          status: 'ACTIVE',
          identities: []
        })
      },
      {
        id: 'account-identities',
        name: '查询已绑定的外部身份',
        method: 'GET',
        path: '/account/identities',
        scope: 'account:read',
        description: '按绑定时间倒序返回外部身份。',
        exampleResponse: ok([
          { id: 'eid-01', providerCode: 'iot_platform', externalId: 'ext_user_88992', displayName: '物联网网关-终端操作员', bindSource: 'INBOUND_API', status: 'ACTIVE', boundAt: '2026-10-31T09:00:00' }
        ])
      },
      {
        id: 'account-bind',
        name: '绑定外部身份',
        method: 'POST',
        path: '/account/identities',
        scope: 'account:write',
        description: '把外部系统的用户标识绑定到凭证所属开发者账号。同一外部身份只能绑定一次，重复绑定返回 409 identity_conflict。',
        bodyFields: [
          { name: 'provider_code', type: 'string', required: true, default: 'iot_platform', description: '外部系统编码' },
          { name: 'external_id', type: 'string', required: true, default: 'ext_user_88992', description: '外部系统中的用户唯一标识' },
          { name: 'display_name', type: 'string', required: false, default: '物联网网关-终端操作员', description: '显示名称，不填时使用 external_id' }
        ],
        exampleBody: body({
          provider_code: 'iot_platform',
          external_id: 'ext_user_88992',
          display_name: '物联网网关-终端操作员'
        }),
        exampleResponse: ok({ id: 'eid-01', providerCode: 'iot_platform', externalId: 'ext_user_88992', displayName: '物联网网关-终端操作员', bindSource: 'INBOUND_API', status: 'ACTIVE' }, '绑定成功')
      },
      {
        id: 'account-unbind',
        name: '解绑外部身份',
        method: 'DELETE',
        path: '/account/identities/{id}',
        scope: 'account:write',
        description: '解绑一个外部身份，只能解绑自己账号下的。',
        pathParams: [
          { name: 'id', type: 'string', required: true, default: 'eid-01', description: '外部身份记录 ID（绑定接口返回的 id）' }
        ],
        exampleResponse: ok({ id: 'eid-01' }, '解绑成功')
      },
      {
        id: 'account-webhook',
        name: '外部身份同步回调（预留）',
        method: 'POST',
        path: '/webhooks/identity/{providerCode}',
        scope: '任意有效凭证',
        description: '预留接口：目前只回执，不做任何处理。',
        pathParams: [
          { name: 'providerCode', type: 'string', required: true, default: 'iot_platform', description: '外部系统编码' }
        ],
        exampleBody: body({ event: 'user.updated', external_id: 'ext_user_88992' }),
        exampleResponse: ok({ provider: 'iot_platform', status: 'PROCESSED' }, 'Webhook received')
      }
    ]
  }
]

export const ALL_ENDPOINTS = OPEN_API_GROUPS.flatMap(g => g.endpoints)
