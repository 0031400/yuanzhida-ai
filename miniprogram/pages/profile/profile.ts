import {
  getActualUserProfile,
  getMyActivityScore,
  resetPassword,
  sendResetPasswordCode,
  updateUserProfile,
} from '../../api/user'
import { syncUnreadCount } from '../../services/message.service'
import { authStore } from '../../store/auth.store'
import { appStore } from '../../store/app.store'
import type { UserProfile } from '../../types/user'
import { pickErrorMessage } from '../../utils/error'
import { isNonEmpty, isValidBuaaRegisterMail } from '../../utils/validate'

type TapEvent = WechatMiniprogram.TouchEvent
type InputEvent = WechatMiniprogram.CustomEvent<{ value?: string }>

interface ProfileStat {
  label: string
  value: number
}

const CODE_SECONDS = 60
let resetCountdownTimer: number | null = null

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
    showIntroEditor: false,
    introDraft: '',
    introSubmitting: false,
    showResetPwdEditor: false,
    resetUsername: '',
    resetMail: '',
    resetCode: '',
    resetPassword: '',
    resetConfirmPassword: '',
    resetSendingCode: false,
    resetCountdown: 0,
    resetSubmitting: false,
  },
  onUnload() {
    this.clearResetCountdown()
  },
  onShow() {
    void this.bootstrap()
  },
  clearResetCountdown(): void {
    if (resetCountdownTimer !== null) {
      clearInterval(resetCountdownTimer)
      resetCountdownTimer = null
    }
  },
  startResetCountdown(): void {
    this.clearResetCountdown()
    this.setData({ resetCountdown: CODE_SECONDS })
    resetCountdownTimer = setInterval(() => {
      const next = this.data.resetCountdown - 1
      if (next <= 0) {
        this.clearResetCountdown()
        this.setData({ resetCountdown: 0 })
        return
      }
      this.setData({ resetCountdown: next })
    }, 1000)
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
    const likeCount = profile && profile.likeCount !== undefined && profile.likeCount !== null ? profile.likeCount : 0
    const collectCount =
      profile && profile.collectCount !== undefined && profile.collectCount !== null ? profile.collectCount : 0
    const usefulCount =
      profile && profile.usefulCount !== undefined && profile.usefulCount !== null ? profile.usefulCount : 0
    return [
      { label: '活跃度', value: activityScore || 0 },
      { label: '获赞', value: likeCount },
      { label: '收藏', value: collectCount },
      { label: '有用', value: usefulCount },
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
  onEditIntroductionTap(): void {
    const profile = this.data.profile
    if (!profile) {
      return
    }
    this.setData({
      showIntroEditor: true,
      introDraft: profile.introduction !== undefined && profile.introduction !== null ? profile.introduction : '',
    })
  },
  onOpenResetPwdEditor(): void {
    const profile = this.data.profile
    this.clearResetCountdown()
    this.setData({
      showResetPwdEditor: true,
      resetUsername: profile && profile.username ? profile.username : '',
      resetMail: '',
      resetCode: '',
      resetPassword: '',
      resetConfirmPassword: '',
      resetSendingCode: false,
      resetCountdown: 0,
      resetSubmitting: false,
    })
  },
  onCloseResetPwdEditor(): void {
    if (this.data.resetSubmitting) {
      return
    }
    this.clearResetCountdown()
    this.setData({
      showResetPwdEditor: false,
    })
  },
  onResetPwdPanelTap(): void {},
  onResetMailInput(event: InputEvent): void {
    const detail = event.detail as { value?: string }
    const value = detail && typeof detail.value === 'string' ? detail.value : ''
    this.setData({ resetMail: value })
  },
  onResetUsernameInput(event: InputEvent): void {
    const detail = event.detail as { value?: string }
    const value = detail && typeof detail.value === 'string' ? detail.value : ''
    this.setData({ resetUsername: value })
  },
  onResetCodeInput(event: InputEvent): void {
    const detail = event.detail as { value?: string }
    const value = detail && typeof detail.value === 'string' ? detail.value : ''
    this.setData({ resetCode: value })
  },
  onResetPasswordInput(event: InputEvent): void {
    const detail = event.detail as { value?: string }
    const value = detail && typeof detail.value === 'string' ? detail.value : ''
    this.setData({ resetPassword: value })
  },
  onResetConfirmPasswordInput(event: InputEvent): void {
    const detail = event.detail as { value?: string }
    const value = detail && typeof detail.value === 'string' ? detail.value : ''
    this.setData({ resetConfirmPassword: value })
  },
  async onSendResetCode(): Promise<void> {
    if (this.data.resetSendingCode || this.data.resetCountdown > 0) {
      return
    }
    const mail = this.data.resetMail.trim()
    if (!isValidBuaaRegisterMail(mail)) {
      wx.showToast({
        title: '邮箱格式需为8位数字@buaa.edu.cn',
        icon: 'none',
      })
      return
    }

    this.setData({ resetSendingCode: true })
    try {
      await sendResetPasswordCode(mail)
      wx.showToast({
        title: '验证码已发送',
        icon: 'success',
      })
      this.startResetCountdown()
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, '验证码发送失败'),
        icon: 'none',
      })
    } finally {
      this.setData({ resetSendingCode: false })
    }
  },
  async onSubmitResetPassword(): Promise<void> {
    if (this.data.resetSubmitting) {
      return
    }
    const username = this.data.resetUsername.trim()
    if (!isNonEmpty(username)) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none',
      })
      return
    }

    const code = this.data.resetCode.trim()
    const newPassword = this.data.resetPassword
    const confirmPassword = this.data.resetConfirmPassword
    if (!isNonEmpty(code) || !isNonEmpty(newPassword)) {
      wx.showToast({
        title: '请填写验证码和新密码',
        icon: 'none',
      })
      return
    }
    if (newPassword.length < 6) {
      wx.showToast({
        title: '密码至少 6 位',
        icon: 'none',
      })
      return
    }
    if (newPassword !== confirmPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none',
      })
      return
    }

    this.setData({ resetSubmitting: true })
    try {
      await resetPassword({
        username,
        code,
        newPassword,
      })
      this.clearResetCountdown()
      this.setData({
        showResetPwdEditor: false,
        resetUsername: '',
        resetMail: '',
        resetCode: '',
        resetPassword: '',
        resetConfirmPassword: '',
        resetCountdown: 0,
      })
      wx.showToast({
        title: '密码重置成功',
        icon: 'success',
      })
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, '密码重置失败'),
        icon: 'none',
      })
    } finally {
      this.setData({ resetSubmitting: false })
    }
  },
  onIntroductionInput(event: InputEvent): void {
    const detail = event.detail as { value?: string }
    const value = detail && typeof detail.value === 'string' ? detail.value : ''
    this.setData({
      introDraft: value,
    })
  },
  onCloseIntroEditor(): void {
    if (this.data.introSubmitting) {
      return
    }
    this.setData({
      showIntroEditor: false,
    })
  },
  onIntroEditorPanelTap(): void {},
  async onSubmitIntroduction(): Promise<void> {
    if (this.data.introSubmitting) {
      return
    }
    const profile = this.data.profile
    if (!profile || !profile.username) {
      return
    }

    const trimmed = this.data.introDraft.trim()
    const currentIntro = profile.introduction !== undefined && profile.introduction !== null ? profile.introduction : ''
    if (trimmed === currentIntro) {
      this.setData({ showIntroEditor: false })
      return
    }

    this.setData({ introSubmitting: true })
    try {
      await updateUserProfile({
        oldUsername: profile.username,
        newUsername: profile.username,
        introduction: trimmed,
      })
      this.setData({
        showIntroEditor: false,
        profile: {
          ...profile,
          introduction: trimmed,
        },
      })
      wx.showToast({
        title: '简介已更新',
        icon: 'success',
      })
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, '简介更新失败'),
        icon: 'none',
      })
    } finally {
      this.setData({ introSubmitting: false })
    }
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
    if (key === 'my-question') {
      wx.navigateTo({
        url: '/pages/my-question/my-question',
      })
      return
    }
    if (key === 'my-comment') {
      wx.navigateTo({
        url: '/pages/my-comment/my-comment',
      })
      return
    }
    if (key === 'my-collect') {
      wx.navigateTo({
        url: '/pages/my-collect/my-collect',
      })
      return
    }
    if (key === 'my-recent') {
      wx.navigateTo({
        url: '/pages/my-recent/my-recent',
      })
      return
    }
    if (key === 'reset-password') {
      this.onOpenResetPwdEditor()
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
