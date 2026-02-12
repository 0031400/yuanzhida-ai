const toDate = (value: string | number | Date): Date => {
  if (value instanceof Date) {
    return value
  }
  return new Date(value)
}

const pad = (num: number): string => {
  if (num >= 10) {
    return String(num)
  }
  return `0${num}`
}

export const formatDateTime = (value: string | number | Date, pattern = 'YYYY-MM-DD HH:mm'): string => {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const map: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
  }

  return pattern.replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => map[token])
}

export const formatFromNow = (value: string | number | Date): string => {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const diff = Date.now() - date.getTime()
  const absDiff = Math.abs(diff)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (absDiff < minute) {
    return diff >= 0 ? '刚刚' : '马上'
  }
  if (absDiff < hour) {
    const val = Math.floor(absDiff / minute)
    return diff >= 0 ? `${val}分钟前` : `${val}分钟后`
  }
  if (absDiff < day) {
    const val = Math.floor(absDiff / hour)
    return diff >= 0 ? `${val}小时前` : `${val}小时后`
  }
  if (absDiff < 7 * day) {
    const val = Math.floor(absDiff / day)
    return diff >= 0 ? `${val}天前` : `${val}天后`
  }
  return formatDateTime(date, 'YYYY-MM-DD HH:mm')
}
