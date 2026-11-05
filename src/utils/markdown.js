import DOMPurify from 'dompurify'
import { marked } from 'marked'

// 模型输出可能带图片链接或 HTML，这里只放行排版用的标签。
// 图片换成链接：外部图片一显示就会向对方服务器发请求，可能把对话内容带出去；FAQ 附图走单独的字段，不受影响
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'del', 'code', 'pre',
  'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a'
]
const ALLOWED_ATTR = ['href', 'title', 'align', 'start', 'colspan', 'rowspan', 'target', 'rel']

const purifier = DOMPurify()
purifier.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    image({ href, text }) {
      return `<a href="${encodeURI(href || '')}">${escapeText(text) || '查看图片'}</a>`
    }
  }
})

function escapeText(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Markdown 转成可以安全放进 v-html 的 HTML */
export function renderMarkdown(text) {
  return purifier.sanitize(marked.parse(String(text || '')), { ALLOWED_TAGS, ALLOWED_ATTR })
}
