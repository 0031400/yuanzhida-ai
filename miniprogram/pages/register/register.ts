import { register, sendRegisterCode } from '../../api/user'
import { pickErrorMessage } from '../../utils/error'
import { isNonEmpty, isValidBuaaRegisterMail } from '../../utils/validate'

const CODE_SECONDS = 60
let countdownTimer: number | null = null

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
    if (!isValidBuaaRegisterMail(mail)) {
      wx.showToast({
        title: '邮箱格式需为8位数字@buaa.edu.cn',
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
    if (!isValidBuaaRegisterMail(mail)) {
      wx.showToast({
        title: '邮箱格式需为8位数字@buaa.edu.cn',
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
