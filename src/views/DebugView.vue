<template>
  <div class="debug-page">
    <header class="debug-header">
      <div class="debug-header-left">
        <router-link to="/dashboard?tab=agents" class="btn-back-nav">
          <i class="fa-solid fa-arrow-left"></i>
          <span>返回智能体列表</span>
        </router-link>
        <div class="header-agent-badge">
          <h2 class="header-agent-title">
            <span>{{ agent ? `${agent.avatar || '🤖'} ${agent.name}` : '智能体加载中...' }}</span>
            <span v-if="pageTab === 'orchestrate'" class="header-tag-pill" :class="promptDirty ? 'draft' : 'published'">
              {{ promptDirty ? '未发布' : '已发布' }}
            </span>
          </h2>
          <div class="debug-tabs">
            <button type="button" class="debug-tab" :class="{ active: pageTab === 'orchestrate' }" @click="pageTab = 'orchestrate'">编排</button>
            <button type="button" class="debug-tab" :class="{ active: pageTab === 'logs' }" @click="pageTab = 'logs'">日志</button>
            <button type="button" class="debug-tab" :class="{ active: pageTab === 'monitor' }" @click="pageTab = 'monitor'">监测</button>
          </div>
        </div>
      </div>
      <div class="debug-header-right">
        <button class="btn-theme-toggle" @click="toggleTheme">
          <i :class="theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'" :style="{ color: theme === 'light' ? '#f59e0b' : '#9ca3af' }"></i>
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
                <input v-model="settings.extraHeaders.value" class="ms-text" type="text" placeholder="额外请求头, Json字符串格式">
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
          @click="publish"
        >
          <span>发布上线</span>
        </button>
      </div>
    </header>

    <main v-show="pageTab === 'orchestrate'" class="debug-main-layout" ref="layoutRef">
      <section class="orchestration-pane" ref="leftPane" :style="leftWidth ? { width: leftWidth + 'px' } : {}">
        <div class="config-card-section prompt-editor-card">
          <div class="section-header-row">
            <div class="section-title"><span>系统提示词（草稿）</span></div>
            <button class="btn-section-action" @click="optimizePrompt"><i class="fa-solid fa-wand-magic-sparkles"></i><span>生成</span></button>
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
          <div class="section-header-row"><div class="section-title"><span>知识库</span></div></div>
          <div class="knowledge-item-card">
            <div class="knowledge-meta"><i class="fa-solid fa-book" style="color: #ec4899;"></i><span>ShiMeta数字标牌V7.0.0使用手册.pdf</span></div>
            <span class="knowledge-badge">高质量 · 混合检索</span>
          </div>
        </div>
        <div class="config-card-section">
          <div class="section-header-row">
            <div class="section-title">
              <span>工具</span>
              <i class="fa-regular fa-circle-question section-title-help" title="智能体可调用的扩展工具与插件，支持大模型自主决策调用"></i>
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
              :key="tool.name"
              class="tool-item-card"
              :class="{ 'tool-disabled': !tool.enabled }"
            >
              <div class="tool-left">
                <div class="tool-icon" :class="tool.iconClass">
                  <template v-if="tool.customIcon === 'bocha'">
                    <svg class="bocha-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z" fill="#0284c7"/>
                      <circle cx="12" cy="12" r="3.2" fill="#38bdf8"/>
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
                    @change="showToast(`工具 [${tool.prefix} ${tool.title}] 已${tool.enabled ? '启用' : '禁用'}`, 'info', 1500)"
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
          <div v-if="!messages.length && !sending" class="chat-empty">在下方输入内容开始调试</div>
          <div v-for="(msg, i) in messages" :key="i" class="chat-msg-row" :class="msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-bot'">
            <div class="msg-avatar" :class="msg.role === 'user' ? 'msg-avatar-user' : 'msg-avatar-bot'">
              <i v-if="msg.role === 'user'" class="fa-regular fa-user"></i>
              <template v-else>{{ agent?.avatar || '🤖' }}</template>
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
            <div class="msg-avatar msg-avatar-bot">{{ agent?.avatar || '🤖' }}</div>
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
          <div class="bottom-statusbar">
            <div class="status-left-tag"><i class="fa-solid fa-quote-left"></i><span style="color: var(--text-secondary);">功能已开启</span></div>
            <div class="speed-meter-pill"><span>{{ speedText }}</span></div>
          </div>
        </div>
      </section>
    </main>

    <AgentLogsPanel v-if="pageTab === 'logs' && agent" :agent-id="agent.id" />
    <AgentMonitorPanel v-if="pageTab === 'monitor' && agent" :agent-id="agent.id" />

    <!-- Tool Settings Modal -->
    <div v-if="toolSettingsModalOpen" class="tool-modal-backdrop" @click.self="toolSettingsModalOpen = false">
      <div class="tool-modal-dialog">
        <div class="tool-modal-header">
          <div class="tool-modal-title">
            <div class="tool-icon" :class="editingTool?.iconClass">
              <template v-if="editingTool?.customIcon === 'bocha'">
                <svg class="bocha-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z" fill="#0284c7"/>
                  <circle cx="12" cy="12" r="3.2" fill="#38bdf8"/>
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
                  <span class="label-sub">(选填，留空使用内置系统 Key)</span>
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
                    placeholder="sk-********************************"
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
                  title="向 Bocha 接口发送连通性探测请求"
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
            <span>添加智能体扩展工具</span>
          </div>
          <button type="button" class="btn-modal-close" @click="addToolModalOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="tool-modal-body">
          <div v-if="removedTools.length" class="tool-catalog-section">
            <h4 class="catalog-section-title">已移除的工具</h4>
            <div class="tool-catalog-list">
              <div v-for="rTool in removedTools" :key="rTool.name" class="catalog-item-card">
                <div class="catalog-item-left">
                  <div class="tool-icon" :class="rTool.iconClass">
                    <template v-if="rTool.customIcon === 'bocha'">
                      <svg class="bocha-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z" fill="#0284c7"/>
                        <circle cx="12" cy="12" r="3.2" fill="#38bdf8"/>
                      </svg>
                    </template>
                    <i v-else :class="rTool.icon"></i>
                  </div>
                  <div>
                    <div class="tool-info-text">
                      <span class="tool-prefix">{{ rTool.prefix }}</span>
                      <span class="tool-title">{{ rTool.title }}</span>
                    </div>
                    <div class="catalog-item-desc">{{ rTool.description }}</div>
                  </div>
                </div>
                <button type="button" class="btn-catalog-add" @click="addToolFromCatalog(rTool)">
                  <i class="fa-solid fa-rotate-left"></i> 恢复
                </button>
              </div>
            </div>
          </div>

          <div class="tool-catalog-section">
            <h4 class="catalog-section-title">可用扩展插件与工具库</h4>
            <div class="tool-catalog-list">
              <div v-for="catTool in availableCatalog" :key="catTool.name" class="catalog-item-card">
                <div class="catalog-item-left">
                  <div class="tool-icon" :class="catTool.iconClass">
                    <i :class="catTool.icon"></i>
                  </div>
                  <div>
                    <div class="tool-info-text">
                      <span class="tool-prefix">{{ catTool.prefix }}</span>
                      <span class="tool-title">{{ catTool.title }}</span>
                    </div>
                    <div class="catalog-item-desc">{{ catTool.description }}</div>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn-catalog-add"
                  :disabled="tools.some(t => t.name === catTool.name)"
                  @click="addToolFromCatalog(catTool)"
                >
                  <i :class="tools.some(t => t.name === catTool.name) ? 'fa-solid fa-check' : 'fa-solid fa-plus'"></i>
                  {{ tools.some(t => t.name === catTool.name) ? '已添加' : '添加' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="tool-modal-footer">
          <span></span>
          <button type="button" class="btn-modal-cancel" @click="addToolModalOpen = false">完成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'
import AgentLogsPanel from '../components/AgentLogsPanel.vue'
import AgentMonitorPanel from '../components/AgentMonitorPanel.vue'

const route = useRoute()
const { showToast } = useToast()
const inputVar = '{{input}}'
const timeVar = '{{system_time}}'
const pageTab = ref('orchestrate')
const agent = ref(null)
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

const tools = reactive([
  {
    name: '时区转换',
    prefix: 'time',
    title: '时区转换',
    icon: 'fa-solid fa-clock',
    iconClass: 'icon-orange',
    help: '将指定时间在不同时区（如北京、纽约、伦敦等）之间进行转换计算',
    enabled: true,
    description: '将指定时间在不同时区之间进行换算转换。例如将北京时间转换为纽约时间、东京时间或伦敦时间。'
  },
  {
    name: '时间戳转换',
    prefix: 'time',
    title: '时间戳转换',
    icon: 'fa-solid fa-clock',
    iconClass: 'icon-orange',
    help: '毫秒级/秒级 Unix 时间戳与标准日期时间字符串相互转换',
    enabled: true,
    description: 'Unix时间戳与格式化时间字符串之间的相互转换。可将秒级/毫秒级时间戳转为日期时间，或将日期时间转为时间戳。'
  },
  {
    name: '获取当前时间',
    prefix: 'time',
    title: '获取当前时间',
    icon: 'fa-solid fa-clock',
    iconClass: 'icon-orange',
    help: '获取当前系统的精确年月日、时分秒与时区时间',
    enabled: true,
    description: '获取指定时区的当前精确日期和时间（包含年月日、时分秒以及星期几）。当用户询问当前时间、现在几点、今天几号等问题时调用。'
  },
  {
    name: '获取时间戳',
    prefix: 'time',
    title: '获取时间戳',
    icon: 'fa-solid fa-clock',
    iconClass: 'icon-orange',
    help: '计算日期偏移与两个日期相隔天数',
    enabled: true,
    description: '计算两个日期之间相隔的天数，或者计算基准日期增加/减少若干天后的新日期。'
  },
  {
    name: '星期几计算器',
    prefix: 'time',
    title: '星期几计算器',
    icon: 'fa-solid fa-calendar-days',
    iconClass: 'icon-orange',
    help: '计算历史上或未来的任意特定日期属于星期几',
    enabled: true,
    description: '计算历史上或未来的某个具体日期是星期几。当用户询问某一天是周几或星期几时调用。'
  },
  {
    name: '联网检索',
    prefix: 'bocha',
    title: 'Bocha Web Search',
    customIcon: 'bocha',
    iconClass: 'icon-bocha-badge',
    help: '博查 AI 搜索引擎，提供全网实时网页、新闻与知识检索',
    enabled: true,
    description: '联网检索博查搜索引擎，获取最新互联网信息与知识。'
  }
])

const enabledToolsCount = computed(() => tools.filter(t => t.enabled).length)
const removedTools = ref([])

const toolSettingsModalOpen = ref(false)
const editingTool = ref(null)
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
      apiKey: editingToolConfig.apiKey ? editingToolConfig.apiKey.trim() : undefined
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
  if (tool.customIcon === 'bocha' && !currentKey) {
    currentKey = localStorage.getItem(GLOBAL_BOCHA_KEY) || ''
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

    // 1. If Bocha key filled, persist globally to localStorage
    if (editingTool.value.customIcon === 'bocha' && editingToolConfig.apiKey) {
      localStorage.setItem(GLOBAL_BOCHA_KEY, editingToolConfig.apiKey.trim())
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
  } else {
    editingToolConfig.timezone = 'Asia/Shanghai'
    editingToolConfig.format = 'yyyy-MM-dd HH:mm:ss'
  }
  editingToolConfig.description = editingTool.value?.description || ''
  showToast('已恢复默认配置', 'info', 1500)
}

function deleteTool(tool) {
  const idx = tools.findIndex(t => t.name === tool.name)
  if (idx !== -1) {
    removedTools.value.push({ ...tools[idx] })
    tools.splice(idx, 1)
    showToast(`已移除工具 [${tool.prefix} ${tool.title}]，可在「+ 添加」中恢复`, 'info', 2500)
  }
}

const addToolModalOpen = ref(false)
const availableCatalog = ref([
  {
    name: 'Python代码沙箱',
    prefix: 'python',
    title: 'Code Interpreter',
    icon: 'fa-brands fa-python',
    iconClass: 'icon-blue-tool',
    help: '安全执行 Python 3.11 代码计算与数据分析',
    enabled: true,
    description: '在安全隔离沙箱中执行 Python 代码脚本，用于复杂数学计算、数据处理与算法验证。'
  },
  {
    name: '实时天气查询',
    prefix: 'weather',
    title: 'Weather Query',
    icon: 'fa-solid fa-cloud-sun',
    iconClass: 'icon-orange',
    help: '获取全球各大城市的实时天气预报与空气质量',
    enabled: true,
    description: '查询指定城市的实时天气状况、气温、湿度、风向与多日天气预测。'
  },
  {
    name: '精确数学计算器',
    prefix: 'math',
    title: 'Calculator',
    icon: 'fa-solid fa-calculator',
    iconClass: 'icon-purple-tool',
    help: '支持高精度复杂数学公式计算与统计分析',
    enabled: true,
    description: '执行高精度四则运算、三角函数、微积分与统计学公式运算。'
  },
  {
    name: '业务数据库查询',
    prefix: 'db',
    title: 'Database Query',
    icon: 'fa-solid fa-database',
    iconClass: 'icon-emerald-tool',
    help: '安全只读查询业务数据库并生成分析数据',
    enabled: true,
    description: '执行只读 SQL 查询，分析数据库中的表结构、统计业务指标并支持图表可视化。'
  }
])

function openAddToolModal() {
  addToolModalOpen.value = true
}

function addToolFromCatalog(toolItem) {
  if (tools.some(t => t.name === toolItem.name)) {
    showToast(`工具 [${toolItem.title}] 已经存在`, 'warning', 2000)
    return
  }
  tools.push({
    ...toolItem,
    enabled: true
  })
  const rIdx = removedTools.value.findIndex(t => t.name === toolItem.name)
  if (rIdx !== -1) {
    removedTools.value.splice(rIdx, 1)
  }
  showToast(`已成功添加工具 [${toolItem.prefix} ${toolItem.title}]`, 'success', 2000)
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatHtml(content, isUser) {
  let html = escapeHtml(content)
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

async function publish() {
  if (!agent.value) return
  const res = await http.put(`/api/agents/${agent.value.id}`, {
    ...agent.value,
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
  } else {
    showToast(res.message || '发布失败', 'error')
  }
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

function applyGatewayRoute(overview) {
  const providers = overview?.providers || []
  const policy = overview?.policy || {}
  const ready = providers.filter((p) => p.enabled && p.configured)
  const defaultId = policy.defaultProviderId || ''
  const primary = ready.find((p) => p.id === defaultId) || ready[0]
  routedChannel.value = primary?.name || ''
  routedModel.value = primary?.defaultModel || ''
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
      saved.forEach(st => {
        const target = tools.find(t => t.name === st.name)
        if (target) {
          if (st.enabled !== undefined) target.enabled = st.enabled
          if (st.config) target.config = { ...st.config }
          if (st.description) target.description = st.description
        }
      })
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
  const overviewRes = await http.get('/api/model-gateway')
  if (overviewRes.success) applyGatewayRoute(overviewRes.data)
  const res = await http.get(`/api/agents/${route.params.id}`)
  if (res.success && res.data) {
    agent.value = res.data
    prompt.value = res.data.systemPrompt || ''
    publishedPrompt.value = prompt.value
    applyAgentSettings(res.data)
    loadPersistedSettings(res.data.id)
    loadPersistedTools(res.data)
    resetChat()
  } else {
    showToast('未能加载智能体信息', 'error')
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMove)
  document.removeEventListener('mouseup', onUp)
  document.removeEventListener('mousedown', onDocClick)
})
</script>
