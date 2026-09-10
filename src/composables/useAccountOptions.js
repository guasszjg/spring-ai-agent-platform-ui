export function accountLabel(item) {
  if (!item) return '未知账号'
  if (item.ownerUsername) return '@' + item.ownerUsername
  if (item.ownerId) return '@' + String(item.ownerId).slice(0, 8)
  return '未知账号'
}
