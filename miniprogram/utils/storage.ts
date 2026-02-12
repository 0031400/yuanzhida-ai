export const STORAGE_KEYS = {
  token: 'auth_token',
  username: 'auth_username',
} as const

export const storage = {
  getString(key: string): string {
    const value = wx.getStorageSync(key)
    return typeof value === 'string' ? value : ''
  },
  setString(key: string, value: string): void {
    wx.setStorageSync(key, value)
  },
  remove(key: string): void {
    wx.removeStorageSync(key)
  },
}
