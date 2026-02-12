import { register, sendRegisterCode } from '../../api/user'
import { isNonEmpty } from '../../utils/validate'

const CODE_SECONDS = 60
let countdownTimer: number | null = null
const pickErrorMessage = (error: unknown, fallback: string): string =>
  typeof error === 'string' && error.trim().length > 0 ? error : fallback

const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

Page({
  data: {
    username: '',
    mail: '',
    code: '',
    password: '',
    confirmPassword: '',
    sendingCode: false,
    countdown: 0,
    submitting: false,
  },
  onUnload() {
    this.clearCountdown()
  },
  clearCountdown() {
    if (countdownTimer !== null) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  },
  startCountdown() {
    this.clearCountdown()
    this.setData({ countdown: CODE_SECONDS })
    countdownTimer = setInterval(() => {
      const next = this.data.countdown - 1
      if (next <= 0) {
        this.clearCountdown()
        this.setData({ countdown: 0 })
        return
      }
      this.setData({ countdown: next })
    }, 1000)
  },
  async onSendCode() {
    if (this.data.sendingCode || this.data.countdown > 0) {
      return
    }
    const mail = this.data.mail.trim()
    if (!isEmail(mail)) {
      wx.showToast({
        title: '请输入有效邮箱',
        icon: 'none',
      })
      return
    }

    this.setData({ sendingCode: true })
    try {
      await sendRegisterCode(mail)
      wx.showToast({
        title: '验证码已发送',
        icon: 'success',
      })
      this.startCountdown()
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, '验证码发送失败'),
        icon: 'none',
      })
    } finally {
      this.setData({ sendingCode: false })
    }
  },
  async onSubmit() {
    if (this.data.submitting) {
      return
    }

    const username = this.data.username.trim()
    const mail = this.data.mail.trim()
    const code = this.data.code.trim()
    const password = this.data.password
    const confirmPassword = this.data.confirmPassword

    if (!isNonEmpty(username) || !isNonEmpty(mail) || !isNonEmpty(code) || !isNonEmpty(password)) {
      wx.showToast({
        title: '请完整填写注册信息',
        icon: 'none',
      })
      return
    }
    if (!isEmail(mail)) {
      wx.showToast({
        title: '请输入有效邮箱',
        icon: 'none',
      })
      return
    }
    if (password.length < 6) {
      wx.showToast({
        title: '密码至少 6 位',
        icon: 'none',
      })
      return
    }
    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none',
      })
      return
    }

    this.setData({ submitting: true })
    try {
      await register({
        username,
        mail,
        code,
        password,
      })
      wx.showToast({
        title: '注册成功，请登录',
        icon: 'success',
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, '注册失败'),
        icon: 'none',
      })
    } finally {
      this.setData({ submitting: false })
    }
  },
  goLogin() {
    wx.navigateBack()
  },
})
