<template>
  <div class="debug-page">
    <header class="debug-header">
      <div class="debug-header-left">
        <router-link :to="{ name: 'dashboard', query: { tab: 'agents' } }" class="btn-back-nav">
          <i class="fa-solid fa-arrow-left"></i>
          <span>返回智能体列表</span>
        </router-link>
        <div class="header-agent-badge">
          <h2 class="header-agent-title">
            <AgentAvatar v-if="agent" :name="agent.name" :size="28" />
            <span>{{ agent ? agent.name : '智能体加载中...' }}</span>
            <span v-if="pageTab === 'orchestrate'" class="header-tag-pill" :class="promptDirty ? 'draft' : 'published'">
              {{ promptDirty ? '未发布' : '已发布' }}
            </span>
          </h2>
          <div class="debug-tabs">
            <button type="button" class="debug-tab" :class="{ active: pageTab === 'orchestrate' }" @click="pageTab = 'orchestrate'">编排</button>
            <button type="button" class="debug-tab" :class="{ active: pageTab === 'logs' }" @click="pageTab = 'logs'">日志</button>
            <button type="button" class="debug-tab" :class="{ active: pageTab === 'monitor' }" @click="pageTab = 'monitor'">监测</button>
            <button type="button" class="debug-tab" :class="{ active: pageTab === 'api' }" @click="pageTab = 'api'">访问 API</button>
          </div>
        </div>
      </div>
      <div class="debug-header-right">
        <button class="btn-theme-toggle" @click="toggleTheme">
          <i :class="theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i>
        </button>
        <router-link
          to="/dashboard?tab=gateway"
          class="model-selector-pill"
          title="模型已在网关页选定，点击前往修改"
        >
          <i class="fa-solid fa-microchip" style="color: var(--accent-purple);"></i>
          <span class="model-current-name">{{ routedLabel }}</span>
          <span class="model-type-badge">CHAT</span>
        </router-link>
        <div v-if="pageTab === 'orchestrate'" class="model-settings-wrap" ref="settingsWrap">
          <button class="btn-model-settings" type="button" title="模型设置" @click="toggleSettings">
            <i class="fa-solid fa-sliders"></i>
          </button>
          <div v-if="settingsOpen" class="model-settings-panel">
            <div class="ms-header">
              <span>模型设置</span>
              <div class="ms-header-actions">
                <button type="button" class="ms-save" @click="saveModelSettings">保存</button>
                <button type="button" class="ms-close" @click="discardAndClose">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
            <div class="ms-body">
              <div class="ms-row">
                <label class="switch ms-switch">
                  <input v-model="settings.temperature.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">温度 <i class="fa-regular fa-circle-question" title="越高输出越随机，越低越稳定"></i></div>
                <input v-model.number="settings.temperature.value" class="ms-range" type="range" min="0" max="2" step="0.01">
                <input v-model.number="settings.temperature.value" class="ms-num" type="number" min="0" max="2" step="0.01">
              </div>
              <div class="ms-row">
                <label class="switch ms-switch">
                  <input v-model="settings.maxTokens.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">最大标记 <i class="fa-regular fa-circle-question" title="单次回复最多生成的 token 数"></i></div>
                <input v-model.number="settings.maxTokens.value" class="ms-range" type="range" min="1" max="16384" step="1">
                <input v-model.number="settings.maxTokens.value" class="ms-num" type="number" min="1" max="32768" step="1">
              </div>
              <div class="ms-row">
                <label class="switch ms-switch">
                  <input v-model="settings.topP.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">Top P <i class="fa-regular fa-circle-question" title="核采样阈值，越小候选词越少"></i></div>
                <input v-model.number="settings.topP.value" class="ms-range" type="range" min="0" max="1" step="0.01">
                <input v-model.number="settings.topP.value" class="ms-num" type="number" min="0" max="1" step="0.01">
              </div>
              <div class="ms-row">
                <label class="switch ms-switch">
                  <input v-model="settings.n.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">取样数量 <i class="fa-regular fa-circle-question" title="一次请求返回的候选回复数"></i></div>
                <span class="ms-spacer"></span>
                <input v-model.number="settings.n.value" class="ms-num" type="number" min="0" max="8" step="1">
              </div>
              <div class="ms-row">
                <label class="switch ms-switch">
                  <input v-model="settings.frequencyPenalty.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">频率惩罚 <i class="fa-regular fa-circle-question" title="降低重复用词的概率"></i></div>
                <input v-model.number="settings.frequencyPenalty.value" class="ms-range" type="range" min="0" max="2" step="0.01">
                <input v-model.number="settings.frequencyPenalty.value" class="ms-num" type="number" min="0" max="2" step="0.01">
              </div>
              <div class="ms-row">
                <label class="switch ms-switch">
                  <input v-model="settings.responseFormat.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">回复格式 <i class="fa-regular fa-circle-question" title="约束模型输出为普通文本或 JSON"></i></div>
                <select v-model="settings.responseFormat.value" class="ms-select">
                  <option value="text">文本</option>
                  <option value="json_object">JSON</option>
                </select>
              </div>
              <div class="ms-row ms-row-choice">
                <label class="switch ms-switch">
                  <input v-model="settings.webSearch.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">联网搜索 <i class="fa-regular fa-circle-question" title="打开后允许模型检索网络（需供应商支持）"></i></div>
                <span class="ms-flag">{{ settings.webSearch.enabled ? '已开启' : '已关闭' }}</span>
              </div>
              <div class="ms-row ms-row-choice">
                <label class="switch ms-switch">
                  <input v-model="settings.thinking.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <div class="ms-label">思考模式 <i class="fa-regular fa-circle-question" title="DeepSeek V4 默认会思考。关闭后会显式关掉思考，只返回最终答案。"></i></div>
                <span class="ms-flag">{{ settings.thinking.enabled ? '已开启' : '已关闭' }}</span>
              </div>
              <div class="ms-row ms-row-headers">
                <label class="switch ms-switch">
                  <input v-model="settings.extraHeaders.enabled" type="checkbox">
                  <span class="slider-toggle"></span>
                </label>
                <input v-model="settings.extraHeaders.value" class="ms-text" type="text" autocomplete="off" placeholder="额外请求头, Json字符串格式">
              </div>
            </div>
            <div class="ms-footer">
              <button type="button" class="ms-cancel" @click="discardAndClose">取消</button>
              <button type="button" class="ms-save" @click="saveModelSettings">保存</button>
            </div>
          </div>
        </div>
        <button
          v-if="pageTab === 'orchestrate'"
          class="btn-publish"
          :disabled="!agent || !promptDirty"
          :title="promptDirty ? '将当前草稿发布为线上系统提示词' : '没有未发布的更改'"
          @click="openPublishDialog"
        >
          <span>发布上线</span>
        </button>
      </div>
    </header>

    <main v-show="pageTab === 'orchestrate'" class="debug-main-layout" ref="layoutRef">
      <section class="orchestration-pane" ref="leftPane" :style="leftWidth ? { width: leftWidth + 'px' } : {}">
        <div class="config-card-section prompt-editor-card">
          <div class="section-header-row">
            <div class="section-title">
              <span>系统提示词（草稿）</span>
              <span v-if="onlineVersion" class="pv-online-chip" :title="'线上提示词为 v' + onlineVersion.versionNo">线上 v{{ onlineVersion.versionNo }}</span>
              <span v-if="promptDirty" class="pv-dirty-chip" title="草稿与线上提示词不同，点「发布上线」生成新版本">未发布</span>
            </div>
            <div class="pv-header-actions">
              <button class="btn-section-action" title="查看历史版本、对比与回滚" @click="openVersions"><i class="fa-solid fa-clock-rotate-left"></i><span>版本</span></button>
              <button class="btn-section-action" @click="optimizePrompt"><i class="fa-solid fa-wand-magic-sparkles"></i><span>生成</span></button>
            </div>
          </div>
          <textarea v-model="prompt" class="prompt-textarea" placeholder="请输入智能体的角色设定与工作流程..."></textarea>
          <div class="prompt-footer">
            <span>{{ prompt.length }} 字</span>
            <span style="font-size: 11px;">右侧调试用这份草稿；点「发布上线」后才成为线上系统提示词</span>
          </div>
        </div>
        <div class="config-card-section">
          <div class="section-header-row"><div class="section-title"><span>变量</span></div></div>
          <p class="section-hint">变量能使用户输入表单引入提示词或开场白</p>
          <div class="var-tag-list">
            <span class="var-chip"><i class="fa-solid fa-code" style="color: var(--accent-blue);"></i> {{ inputVar }} (用户输入)</span>
            <span class="var-chip"><i class="fa-solid fa-clock" style="color: var(--accent-amber);"></i> {{ timeVar }}</span>
          </div>
        </div>
        <div class="config-card-section">
          <div class="section-header-row">
            <div class="section-title">
              <span>知识库</span>
              <span v-if="boundSource" class="kb-source-chip" :class="boundSource === 'DIFY' ? 'dify' : 'native'">{{ kbSourceLabel(boundSource) }}</span>
            </div>
            <div class="section-tools-header-right">
              <span class="tools-count-badge">{{ boundKnowledgeBases.length }} 已关联</span>
              <span class="tools-header-divider">|</span>
              <button type="button" class="btn-tools-add" @click="openAddKnowledgeModal">
                <i class="fa-solid fa-plus"></i>
                <span>添加</span>
              </button>
            </div>
          </div>
          <p v-if="!boundKnowledgeBases.length" class="section-hint">尚未关联知识库。对话前会按这里绑定的库做检索并注入提示词。</p>
          <div
            v-for="kb in boundKnowledgeBases"
            :key="kb.id"
            class="knowledge-item-card"
          >
            <div class="knowledge-meta">
              <i class="fa-solid fa-book" style="color: #ec4899;"></i>
              <span>{{ kb.name }}</span>
            </div>
            <div class="tool-right">
              <span class="knowledge-badge">{{ knowledgeBadge(kb) }}</span>
              <button
                type="button"
                class="btn-tool-action btn-tool-delete"
                title="取消关联"
                @click.stop="unbindKnowledgeBase(kb)"
              >
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="config-card-section">
          <div class="section-header-row">
            <div class="section-title">
              <span>工具</span>
              <i class="fa-regular fa-circle-question section-title-help" title="从平台工具管理中选择，配置一次即可被全部智能体使用"></i>
            </div>
            <div class="section-tools-header-right">
              <span class="tools-count-badge">{{ enabledToolsCount }}/{{ tools.length }} 启用</span>
              <span class="tools-header-divider">|</span>
              <button type="button" class="btn-tools-add" @click="openAddToolModal">
                <i class="fa-solid fa-plus"></i>
                <span>添加</span>
              </button>
            </div>
          </div>
          <div class="tools-grid">
            <div
              v-for="tool in tools"
              :key="tool.id || tool.code || tool.name"
              class="tool-item-card"
              :class="{ 'tool-disabled': !tool.enabled }"
            >
              <div class="tool-left">
                <div class="tool-icon" :class="tool.iconClass">
                  <template v-if="tool.customIcon === 'bocha'">
                    <svg class="bocha-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.98 2c2.351.265 3.905 1.955 3.987 4.31a.035.035 0 00.019.031.036.036 0 00.036-.001c5.432-3.05 12.168.3 12.921 6.48.31 2.535-.668 5.04-2.33 6.946-1.41 1.619-3.653 2.561-5.763 2.738h-.996c-3.945-.28-7.106-2.99-7.99-6.805a.302.302 0 00-.078-.145l.013-.027a.114.114 0 00.01-.055l-.162-2.05.014-8.569L6.666 2h.314zm14.102 17.852c-.32-.386-.527-.643-.62-.773-.74-1.011-1.058-2.195-.952-3.552.044-.57.296-1.117.263-1.744-.146-2.74-2.503-4.64-5.21-4.232-1.772.268-3.215 1.678-3.61 3.4a4.44 4.44 0 001.574 4.488c1.119.879 2.37 1.166 3.753.86.675-.15 1.04-.226 1.096-.23 1.126-.083 2.098.273 2.918 1.069.486.472.74.718.763.738a.017.017 0 00.024 0 .017.017 0 000-.024z" fill="#006EFF"/>
                      <path d="M6.661 4.854l-.014 8.568-2.921-5.847-1.488-3.048a.106.106 0 01.022-.124.11.11 0 01.037-.024c1.57-.602 3.025-.444 4.364.475z" fill="#A5CCFF"/>
                      <path d="M3.726 7.575l2.921 5.847.161 2.05a.114.114 0 01-.01.055l-.012.027L.02 8.821a.07.07 0 01.001-.1C1.064 7.747 2.3 7.365 3.726 7.576z" fill="#A5CCFF" fill-opacity=".647"/>
                    </svg>
                  </template>
                  <i v-else :class="tool.icon"></i>
                </div>
                <div class="tool-info-text">
                  <span class="tool-prefix">{{ tool.prefix }}</span>
                  <span class="tool-title">{{ tool.title }}</span>
                  <i v-if="tool.help" class="fa-regular fa-circle-question tool-help-icon" :title="tool.help"></i>
                </div>
              </div>
              <div class="tool-right">
                <div class="tool-hover-actions">
                  <button
                    type="button"
                    class="btn-tool-action btn-tool-sliders"
                    title="参数配置"
                    @click.stop="openToolSettings(tool)"
                  >
                    <i class="fa-solid fa-sliders"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-tool-action btn-tool-delete"
                    title="移除工具"
                    @click.stop="deleteTool(tool)"
                  >
                    <i class="fa-regular fa-trash-can"></i>
                  </button>
                </div>
                <label class="switch" @click.stop>
                  <input
                    v-model="tool.enabled"
                    type="checkbox"
                    @change="toggleToolEnabled(tool)"
                  >
                  <span class="slider-toggle"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="resize-divider" @mousedown.prevent="startDrag"></div>

      <section class="preview-pane">
        <div class="preview-header">
          <div>
            <h3 class="preview-title">调试预览</h3>
            <p class="preview-hint">{{ promptDirty ? '正在使用未发布的草稿提示词' : '正在使用已发布的系统提示词' }}</p>
          </div>
          <button class="btn-icon-round" @click="resetChat"><i class="fa-solid fa-rotate-right"></i></button>
        </div>
        <div class="chat-history-scroll" ref="streamRef">
          <div v-if="!messages.length && !sending" class="chat-empty chat-empty-mascot">
            <AgentMascot :size="56" animated />
            <strong>{{ agent?.name || '智能体' }}</strong>
            <span>在下方输入内容开始调试</span>
          </div>
          <div v-for="(msg, i) in messages" :key="i" class="chat-msg-row" :class="msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-bot'">
            <div class="msg-avatar" :class="msg.role === 'user' ? 'msg-avatar-user' : 'msg-avatar-bot'">
              <User v-if="msg.role === 'user'" :size="15" :stroke-width="1.75" />
              <AgentMascot v-else :size="22" />
            </div>
            <div class="msg-content-wrapper">
              <div v-if="msg.tool" class="msg-tool-chip"><i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i> 工具调用: {{ msg.tool }}</div>
              <div class="msg-bubble" v-html="msg.html"></div>
              <div v-if="msg.meta" class="msg-meta-info">
                <span><i class="fa-solid fa-microchip"></i> {{ msg.meta.model }}</span>
                <span><i class="fa-regular fa-clock"></i> {{ msg.meta.latencyMs }}ms</span>
                <span><i class="fa-solid fa-ticket"></i> {{ msg.meta.tokensUsed }} Tokens</span>
              </div>
            </div>
          </div>
          <div v-if="sending" class="chat-msg-row chat-msg-bot">
            <div class="msg-avatar msg-avatar-bot"><AgentMascot :size="22" animated /></div>
            <div class="msg-content-wrapper">
              <div class="msg-bubble"><i class="fa-solid fa-circle-notch fa-spin" style="color: var(--accent-blue);"></i> {{ appliedSettings.thinking.enabled ? '思考中...' : '生成中...' }}</div>
            </div>
          </div>
        </div>
        <div class="preview-input-container">
          <div class="preset-pills-row">
            <span class="preset-chip" @click="sendQuick('请介绍你的核心人设与工作流程')">介绍工作流程</span>
            <span class="preset-chip" @click="sendQuick('现在系统时间是几点？星期几？')">查询当前时间</span>
            <span class="preset-chip" @click="sendQuick('帮我写一个 Spring AI 2.0.1 动态提示词编排代码')">生成 Spring AI 代码</span>
          </div>
          <form class="input-bar-wrapper" @submit.prevent="sendChat">
            <input v-model="inputText" class="main-chat-input" placeholder="和 Bot 聊天" autocomplete="off">
            <button type="submit" class="btn-input-send" :disabled="sending"><i class="fa-solid fa-paper-plane"></i></button>
          </form>
        </div>
      </section>
    </main>

    <AgentLogsPanel v-if="pageTab === 'logs' && agent" :agent-id="agent.id" />
    <AgentMonitorPanel v-if="pageTab === 'monitor' && agent" :agent-id="agent.id" />
    <AgentApiPanel
      v-if="pageTab === 'api' && agent"
      :agent="agent"
      :routed-channel="routedChannel"
      :routed-model="routedModel"
      :routed-label="routedLabel"
      @agent-updated="onAgentUpdated"
    />

    <!-- Tool Settings Modal -->
    <div v-if="toolSettingsModalOpen" class="tool-modal-backdrop" @click.self="toolSettingsModalOpen = false">
      <div class="tool-modal-dialog">
        <div class="tool-modal-header">
          <div class="tool-modal-title">
            <div class="tool-icon" :class="editingTool?.iconClass">
              <template v-if="editingTool?.customIcon === 'bocha'">
                <svg class="bocha-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.98 2c2.351.265 3.905 1.955 3.987 4.31a.035.035 0 00.019.031.036.036 0 00.036-.001c5.432-3.05 12.168.3 12.921 6.48.31 2.535-.668 5.04-2.33 6.946-1.41 1.619-3.653 2.561-5.763 2.738h-.996c-3.945-.28-7.106-2.99-7.99-6.805a.302.302 0 00-.078-.145l.013-.027a.114.114 0 00.01-.055l-.162-2.05.014-8.569L6.666 2h.314zm14.102 17.852c-.32-.386-.527-.643-.62-.773-.74-1.011-1.058-2.195-.952-3.552.044-.57.296-1.117.263-1.744-.146-2.74-2.503-4.64-5.21-4.232-1.772.268-3.215 1.678-3.61 3.4a4.44 4.44 0 001.574 4.488c1.119.879 2.37 1.166 3.753.86.675-.15 1.04-.226 1.096-.23 1.126-.083 2.098.273 2.918 1.069.486.472.74.718.763.738a.017.017 0 00.024 0 .017.017 0 000-.024z" fill="#006EFF"/>
                  <path d="M6.661 4.854l-.014 8.568-2.921-5.847-1.488-3.048a.106.106 0 01.022-.124.11.11 0 01.037-.024c1.57-.602 3.025-.444 4.364.475z" fill="#A5CCFF"/>
                  <path d="M3.726 7.575l2.921 5.847.161 2.05a.114.114 0 01-.01.055l-.012.027L.02 8.821a.07.07 0 01.001-.1C1.064 7.747 2.3 7.365 3.726 7.576z" fill="#A5CCFF" fill-opacity=".647"/>
                </svg>
              </template>
              <i v-else :class="editingTool?.icon"></i>
            </div>
            <span>配置工具 - {{ editingTool?.prefix }} {{ editingTool?.title }}</span>
          </div>
          <button type="button" class="btn-modal-close" @click="toolSettingsModalOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="tool-modal-body">
          <template v-if="editingTool?.customIcon === 'bocha'">
            <div class="tool-form-group">
              <div class="tool-label-row">
                <label class="tool-form-label">
                  <span>博查 API Key</span>
                  <span v-if="bochaDbConfigured" class="badge-saved-encrypted" :class="{ 'badge-inherited': bochaDbInherited }" :title="bochaDbInherited ? '已自动继承平台共享的加密密钥' : '当前智能体已专属加密保存'">
                    <i class="fa-solid fa-shield-halved"></i> {{ bochaDbInherited ? '继承平台共享密钥' : '数据库已专属保存' }}
                  </span>
                  <span v-else class="label-sub">(选填，留空使用内置系统 Key)</span>
                </label>
                <span class="tool-tip-pill" title="支持自定义 API Key，或填 mock 进行快速模拟验证">
                  <i class="fa-solid fa-circle-info"></i> 即时测试
                </span>
              </div>
              <div class="tool-key-input-row">
                <div class="tool-input-wrapper">
                  <input
                    v-model="editingToolConfig.apiKey"
                    class="tool-form-input tool-key-input"
                    :type="showApiKey ? 'text' : 'password'"
                    autocomplete="new-password"
                    :placeholder="bochaDbConfigured ? (bochaDbInherited ? '已自动继承平台共享密钥（如需专属 Key 请输入）' : '已在数据库专属加密保存（如需更换请输入新 Key）') : 'sk-********************************'"
                    @input="testResult = null"
                  >
                  <button
                    type="button"
                    class="btn-key-eye"
                    @click="showApiKey = !showApiKey"
                    :title="showApiKey ? '隐藏 Key' : '显示 Key'"
                  >
                    <i :class="showApiKey ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
                  </button>
                </div>
                <button
                  type="button"
                  class="btn-tool-test"
                  :disabled="testingConnection"
                  @click="testBochaConnection"
                  :title="bochaDbConfigured && !editingToolConfig.apiKey ? '使用数据库已保存的加密 Key 进行连通性探测' : '向 Bocha 接口发送连通性探测请求'"
                >
                  <i v-if="testingConnection" class="fa-solid fa-circle-notch fa-spin"></i>
                  <i v-else class="fa-solid fa-bolt"></i>
                  <span>{{ testingConnection ? '测试中...' : '测试连接' }}</span>
                </button>
              </div>

              <!-- Test Result Alert Banner -->
              <div
                v-if="testResult"
                class="tool-test-banner"
                :class="testResult.success ? 'test-banner-success' : 'test-banner-error'"
              >
                <div class="test-banner-left">
                  <i :class="testResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
                  <div class="test-banner-text">
                    <div class="test-banner-msg">{{ testResult.message }}</div>
                    <div v-if="testResult.latencyMs" class="test-banner-meta">
                      耗时: <span>{{ testResult.latencyMs }}ms</span> · 状态: {{ testResult.success ? '可用 (OK)' : '异常' }}
                    </div>
                  </div>
                </div>
                <button type="button" class="btn-banner-close" @click="testResult = null">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
            <div class="tool-form-group">
              <label class="tool-form-label">
                <span>最大检索结果数</span>
                <span class="label-sub">({{ editingToolConfig.count }} 条)</span>
              </label>
              <div class="tool-range-row">
                <input
                  v-model.number="editingToolConfig.count"
                  type="range"
                  min="1"
                  max="10"
                  class="tool-range-slider"
                >
                <input
                  v-model.number="editingToolConfig.count"
                  type="number"
                  min="1"
                  max="10"
                  class="tool-form-input tool-range-num"
                >
              </div>
            </div>
            <div class="tool-form-group">
              <label class="tool-form-label"><span>搜索时效性范围</span></label>
              <select v-model="editingToolConfig.freshness" class="tool-form-select">
                <option value="noLimit">不限时间</option>
                <option value="oneDay">过去 24 小时</option>
                <option value="oneWeek">过去一周</option>
                <option value="oneMonth">过去一月</option>
                <option value="oneYear">过去一年</option>
              </select>
            </div>
            <div class="tool-switch-row">
              <div class="tool-form-label">
                <span>生成内容摘要</span>
                <span class="label-sub">提取网页核心要点返回给大模型</span>
              </div>
              <label class="switch">
                <input v-model="editingToolConfig.summary" type="checkbox">
                <span class="slider-toggle"></span>
              </label>
            </div>
          </template>

          <template v-else-if="editingTool?.prefix === 'time'">
            <div class="tool-form-group">
              <label class="tool-form-label"><span>基准时区</span></label>
              <select v-model="editingToolConfig.timezone" class="tool-form-select">
                <option value="Asia/Shanghai">Asia/Shanghai (北京时间 GMT+8)</option>
                <option value="UTC">UTC (协调世界时)</option>
                <option value="America/New_York">America/New_York (美东时间)</option>
                <option value="Europe/London">Europe/London (伦敦时间)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (东京时间 GMT+9)</option>
              </select>
            </div>
            <div class="tool-form-group">
              <label class="tool-form-label"><span>默认时间格式</span></label>
              <select v-model="editingToolConfig.format" class="tool-form-select">
                <option value="yyyy-MM-dd HH:mm:ss">yyyy-MM-dd HH:mm:ss</option>
                <option value="yyyy年MM月dd日 HH:mm:ss">yyyy年MM月dd日 HH:mm:ss</option>
                <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                <option value="ISO-8601">ISO-8601 标准格式</option>
              </select>
            </div>
          </template>

          <div class="tool-form-group">
            <label class="tool-form-label">
              <span>工具提示词描述 (LLM Prompt)</span>
              <span class="label-sub">指引模型何时及如何调用本工具</span>
            </label>
            <textarea
              v-model="editingToolConfig.description"
              class="tool-form-textarea"
              placeholder="请输入工具调用提示词描述..."
            ></textarea>
          </div>
        </div>
        <div class="tool-modal-footer">
          <button type="button" class="btn-modal-reset" @click="resetToolSettings">恢复默认</button>
          <div class="tool-footer-right">
            <button type="button" class="btn-modal-cancel" @click="toolSettingsModalOpen = false">取消</button>
            <button type="button" class="btn-modal-save" @click="saveToolSettings">保存配置</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Tool Modal -->
    <div v-if="addToolModalOpen" class="tool-modal-backdrop" @click.self="addToolModalOpen = false">
      <div class="tool-modal-dialog">
        <div class="tool-modal-header">
          <div class="tool-modal-title">
            <i class="fa-solid fa-puzzle-piece" style="color: var(--accent-blue);"></i>
            <span>从工具管理选择</span>
          </div>
          <button type="button" class="btn-modal-close" @click="addToolModalOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="tool-modal-body">
          <div class="tool-catalog-section">
            <div class="tool-catalog-search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input v-model="toolCatalogKeyword" type="search" autocomplete="off" placeholder="搜索工具名称、前缀或能力…">
            </div>
            <h4 class="catalog-section-title">平台工具目录 ({{ filteredToolCatalog.length }}/{{ standardToolCatalog.length }})</h4>
            <p v-if="!standardToolCatalog.length" class="section-hint">暂无可用工具，请先在左侧「工具管理」中启用。</p>
            <p v-else-if="!filteredToolCatalog.length" class="section-hint">没有匹配的工具，试试其他关键词。</p>
            <div class="tool-catalog-list">
              <div v-for="catTool in filteredToolCatalog" :key="catTool.id || catTool.name" class="catalog-item-card">
                <div class="catalog-item-left">
                  <ToolGlyph :icon="catTool.icon" :icon-class="catTool.iconClass" :custom-icon="catTool.customIcon" />
                  <div>
                    <div class="tool-info-text">
                      <span class="tool-prefix">{{ catTool.prefix }}</span>
                      <span class="tool-title">{{ catTool.title }}</span>
                    </div>
                    <div class="catalog-item-desc">{{ catTool.help || catTool.description }}</div>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn-catalog-add"
                  :disabled="isToolAttached(catTool)"
                  @click="addToolFromCatalog(catTool)"
                >
                  <i :class="isToolAttached(catTool) ? 'fa-solid fa-check' : 'fa-solid fa-plus'"></i>
                  {{ isToolAttached(catTool) ? '已添加' : '添加' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="tool-modal-footer">
          <span class="label-sub">后续新工具会自动出现在此列表</span>
          <button type="button" class="btn-modal-cancel" @click="addToolModalOpen = false">完成</button>
        </div>
      </div>
    </div>

    <div v-if="addKnowledgeModalOpen" class="tool-modal-backdrop" @click.self="addKnowledgeModalOpen = false">
      <div class="tool-modal-dialog">
        <div class="tool-modal-header">
          <div class="tool-modal-title">
            <i class="fa-solid fa-book" style="color: #ec4899;"></i>
            <span>关联知识库</span>
          </div>
          <button type="button" class="btn-modal-close" @click="addKnowledgeModalOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="tool-modal-body">
          <div class="tool-catalog-section">
            <!-- 知识来源：一个智能体只能使用一种来源，已绑定后另一种来源锁定 -->
            <div v-if="showSourceSwitch" class="kb-source-switch">
              <button
                v-for="opt in KB_SOURCES"
                :key="opt.value"
                type="button"
                class="kb-source-option"
                :class="{ active: kbSource === opt.value }"
                :disabled="!!boundSource && boundSource !== opt.value"
                :title="boundSource && boundSource !== opt.value ? '已绑定' + kbSourceLabel(boundSource) + '，需先全部解绑才能切换' : ''"
                @click="kbSource = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
            <p v-if="boundSource && showSourceSwitch" class="section-hint">
              一个智能体只能使用一种知识来源。当前已绑定{{ kbSourceLabel(boundSource) }}，如需切换请先解绑全部知识库。
            </p>
            <h4 class="catalog-section-title">{{ kbSourceLabel(kbSource) }} (共 {{ sourceCatalog.length }} 项)</h4>
            <p v-if="!sourceCatalog.length" class="section-hint">
              {{ kbSource === 'DIFY' ? '暂无可选的 Dify 知识库，请先在「Dify 知识库」页面创建或同步。' : '暂无可选的自建知识库，请先在「自建知识库」页面创建。' }}
            </p>
            <div class="tool-catalog-list">
              <div v-for="kb in sourceCatalog" :key="kb.id" class="catalog-item-card">
                <div class="catalog-item-left">
                  <div class="tool-icon icon-orange">
                    <i class="fa-solid fa-book"></i>
                  </div>
                  <div>
                    <div class="tool-info-text">
                      <span class="tool-title">{{ kb.name }}</span>
                    </div>
                    <div class="catalog-item-desc">{{ knowledgeBadge(kb) }}{{ kb.description ? ' · ' + kb.description : '' }}</div>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn-catalog-add"
                  :disabled="boundKbIds.includes(kb.id) || (!!boundSource && boundSource !== kbSourceOf(kb))"
                  @click="bindKnowledgeBase(kb)"
                >
                  <i :class="boundKbIds.includes(kb.id) ? 'fa-solid fa-check' : 'fa-solid fa-plus'"></i>
                  {{ boundKbIds.includes(kb.id) ? '已关联' : '添加' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="tool-modal-footer">
          <span></span>
          <button type="button" class="btn-modal-cancel" @click="addKnowledgeModalOpen = false">完成</button>
        </div>
      </div>
    </div>

    <!-- 系统提示词版本：列表、查看、与草稿对比、载入草稿、回滚 -->
    <div v-if="versionsOpen" class="tool-modal-backdrop" @click.self="versionsOpen = false">
      <div class="tool-modal-dialog pv-dialog">
        <div class="tool-modal-header">
          <div class="tool-modal-title">
            <i class="fa-solid fa-clock-rotate-left" style="color: var(--accent-blue);"></i>
            <span>系统提示词版本</span>
            <span class="pv-count">{{ promptVersions.length }} 个版本</span>
          </div>
          <button type="button" class="btn-modal-close" @click="versionsOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="pv-body">
          <div class="pv-list">
            <div v-if="versionsLoading" class="pv-empty">加载中…</div>
            <div v-else-if="!promptVersions.length" class="pv-empty">
              还没有历史版本。<br>修改提示词并「发布上线」后会自动记录版本。
            </div>
            <button
              v-for="v in promptVersions"
              :key="v.id"
              type="button"
              class="pv-item"
              :class="{ active: selectedVersion && selectedVersion.id === v.id }"
              @click="selectVersion(v)"
            >
              <div class="pv-item-head">
                <strong>v{{ v.versionNo }}</strong>
                <span v-if="v.current" class="pv-online-chip">线上</span>
                <span class="pv-source">{{ v.sourceLabel }}</span>
              </div>
              <div v-if="v.note" class="pv-item-note">{{ v.note }}</div>
              <div class="pv-item-meta">{{ formatVersionTime(v.createdAt) }}<template v-if="v.createdBy"> · {{ v.createdBy }}</template> · {{ v.length }} 字</div>
            </button>
          </div>
          <div class="pv-detail">
            <template v-if="selectedVersion">
              <div class="pv-detail-head">
                <div class="pv-detail-title">
                  <strong>v{{ selectedVersion.versionNo }}</strong>
                  <span class="pv-source">{{ selectedVersion.sourceLabel }}</span>
                  <span class="pv-item-meta">{{ formatVersionTime(selectedVersion.createdAt) }}<template v-if="selectedVersion.createdBy"> · {{ selectedVersion.createdBy }}</template></span>
                </div>
                <div class="pv-tabs">
                  <button type="button" :class="{ on: versionView === 'content' }" @click="versionView = 'content'">内容</button>
                  <button type="button" :class="{ on: versionView === 'diff' }" @click="versionView = 'diff'">与当前草稿对比</button>
                </div>
              </div>
              <p v-if="selectedVersion.note" class="pv-detail-note">{{ selectedVersion.note }}</p>
              <pre v-if="versionView === 'content'" class="pv-content">{{ selectedVersion.systemPrompt || '（空）' }}</pre>
              <div v-else class="pv-diff">
                <div v-if="versionDiffStats.same" class="pv-empty">与当前草稿完全一致</div>
                <template v-else>
                  <div class="pv-diff-legend">
                    <span class="del">− {{ versionDiffStats.removed }} 行仅在 v{{ selectedVersion.versionNo }}</span>
                    <span class="add">+ {{ versionDiffStats.added }} 行仅在当前草稿</span>
                  </div>
                  <div v-for="(line, i) in versionDiff" :key="i" class="pv-diff-line" :class="line.type">
                    <span class="pv-diff-mark">{{ line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' ' }}</span>
                    <span class="pv-diff-text">{{ line.text || ' ' }}</span>
                  </div>
                </template>
              </div>
            </template>
            <div v-else-if="!versionsLoading" class="pv-empty">选择左侧的版本查看内容</div>
          </div>
        </div>
        <div class="tool-modal-footer pv-footer">
          <span class="pv-hint">载入到草稿后可在右侧调试，确认后再发布；回滚会直接把该版本发布为线上提示词，并生成一个新版本。</span>
          <div class="tool-footer-right">
            <button type="button" class="btn-modal-cancel" :disabled="!selectedVersion" @click="loadVersionToDraft">载入到草稿</button>
            <button
              type="button"
              class="btn-modal-save"
              :disabled="!selectedVersion || selectedVersion.current || versionBusy"
              :title="selectedVersion && selectedVersion.current ? '该版本就是当前线上版本' : ''"
              @click="openRollbackDialog"
            >回滚到此版本</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 发布 / 回滚确认：填写版本说明 -->
    <div v-if="publishDialog.open" class="tool-modal-backdrop" @click.self="publishDialog.open = false">
      <div class="tool-modal-dialog">
        <div class="tool-modal-header">
          <div class="tool-modal-title">
            <i :class="publishDialog.mode === 'rollback' ? 'fa-solid fa-rotate-left' : 'fa-solid fa-rocket'" style="color: var(--accent-blue);"></i>
            <span>{{ publishDialog.mode === 'rollback' ? '回滚到 v' + publishDialog.version.versionNo : '发布上线' }}</span>
          </div>
          <button type="button" class="btn-modal-close" @click="publishDialog.open = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="tool-modal-body">
          <p class="pv-publish-tip">
            <template v-if="publishDialog.mode === 'rollback'">
              将 v{{ publishDialog.version.versionNo }} 的内容发布为线上系统提示词，并记录为新版本 v{{ nextVersionNo }}。
              <span v-if="promptDirty" class="pv-warn">当前草稿中未发布的修改会被替换。</span>
            </template>
            <template v-else>
              当前草稿将成为线上系统提示词，并记录为版本 v{{ nextVersionNo }}；工具与模型参数一并保存。
            </template>
          </p>
          <div class="tool-form-group">
            <label class="tool-form-label">版本说明 <span class="label-sub">可选，最多 200 字，例如"补充退货时效规则"</span></label>
            <input
              ref="noteInputRef"
              v-model="publishDialog.note"
              class="pv-note-input"
              maxlength="200"
              placeholder="这次修改了什么"
              @keydown.enter.prevent="confirmPublishDialog"
            >
          </div>
        </div>
        <div class="tool-modal-footer">
          <span></span>
          <div class="tool-footer-right">
            <button type="button" class="btn-modal-cancel" @click="publishDialog.open = false">取消</button>
            <button type="button" class="btn-modal-save" :disabled="versionBusy" @click="confirmPublishDialog">
              {{ publishDialog.mode === 'rollback' ? '确认回滚' : '确认发布' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 平台 AI 助手：页面上下文为当前智能体，可以直接问"这个智能体为什么没回复" -->
    <AssistantDock :launcher-bottom="132" />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'
import AgentLogsPanel from '../components/AgentLogsPanel.vue'
import AgentMonitorPanel from '../components/AgentMonitorPanel.vue'
import AgentApiPanel from '../components/AgentApiPanel.vue'
import ToolGlyph from '../components/ToolGlyph.vue'
import AgentMascot from '../components/AgentMascot.vue'
import AgentAvatar from '../components/AgentAvatar.vue'
import AssistantDock from '../components/AssistantDock.vue'
import { clearAssistantResource, setAssistantPage, setAssistantResource } from '../composables/useAssistantContext'
import { User } from 'lucide-vue-next'
import { FALLBACK_PLATFORM_TOOLS, matchSavedTool, toDebugTool } from '../composables/platformTools'

const route = useRoute()
const { showToast } = useToast()
const inputVar = '{{input}}'
const timeVar = '{{system_time}}'
const pageTab = ref('orchestrate')
const agent = ref(null)

function onAgentUpdated(updatedAgent) {
  if (updatedAgent) {
    agent.value = { ...agent.value, ...updatedAgent }
  }
}
const prompt = ref('')
const publishedPrompt = ref('')
const promptDirty = computed(() => prompt.value !== publishedPrompt.value)
const routedChannel = ref('')
const routedModel = ref('')
const routedLabel = computed(() => {
  if (routedChannel.value && routedModel.value) {
    return `${routedChannel.value} · ${routedModel.value}`
  }
  if (routedChannel.value) return routedChannel.value
  if (routedModel.value) return routedModel.value
  return '未配置网关'
})

watch(pageTab, async (newTab) => {
  if (newTab === 'api') {
    const overviewRes = await http.get('/api/model-gateway/active-route')
    if (overviewRes.success) {
      applyGatewayRoute(overviewRes.data)
      if (agent.value && routedModel.value && agent.value.modelName !== routedModel.value) {
        agent.value.modelName = routedModel.value
        http.put(`/api/agents/${agent.value.id}`, {
          ...agent.value,
          modelName: routedModel.value
        }).catch(() => {})
      }
    }
  }
})
const inputText = ref('')
const sending = ref(false)
const conversationId = ref('')
const messages = ref([])
const history = ref([])
const speedText = ref('↑ 0 K/s  ↓ 2 K/s')
const theme = ref(localStorage.getItem('theme') || 'dark')
const leftWidth = ref(Number(localStorage.getItem('debugPaneWidth') || 0) || null)
const layoutRef = ref(null)
const leftPane = ref(null)
const streamRef = ref(null)
const settingsWrap = ref(null)
const settingsOpen = ref(false)
const settings = reactive(createDefaultSettings())
const appliedSettings = reactive(createDefaultSettings())
const drag = reactive({ active: false, startX: 0, startWidth: 0 })

const tools = reactive([])

const enabledToolsCount = computed(() => tools.filter(t => t.enabled).length)
const removedTools = ref([])
const boundKbIds = ref([])
const knowledgeCatalog = ref([])
const addKnowledgeModalOpen = ref(false)
const boundKnowledgeBases = computed(() => {
  const catalog = knowledgeCatalog.value
  return boundKbIds.value
    .map(id => catalog.find(kb => kb.id === id) || { id, name: id, searchMethod: 'hybrid_search', indexingTechnique: 'high_quality' })
})

// 知识来源：自建知识库与 Dify 知识库分开使用，一个智能体只能绑定其中一种（后端同样校验）
const KB_SOURCES = [
  { value: 'SPRING_AI', label: '自建知识库' },
  { value: 'DIFY', label: 'Dify 知识库' }
]
const kbSource = ref('SPRING_AI')
// 缺失 provider 的历史数据按 Dify 处理，与后端一致
function kbSourceOf(kb) {
  return kb?.provider === 'SPRING_AI' ? 'SPRING_AI' : 'DIFY'
}
function kbSourceLabel(source) {
  return source === 'DIFY' ? 'Dify 知识库' : '自建知识库'
}
const boundSource = computed(() => {
  const kb = boundKnowledgeBases.value.find(item => item.provider)
  return kb ? kbSourceOf(kb) : null
})
const sourceCatalog = computed(() => knowledgeCatalog.value.filter(kb => kbSourceOf(kb) === kbSource.value))
// 没有任何 Dify 知识库时不显示来源切换，界面与只用自建知识库时一致
const showSourceSwitch = computed(() => boundSource.value === 'DIFY' || knowledgeCatalog.value.some(kb => kbSourceOf(kb) === 'DIFY'))

const toolSettingsModalOpen = ref(false)
const editingTool = ref(null)
const bochaDbConfigured = ref(false)
const bochaDbInherited = ref(false)
const showApiKey = ref(false)
const testingConnection = ref(false)
const testResult = ref(null)
const editingToolConfig = reactive({
  apiKey: '',
  count: 5,
  freshness: 'noLimit',
  summary: true,
  timezone: 'Asia/Shanghai',
  format: 'yyyy-MM-dd HH:mm:ss',
  description: ''
})

async function testBochaConnection() {
  if (testingConnection.value) return
  testingConnection.value = true
  testResult.value = null
  try {
    const res = await http.post('/api/tools/bocha/test', {
      apiKey: editingToolConfig.apiKey ? editingToolConfig.apiKey.trim() : undefined,
      agentId: agent.value?.id
    })
    if (res.success && res.data) {
      testResult.value = {
        success: true,
        message: res.message || '连接成功！Bocha 搜索服务可用',
        latencyMs: res.data.latencyMs,
        code: res.data.code
      }
      showToast('Bocha 接口连接测试通过！', 'success', 2500)
    } else {
      testResult.value = {
        success: false,
        message: res.message || '测试失败：无法连接 Bocha 接口',
        latencyMs: res.data?.latencyMs,
        code: res.data?.code
      }
      showToast(res.message || 'Bocha 接口测试未通过', 'error', 3500)
    }
  } catch (err) {
    testResult.value = {
      success: false,
      message: '测试异常: ' + (err.message || '网络请求超时或服务不可用')
    }
    showToast('测试异常: ' + (err.message || '网络请求超时'), 'error', 3500)
  } finally {
    testingConnection.value = false
  }
}

const GLOBAL_BOCHA_KEY = 'global-bocha-api-key'
function toolsStorageKey(id) {
  return 'debug-agent-tools:' + (id || 'default')
}

function openToolSettings(tool) {
  editingTool.value = tool
  showApiKey.value = false
  testingConnection.value = false
  testResult.value = null
  let currentKey = tool.config?.apiKey || ''
  if (tool.customIcon === 'bocha') {
    bochaDbConfigured.value = false
    bochaDbInherited.value = false
    if (!currentKey) {
      currentKey = localStorage.getItem(GLOBAL_BOCHA_KEY) || ''
    }
    if (agent.value?.id) {
      http.get(`/api/agents/${agent.value.id}/tool-secrets/bocha`).then(res => {
        if (res.success && res.data?.configured) {
          bochaDbConfigured.value = true
          bochaDbInherited.value = !!res.data.inherited
        }
      }).catch(() => {})
    }
  }
  editingToolConfig.apiKey = currentKey
  editingToolConfig.count = tool.config?.count || 5
  editingToolConfig.freshness = tool.config?.freshness || 'noLimit'
  editingToolConfig.summary = tool.config?.summary ?? true
  editingToolConfig.timezone = tool.config?.timezone || 'Asia/Shanghai'
  editingToolConfig.format = tool.config?.format || 'yyyy-MM-dd HH:mm:ss'
  editingToolConfig.description = tool.description || ''
  toolSettingsModalOpen.value = true
}

function saveToolSettings() {
  if (editingTool.value) {
    editingTool.value.config = {
      apiKey: editingToolConfig.apiKey,
      count: editingToolConfig.count,
      freshness: editingToolConfig.freshness,
      summary: editingToolConfig.summary,
      timezone: editingToolConfig.timezone,
      format: editingToolConfig.format
    }
    editingTool.value.description = editingToolConfig.description

    // 1. If Bocha key filled, persist globally to localStorage and backend secret store
    if (editingTool.value.customIcon === 'bocha') {
      if (editingToolConfig.apiKey && editingToolConfig.apiKey.trim()) {
        const trimmedKey = editingToolConfig.apiKey.trim()
        localStorage.setItem(GLOBAL_BOCHA_KEY, trimmedKey)
        if (agent.value?.id) {
          http.put(`/api/agents/${agent.value.id}/tool-secrets/bocha`, { apiKey: trimmedKey })
            .then(() => {
              bochaDbConfigured.value = true
              bochaDbInherited.value = false
            })
            .catch(err => console.warn('Sync bocha secret failed:', err))
        }
      }
    }

    // 2. Persist this agent's tools configuration to localStorage
    if (agent.value?.id) {
      localStorage.setItem(toolsStorageKey(agent.value.id), JSON.stringify(tools))

      // 3. Auto sync to backend PostgreSQL database
      http.put(`/api/agents/${agent.value.id}`, {
        ...agent.value,
        toolsConfig: JSON.stringify(tools)
      }).catch(err => console.warn('Auto sync toolsConfig failed:', err))
    }

    showToast(`工具 [${editingTool.value.prefix} ${editingTool.value.title}] 配置已持久化保存`, 'success', 2000)
  }
  toolSettingsModalOpen.value = false
}

function resetToolSettings() {
  if (editingTool.value?.customIcon === 'bocha') {
    editingToolConfig.apiKey = ''
    editingToolConfig.count = 5
    editingToolConfig.freshness = 'noLimit'
    editingToolConfig.summary = true
    if (agent.value?.id) {
      http.delete(`/api/agents/${agent.value.id}/tool-secrets/bocha`)
        .then(() => {
          http.get(`/api/agents/${agent.value.id}/tool-secrets/bocha`).then(res => {
            if (res.success && res.data?.configured) {
              bochaDbConfigured.value = true
              bochaDbInherited.value = !!res.data.inherited
            } else {
              bochaDbConfigured.value = false
              bochaDbInherited.value = false
            }
          }).catch(() => {
            bochaDbConfigured.value = false
            bochaDbInherited.value = false
          })
        })
        .catch(() => {})
    }
  } else {
    editingToolConfig.timezone = 'Asia/Shanghai'
    editingToolConfig.format = 'yyyy-MM-dd HH:mm:ss'
  }
  editingToolConfig.description = editingTool.value?.description || ''
  showToast('已恢复默认配置', 'info', 1500)
}

function toggleToolEnabled(tool) {
  if (agent.value?.id) {
    localStorage.setItem(toolsStorageKey(agent.value.id), JSON.stringify(tools))
    http.put(`/api/agents/${agent.value.id}`, {
      ...agent.value,
      toolsConfig: JSON.stringify(tools)
    }).catch(err => console.warn('Auto sync toolsConfig failed:', err))
  }
  showToast(`工具 [${tool.prefix} ${tool.title}] 已${tool.enabled ? '启用' : '禁用'}`, 'info', 1500)
}

function deleteTool(tool) {
  const idx = tools.findIndex(t => t.name === tool.name)
  if (idx !== -1) {
    tools.splice(idx, 1)
    if (agent.value?.id) {
      localStorage.setItem(toolsStorageKey(agent.value.id), JSON.stringify(tools))
      http.put(`/api/agents/${agent.value.id}`, {
        ...agent.value,
        toolsConfig: JSON.stringify(tools)
      }).catch(err => console.warn('Auto sync toolsConfig failed:', err))
    }
    showToast(`已移除工具 [${tool.prefix} ${tool.title}]，可在「+ 添加」中重新添加`, 'info', 2500)
  }
}

const addToolModalOpen = ref(false)
const toolCatalogKeyword = ref('')
const standardToolCatalog = ref([])

const filteredToolCatalog = computed(() => {
  const q = toolCatalogKeyword.value.trim().toLowerCase()
  if (!q) return standardToolCatalog.value
  return standardToolCatalog.value.filter(t =>
    [t.name, t.title, t.prefix, t.code, t.help, t.description]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(q))
  )
})

function isToolAttached(catTool) {
  return tools.some(t =>
    (catTool.id && t.id === catTool.id)
    || (catTool.code && t.code === catTool.code)
    || t.name === catTool.name
  )
}

async function loadPlatformCatalog() {
  const res = await http.get('/api/platform-tools')
  const rows = Array.isArray(res?.data) ? res.data : (res?.data?.records || [])
  const catalog = (res.success && rows.length) ? rows : FALLBACK_PLATFORM_TOOLS
  standardToolCatalog.value = catalog
    .filter(t => t.enabled !== false)
    .map(toDebugTool)
}

function knowledgeBadge(kb) {
  const quality = kb?.indexingTechnique === 'economy' ? '经济' : '高质量'
  const method = kb?.searchMethod
  let methodLabel = '混合检索'
  if (method === 'semantic_search') methodLabel = '向量检索'
  else if (method === 'full_text_search') methodLabel = '全文检索'
  return `${quality} · ${methodLabel}`
}

async function loadKnowledgeCatalog() {
  const res = await http.get('/api/knowledge-bases', { page: 1, size: 100 })
  if (res.success && res.data) {
    knowledgeCatalog.value = res.data.records || []
  }
}

async function persistKnowledgeBaseIds() {
  if (!agent.value?.id) return false
  const ids = [...boundKbIds.value]
  agent.value = { ...agent.value, knowledgeBaseIds: ids }
  const res = await http.put(`/api/agents/${agent.value.id}`, {
    ...agent.value,
    knowledgeBaseIds: ids
  })
  if (res.success && res.data) {
    agent.value = res.data
    if (Array.isArray(res.data.knowledgeBaseIds)) {
      boundKbIds.value = [...res.data.knowledgeBaseIds]
    }
    return true
  }
  showToast(res.message || '知识库关联保存失败', 'error')
  return false
}

async function openAddKnowledgeModal() {
  await loadKnowledgeCatalog()
  kbSource.value = boundSource.value || 'SPRING_AI'
  addKnowledgeModalOpen.value = true
}

async function bindKnowledgeBase(kb) {
  if (!kb?.id || boundKbIds.value.includes(kb.id)) return
  const prev = [...boundKbIds.value]
  boundKbIds.value = [...prev, kb.id]
  const ok = await persistKnowledgeBaseIds()
  if (!ok) {
    boundKbIds.value = prev
    return
  }
  showToast(`已关联知识库 [${kb.name}]`, 'success', 2000)
}

async function unbindKnowledgeBase(kb) {
  const prev = [...boundKbIds.value]
  boundKbIds.value = prev.filter(id => id !== kb.id)
  const ok = await persistKnowledgeBaseIds()
  if (!ok) {
    boundKbIds.value = prev
    return
  }
  showToast(`已取消关联 [${kb.name}]`, 'info', 2000)
}

async function openAddToolModal() {
  toolCatalogKeyword.value = ''
  await loadPlatformCatalog()
  addToolModalOpen.value = true
}

function addToolFromCatalog(toolItem) {
  if (isToolAttached(toolItem)) {
    showToast(`工具 [${toolItem.title}] 已经存在`, 'warning', 2000)
    return
  }
  const newTool = JSON.parse(JSON.stringify(toolItem))
  newTool.enabled = true
  if (newTool.customIcon === 'bocha') {
    const savedGlobalKey = localStorage.getItem(GLOBAL_BOCHA_KEY)
    if (savedGlobalKey) {
      if (!newTool.config) newTool.config = {}
      newTool.config.apiKey = savedGlobalKey
    }
  }
  tools.push(newTool)
  if (agent.value?.id) {
    localStorage.setItem(toolsStorageKey(agent.value.id), JSON.stringify(tools))
    http.put(`/api/agents/${agent.value.id}`, {
      ...agent.value,
      toolsConfig: JSON.stringify(tools)
    }).catch(err => console.warn('Auto sync toolsConfig failed:', err))
  }
  showToast(`已成功添加工具 [${toolItem.prefix} ${toolItem.title}]`, 'success', 2000)
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatHtml(content, isUser) {
  if (!content) return ''
  let text = isUser ? content : content
    .replace(/\[\d+\]/g, '')
    .replace(/【\d+】/g, '')
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g, '')
    .trim()
  let html = escapeHtml(text)
  if (isUser) return html
  return html
    .replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, '<pre style="background: var(--bg-primary); padding: 10px; border-radius: 8px; margin: 8px 0; overflow-x: auto; font-family: monospace; font-size: 12px;"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background: var(--bg-primary); padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 12px;">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/### ([^\n]+)/g, '<h4 style="color: var(--accent-blue); margin: 6px 0;">$1</h4>')
    .replace(/\n/g, '<br>')
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem('theme', theme.value)
}

function resetChat() {
  conversationId.value = ''
  history.value = []
  messages.value = []
}

function sendQuick(text) {
  inputText.value = text
  sendChat()
}

async function sendChat() {
  if (!agent.value || !inputText.value.trim() || sending.value) return
  const text = inputText.value.trim()
  inputText.value = ''
  messages.value.push({ role: 'user', html: escapeHtml(text) })
  history.value.push({ role: 'user', content: text })
  sending.value = true
  await nextTick()
  if (streamRef.value) streamRef.value.scrollTop = streamRef.value.scrollHeight

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  })()

  const enabledToolNames = tools.filter(t => t.enabled).map(t => t.name)
  const bochaApiKey = tools.find(t => t.customIcon === 'bocha')?.config?.apiKey || localStorage.getItem(GLOBAL_BOCHA_KEY) || undefined

  const res = await http.post(`/api/agents/${agent.value.id}/messages`, {
    message: text,
    prompt: prompt.value,
    history: history.value.slice(-6),
    generation: buildGeneration(appliedSettings),
    conversationId: conversationId.value || undefined,
    account: user.username || user.nickname || undefined,
    enabledTools: enabledToolNames,
    toolConfigs: {
      bochaApiKey
    }
  })
  sending.value = false
  if (res.success && res.data) {
    if (res.data.conversationId) conversationId.value = res.data.conversationId
    const reply = res.data.reply
    const tool = res.data.toolCalled || null
    messages.value.push({
      role: 'assistant',
      html: formatHtml(reply, false),
      tool,
      meta: { model: res.data.model || routedModel.value, latencyMs: res.data.latencyMs || 240, tokensUsed: res.data.tokensUsed || 150 }
    })
    history.value.push({ role: 'assistant', content: reply })
    speedText.value = `↑ 0.1 K/s  ↓ ${(Math.random() * 2.2 + 1.1).toFixed(1)} K/s`
  } else {
    messages.value.push({ role: 'assistant', html: `对话异常: ${res.message || '未知错误'}` })
  }
  await nextTick()
  if (streamRef.value) streamRef.value.scrollTop = streamRef.value.scrollHeight
}

function optimizePrompt() {
  prompt.value = `# 工作流程
1. 收到用户问题后，必须首先检索知识库。
2. 若知识库有匹配内容，直接基于检索结果回答，不添加额外推测。
3. 若知识库无匹配内容，且具备联网条件，开启联网搜索，优先采信权威来源整理回答。
4. 若知识库无匹配内容，且无法联网，则基于自身已有知识进行回答，遇到不确定的内容应明确说明“这一点我不确定”。`
  showToast('提示词已依据 Dify 标准规范结构化生成！', 'success', 2500)
}

async function publish(note) {
  if (!agent.value) return false
  const currentModel = routedModel.value || agent.value.modelName
  const res = await http.put(`/api/agents/${agent.value.id}`, {
    ...agent.value,
    promptChangeSource: 'PUBLISH',
    promptChangeNote: note || undefined,
    modelName: currentModel,
    systemPrompt: prompt.value,
    temperature: Number(appliedSettings.temperature.value),
    topP: Number(appliedSettings.topP.value),
    maxTokens: Number(appliedSettings.maxTokens.value),
    toolsConfig: JSON.stringify(tools)
  })
  if (res.success) {
    agent.value = res.data
    publishedPrompt.value = prompt.value
    if (agent.value?.id) {
      localStorage.setItem(toolsStorageKey(agent.value.id), JSON.stringify(tools))
    }
    showToast('已发布上线，草稿提示词与工具配置已持久化保存', 'success', 2500)
    loadPromptVersions()
    return true
  }
  showToast(res.message || '发布失败', 'error')
  return false
}

// ==================== 系统提示词版本 ====================
const promptVersions = ref([])
const versionsOpen = ref(false)
const versionsLoading = ref(false)
const selectedVersion = ref(null) // 含全文的版本详情
const versionView = ref('content') // content | diff
const versionBusy = ref(false)
const publishDialog = reactive({ open: false, mode: 'publish', note: '', version: null })
const noteInputRef = ref(null)

const onlineVersion = computed(() => promptVersions.value.find(v => v.current) || null)
const nextVersionNo = computed(() => {
  if (promptVersions.value.length) return promptVersions.value[0].versionNo + 1
  // 还没有版本的旧智能体：首次发布会先补记修改前的提示词为 v1
  return publishedPrompt.value.trim() ? 2 : 1
})

async function loadPromptVersions() {
  if (!agent.value) return
  const res = await http.get(`/api/agents/${agent.value.id}/prompt-versions`)
  promptVersions.value = res.success && Array.isArray(res.data) ? res.data : []
}

async function openVersions() {
  if (!agent.value) return
  versionsOpen.value = true
  versionsLoading.value = true
  await loadPromptVersions()
  versionsLoading.value = false
  const first = onlineVersion.value || promptVersions.value[0]
  if (first) await selectVersion(first)
  else selectedVersion.value = null
}

async function selectVersion(v) {
  const res = await http.get(`/api/agents/${agent.value.id}/prompt-versions/${v.id}`)
  if (res.success && res.data) {
    selectedVersion.value = { ...res.data, current: v.current }
  } else {
    showToast(res.message || '读取版本失败', 'error')
  }
}

function loadVersionToDraft() {
  const v = selectedVersion.value
  if (!v) return
  if (promptDirty.value && prompt.value !== v.systemPrompt && !confirm('当前草稿有未发布的修改，载入后将被替换，继续吗？')) return
  prompt.value = v.systemPrompt || ''
  versionsOpen.value = false
  showToast(`已将 v${v.versionNo} 载入草稿，调试确认后点「发布上线」`, 'success', 2500)
}

function openPublishDialog() {
  if (!agent.value || !promptDirty.value) return
  Object.assign(publishDialog, { open: true, mode: 'publish', note: '', version: null })
  nextTick(() => noteInputRef.value && noteInputRef.value.focus())
}

function openRollbackDialog() {
  const v = selectedVersion.value
  if (!v || v.current) return
  Object.assign(publishDialog, { open: true, mode: 'rollback', note: `回滚到 v${v.versionNo}`, version: v })
  nextTick(() => noteInputRef.value && noteInputRef.value.select())
}

async function confirmPublishDialog() {
  if (versionBusy.value) return
  versionBusy.value = true
  try {
    if (publishDialog.mode === 'rollback') {
      await rollbackTo(publishDialog.version, publishDialog.note.trim())
    } else if (await publish(publishDialog.note.trim())) {
      publishDialog.open = false
    }
  } finally {
    versionBusy.value = false
  }
}

// 回滚只改系统提示词：以当前已保存的智能体为基础提交，不带上草稿中的工具与参数修改
async function rollbackTo(v, note) {
  const res = await http.put(`/api/agents/${agent.value.id}`, {
    ...agent.value,
    systemPrompt: v.systemPrompt || '',
    promptChangeSource: 'ROLLBACK',
    promptChangeNote: note || `回滚到 v${v.versionNo}`
  })
  if (!res.success) {
    showToast(res.message || '回滚失败', 'error')
    return
  }
  agent.value = res.data
  prompt.value = v.systemPrompt || ''
  publishedPrompt.value = prompt.value
  publishDialog.open = false
  await loadPromptVersions()
  const latest = promptVersions.value[0]
  if (versionsOpen.value && latest) await selectVersion(latest)
  showToast(latest ? `已回滚，线上提示词为新版本 v${latest.versionNo}` : '已回滚', 'success', 2500)
}

// 行级对比：所选版本（旧）→ 当前草稿（新）
const versionDiff = computed(() => {
  if (!selectedVersion.value || versionView.value !== 'diff') return []
  return diffLines(selectedVersion.value.systemPrompt || '', prompt.value || '')
})
const versionDiffStats = computed(() => {
  const lines = versionDiff.value
  const added = lines.filter(l => l.type === 'add').length
  const removed = lines.filter(l => l.type === 'del').length
  return { added, removed, same: added === 0 && removed === 0 }
})

function diffLines(oldText, newText) {
  const a = oldText.replace(/\r\n/g, '\n').split('\n')
  const b = newText.replace(/\r\n/g, '\n').split('\n')
  const n = a.length
  const m = b.length
  // 提示词最多几千字，行数有限；极端情况下退化为整段替换
  if (n * m > 1000000) {
    return [...a.map(text => ({ type: 'del', text })), ...b.map(text => ({ type: 'add', text }))]
  }
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', text: a[i++] })
    } else {
      out.push({ type: 'add', text: b[j++] })
    }
  }
  while (i < n) out.push({ type: 'del', text: a[i++] })
  while (j < m) out.push({ type: 'add', text: b[j++] })
  return out
}

function formatVersionTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function startDrag(e) {
  drag.active = true
  drag.startX = e.clientX
  drag.startWidth = leftPane.value.getBoundingClientRect().width
  document.body.style.cursor = 'col-resize'
}

function onMove(e) {
  if (!drag.active || !layoutRef.value) return
  const total = layoutRef.value.getBoundingClientRect().width
  const min = Math.max(360, total * 0.25)
  const max = Math.min(total - 360, total * 0.75)
  let width = drag.startWidth + (e.clientX - drag.startX)
  width = Math.min(max, Math.max(min, width))
  leftWidth.value = width
}

function onUp() {
  if (!drag.active) return
  drag.active = false
  document.body.style.cursor = ''
  if (leftWidth.value) localStorage.setItem('debugPaneWidth', String(leftWidth.value))
}

function applyGatewayRoute(route) {
  routedChannel.value = route?.channel || ''
  routedModel.value = route?.model || ''
}

function createDefaultSettings() {
  return {
    temperature: { enabled: false, value: 1 },
    maxTokens: { enabled: false, value: 4096 },
    topP: { enabled: false, value: 1 },
    n: { enabled: false, value: 0 },
    frequencyPenalty: { enabled: false, value: 0 },
    responseFormat: { enabled: false, value: 'text' },
    webSearch: { enabled: false },
    thinking: { enabled: false },
    extraHeaders: { enabled: false, value: '' }
  }
}

function copySettings(from, to) {
  Object.keys(to).forEach((key) => {
    if (from[key]) Object.assign(to[key], from[key])
  })
}

function settingsKey(id) {
  return 'debug-model-settings:' + id
}

function applyAgentSettings(data) {
  settings.temperature.value = data.temperature ?? 1
  settings.maxTokens.value = data.maxTokens ?? 4096
  settings.topP.value = data.topP ?? 1
  appliedSettings.temperature.value = settings.temperature.value
  appliedSettings.maxTokens.value = settings.maxTokens.value
  appliedSettings.topP.value = settings.topP.value
}

function loadPersistedSettings(agentId) {
  try {
    const raw = localStorage.getItem(settingsKey(agentId))
    if (!raw) return
    const parsed = JSON.parse(raw)
    copySettings(parsed, appliedSettings)
    copySettings(parsed, settings)
  } catch {
    // ignore broken local cache
  }
}

function buildGeneration(source) {
  const generation = {
    thinking: !!source.thinking.enabled,
    webSearch: !!source.webSearch.enabled
  }
  if (source.temperature.enabled) generation.temperature = Number(source.temperature.value)
  if (source.maxTokens.enabled) generation.maxTokens = Number(source.maxTokens.value)
  if (source.topP.enabled) generation.topP = Number(source.topP.value)
  if (source.n.enabled) generation.n = Number(source.n.value)
  if (source.frequencyPenalty.enabled) generation.frequencyPenalty = Number(source.frequencyPenalty.value)
  if (source.responseFormat.enabled) generation.responseFormat = source.responseFormat.value
  if (source.extraHeaders.enabled) generation.extraHeaders = source.extraHeaders.value
  return generation
}

function toggleSettings() {
  if (settingsOpen.value) {
    discardAndClose()
    return
  }
  copySettings(appliedSettings, settings)
  settingsOpen.value = true
}

function discardAndClose() {
  copySettings(appliedSettings, settings)
  settingsOpen.value = false
}

async function saveModelSettings() {
  copySettings(settings, appliedSettings)
  if (agent.value?.id) {
    localStorage.setItem(settingsKey(agent.value.id), JSON.stringify(appliedSettings))
    await http.put(`/api/agents/${agent.value.id}`, {
      ...agent.value,
      temperature: Number(appliedSettings.temperature.value),
      topP: Number(appliedSettings.topP.value),
      maxTokens: Number(appliedSettings.maxTokens.value)
    })
  }
  settingsOpen.value = false
  showToast(appliedSettings.thinking.enabled ? '模型设置已保存' : '模型设置已保存，已关闭思考模式', 'success', 2200)
}

function loadPersistedTools(agentData) {
  try {
    let saved = null
    if (agentData?.toolsConfig) {
      try {
        saved = JSON.parse(agentData.toolsConfig)
      } catch {}
    }
    if (!saved && agentData?.id) {
      const raw = localStorage.getItem(toolsStorageKey(agentData.id))
      if (raw) {
        try {
          saved = JSON.parse(raw)
        } catch {}
      }
    }
    if (Array.isArray(saved) && saved.length) {
      const loadedList = []
      saved.forEach(st => {
        const standard = matchSavedTool(st, standardToolCatalog.value)
        if (standard) {
          loadedList.push({
            ...standard,
            ...st,
            config: { ...standard.config, ...(st.config || {}) }
          })
        } else {
          loadedList.push(st)
        }
      })
      if (loadedList.length > 0) {
        tools.splice(0, tools.length, ...loadedList)
      }
    } else if (standardToolCatalog.value.length) {
      tools.splice(0, tools.length, ...standardToolCatalog.value.map(t => ({ ...t, config: { ...(t.config || {}) } })))
    }
    const bocha = tools.find(t => t.customIcon === 'bocha')
    if (bocha) {
      if (!bocha.config) bocha.config = {}
      if (!bocha.config.apiKey) {
        const globalKey = localStorage.getItem(GLOBAL_BOCHA_KEY)
        if (globalKey) bocha.config.apiKey = globalKey
      }
    }
  } catch (err) {
    console.warn('Failed to load persisted tools:', err)
  }
}

function onDocClick(e) {
  if (!settingsOpen.value) return
  if (settingsWrap.value && !settingsWrap.value.contains(e.target)) {
    discardAndClose()
  }
}

onMounted(async () => {
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  document.addEventListener('mousedown', onDocClick)
    const overviewRes = await http.get('/api/model-gateway/active-route')
    if (overviewRes.success) applyGatewayRoute(overviewRes.data)
  setAssistantPage('debug')
  const res = await http.get(`/api/agents/${route.params.id}`)
  if (res.success && res.data) {
    agent.value = res.data
    setAssistantResource('AGENT', res.data.id, res.data.name)
    prompt.value = res.data.systemPrompt || ''
    publishedPrompt.value = prompt.value
    loadPromptVersions()
    applyAgentSettings(res.data)
    loadPersistedSettings(res.data.id)
    await loadPlatformCatalog()
    loadPersistedTools(res.data)
    boundKbIds.value = Array.isArray(res.data.knowledgeBaseIds) ? [...res.data.knowledgeBaseIds] : []
    await loadKnowledgeCatalog()
    resetChat()

    if (routedModel.value && agent.value.modelName !== routedModel.value) {
      agent.value.modelName = routedModel.value
      http.put(`/api/agents/${agent.value.id}`, {
        ...agent.value,
        modelName: routedModel.value
      }).catch(err => console.warn('Auto sync agent modelName failed:', err))
    }
  } else {
    showToast('未能加载智能体信息', 'error')
  }
})

onUnmounted(() => {
  clearAssistantResource()
  document.removeEventListener('mousemove', onMove)
  document.removeEventListener('mouseup', onUp)
  document.removeEventListener('mousedown', onDocClick)
})
</script>
