<template>
  <div class="tools-mgmt-page">
    <div class="tools-mgmt-header">
      <div class="tools-mgmt-heading">
        <h2>工具管理</h2>
        <span class="tools-count">{{ allTools.length || pageResult.total || 0 }}</span>
      </div>
      <div class="tools-mgmt-header-right">
        <div class="tools-meta-line">
          <span>已启用 {{ enabledCount }}</span>
          <span class="tools-meta-sep"></span>
          <span>自定义 {{ customCount }}</span>
          <span class="tools-meta-sep"></span>
          <span :class="bochaReady ? 'ok' : ''">联网 {{ bochaReady ? '已配' : '待配' }}</span>
        </div>
        <button
          v-if="canManage"
          type="button"
          class="btn-create-agent btn-tool-add"
          @click="openCreate"
        >
          <i class="fa-solid fa-plus"></i>
          <span>添加工具</span>
        </button>
      </div>
    </div>

    <div class="tools-settings-bar">
      <div class="tools-setting-item">
        <label class="tools-setting-label" for="max-tool-rounds">单次回答最多调用工具轮数</label>
        <select
          id="max-tool-rounds"
          v-model.number="maxToolRounds"
          class="tools-setting-select"
          :disabled="!isSuperAdmin || savingRounds"
          :title="isSuperAdmin ? '' : '仅超级管理员可修改'"
          @change="saveMaxToolRounds"
        >
          <option v-for="n in roundOptions" :key="n" :value="n">{{ n }} 轮{{ n === defaultRounds ? '（默认）' : '' }}</option>
        </select>
        <span class="tools-setting-hint">
          只限制模型回答<b>一个问题</b>时反复调用工具，不限制提问次数；到上限后模型会根据已查到的资料直接作答。
        </span>
      </div>
      <div class="tools-usage-total" title="本月全部工具的成功调用次数与预估费用（按各工具单价计算）">
        <i class="fa-solid fa-chart-column"></i>
        本月调用 <b>{{ monthTotalCalls }}</b> 次 · 预估 <b>¥{{ monthTotalCost }}</b>
      </div>
    </div>

    <div class="tools-mgmt-toolbar">
      <div class="tools-search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input
          v-model="keyword"
          type="search"
          autocomplete="off"
          placeholder="搜索名称或描述"
        >
      </div>
      <div class="tools-filter-pills">
        <button
          v-for="chip in categoryChips"
          :key="chip.id"
          type="button"
          class="btn-filter-pill"
          :class="{ active: category === chip.id }"
          @click="category = chip.id"
        >{{ chip.label }}</button>
      </div>
      <div class="tools-toolbar-end">
        <div class="view-mode-group" title="切换列表/卡片显示">
          <button type="button" class="btn-view-mode" :class="{ active: viewMode === 'card' }" @click="setViewMode('card')">
            <i class="fa-solid fa-table-cells-large"></i>
          </button>
          <button type="button" class="btn-view-mode" :class="{ active: viewMode === 'list' }" @click="setViewMode('list')">
            <i class="fa-solid fa-list-ul"></i>
          </button>
        </div>
        <button type="button" class="btn-refresh" :disabled="loading" title="刷新" @click="reloadAll">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
        </button>
      </div>
    </div>

    <div v-if="loading && !tools.length" class="tools-mgmt-empty">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      <span>正在加载平台工具…</span>
    </div>
    <div v-else-if="!tools.length" class="tools-mgmt-empty">
      <i class="fa-solid fa-toolbox"></i>
      <span>没有匹配的工具</span>
    </div>
    <div v-else-if="viewMode === 'card'" class="tools-mgmt-grid">
      <article
        v-for="tool in tools"
        :key="tool.id"
        class="tools-mgmt-card"
        :class="{ disabled: !tool.enabled }"
        @click="canManage && openEditor(tool)"
      >
        <div class="tools-mgmt-card-top">
          <ToolGlyph :icon="tool.icon" :icon-class="tool.iconClass" :custom-icon="tool.customIcon" />
          <div class="tools-mgmt-card-heading">
            <div class="tools-mgmt-title-row">
              <h4>{{ tool.title }}</h4>
              <span class="tools-prefix-badge">{{ tool.prefix }}</span>
            </div>
            <p class="tools-mgmt-help">{{ tool.help || tool.description }}</p>
          </div>
        </div>
        <div class="tools-mgmt-preview">{{ configPreview(tool) }}</div>
        <button type="button" class="tools-usage-line" title="查看调用统计" @click.stop="openUsage(tool)">
          <i class="fa-solid fa-chart-simple"></i>
          <span>本月 <b>{{ usageOf(tool).month }}</b> 次</span>
          <span class="tools-usage-sep"></span>
          <span>今日 {{ usageOf(tool).today }}</span>
          <template v-if="Number(tool.unitPrice) > 0">
            <span class="tools-usage-sep"></span>
            <span>预估 ¥{{ formatMoney(usageOf(tool).monthCost) }}</span>
          </template>
          <i class="fa-solid fa-chevron-right tools-usage-more"></i>
        </button>
        <div class="tools-mgmt-card-foot">
          <div class="tools-mgmt-tags">
            <span class="tools-cat-tag">{{ categoryLabel(tool.category) }}</span>
            <span v-if="tool.builtin" class="tools-cat-tag muted">内置</span>
            <span v-if="isBocha(tool)" class="tools-cat-tag" :class="tool.hasApiKey ? 'ok' : 'warn'">
              {{ tool.hasApiKey ? '已配 Key' : '待配 Key' }}
            </span>
          </div>
          <div class="tools-mgmt-actions" @click.stop>
            <label class="switch" :title="canManage ? (tool.enabled ? '停用后调试页将不可选' : '启用后所有智能体可选') : '只读'">
              <input
                type="checkbox"
                :checked="tool.enabled"
                :disabled="!canManage || toggling === tool.id"
                @change="toggleEnabled(tool, $event.target.checked)"
              >
              <span class="slider-toggle"></span>
            </label>
            <button
              v-if="!tool.builtin"
              type="button"
              class="btn-tool-icon-danger"
              :disabled="!canManage || deleting === tool.id"
              title="删除自定义工具"
              @click="removeTool(tool)"
            >
              <i class="fa-regular fa-trash-can"></i>
            </button>
            <button
              type="button"
              class="btn-create-agent btn-tool-config"
              :disabled="!canManage"
              @click="openEditor(tool)"
            >
              <i class="fa-solid fa-sliders"></i>
              <span>配置</span>
            </button>
          </div>
        </div>
      </article>
    </div>
    <div v-else class="table-view-card gateway-table-card">
      <table class="agent-table">
        <thead>
          <tr>
            <th style="min-width: 220px;">工具</th>
            <th style="min-width: 100px;">分类</th>
            <th style="min-width: 220px;">当前配置</th>
            <th style="min-width: 130px;">本月调用</th>
            <th style="min-width: 90px;">状态</th>
            <th style="min-width: 200px; text-align:right;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tool in tools" :key="tool.id" :class="{ 'row-disabled': !tool.enabled }">
            <td>
              <div class="table-agent-meta">
                <ToolGlyph :icon="tool.icon" :icon-class="tool.iconClass" :custom-icon="tool.customIcon" />
                <div>
                  <div class="table-agent-title">{{ tool.title }}</div>
                  <div class="table-agent-code">{{ tool.prefix }} · {{ tool.help }}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="tools-cat-tag">{{ categoryLabel(tool.category) }}</span>
            </td>
            <td>
              <span class="tools-mgmt-preview">{{ configPreview(tool) }}</span>
            </td>
            <td>
              <button type="button" class="tools-usage-link" title="查看调用统计" @click="openUsage(tool)">
                {{ usageOf(tool).month }} 次<template v-if="Number(tool.unitPrice) > 0"> · ¥{{ formatMoney(usageOf(tool).monthCost) }}</template>
              </button>
            </td>
            <td>
              <div class="badge-status" :class="tool.enabled ? 'badge-success' : 'badge-warning'">
                <span class="status-dot"></span>
                <span>{{ tool.enabled ? '已启用' : '已停用' }}</span>
              </div>
            </td>
            <td style="text-align:right;">
              <div class="agent-actions" style="justify-content:flex-end;">
                <label class="switch" :title="canManage ? (tool.enabled ? '停用' : '启用') : '只读'">
                  <input
                    type="checkbox"
                    :checked="tool.enabled"
                    :disabled="!canManage || toggling === tool.id"
                    @change="toggleEnabled(tool, $event.target.checked)"
                  >
                  <span class="slider-toggle"></span>
                </label>
                <button
                  v-if="!tool.builtin"
                  type="button"
                  class="btn-tool-icon-danger"
                  :disabled="!canManage || deleting === tool.id"
                  title="删除"
                  @click="removeTool(tool)"
                >
                  <i class="fa-regular fa-trash-can"></i>
                </button>
                <button
                  type="button"
                  class="btn-create-agent btn-tool-config"
                  :disabled="!canManage"
                  @click="openEditor(tool)"
                >
                  <i class="fa-solid fa-sliders"></i>
                  <span>配置</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <section v-if="pageResult.total > 0" class="pagination-container">
      <div class="page-summary">
        共 {{ pageResult.total || 0 }} 个工具 · 第 {{ page }} / {{ totalPages }} 页
        <select v-model.number="pageSize" class="status-select tools-page-size" @change="onPageSizeChange">
          <option :value="6">6 条/页</option>
          <option :value="12">12 条/页</option>
          <option :value="24">24 条/页</option>
        </select>
      </div>
      <div class="pagination-controls">
        <button type="button" class="btn-page" :disabled="page <= 1" @click="changePage(-1)">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <button
          v-for="n in totalPages"
          :key="n"
          type="button"
          class="btn-page"
          :class="{ active: n === page }"
          @click="goPage(n)"
        >{{ n }}</button>
        <button type="button" class="btn-page" :disabled="page >= totalPages" @click="changePage(1)">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </section>

    <div v-if="usageOpen" class="tool-modal-backdrop" @click.self="usageOpen = false">
      <div class="tool-modal-dialog tools-usage-dialog">
        <div class="tool-modal-header">
          <div class="tool-modal-title">
            <ToolGlyph :icon="usageTool?.icon" :icon-class="usageTool?.iconClass" :custom-icon="usageTool?.customIcon" />
            <span>调用统计 · {{ usageTool?.title }}</span>
          </div>
          <button type="button" class="btn-modal-close" @click="usageOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="tool-modal-body">
          <div v-if="usageLoading" class="tools-mgmt-empty"><i class="fa-solid fa-circle-notch fa-spin"></i><span>加载中…</span></div>
          <template v-else-if="usageDetail">
            <div class="usage-stat-grid">
              <div class="usage-stat"><span>今日</span><b>{{ usageDetail.today }}</b></div>
              <div class="usage-stat"><span>本月</span><b>{{ usageDetail.month }}</b></div>
              <div class="usage-stat"><span>累计</span><b>{{ usageDetail.total }}</b></div>
              <div class="usage-stat"><span>本月成功率</span><b>{{ formatRate(usageDetail.monthSuccessRate) }}</b></div>
              <div class="usage-stat"><span>平均耗时</span><b>{{ usageDetail.monthAvgLatencyMs == null ? '—' : usageDetail.monthAvgLatencyMs + ' ms' }}</b></div>
              <div class="usage-stat">
                <span>本月预估费用</span>
                <b>¥{{ formatMoney(usageDetail.monthCost) }}</b>
                <small>单价 {{ Number(usageDetail.unitPrice) > 0 ? '¥' + Number(usageDetail.unitPrice) + '/次' : '未设置' }}</small>
              </div>
            </div>

            <div class="usage-section-title">近 14 天每日调用</div>
            <div class="usage-bars">
              <div v-for="d in usageDetail.daily" :key="d.date" class="usage-bar-col" :title="`${d.date}：${d.calls} 次`">
                <div class="usage-bar-track">
                  <div class="usage-bar-fill" :style="{ height: barHeight(d.calls) }"></div>
                </div>
                <span class="usage-bar-label">{{ d.date.slice(5) }}</span>
              </div>
            </div>

            <div class="usage-section-title">本月按智能体</div>
            <div v-if="!usageDetail.byAgent.length" class="usage-empty">本月还没有调用</div>
            <table v-else class="usage-agent-table">
              <thead><tr><th>智能体</th><th>调用</th><th>失败</th><th>预估费用</th></tr></thead>
              <tbody>
                <tr v-for="row in usageDetail.byAgent" :key="row.agentId">
                  <td>{{ row.agentName }}</td>
                  <td>{{ row.calls }}</td>
                  <td :class="{ 'usage-fail': row.failures > 0 }">{{ row.failures }}</td>
                  <td>¥{{ formatMoney(row.cost) }}</td>
                </tr>
              </tbody>
            </table>
            <p class="usage-note">失败的调用（如 Key 无效、余额不足、网络异常）一般不计费，预估费用只按成功次数计算。</p>
          </template>
        </div>
      </div>
    </div>

    <div v-if="editorOpen" class="tool-modal-backdrop" @click.self="editorOpen = false">
      <div class="tool-modal-dialog">
        <div class="tool-modal-header">
          <div class="tool-modal-title">
            <ToolGlyph :icon="editing?.icon || 'fa-solid fa-plug'" :icon-class="editing?.iconClass || 'icon-orange'" :custom-icon="editing?.customIcon" />
            <span>{{ creating ? '添加自定义 HTTP 工具' : `配置工具 · ${editing?.prefix} ${editing?.title}` }}</span>
          </div>
          <button type="button" class="btn-modal-close" @click="editorOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="tool-modal-body">
          <p class="tools-mgmt-editor-tip">{{ editorTip }}</p>
          <template v-if="creating || isHttp(editing)">
            <div class="tool-form-group">
              <label class="tool-form-label"><span>工具名称</span></label>
              <input v-model="form.name" class="tool-form-input" maxlength="40" placeholder="例如：订单查询、CRM 检索">
            </div>
            <div class="tool-form-group">
              <label class="tool-form-label"><span>请求方法</span></label>
              <select v-model="form.method" class="tool-form-select">
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>
            </div>
            <div class="tool-form-group">
              <label class="tool-form-label"><span>HTTP 接口地址</span></label>
              <input v-model="form.url" class="tool-form-input" placeholder="https://api.example.com/tools/query">
            </div>
            <div class="tool-form-group">
              <label class="tool-form-label">
                <span>超时秒数</span>
                <span class="label-sub">({{ form.timeoutSeconds }} 秒)</span>
              </label>
              <div class="tool-range-row">
                <input v-model.number="form.timeoutSeconds" type="range" min="3" max="30" class="tool-range-slider">
                <input v-model.number="form.timeoutSeconds" type="number" min="3" max="30" class="tool-form-input tool-range-num">
              </div>
            </div>
            <div class="tool-form-group">
              <div class="tool-label-row">
                <label class="tool-form-label">
                  <span>接口鉴权 Key</span>
                  <span v-if="editing?.hasApiKey" class="badge-saved-encrypted">
                    <i class="fa-solid fa-shield-halved"></i> 已加密保存
                  </span>
                  <span v-else class="label-sub">可选，将以 Bearer 发送</span>
                </label>
              </div>
              <div class="tool-key-input-row">
                <div class="tool-input-wrapper">
                  <input
                    v-model="form.apiKey"
                    class="tool-form-input tool-key-input"
                    :type="showApiKey ? 'text' : 'password'"
                    autocomplete="new-password"
                    :placeholder="editing?.hasApiKey ? '已保存（留空不改）' : '可选'"
                    @input="testResult = null"
                  >
                  <button type="button" class="btn-key-eye" @click="showApiKey = !showApiKey">
                    <i :class="showApiKey ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
                  </button>
                </div>
                <button v-if="!creating" type="button" class="btn-tool-test" :disabled="testing" @click="testConnection">
                  <i :class="testing ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-bolt'"></i>
                  <span>{{ testing ? '测试中...' : '测试连接' }}</span>
                </button>
              </div>
              <div
                v-if="testResult"
                class="tool-test-banner"
                :class="testResult.success ? 'test-banner-success' : 'test-banner-error'"
              >
                <div class="test-banner-left">
                  <i :class="testResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
                  <div class="test-banner-text">
                    <div class="test-banner-msg">{{ testResult.message }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <template v-else-if="isDeepSeek(editing)">
            <div class="tool-form-group">
              <div class="tool-label-row">
                <label class="tool-form-label">
                  <span>DeepSeek API Key</span>
                  <span v-if="editing.hasApiKey" class="badge-saved-encrypted">
                    <i class="fa-solid fa-shield-halved"></i> 已单独保存
                  </span>
                  <span v-else class="label-sub">选填：不填则使用「模型网关」中 DeepSeek 通道的 Key</span>
                </label>
              </div>
              <div class="tool-key-input-row">
                <div class="tool-input-wrapper">
                  <input
                    v-model="form.apiKey"
                    class="tool-form-input tool-key-input"
                    :type="showApiKey ? 'text' : 'password'"
                    autocomplete="new-password"
                    :placeholder="editing.hasApiKey ? '已保存（留空不改；输入新 Key 则覆盖）' : '留空即可，自动使用模型网关的 DeepSeek Key'"
                    @input="testResult = null"
                  >
                  <button type="button" class="btn-key-eye" @click="showApiKey = !showApiKey">
                    <i :class="showApiKey ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
                  </button>
                </div>
                <button type="button" class="btn-tool-test" :disabled="testing" @click="testConnection">
                  <i :class="testing ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-bolt'"></i>
                  <span>{{ testing ? '测试中...' : '测试连接' }}</span>
                </button>
              </div>
              <div
                v-if="testResult"
                class="tool-test-banner"
                :class="testResult.success ? 'test-banner-success' : 'test-banner-error'"
              >
                <div class="test-banner-left">
                  <i :class="testResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
                  <div class="test-banner-text">
                    <div class="test-banner-msg">{{ testResult.message }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="tool-form-group">
              <label class="tool-form-label">
                <span>最大检索结果数</span>
                <span class="label-sub">({{ form.count }} 条；条数越多，交给模型的内容越长、Token 越多)</span>
              </label>
              <div class="tool-range-row">
                <input v-model.number="form.count" type="range" min="1" max="10" class="tool-range-slider">
                <input v-model.number="form.count" type="number" min="1" max="10" class="tool-form-input tool-range-num">
              </div>
            </div>
          </template>
          <template v-else-if="isBocha(editing)">
            <div class="tool-form-group">
              <div class="tool-label-row">
                <label class="tool-form-label">
                  <span>博查 API Key</span>
                  <span v-if="editing.hasApiKey" class="badge-saved-encrypted">
                    <i class="fa-solid fa-shield-halved"></i> 平台已加密保存
                  </span>
                  <span v-else class="label-sub">所有智能体共用</span>
                </label>
              </div>
              <div class="tool-key-input-row">
                <div class="tool-input-wrapper">
                  <input
                    v-model="form.apiKey"
                    class="tool-form-input tool-key-input"
                    :type="showApiKey ? 'text' : 'password'"
                    autocomplete="new-password"
                    :placeholder="editing.hasApiKey ? '已保存（留空不改；输入新 Key 则覆盖）' : 'sk-********************************'"
                    @input="testResult = null"
                  >
                  <button type="button" class="btn-key-eye" @click="showApiKey = !showApiKey">
                    <i :class="showApiKey ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
                  </button>
                </div>
                <button type="button" class="btn-tool-test" :disabled="testing" @click="testConnection">
                  <i :class="testing ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-bolt'"></i>
                  <span>{{ testing ? '测试中...' : '测试连接' }}</span>
                </button>
              </div>
              <div
                v-if="testResult"
                class="tool-test-banner"
                :class="testResult.success ? 'test-banner-success' : 'test-banner-error'"
              >
                <div class="test-banner-left">
                  <i :class="testResult.success ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
                  <div class="test-banner-text">
                    <div class="test-banner-msg">{{ testResult.message }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="tool-form-group">
              <label class="tool-form-label">
                <span>最大检索结果数</span>
                <span class="label-sub">({{ form.count }} 条)</span>
              </label>
              <div class="tool-range-row">
                <input v-model.number="form.count" type="range" min="1" max="10" class="tool-range-slider">
                <input v-model.number="form.count" type="number" min="1" max="10" class="tool-form-input tool-range-num">
              </div>
            </div>
            <div class="tool-form-group">
              <label class="tool-form-label"><span>搜索时效性范围</span></label>
              <select v-model="form.freshness" class="tool-form-select">
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
                <input v-model="form.summary" type="checkbox">
                <span class="slider-toggle"></span>
              </label>
            </div>
          </template>
          <template v-else>
            <div class="tool-form-group">
              <label class="tool-form-label"><span>基准时区</span></label>
              <select v-model="form.timezone" class="tool-form-select">
                <option value="Asia/Shanghai">Asia/Shanghai (北京时间 GMT+8)</option>
                <option value="UTC">UTC (协调世界时)</option>
                <option value="America/New_York">America/New_York (美东时间)</option>
                <option value="Europe/London">Europe/London (伦敦时间)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (东京时间 GMT+9)</option>
              </select>
            </div>
            <div class="tool-form-group">
              <label class="tool-form-label"><span>默认时间格式</span></label>
              <select v-model="form.format" class="tool-form-select">
                <option value="yyyy-MM-dd HH:mm:ss">yyyy-MM-dd HH:mm:ss</option>
                <option value="yyyy年MM月dd日 HH:mm:ss">yyyy年MM月dd日 HH:mm:ss</option>
                <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                <option value="ISO-8601">ISO-8601 标准格式</option>
              </select>
            </div>
          </template>
          <div class="tool-form-group">
            <label class="tool-form-label">
              <span>单价（元/次）</span>
              <span class="label-sub">用于估算费用；免费或自研工具填 0</span>
            </label>
            <input v-model="form.unitPrice" type="number" min="0" step="0.001" class="tool-form-input" placeholder="0">
          </div>
          <div class="tool-form-group">
            <label class="tool-form-label">
              <span>工具提示词描述</span>
              <span class="label-sub">指引模型何时调用本工具</span>
            </label>
            <textarea v-model="form.description" class="tool-form-textarea" rows="4" placeholder="例如：当用户询问订单物流或支付状态时调用。"></textarea>
          </div>
        </div>
        <div class="tool-modal-footer">
          <button type="button" class="btn-modal-cancel" @click="editorOpen = false">取消</button>
          <button type="button" class="btn-modal-save" :disabled="saving" @click="saveEditor">
            {{ saving ? '保存中…' : (creating ? '创建并全平台生效' : '保存并全平台生效') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'
import { categoryLabel, FALLBACK_PLATFORM_TOOLS, freshnessLabel, timezoneLabel } from '../composables/platformTools'
import ToolGlyph from './ToolGlyph.vue'

const props = defineProps({
  canManage: { type: Boolean, default: true },
  isSuperAdmin: { type: Boolean, default: false }
})

const { showToast } = useToast()
const VIEW_MODE_KEY = 'toolsViewMode'
const tools = ref([])
const allTools = ref([])
const loading = ref(false)
const keyword = ref('')
const category = ref('ALL')
const page = ref(1)
const pageSize = ref(6)
const pageResult = ref({ total: 0, page: 1, size: 6, totalPages: 1 })
const viewMode = ref(localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'card')
const toggling = ref('')
const deleting = ref('')
const editorOpen = ref(false)
const creating = ref(false)
const editing = ref(null)
const saving = ref(false)
const testing = ref(false)
const showApiKey = ref(false)
const testResult = ref(null)
const form = reactive({
  name: '',
  apiKey: '',
  count: 5,
  freshness: 'noLimit',
  summary: true,
  timezone: 'Asia/Shanghai',
  format: 'yyyy-MM-dd HH:mm:ss',
  description: '',
  method: 'POST',
  url: '',
  timeoutSeconds: 8,
  unitPrice: ''
})

// ==================== 调用统计与轮数设置 ====================
const usageRows = ref([])
const usageOpen = ref(false)
const usageLoading = ref(false)
const usageTool = ref(null)
const usageDetail = ref(null)
const maxToolRounds = ref(5)
const defaultRounds = ref(5)
const roundOptions = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
const savingRounds = ref(false)
const EMPTY_USAGE = { today: 0, month: 0, total: 0, monthCost: 0 }

const monthTotalCalls = computed(() => usageRows.value.reduce((sum, r) => sum + (r.month || 0), 0))
const monthTotalCost = computed(() => formatMoney(usageRows.value.reduce((sum, r) => sum + Number(r.monthCost || 0), 0)))

function usageOf(tool) {
  return usageRows.value.find(r => r.toolId === tool.id || r.toolCode === tool.code) || EMPTY_USAGE
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

function formatRate(rate) {
  return rate == null ? '—' : `${(rate * 100).toFixed(1)}%`
}

function barHeight(calls) {
  const max = Math.max(1, ...(usageDetail.value?.daily || []).map(d => d.calls))
  return calls ? `${Math.max(6, Math.round(calls / max * 100))}%` : '0'
}

async function loadUsage() {
  try {
    const res = await http.get('/api/platform-tools/usage')
    if (res.success && Array.isArray(res.data)) usageRows.value = res.data
  } catch {}
}

async function loadSettings() {
  try {
    const res = await http.get('/api/platform-tools/settings')
    if (res.success && res.data) {
      maxToolRounds.value = res.data.maxToolRounds
      defaultRounds.value = res.data.default
      const options = []
      for (let n = res.data.min; n <= res.data.max; n++) options.push(n)
      roundOptions.value = options
    }
  } catch {}
}

async function saveMaxToolRounds() {
  savingRounds.value = true
  const res = await http.put('/api/platform-tools/settings', { maxToolRounds: maxToolRounds.value })
  savingRounds.value = false
  if (res.success) {
    showToast(res.message || '已保存', 'success', 2000)
  } else {
    showToast(res.message || '保存失败', 'error')
    await loadSettings()
  }
}

async function openUsage(tool) {
  usageTool.value = tool
  usageDetail.value = null
  usageOpen.value = true
  usageLoading.value = true
  try {
    const res = await http.get(`/api/platform-tools/${tool.id}/usage`)
    if (res.success) usageDetail.value = res.data
    else showToast(res.message || '加载统计失败', 'error')
  } finally {
    usageLoading.value = false
  }
}

const categoryChips = [
  { id: 'ALL', label: '全部' },
  { id: 'TIME', label: '时间' },
  { id: 'SEARCH', label: '联网' },
  { id: 'CUSTOM', label: '自定义' }
]

const enabledCount = computed(() => allTools.value.filter(t => t.enabled).length)
const customCount = computed(() => allTools.value.filter(t => isHttp(t)).length)
const bochaReady = computed(() => allTools.value.some(t => isBocha(t) && t.hasApiKey && t.enabled))
const totalPages = computed(() => Math.max(1, pageResult.value.totalPages || 1))
const editorTip = computed(() => {
  if (creating.value || isHttp(editing.value)) {
    return '自定义工具走 HTTP 回调：模型传入 query，平台按你填的方法请求该地址。内网/localhost 地址按网关出站规则校验。'
  }
  if (isBocha(editing.value)) {
    return '必填：Bocha API Key。保存后所有智能体问天气、新闻时共用这一把密钥。'
  }
  if (isDeepSeek(editing.value)) {
    return 'DeepSeek 官方搜索接口，按次计费（约 0.005 元/次）。默认使用模型网关里 DeepSeek 通道的 Key，无需另外申请。'
  }
  return '这里设置平台默认时区和时间格式。模型没指定时区时，按这个默认值执行。'
})

function isBocha(tool) {
  return !!tool && (tool.customIcon === 'bocha' || tool.prefix === 'bocha' || tool.code === 'bocha_web_search')
}

function isDeepSeek(tool) {
  return !!tool && (tool.customIcon === 'deepseek' || tool.code === 'deepseek_web_search')
}

function isHttp(tool) {
  if (!tool) return false
  return tool.category === 'CUSTOM' || tool.prefix === 'http' || !!tool.config?.url
}

function configPreview(tool) {
  if (isHttp(tool)) {
    const method = tool.config?.method || 'POST'
    const url = tool.config?.url || '未填写地址'
    return `${method} · ${url}`
  }
  if (isDeepSeek(tool)) {
    return `${tool.hasApiKey ? '使用单独保存的 Key' : '使用模型网关的 DeepSeek Key'} · 返回 ${tool.config?.count || 5} 条`
  }
  if (isBocha(tool)) {
    const count = tool.config?.count || 5
    return `${tool.hasApiKey ? '密钥已保存' : '尚未填写密钥'} · 返回 ${count} 条 · ${freshnessLabel(tool.config?.freshness)}`
  }
  return `${timezoneLabel(tool.config?.timezone)} · ${tool.config?.format || 'yyyy-MM-dd HH:mm:ss'}`
}

function setViewMode(mode) {
  viewMode.value = mode === 'list' ? 'list' : 'card'
}

function applyAllRows(rows) {
  allTools.value = Array.isArray(rows) && rows.length ? rows : FALLBACK_PLATFORM_TOOLS
}

function extractRows(res) {
  if (Array.isArray(res?.data)) return res.data
  return res?.data?.records || res?.data?.items || []
}

async function loadStats() {
  try {
    const res = await http.get('/api/platform-tools')
    const rows = extractRows(res)
    if (res.success && rows.length) {
      applyAllRows(rows)
      return
    }
  } catch {}
  applyAllRows(FALLBACK_PLATFORM_TOOLS)
}

async function loadTools() {
  loading.value = true
  try {
    const res = await http.get('/api/platform-tools', {
      page: page.value,
      size: pageSize.value,
      keyword: keyword.value,
      category: category.value === 'ALL' ? '' : category.value
    })
    const data = res?.data
    const rows = extractRows(res)
    if (res.success && data && !Array.isArray(data) && typeof data.total === 'number') {
      pageResult.value = {
        total: data.total,
        page: data.page || page.value,
        size: data.size || pageSize.value,
        totalPages: data.totalPages || Math.max(1, Math.ceil((data.total || 0) / pageSize.value))
      }
      if (pageResult.value.totalPages && page.value > pageResult.value.totalPages) {
        page.value = pageResult.value.totalPages
        loading.value = false
        return loadTools()
      }
      tools.value = rows
    } else if (res.success && rows.length) {
      paginateLocal(rows)
    } else {
      paginateLocal(FALLBACK_PLATFORM_TOOLS)
    }
  } catch (e) {
    paginateLocal(FALLBACK_PLATFORM_TOOLS)
    showToast('加载工具目录失败，已回退内置工具列表', 'warning')
  } finally {
    loading.value = false
  }
}

function paginateLocal(source) {
  const q = keyword.value.trim().toLowerCase()
  const filtered = source.filter(t => {
    if (category.value !== 'ALL' && t.category !== category.value) return false
    if (!q) return true
    return [t.name, t.title, t.prefix, t.code, t.help, t.description]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(q))
  })
  const total = filtered.length
  const pages = Math.max(1, Math.ceil(total / pageSize.value) || 1)
  if (page.value > pages) page.value = pages
  const from = (page.value - 1) * pageSize.value
  tools.value = filtered.slice(from, from + pageSize.value)
  pageResult.value = { total, page: page.value, size: pageSize.value, totalPages: pages }
  applyAllRows(source)
}

async function reloadAll() {
  await Promise.all([loadTools(), loadStats(), loadUsage(), loadSettings()])
}

function changePage(delta) {
  const next = page.value + delta
  if (next < 1 || next > totalPages.value) return
  page.value = next
  loadTools()
}

function goPage(n) {
  page.value = n
  loadTools()
}

function onPageSizeChange() {
  page.value = 1
  loadTools()
}

async function toggleEnabled(tool, enabled) {
  if (!props.canManage) return
  toggling.value = tool.id
  const res = await http.patch(`/api/platform-tools/${tool.id}/enabled`, { enabled })
  toggling.value = ''
  if (res.success && res.data) {
    const idx = tools.value.findIndex(t => t.id === tool.id)
    if (idx >= 0) tools.value[idx] = res.data
    const allIdx = allTools.value.findIndex(t => t.id === tool.id)
    if (allIdx >= 0) allTools.value[allIdx] = res.data
    showToast(res.message || (enabled ? '已启用' : '已停用'), 'success', 1800)
  } else {
    showToast(res.message || '更新失败', 'error')
    await reloadAll()
  }
}

async function removeTool(tool) {
  if (!props.canManage || tool.builtin) return
  if (!window.confirm(`确定删除自定义工具「${tool.title || tool.name}」？调试页已添加的引用将失效。`)) return
  deleting.value = tool.id
  const res = await http.del(`/api/platform-tools/${tool.id}`)
  deleting.value = ''
  if (res.success) {
    showToast(res.message || '已删除', 'success', 1800)
    await reloadAll()
  } else {
    showToast(res.message || '删除失败', 'error')
  }
}

function resetForm() {
  form.name = ''
  form.apiKey = ''
  form.count = 5
  form.freshness = 'noLimit'
  form.summary = true
  form.timezone = 'Asia/Shanghai'
  form.format = 'yyyy-MM-dd HH:mm:ss'
  form.description = ''
  form.method = 'POST'
  form.url = ''
  form.timeoutSeconds = 8
  form.unitPrice = ''
}

function openCreate() {
  creating.value = true
  editing.value = {
    icon: 'fa-solid fa-plug',
    iconClass: 'icon-orange',
    prefix: 'http',
    title: '自定义工具',
    category: 'CUSTOM',
    hasApiKey: false
  }
  showApiKey.value = false
  testResult.value = null
  resetForm()
  form.description = '当用户提出与该业务接口相关的问题时调用，将用户问题作为 query 传给外部服务。'
  editorOpen.value = true
}

function openEditor(tool) {
  creating.value = false
  editing.value = tool
  showApiKey.value = false
  testResult.value = null
  resetForm()
  form.name = tool.name || tool.title || ''
  form.count = Number(tool.config?.count || 5)
  form.freshness = tool.config?.freshness || 'noLimit'
  form.summary = tool.config?.summary ?? true
  form.timezone = tool.config?.timezone || 'Asia/Shanghai'
  form.format = tool.config?.format || 'yyyy-MM-dd HH:mm:ss'
  form.description = tool.description || ''
  form.method = tool.config?.method || 'POST'
  form.url = tool.config?.url || ''
  form.timeoutSeconds = Number(tool.config?.timeoutSeconds || 8)
  form.unitPrice = tool.unitPrice == null ? '' : Number(tool.unitPrice)
  editorOpen.value = true
}

async function testConnection() {
  if (!editing.value || testing.value || creating.value) return
  testing.value = true
  testResult.value = null
  try {
    const res = await http.post(`/api/platform-tools/${editing.value.id}/test-connection`, {
      apiKey: form.apiKey ? form.apiKey.trim() : undefined
    })
    testResult.value = {
      success: !!res.success,
      message: res.message || (res.success ? '连接成功' : '测试失败')
    }
    showToast(testResult.value.message, testResult.value.success ? 'success' : 'error', 2500)
  } catch (e) {
    testResult.value = { success: false, message: e.message || '测试异常' }
  } finally {
    testing.value = false
  }
}

function unitPricePayload() {
  if (form.unitPrice === '' || form.unitPrice == null) return undefined
  const price = Number(form.unitPrice)
  return Number.isFinite(price) && price >= 0 ? price : undefined
}

function buildPayload() {
  const payload = buildConfigPayload()
  const price = unitPricePayload()
  if (price !== undefined) payload.unitPrice = price
  return payload
}

function buildConfigPayload() {
  if (creating.value || isHttp(editing.value)) {
    const payload = {
      name: form.name.trim(),
      title: form.name.trim(),
      description: form.description,
      config: {
        method: form.method,
        url: form.url.trim(),
        timeoutSeconds: form.timeoutSeconds
      }
    }
    if (form.apiKey && form.apiKey.trim()) {
      payload.apiKey = form.apiKey.trim()
    }
    return payload
  }
  const payload = {
    description: form.description,
    config: isBocha(editing.value)
      ? { count: form.count, freshness: form.freshness, summary: form.summary }
      : isDeepSeek(editing.value)
        ? { count: form.count }
        : { timezone: form.timezone, format: form.format }
  }
  if (form.apiKey && form.apiKey.trim()) {
    payload.apiKey = form.apiKey.trim()
  }
  return payload
}

async function saveEditor() {
  if (saving.value) return
  if ((creating.value || isHttp(editing.value)) && !form.name.trim()) {
    showToast('请填写工具名称', 'error')
    return
  }
  if ((creating.value || isHttp(editing.value)) && !form.url.trim()) {
    showToast('请填写 HTTP 接口地址', 'error')
    return
  }
  if (!form.description.trim()) {
    showToast('请填写工具提示词，告诉模型何时调用', 'error')
    return
  }
  saving.value = true
  const payload = buildPayload()
  const res = creating.value
    ? await http.post('/api/platform-tools', payload)
    : await http.put(`/api/platform-tools/${editing.value.id}`, payload)
  saving.value = false
  if (res.success && res.data) {
    editorOpen.value = false
    showToast(res.message || '配置已保存', 'success', 2200)
    if (creating.value) {
      category.value = 'CUSTOM'
      page.value = 1
    }
    await reloadAll()
  } else {
    showToast(res.message || '保存失败', 'error')
  }
}

defineExpose({ loadTools: reloadAll })

watch(viewMode, (mode) => {
  localStorage.setItem(VIEW_MODE_KEY, mode)
})

watch([keyword, category], () => {
  page.value = 1
  loadTools()
})

onMounted(() => {
  reloadAll()
})
</script>

<style scoped>
.tools-settings-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-card);
}

.tools-setting-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.tools-setting-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.tools-setting-select {
  height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 12.5px;
}

.tools-setting-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.tools-usage-total {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.tools-usage-total b {
  color: var(--text-primary);
}

.tools-usage-line {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 8px;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-subtle, transparent);
  color: var(--text-secondary);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.tools-usage-line:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}

.tools-usage-line b {
  color: var(--text-primary);
}

.tools-usage-sep {
  width: 1px;
  height: 10px;
  background: var(--border-color);
}

.tools-usage-more {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-muted);
}

.tools-usage-link {
  border: none;
  background: none;
  padding: 0;
  color: var(--accent-blue);
  font-size: 12.5px;
  cursor: pointer;
}

.tools-usage-dialog {
  max-width: 640px;
}

.usage-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.usage-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.usage-stat span {
  font-size: 12px;
  color: var(--text-muted);
}

.usage-stat b {
  font-size: 18px;
  color: var(--text-primary);
}

.usage-stat small {
  font-size: 11px;
  color: var(--text-muted);
}

.usage-section-title {
  margin: 18px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.usage-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 110px;
}

.usage-bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
}

.usage-bar-track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}

.usage-bar-fill {
  width: 100%;
  border-radius: 3px 3px 0 0;
  background: var(--brand, var(--accent-blue));
  opacity: 0.85;
}

.usage-bar-label {
  font-size: 10px;
  color: var(--text-muted);
}

.usage-agent-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.usage-agent-table th,
.usage-agent-table td {
  padding: 7px 8px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.usage-agent-table th {
  font-weight: 500;
  color: var(--text-muted);
}

.usage-fail {
  color: var(--accent-amber);
}

.usage-empty,
.usage-note {
  font-size: 12px;
  color: var(--text-muted);
}

.usage-note {
  margin-top: 12px;
}

@media (max-width: 720px) {
  .usage-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
