const ERROR_MESSAGE_MAP: Record<string, string> = {
  A000204: '登录状态失效，请重新登录',
  A000205: '验证码错误，请重试',
  A000201: '用户名不存在',
  A000202: '密码错误',
  A000104: '验证码错误',
  A000101: '用户名已存在',
  A00105: '邮箱已被注册',
  A000302: '用户信息更新失败',
  C000101: '问题不存在',
  C000102: '操作权限不足',
  C000103: '评论不存在',
  C000104: '评论操作权限不足',
  C000105: '主题操作权限不足',
  B000101: '邮件发送失败',
  B000102: '图片上传失败',
  B000103: '系统繁忙，请稍后重试',
  B000001: '系统执行出错',
}

export const getErrorMessage = (code: string, fallback?: string | null): string => {
  if (ERROR_MESSAGE_MAP[code]) return ERROR_MESSAGE_MAP[code]
  if (fallback) return fallback
  return '请求失败，请稍后重试'
}
