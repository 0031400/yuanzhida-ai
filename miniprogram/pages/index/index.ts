import { authStore } from '../../store/auth.store'
import { logout } from '../../services/auth.service'

Component({
  data: {
    isLoggedIn: false,
    username: '',
  },
  lifetimes: {
    attached() {
      this.syncAuthState()
    },
  },
  pageLifetimes: {
    show() {
      this.syncAuthState()
    },
  },
  methods: {
    syncAuthState() {
      const auth = authStore.hydrate()
      this.setData({
        isLoggedIn: auth.isLoggedIn,
        username: auth.username,
      })
    },
    goLogin() {
      wx.navigateTo({
        url: '/pages/login/login',
      })
    },
    onLogout() {
      logout()
      this.syncAuthState()
      wx.showToast({
        title: '已退出登录',
        icon: 'none',
      })
    },
  },
})
