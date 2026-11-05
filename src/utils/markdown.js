import DOMPurify from 'dompurify'
import { marked } from 'marked'

// 模型输出可能带图片链接或 HTML，这里只放行排版用的标签。
// 图片换成链接：外部图片一显示就会向对方服务器发请求，可能把对话内容带出去；FAQ 附图走单独的字段，不受影响
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'del', 'code', 'pre',
  'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a'
]
const ALLOWED_ATTR = ['href', 'title', 'align', 'start', 'colspan', 'rowspan', 'target', 'rel']

let markInternalLinks = false

const purifier = DOMPurify()
purifier.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName !== 'A') return
  const href = node.getAttribute('href') || ''
  // 只认 / 开头的站内路径；//example.com 和 /\example.com 其实是外部地址
  if (markInternalLinks && /^\/(?![/\\])/.test(href)) {
    node.setAttribute('class', 'md-link')
    node.setAttribute('data-internal', '1')
    return
  }
  node.setAttribute('target', '_blank')
  node.setAttribute('rel', 'noopener noreferrer')
})

marked.use({
  gfm: true,
  breaks: true,
  extensions: [
    {
      // 标准规则下，结束的 ** 前是标点、后面紧跟文字时不算结束（如 **【列表】**中点击），中文回答里很常见，单独处理
      name: 'cjkStrong',
      level: 'inline',
      start(src) {
        return src.indexOf('**')
      },
      tokenizer(src) {
        const match = /^\*\*(?=\S)([^*\n]*?\S)\*\*(?!\*)/.exec(src)
        if (!match) return undefined
        return { type: 'strong', raw: match[0], text: match[1], tokens: this.lexer.inlineTokens(match[1]) }
      }
    }
  ],
  renderer: {
    image({ href, text }) {
      return `<a href="${encodeURI(href || '')}">${escapeText(text) || '查看图片'}</a>`
    }
  }
})

function escapeText(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Markdown 转成可以安全放进 v-html 的 HTML。
 * @param internalLinks 为 true 时给站内链接加 data-internal，由调用方在平台内跳转；其余链接都在新窗口打开
 */
export function renderMarkdown(text, { internalLinks = false } = {}) {
  markInternalLinks = internalLinks
  return purifier.sanitize(marked.parse(String(text || '')), { ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false })
}
