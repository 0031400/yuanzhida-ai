import { getActualUserProfile, getMyActivityScore } from '../../api/user'
import { syncUnreadCount } from '../../services/message.service'
import { authStore } from '../../store/auth.store'
import { appStore } from '../../store/app.store'
import type { UserProfile } from '../../types/user'

type TapEvent = WechatMiniprogram.TouchEvent

interface ProfileStat {
  label: string
  value: number
}

Page({
  data: {
    loading: false,
    isLoggedIn: false,
    unreadCount: 0,
    profile: null as UserProfile | null,
    stats: [
      { label: '活跃度', value: 0 },
      { label: '获赞', value: 0 },
      { label: '收藏', value: 0 },
      { label: '有用', value: 0 },
    ] as ProfileStat[],
  },
  onShow() {
    void this.bootstrap()
  },
  async bootstrap(): Promise<void> {
    const auth = authStore.hydrate()
    if (!auth.isLoggedIn) {
      this.setData({
        isLoggedIn: false,
        loading: false,
        profile: null,
        unreadCount: 0,
        stats: this.getStats(0, null),
      })
      return
    }

    this.setData({
      loading: true,
      isLoggedIn: true,
      unreadCount: appStore.getState().unreadMessageCount,
    })

    try {
      const [profile, activityScore, unreadCount] = await Promise.all([
        getActualUserProfile(auth.username),
        getMyActivityScore().catch(() => 0),
        syncUnreadCount().catch(() => 0),
      ])

      this.setData({
        profile,
        unreadCount,
        stats: this.getStats(activityScore, profile),
      })
    } catch (error) {
      this.setData({
        profile: {
          id: 0,
          username: auth.username,
        },
        unreadCount: appStore.getState().unreadMessageCount,
        stats: this.getStats(0, null),
      })
      wx.showToast({
        title: typeof error === 'string' ? error : '个人信息加载失败',
        icon: 'none',
      })
    } finally {
      this.setData({ loading: false })
    }
  },
  getStats(activityScore: number, profile: UserProfile | null): ProfileStat[] {
    return [
      { label: '活跃度', value: activityScore || 0 },
      { label: '获赞', value: profile?.likeCount || 0 },
      { label: '收藏', value: profile?.collectCount || 0 },
      { label: '有用', value: profile?.usefulCount || 0 },
    ]
  },
  onLoginTap(): void {
    wx.navigateTo({
      url: '/pages/login/login',
    })
  },
  onGoMessageTap(): void {
    wx.switchTab({
      url: '/pages/message-center/message-center',
    })
  },
  onMenuTap(event: TapEvent): void {
    const key = String(event.currentTarget.dataset.key || '')
    if (key === 'logout') {
      this.onLogoutTap()
      return
    }
    if (key === 'message') {
      this.onGoMessageTap()
      return
    }
    wx.showToast({
      title: '该功能建设中',
      icon: 'none',
    })
  },
  onLogoutTap(): void {
    wx.showModal({
      title: '退出登录',
      content: '确定退出当前账号吗？',
      success: (res) => {
        if (!res.confirm) return
        authStore.clearAuth()
        appStore.reset()
        this.setData({
          isLoggedIn: false,
          profile: null,
          unreadCount: 0,
          stats: this.getStats(0, null),
        })
        wx.showToast({
          title: '已退出登录',
          icon: 'success',
        })
      },
    })
  },
})
