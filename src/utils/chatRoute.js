// 调试页的模型通道选择：按「选项列表 + 当前选择」算出实际会用的主通道、模型和备用通道。
// 规则与后端 LlmGatewayService.resolveAgentRoute 一致：选的通道不可用时改用平台默认。

export function emptyRouteChoice() {
  return { primaryProviderId: '', modelName: '', fallbackProviderId: '' }
}

export function routeChoiceFromAgent(agent) {
  return {
    primaryProviderId: agent?.primaryProviderId || '',
    modelName: agent?.modelName || '',
    fallbackProviderId: agent?.fallbackProviderId || ''
  }
}

function sameModel(a, b) {
  return (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase()
}

/** 通道上实际会用的模型：选的模型在通道模型列表里就用它，否则用通道默认模型 */
export function modelOn(channel, requested) {
  if (!channel) return ''
  const models = channel.models || []
  const hit = requested && models.find(m => sameModel(m, requested))
  return hit || channel.defaultModel || models[0] || ''
}

export function describeRoute(options, choice) {
  const channels = options?.channels || []
  const platform = options?.platform || null
  const byId = id => channels.find(c => c.id === id)
  const platformChannel = platform
    ? (byId(platform.channelId) || {
        id: platform.channelId,
        name: platform.channelName,
        defaultModel: platform.model,
        models: platform.model ? [platform.model] : [],
        supportsTools: true
      })
    : null

  let primary = null
  let primaryUnavailable = ''
  if (choice?.primaryProviderId) {
    const c = byId(choice.primaryProviderId)
    if (c && c.selectable) primary = c
    else primaryUnavailable = c ? `「${c.name}」${c.unavailableReason || '当前不可用'}` : '所选通道已删除或已停用'
  }
  const followPlatform = !primary
  if (!primary) primary = platformChannel

  let fallback = null
  let fallbackUnavailable = ''
  if (choice?.fallbackProviderId) {
    const c = byId(choice.fallbackProviderId)
    if (c && c.selectable) fallback = c
    else fallbackUnavailable = c ? `「${c.name}」${c.unavailableReason || '当前不可用'}` : '所选通道已删除或已停用'
  }
  const fallbackFollow = !fallback
  if (!fallback && platform?.fallbackChannelId) {
    fallback = byId(platform.fallbackChannelId) || { id: platform.fallbackChannelId, name: platform.fallbackChannelName }
  }
  if (fallback && primary && fallback.id === primary.id) fallback = null

  return {
    primary,
    model: modelOn(primary, choice?.modelName),
    followPlatform,
    primaryUnavailable,
    fallback,
    fallbackModel: fallback ? modelOn(fallback, null) : '',
    fallbackFollow,
    fallbackUnavailable,
    supportsTools: primary ? primary.supportsTools !== false : true,
    contextWindow: primary?.contextWindow || null
  }
}

/** 两个选择是否等价（没选主通道时不比较模型） */
export function sameRouteChoice(a, b) {
  if ((a?.primaryProviderId || '') !== (b?.primaryProviderId || '')) return false
  if ((a?.fallbackProviderId || '') !== (b?.fallbackProviderId || '')) return false
  if (a?.primaryProviderId && !sameModel(a?.modelName, b?.modelName)) return false
  return true
}

export function formatContextWindow(tokens) {
  if (!tokens) return ''
  if (tokens >= 1000) return `${Math.round(tokens / 1024)}K`
  return String(tokens)
}
