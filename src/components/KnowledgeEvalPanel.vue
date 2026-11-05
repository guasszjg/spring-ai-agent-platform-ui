<template>
  <!-- 知识库检索评测：用同一批题目比较不同检索配置能否找到正确内容 -->
  <div class="re-page">
    <p class="re-intro">
      用同一批真实问题给检索打分，每次改配置都跑一遍，就能看出改动有没有用。这里只衡量<strong>能否找到正确内容</strong>，不评判模型最终的回答。
    </p>

    <!-- 题目 -->
    <section class="re-card">
      <div class="re-card-head">
        <div>
          <h4>评测题目 <span class="re-count">{{ cases.length }}</span></h4>
          <p>建议 30～50 题，尽量用用户的真实问法。答案原文只摘关键的一句话，太长容易跨切片而匹配不上。</p>
        </div>
        <div v-if="canManage" class="re-actions">
          <button type="button" class="btn-secondary" @click="openImport"><i class="fa-solid fa-file-import"></i> 批量导入</button>
          <button type="button" class="btn-create-agent" @click="openCase()"><i class="fa-solid fa-plus"></i> 添加题目</button>
        </div>
      </div>
      <div v-if="!cases.length" class="re-empty">还没有题目。{{ canManage ? '添加几道题后就可以运行评测。' : '需要有管理权限的用户添加。' }}</div>
      <div v-else class="re-table-wrap">
        <table class="re-table">
          <thead>
            <tr><th>问题</th><th>答案原文</th><th v-if="canManage" class="re-col-actions"></th></tr>
          </thead>
          <tbody>
            <tr v-for="c in cases" :key="c.id">
              <td class="re-query">{{ c.query }}</td>
              <td>
                <div v-for="(t, i) in caseTargets(c)" :key="i" class="re-target">{{ t }}</div>
              </td>
              <td v-if="canManage" class="re-col-actions">
                <button type="button" class="btn-card-action btn-action-icon" title="编辑" @click="openCase(c)"><i class="fa-regular fa-pen-to-square"></i></button>
                <button type="button" class="btn-card-action btn-action-icon btn-action-danger" title="删除" @click="removeCase(c)"><i class="fa-regular fa-trash-can"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 运行 -->
    <section v-if="canManage" class="re-card">
      <div class="re-card-head">
        <div>
          <h4>运行评测</h4>
          <p>默认是知识库当前的配置。这里只影响这次评测，不会改知识库设置。</p>
        </div>
      </div>
      <div class="re-config">
        <label class="re-field">
          <span>检索方式</span>
          <select v-model="config.searchMethod" class="form-control-styled">
            <option value="hybrid_search">混合检索</option>
            <option value="semantic_search">向量检索</option>
            <option value="full_text_search">全文检索</option>
          </select>
        </label>
        <label class="re-field">
          <span>排序方式</span>
          <select v-model="config.rerankMode" class="form-control-styled">
            <option value="weighted_score">{{ config.searchMethod === 'hybrid_search' ? '权重设置' : '不重排' }}</option>
            <option value="reranking_model" :disabled="!activeRerank.configured">
              Rerank 模型{{ activeRerank.configured ? `（${activeRerank.modelName}）` : '（未配置）' }}
            </option>
          </select>
        </label>
        <label v-if="config.searchMethod === 'hybrid_search'" class="re-field">
          <span>语义 {{ Math.round(config.vectorWeight * 100) }}% : 关键词 {{ Math.round((1 - config.vectorWeight) * 100) }}%</span>
          <input v-model.number="config.vectorWeight" type="range" min="0" max="1" step="0.05" class="re-range">
        </label>
        <label class="re-field">
          <span>备注（可选）</span>
          <input v-model="config.label" class="form-control-styled" maxlength="100" placeholder="如 按标题切分后">
        </label>
        <button type="button" class="btn-create-agent re-run" :disabled="running || starting || !cases.length" @click="startRun">
          <i :class="running || starting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-play'"></i>
          {{ running ? '评测进行中…' : '运行评测' }}
        </button>
      </div>
      <p v-if="config.rerankMode === 'reranking_model'" class="re-hint">每道题会调用一次 Rerank 模型，按用量计费，这次约 {{ cases.length }} 次调用。</p>
      <p v-if="!activeRerank.configured" class="re-hint">
        没有生效的 Rerank 模型，暂时测不了 Rerank。
        <router-link v-if="isSuperAdmin" to="/dashboard?tab=gateway-rerank" class="kb-gateway-link">去配置 →</router-link>
      </p>
    </section>

    <!-- 历史 -->
    <section class="re-card">
      <div class="re-card-head">
        <div>
          <h4>评测记录</h4>
          <p>点一条记录看每道题的结果，设为基准后其他记录会显示与它的差距。</p>
        </div>
      </div>
      <p v-if="baselineMismatch" class="re-warn">
        <i class="fa-solid fa-triangle-exclamation"></i>
        部分记录和基准用的题目不一样，这些差距仅供参考。
      </p>
      <div v-if="!runs.length" class="re-empty">还没有评测记录。</div>
      <div v-else class="re-table-wrap">
        <table class="re-table re-runs">
          <thead>
            <tr>
              <th>配置</th>
              <th>时间</th>
              <th>题数</th>
              <th title="正确内容进入前 5 名的题目占比，越高越好">前 5 命中率</th>
              <th title="每题的答案有多少进入了前 10 名，越高越好">前 10 召回率</th>
              <th title="NDCG@10：答案排得越靠前分数越高，最高 100%">排序质量</th>
              <th>平均耗时</th>
              <th class="re-col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in runs" :key="r.id" :class="{ 'is-selected': selected && selected.id === r.id }" @click="selectRun(r)">
              <td>
                <div class="re-run-label">{{ r.label || '未命名配置' }}</div>
                <span v-if="r.id === baselineId" class="re-tag">基准</span>
                <span v-if="r.status === 'RUNNING'" class="re-tag re-tag-run">运行中 {{ r.completedCount }}/{{ r.caseCount }}</span>
                <span v-if="r.status === 'FAILED'" class="re-tag re-tag-bad" :title="r.errorMessage">失败</span>
                <span v-if="r.rerankFallbackCount" class="re-tag re-tag-warn" title="这些题调用 Rerank 失败，用的是融合排序，这次结果不能代表 Rerank 的效果">{{ r.rerankFallbackCount }} 题 Rerank 未生效</span>
                <span v-if="r.errorCount" class="re-tag re-tag-bad" title="这些题检索出错，按 0 分计入">{{ r.errorCount }} 题出错</span>
              </td>
              <td class="re-nowrap">{{ formatTime(r.createdAt) }}</td>
              <td>{{ r.caseCount }}</td>
              <td v-for="m in METRICS" :key="m" class="re-nowrap">
                {{ percent(r[m]) }}
                <span v-if="delta(r, m)" class="re-delta" :class="delta(r, m).cls">{{ delta(r, m).text }}</span>
              </td>
              <td class="re-nowrap">{{ r.avgLatencyMs != null ? Math.round(r.avgLatencyMs) + ' ms' : '-' }}</td>
              <td class="re-col-actions" @click.stop>
                <button v-if="r.status === 'DONE' && r.id !== baselineId" type="button" class="re-link" @click="baselineId = r.id">设为基准</button>
                <button v-if="canManage && r.status !== 'RUNNING'" type="button" class="btn-card-action btn-action-icon btn-action-danger" title="删除" @click="removeRun(r)"><i class="fa-regular fa-trash-can"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 每道题的结果 -->
    <section v-if="selected" class="re-card">
      <div class="re-card-head">
        <div>
          <h4>每道题的结果 · {{ selected.label }}</h4>
          <p v-if="selected.status === 'RUNNING'">评测进行中，结束后显示结果。</p>
          <p v-else-if="selected.status === 'FAILED'" class="re-bad">{{ selected.errorMessage || '评测失败' }}</p>
          <p v-else>共 {{ detailRows.length }} 题，{{ missCount }} 题没有在前 5 名找到正确内容。</p>
        </div>
        <label v-if="detailRows.length" class="re-only-miss">
          <input v-model="onlyMissed" type="checkbox"> 只看没命中的
        </label>
      </div>
      <div v-for="row in visibleRows" :key="row.caseId" class="re-case">
        <button type="button" class="re-case-head" @click="toggleCase(row.caseId)">
          <i class="fa-solid" :class="expanded[row.caseId] ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
          <span class="re-rank" :class="rankClass(row)">{{ row.firstHitRank ? `第 ${row.firstHitRank} 名` : (row.error ? '出错' : '未找到') }}</span>
          <span class="re-case-query">{{ row.query }}</span>
          <span v-if="baselineRank(row)" class="re-delta" :class="baselineRank(row).cls">{{ baselineRank(row).text }}</span>
        </button>
        <div v-if="expanded[row.caseId]" class="re-case-body">
          <p v-if="row.error" class="re-bad">{{ row.error }}</p>
          <p v-if="row.rerankFallback" class="re-warn"><i class="fa-solid fa-triangle-exclamation"></i> 这道题调用 Rerank 失败，用的是融合排序。</p>
          <div v-if="row.missed && row.missed.length" class="re-missed">
            <span>前 10 名里没找到：</span>
            <div v-for="(m, i) in row.missed" :key="i" class="re-target">{{ m }}</div>
          </div>
          <div v-for="item in row.top" :key="item.rank" class="re-hit" :class="{ 'is-hit': item.hit }">
            <span class="re-hit-rank">{{ item.rank }}</span>
            <div>
              <div class="re-hit-source">{{ item.source || '未知来源' }}<span v-if="item.hit"> · 命中</span></div>
              <div class="re-hit-text">{{ item.snippet }}</div>
            </div>
          </div>
          <p v-if="!row.top || !row.top.length" class="re-empty-inline">这道题没有检索到任何内容。</p>
        </div>
      </div>
    </section>

    <!-- 题目弹窗 -->
    <div class="modal-backdrop" :class="{ open: caseModalOpen }">
      <div class="modal-dialog" style="max-width: 560px;">
        <div class="modal-header">
          <h3>{{ caseForm.id ? '编辑题目' : '添加题目' }}</h3>
          <button type="button" class="btn-modal-close" @click="caseModalOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form @submit.prevent="saveCase">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">问题 *</label>
              <input v-model="caseForm.query" class="form-control-styled" placeholder="如 退款多久到账？" required>
            </div>
            <div class="form-group">
              <label class="form-label">答案原文 *</label>
              <textarea v-model="caseForm.texts" class="form-control-styled" rows="4" placeholder="从文档里复制能回答这个问题的关键句，如：退款申请提交后 3 个工作日内到账" required></textarea>
              <p class="re-field-hint">检索结果里包含这段文字就算找到（忽略大小写和空格）。需要多段内容才能回答时，每段写一行。</p>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="caseModalOpen = false">取消</button>
            <button type="submit" class="btn-create-agent" :disabled="savingCase">{{ savingCase ? '保存中...' : '保存' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 批量导入弹窗 -->
    <div class="modal-backdrop" :class="{ open: importOpen }">
      <div class="modal-dialog" style="max-width: 640px;">
        <div class="modal-header">
          <h3>批量导入题目</h3>
          <button type="button" class="btn-modal-close" @click="importOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">从 Excel 复制两列粘贴到这里：问题、答案原文</label>
            <textarea v-model="importText" class="form-control-styled re-import" rows="10" placeholder="退款多久到账？&#9;退款申请提交后 3 个工作日内到账&#10;发票抬头开错了怎么办？&#9;可在订单页申请重开发票"></textarea>
            <p class="re-field-hint">每行一题，问题和答案之间用制表符隔开（从 Excel 复制时会自动带上）。一题有多段答案时，用 <code>||</code> 隔开。单元格里不要有换行。</p>
          </div>
          <p class="re-import-summary">
            识别到 <strong>{{ importParsed.cases.length }}</strong> 题<span v-if="importParsed.errors.length">，<span class="re-bad">{{ importParsed.errors.length }} 行有问题：第 {{ importParsed.errors.slice(0, 8).join('、') }} 行{{ importParsed.errors.length > 8 ? ' 等' : '' }}缺少问题或答案</span></span>
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="importOpen = false">取消</button>
          <button type="button" class="btn-create-agent" :disabled="importing || !importParsed.cases.length || importParsed.errors.length > 0" @click="submitImport">
            {{ importing ? '导入中...' : `导入 ${importParsed.cases.length} 题` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { http } from '../api/http'
import { useToast } from '../composables/useToast'

const props = defineProps({
  kb: { type: Object, required: true },
  canManage: { type: Boolean, default: false },
  isSuperAdmin: { type: Boolean, default: false }
})

const { showToast } = useToast()
const METRICS = ['hitAt5', 'recallAt10', 'ndcgAt10']
const POLL_MS = 2000

const base = computed(() => `/api/knowledge-bases/${props.kb.id}`)
const cases = ref([])
const runs = ref([])
const selected = ref(null)
const baselineDetail = ref(null)
const baselineId = ref('')
const onlyMissed = ref(false)
const expanded = reactive({})
const starting = ref(false)
const activeRerank = reactive({ configured: false, modelName: '' })
const config = reactive({ searchMethod: 'hybrid_search', rerankMode: 'weighted_score', vectorWeight: 0.7, label: '' })
let pollTimer = null

const running = computed(() => runs.value.some((r) => r.status === 'RUNNING'))
const baseline = computed(() => runs.value.find((r) => r.id === baselineId.value) || null)
const baselineMismatch = computed(() => !!baseline.value && runs.value.some(
  (r) => r.status === 'DONE' && r.casesFingerprint !== baseline.value.casesFingerprint
))
const detailRows = computed(() => (selected.value && Array.isArray(selected.value.details) ? selected.value.details : []))
const missCount = computed(() => detailRows.value.filter((r) => !r.hitAt5).length)
const visibleRows = computed(() => (onlyMissed.value ? detailRows.value.filter((r) => !r.hitAt5) : detailRows.value))

function caseTargets(c) {
  if (c.expectedTexts) return c.expectedTexts.split('\n')
  const ids = []
  if (c.expectedDocumentIds) ids.push('文档：' + c.expectedDocumentIds)
  if (c.expectedChunkIds) ids.push('切片：' + c.expectedChunkIds)
  return ids
}

function percent(value) {
  return value === null || value === undefined ? '-' : (value * 100).toFixed(1) + '%'
}

function formatTime(value) {
  return value ? String(value).replace('T', ' ').slice(5, 16) : '-'
}

function delta(run, metric) {
  const b = baseline.value
  if (!b || b.id === run.id || run.status !== 'DONE' || run[metric] == null || b[metric] == null) return null
  const diff = (run[metric] - b[metric]) * 100
  if (Math.abs(diff) < 0.05) return { text: '持平', cls: 'is-flat' }
  return { text: (diff > 0 ? '+' : '') + diff.toFixed(1), cls: diff > 0 ? 'is-up' : 'is-down' }
}

function rankClass(row) {
  if (!row.firstHitRank) return 'is-down'
  return row.firstHitRank <= 5 ? 'is-up' : 'is-mid'
}

function baselineRank(row) {
  const b = baselineDetail.value
  if (!b || !selected.value || b.id === selected.value.id || !Array.isArray(b.details)) return null
  const old = b.details.find((r) => r.caseId === row.caseId)
  if (!old) return null
  const was = old.firstHitRank || null
  const now = row.firstHitRank || null
  if (was === now) return null
  const label = was ? `基准第 ${was} 名` : '基准未找到'
  const better = now && (!was || now < was)
  return { text: label, cls: better ? 'is-up' : 'is-down' }
}

function toggleCase(id) {
  expanded[id] = !expanded[id]
}

// ---------- 加载 ----------
async function loadCases() {
  const res = await http.get(`${base.value}/eval-cases`)
  if (res.success) cases.value = res.data || []
}

async function loadRuns() {
  const res = await http.get(`${base.value}/eval-runs`)
  if (!res.success) return
  runs.value = res.data || []
  if (baselineId.value && !runs.value.some((r) => r.id === baselineId.value)) baselineId.value = ''
  schedulePoll()
}

async function loadActiveRerank() {
  const res = await http.get('/api/model-gateway/reranks/active')
  if (res.success && res.data) Object.assign(activeRerank, { configured: false, modelName: '' }, res.data)
  if (!activeRerank.configured) config.rerankMode = 'weighted_score'
}

async function fetchRun(id) {
  const res = await http.get(`${base.value}/eval-runs/${id}`)
  return res.success ? res.data : null
}

async function selectRun(run) {
  selected.value = (await fetchRun(run.id)) || run
}

watch(baselineId, async (id) => {
  baselineDetail.value = id ? await fetchRun(id) : null
})

function schedulePoll() {
  clearTimeout(pollTimer)
  if (!running.value) return
  pollTimer = setTimeout(async () => {
    const wasRunning = runs.value.filter((r) => r.status === 'RUNNING').map((r) => r.id)
    await loadRuns()
    const finished = runs.value.find((r) => wasRunning.includes(r.id) && r.status !== 'RUNNING')
    if (finished) {
      if (finished.status === 'DONE') showToast('评测完成', 'success')
      else showToast(finished.errorMessage || '评测失败', 'error')
      await selectRun(finished)
    }
  }, POLL_MS)
}

// ---------- 题目 ----------
const caseModalOpen = ref(false)
const savingCase = ref(false)
const caseForm = reactive({ id: '', query: '', texts: '' })

function openCase(item) {
  Object.assign(caseForm, {
    id: item ? item.id : '',
    query: item ? item.query : '',
    texts: item && item.expectedTexts ? item.expectedTexts : ''
  })
  caseModalOpen.value = true
}

async function saveCase() {
  savingCase.value = true
  const payload = { query: caseForm.query.trim(), expectedTexts: [caseForm.texts] }
  const res = caseForm.id
    ? await http.put(`${base.value}/eval-cases/${caseForm.id}`, payload)
    : await http.post(`${base.value}/eval-cases`, payload)
  savingCase.value = false
  if (res.success) {
    caseModalOpen.value = false
    showToast(res.message || '已保存', 'success')
    await loadCases()
  } else {
    showToast(res.message || '保存失败', 'error')
  }
}

async function removeCase(item) {
  if (!confirm(`确定删除题目「${item.query}」吗？`)) return
  const res = await http.delete(`${base.value}/eval-cases/${item.id}`)
  if (res.success) await loadCases()
  else showToast(res.message || '删除失败', 'error')
}

// ---------- 批量导入 ----------
const importOpen = ref(false)
const importing = ref(false)
const importText = ref('')

const importParsed = computed(() => {
  const parsed = { cases: [], errors: [] }
  importText.value.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return
    const tab = line.indexOf('\t')
    const query = tab >= 0 ? line.slice(0, tab).trim() : ''
    const answer = tab >= 0 ? line.slice(tab + 1).trim() : ''
    if (!query || !answer) {
      parsed.errors.push(index + 1)
      return
    }
    parsed.cases.push({ query, expectedTexts: answer.split('||').map((s) => s.trim()).filter(Boolean) })
  })
  return parsed
})

function openImport() {
  importText.value = ''
  importOpen.value = true
}

async function submitImport() {
  importing.value = true
  const res = await http.post(`${base.value}/eval-cases/batch`, importParsed.value.cases)
  importing.value = false
  if (res.success) {
    importOpen.value = false
    showToast(`已导入 ${res.data?.length || 0} 题`, 'success')
    await loadCases()
  } else {
    showToast(res.message || '导入失败', 'error')
  }
}

// ---------- 运行 ----------
async function startRun() {
  starting.value = true
  const hybrid = config.searchMethod === 'hybrid_search'
  const res = await http.post(`${base.value}/eval-runs`, {
    label: config.label.trim() || undefined,
    searchMethod: config.searchMethod,
    rerankMode: config.rerankMode,
    vectorWeight: hybrid ? config.vectorWeight : undefined,
    keywordWeight: hybrid ? Number((1 - config.vectorWeight).toFixed(2)) : undefined
  })
  starting.value = false
  if (res.success) {
    showToast('评测已开始', 'success')
    config.label = ''
    await loadRuns()
  } else {
    showToast(res.message || '启动失败', 'error')
  }
}

async function removeRun(run) {
  if (!confirm(`确定删除评测记录「${run.label || '未命名配置'}」吗？`)) return
  const res = await http.delete(`${base.value}/eval-runs/${run.id}`)
  if (res.success) {
    if (selected.value && selected.value.id === run.id) selected.value = null
    await loadRuns()
  } else {
    showToast(res.message || '删除失败', 'error')
  }
}

function resetConfig() {
  const kb = props.kb
  const method = kb.searchMethod || 'hybrid_search'
  Object.assign(config, {
    searchMethod: ['hybrid_search', 'semantic_search', 'full_text_search'].includes(method) ? method : 'hybrid_search',
    rerankMode: kb.rerankEnabled !== false && kb.rerankMode === 'reranking_model' && method === 'hybrid_search' ? 'reranking_model' : 'weighted_score',
    vectorWeight: kb.vectorWeight ?? 0.7,
    label: ''
  })
}

onMounted(async () => {
  resetConfig()
  await Promise.all([loadCases(), loadRuns(), loadActiveRerank()])
})

onBeforeUnmount(() => clearTimeout(pollTimer))
</script>

<style scoped>
.re-page { display: flex; flex-direction: column; gap: 14px; }
.re-intro { margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary); }

.re-card {
  padding: 16px 18px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-card);
}
.re-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 12px; }
.re-card-head h4 { margin: 0 0 4px; font-size: 14.5px; font-weight: 600; color: var(--text-primary); }
.re-card-head p { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--text-muted); }
.re-count { margin-left: 4px; font-size: 12px; font-weight: 500; color: var(--text-muted); }
.re-actions { display: flex; gap: 8px; flex-shrink: 0; }
.re-empty { padding: 28px 8px; text-align: center; font-size: 13px; color: var(--text-muted); }
.re-empty-inline { margin: 0; font-size: 12.5px; color: var(--text-muted); }

.re-table-wrap { overflow-x: auto; }
.re-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.re-table th {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  color: var(--text-muted);
}
.re-table td { padding: 9px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; color: var(--text-secondary); }
.re-table tbody tr:last-child td { border-bottom: 0; }
.re-query { min-width: 180px; color: var(--text-primary) !important; }
.re-target { line-height: 1.5; overflow-wrap: anywhere; }
.re-target + .re-target { margin-top: 4px; padding-top: 4px; border-top: 1px dashed var(--border-color); }
.re-col-actions { width: 1%; white-space: nowrap; text-align: right; }
.re-col-actions .btn-card-action { display: inline-flex; margin-left: 4px; }
.re-nowrap { white-space: nowrap; }

.re-config { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
.re-field { display: flex; flex-direction: column; gap: 6px; flex: 1 1 170px; min-width: 150px; font-size: 12.5px; color: var(--text-secondary); }
.re-range { width: 100%; height: 36px; accent-color: var(--brand-text); }
.re-run { flex-shrink: 0; }
.re-hint { margin: 10px 0 0; font-size: 12.5px; color: var(--text-muted); }
.re-hint .kb-gateway-link { margin: 0 0 0 4px; }
.re-warn { margin: 0 0 10px; font-size: 12.5px; color: var(--accent-amber); }
.re-bad { color: var(--accent-rose) !important; }

.re-runs tbody tr { cursor: pointer; }
.re-runs tbody tr:hover td { background: var(--surface-subtle); }
.re-runs tbody tr.is-selected td { background: var(--brand-soft); }
.re-run-label { color: var(--text-primary); }
.re-tag {
  display: inline-block;
  margin: 4px 4px 0 0;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  font-size: 11px;
  color: var(--text-secondary);
}
.re-tag-run { color: var(--brand-text); border-color: var(--brand-line); }
.re-tag-warn { color: var(--accent-amber); }
.re-tag-bad { color: var(--accent-rose); }
.re-delta { margin-left: 4px; font-size: 11.5px; font-weight: 600; }
.is-up { color: var(--accent-emerald); }
.is-down { color: var(--accent-rose); }
.is-mid { color: var(--accent-amber); }
.is-flat { color: var(--text-muted); font-weight: 400; }
.re-link { padding: 0; border: 0; background: none; font-size: 12px; color: var(--brand-text); cursor: pointer; }
.re-link:hover { text-decoration: underline; }

.re-only-miss { display: flex; align-items: center; gap: 6px; flex-shrink: 0; font-size: 12.5px; color: var(--text-secondary); cursor: pointer; }
.re-case { border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; }
.re-case + .re-case { margin-top: 6px; }
.re-case-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  background: none;
  font-size: 13px;
  text-align: left;
  color: var(--text-primary);
  cursor: pointer;
}
.re-case-head:hover { background: var(--surface-subtle); }
.re-case-head > i { width: 10px; font-size: 10px; color: var(--text-muted); }
.re-rank { flex-shrink: 0; min-width: 52px; font-size: 12px; font-weight: 600; }
.re-case-query { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.re-case-head .re-delta { flex-shrink: 0; }
.re-case-body { display: flex; flex-direction: column; gap: 8px; padding: 4px 12px 12px 32px; }
.re-case-body p { margin: 0; font-size: 12.5px; }
.re-missed { font-size: 12.5px; color: var(--accent-amber); }
.re-missed > span { display: block; margin-bottom: 4px; }
.re-hit { display: flex; gap: 10px; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 12.5px; }
.re-hit.is-hit { border-color: color-mix(in srgb, var(--accent-emerald) 45%, transparent); }
.re-hit-rank { flex-shrink: 0; width: 18px; font-weight: 600; color: var(--text-muted); }
.re-hit-source { margin-bottom: 2px; font-size: 12px; color: var(--text-muted); overflow-wrap: anywhere; }
.re-hit.is-hit .re-hit-source span { color: var(--accent-emerald); }
.re-hit-text { line-height: 1.5; color: var(--text-secondary); overflow-wrap: anywhere; }

.re-field-hint { margin: 6px 0 0; font-size: 12px; line-height: 1.5; color: var(--text-muted); }
.re-import { font-family: ui-monospace, Consolas, monospace; font-size: 12.5px; white-space: pre; overflow-x: auto; }
.re-import-summary { margin: 0; font-size: 13px; color: var(--text-secondary); }

@media (max-width: 720px) {
  .re-card-head { flex-direction: column; }
  .re-actions { flex-wrap: wrap; }
  .re-run { width: 100%; }
}
</style>
