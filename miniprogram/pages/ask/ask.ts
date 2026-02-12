import { getCategoryList } from '../../api/category'
import { getQuestionDetail, updateQuestion } from '../../api/question'
import { uploadImage } from '../../api/upload'
import { envConfig } from '../../config/index'
import { authStore } from '../../store/auth.store'
import type { CategoryItem } from '../../types/category'
import { publishQuestionWithImages } from '../../services/question.service'
import { pickErrorMessage } from '../../utils/error'
import { isNonEmpty } from '../../utils/validate'

type TapEvent = WechatMiniprogram.TouchEvent
interface AskPageQuery {
  id?: string
}

const MAX_IMAGE_COUNT = 9

const normalizeImageUrl = (url: string): string => {
  const trimmed = url.trim()
  if (!trimmed) {
    return ''
  }
  if (/^https?:\/\//.test(trimmed)) {
    return trimmed
  }
  const prefix =
    envConfig.assetBaseUrl !== undefined && envConfig.assetBaseUrl !== null ? envConfig.assetBaseUrl.trim() : ''
  if (!prefix) {
    return trimmed
  }
  const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`
  const normalizedPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
  return `${normalizedPrefix}${normalizedPath}`
}

const parseImageList = (images?: string): string[] => {
  if (!images) {
    return []
  }
  return images
    .split(',')
    .map((item) => normalizeImageUrl(item))
    .filter((item) => item.length > 0)
}

const isRemoteImagePath = (path: string): boolean => /^https?:\/\//.test(path.trim())

Page({
  data: {
    pageTitle: '发布问题',
    isEditMode: false,
    editingQuestionId: 0,
    title: '',
    content: '',
    categories: [] as CategoryItem[],
    activeCategoryId: 0,
    imagePaths: [] as string[],
    loadingCategories: true,
    submitting: false,
  },
  onLoad(query: AskPageQuery) {
    const editingQuestionId = Number(query.id)
    if (Number.isFinite(editingQuestionId) && editingQuestionId > 0) {
      this.setData({
        pageTitle: '修改问题',
        isEditMode: true,
        editingQuestionId,
      })
    }
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

    if (this.data.isEditMode) {
      await this.loadQuestionForEdit(auth.username)
    }
  },
  async loadQuestionForEdit(currentUsername: string): Promise<void> {
    try {
      const detail = await getQuestionDetail(this.data.editingQuestionId)
      if (!detail.username || detail.username !== currentUsername) {
        wx.showToast({
          title: '仅题主可修改问题',
          icon: 'none',
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 250)
        return
      }
      if (detail.commentCount > 0) {
        wx.showToast({
          title: '已有同学解答，不能修改',
          icon: 'none',
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 250)
        return
      }

      const rawCategoryId =
        detail.categoryId !== undefined && detail.categoryId !== null ? detail.categoryId : detail.category
      const categoryId = Number(rawCategoryId)
      this.setData({
        title: detail.title || '',
        content: detail.content || '',
        activeCategoryId: Number.isFinite(categoryId) && categoryId > 0 ? categoryId : this.data.activeCategoryId,
        imagePaths: parseImageList(detail.images),
      })
    } catch (_error) {
      wx.showToast({
        title: '题目信息加载失败',
        icon: 'none',
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 250)
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
    if (!this.data.isEditMode && categoryId <= 0) {
      wx.showToast({
        title: '请选择主题',
        icon: 'none',
      })
      return
    }

    this.setData({ submitting: true })
    try {
      if (this.data.isEditMode) {
        const latestDetail = await getQuestionDetail(this.data.editingQuestionId)
        if (latestDetail.commentCount > 0) {
          wx.showToast({
            title: '已有同学解答，不能修改',
            icon: 'none',
          })
          return
        }
        const uploadedImages = await Promise.all(
          this.data.imagePaths.map(async (path) => (isRemoteImagePath(path) ? path : uploadImage(path))),
        )
        await updateQuestion({
          id: this.data.editingQuestionId,
          title,
          content,
          images: uploadedImages.join(','),
        })
        wx.showToast({
          title: '修改成功',
          icon: 'success',
        })
      } else {
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
      }
      setTimeout(() => {
        wx.navigateBack()
      }, 350)
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, this.data.isEditMode ? '修改失败' : '发布失败'),
        icon: 'none',
      })
    } finally {
      this.setData({ submitting: false })
    }
  },
})
