import { getCategoryList } from '../../api/category'
import { authStore } from '../../store/auth.store'
import type { CategoryItem } from '../../types/category'
import { publishQuestionWithImages } from '../../services/question.service'
import { pickErrorMessage } from '../../utils/error'
import { isNonEmpty } from '../../utils/validate'

type TapEvent = WechatMiniprogram.TouchEvent

const MAX_IMAGE_COUNT = 3
Page({
  data: {
    title: '',
    content: '',
    categories: [] as CategoryItem[],
    activeCategoryId: 0,
    imagePaths: [] as string[],
    loadingCategories: true,
    submitting: false,
  },
  onLoad() {
    void this.bootstrap()
  },
  async bootstrap(): Promise<void> {
    const auth = authStore.hydrate()
    if (!auth.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      })
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login',
        })
      }, 250)
      return
    }

    try {
      const categories = await getCategoryList()
      const firstCategory = categories.length > 0 ? categories[0] : null
      this.setData({
        categories,
        activeCategoryId:
          firstCategory && firstCategory.id !== undefined && firstCategory.id !== null
            ? firstCategory.id
            : 0,
      })
    } catch (_error) {
      wx.showToast({
        title: '主题加载失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        loadingCategories: false,
      })
    }
  },
  onCategoryTap(event: TapEvent): void {
    const rawId = event.currentTarget.dataset.id
    const categoryId = typeof rawId === 'number' ? rawId : Number(rawId)
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      return
    }
    this.setData({
      activeCategoryId: categoryId,
    })
  },
  async onChooseImages(): Promise<void> {
    const currentCount = this.data.imagePaths.length
    if (currentCount >= MAX_IMAGE_COUNT) {
      wx.showToast({
        title: `最多上传 ${MAX_IMAGE_COUNT} 张`,
        icon: 'none',
      })
      return
    }

    const chooseCount = MAX_IMAGE_COUNT - currentCount
    try {
      const result = await wx.chooseImage({
        count: chooseCount,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      const next = [...this.data.imagePaths, ...result.tempFilePaths].slice(0, MAX_IMAGE_COUNT)
      this.setData({
        imagePaths: next,
      })
    } catch (_error) {
      // user cancel should be silent
    }
  },
  onRemoveImage(event: TapEvent): void {
    const rawIndex = event.currentTarget.dataset.index
    const index = typeof rawIndex === 'number' ? rawIndex : Number(rawIndex)
    if (!Number.isFinite(index)) {
      return
    }
    const next = [...this.data.imagePaths]
    next.splice(index, 1)
    this.setData({
      imagePaths: next,
    })
  },
  onPreviewImage(event: TapEvent): void {
    const rawIndex = event.currentTarget.dataset.index
    const index = typeof rawIndex === 'number' ? rawIndex : Number(rawIndex)
    if (!Number.isFinite(index)) {
      return
    }
    wx.previewImage({
      current: this.data.imagePaths[index],
      urls: this.data.imagePaths,
    })
  },
  async onSubmit(): Promise<void> {
    if (this.data.submitting) {
      return
    }

    const title = this.data.title.trim()
    const content = this.data.content.trim()
    const categoryId = this.data.activeCategoryId

    if (!isNonEmpty(title) || !isNonEmpty(content)) {
      wx.showToast({
        title: '请填写标题和内容',
        icon: 'none',
      })
      return
    }
    if (title.length > 50) {
      wx.showToast({
        title: '标题最多 50 字',
        icon: 'none',
      })
      return
    }
    if (categoryId <= 0) {
      wx.showToast({
        title: '请选择主题',
        icon: 'none',
      })
      return
    }

    this.setData({ submitting: true })
    try {
      await publishQuestionWithImages({
        title,
        content,
        categoryId,
        localImages: this.data.imagePaths,
      })
      wx.showToast({
        title: '发布成功',
        icon: 'success',
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 350)
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, '发布失败'),
        icon: 'none',
      })
    } finally {
      this.setData({ submitting: false })
    }
  },
})
