/**
 * 复制文字到剪贴板，返回是否成功。
 * 平台常部署在内网 HTTP 地址上，这时浏览器没有 navigator.clipboard，改用选中文字后复制的方式。
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 浏览器拒绝时继续尝试下面的方式
    }
  }
  const active = document.activeElement
  const el = document.createElement('textarea')
  el.value = text
  el.readOnly = true
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  el.setSelectionRange(0, text.length)
  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }
  el.remove()
  active?.focus?.()
  return copied
}
