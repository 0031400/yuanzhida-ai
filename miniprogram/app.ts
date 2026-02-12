import { appStore } from './store/app.store'
import { authStore } from './store/auth.store'

App<IAppOption>({
  globalData: {},
  onLaunch() {
    authStore.hydrate()
    appStore.reset()

    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    wx.login({
      success: res => {
        if (!res.code) return
        // TODO: send code to backend for session exchange.
      },
    })
  },
})
