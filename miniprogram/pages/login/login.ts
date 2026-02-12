import { fetchLoginCaptcha } from '../../api/user'
import { loginByPassword } from '../../services/auth.service'
import { STORAGE_KEYS, storage } from '../../utils/storage'
import { isNonEmpty } from '../../utils/validate'

Component({
  data: {
    username: '',
    password: '',
    code: '',
    captchaImage: '',
    captchaCookie: '',
    submitting: false,
  },
  lifetimes: {
    attached() {
      this.refreshCaptcha()
    },
  },
  methods: {
    async refreshCaptcha() {
      try {
        const captcha = await fetchLoginCaptcha()
        this.setData({
          captchaImage: captcha.imageBase64,
          captchaCookie: captcha.cookie,
          code: '',
        })
      } catch (error) {
        wx.showToast({
          title: (error as Error).message || '验证码加载失败',
          icon: 'none',
        })
      }
    },
    async onSubmit() {
      if (this.data.submitting) return

      if (!isNonEmpty(this.data.username) || !isNonEmpty(this.data.password) || !isNonEmpty(this.data.code)) {
        wx.showToast({
          title: '请完整填写登录信息',
          icon: 'none',
        })
        return
      }

      this.setData({ submitting: true })

      try {
        const captchaCookie = this.data.captchaCookie || storage.getString(STORAGE_KEYS.captchaOwner)
        await loginByPassword(
          {
            username: this.data.username.trim(),
            password: this.data.password,
            code: this.data.code.trim(),
          },
          captchaCookie,
        )
        wx.showToast({
          title: '登录成功',
          icon: 'success',
        })
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/index/index',
          })
        }, 300)
      } catch (_error) {
        await this.refreshCaptcha()
      } finally {
        this.setData({ submitting: false })
      }
    },
  },
})
