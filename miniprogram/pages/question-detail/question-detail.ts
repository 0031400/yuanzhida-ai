import { getQuestionCommentPage, publishComment } from '../../api/comment'
import { uploadImage } from '../../api/upload'
import { envConfig } from '../../config/index'
import { getQuestionDetail } from '../../api/question'
import { authStore } from '../../store/auth.store'
import type { CommentItem } from '../../types/comment'
import type { QuestionDetail } from '../../types/question'
import { formatDateTime } from '../../utils/day'
import { pickErrorMessage } from '../../utils/error'

interface CommentCard extends CommentItem {
  createTimeText: string
  imageList: string[]
}

interface QuestionDetailQuery {
  id?: string
}

type InputEvent = WechatMiniprogram.CustomEvent<{ value: string }>

const DEFAULT_PAGE_SIZE = 10
const MAX_COMMENT_IMAGE_COUNT = 3

const normalizeImageUrl = (url: string): string => {
  const trimmed = url.trim()
  if (!trimmed) {
    return ''
  }
  if (/^https?:\/\//.test(trimmed)) {
    return trimmed
  }
  const prefix =
    envConfig.assetBaseUrl !== undefined && envConfig.assetBaseUrl !== null
      ? envConfig.assetBaseUrl.trim()
      : ''
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

Page({
  data: {
    questionId: 0,
    question: null as QuestionDetail | null,
    imageList: [] as string[],
    questionTimeText: '',
    comments: [] as CommentCard[],
    loading: true,
    commentLoadingMore: false,
    hasMoreComments: true,
    commentCurrent: 1,
    commentSize: DEFAULT_PAGE_SIZE,
    commentDraft: '',
    commentImagePaths: [] as string[],
    submittingComment: false,
  },
  onLoad(query: QuestionDetailQuery) {
    const questionId = Number(query.id)
    if (!Number.isFinite(questionId) || questionId <= 0) {
      wx.showToast({
        title: '参数错误',
        icon: 'none',
      })
      return
    }
    this.setData({
      questionId,
    })
    void this.bootstrap()
  },
  onPullDownRefresh() {
    void this.bootstrap(true)
  },
  onReachBottom() {
    void this.loadComments(false)
  },
  async bootstrap(withRefresh = false): Promise<void> {
    this.setData({
      loading: true,
      hasMoreComments: true,
      commentCurrent: 1,
      comments: [],
    })
    try {
      await this.loadQuestionDetail()
      await this.loadComments(true)
    } finally {
      this.setData({
        loading: false,
      })
      if (withRefresh) {
        wx.stopPullDownRefresh()
      }
    }
  },
  async loadQuestionDetail(): Promise<void> {
    try {
      const detail = await getQuestionDetail(this.data.questionId)
      this.setData({
        question: detail,
        imageList: parseImageList(detail.images),
        questionTimeText: formatDateTime(detail.createTime),
      })
    } catch (_error) {
      wx.showToast({
        title: '题目加载失败',
        icon: 'none',
      })
    }
  },
  async loadComments(reset: boolean): Promise<void> {
    if (!reset && (this.data.commentLoadingMore || !this.data.hasMoreComments)) {
      return
    }

    const current = reset ? 1 : this.data.commentCurrent
    this.setData({
      commentLoadingMore: !reset,
    })

    try {
      const page = await getQuestionCommentPage({
        current,
        size: this.data.commentSize,
        id: this.data.questionId,
      })
      const records = page.records.map((item) => ({
        ...item,
        createTimeText: formatDateTime(item.createTime),
        imageList: parseImageList(item.images),
      }))
      const mergedComments = reset ? records : [...this.data.comments, ...records]
      const hasMoreComments = page.current * page.size < page.total
      this.setData({
        comments: mergedComments,
        commentCurrent: current + 1,
        hasMoreComments,
      })
    } catch (_error) {
      wx.showToast({
        title: '评论加载失败',
        icon: 'none',
      })
    } finally {
      this.setData({
        commentLoadingMore: false,
      })
    }
  },
  onCommentInput(event: InputEvent): void {
    const detail = event.detail as { value?: string }
    const value = typeof detail.value === 'string' ? detail.value : ''
    this.setData({
      commentDraft: value,
    })
  },
  async onChooseCommentImages(): Promise<void> {
    const currentCount = this.data.commentImagePaths.length
    if (currentCount >= MAX_COMMENT_IMAGE_COUNT) {
      wx.showToast({
        title: `最多上传 ${MAX_COMMENT_IMAGE_COUNT} 张`,
        icon: 'none',
      })
      return
    }

    try {
      const result = await wx.chooseImage({
        count: MAX_COMMENT_IMAGE_COUNT - currentCount,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      const next = [...this.data.commentImagePaths, ...result.tempFilePaths].slice(0, MAX_COMMENT_IMAGE_COUNT)
      this.setData({
        commentImagePaths: next,
      })
    } catch (_error) {
      // user cancel should be silent
    }
  },
  onRemoveCommentImage(event: WechatMiniprogram.TouchEvent): void {
    const rawIndex = event.currentTarget.dataset.index
    const index = typeof rawIndex === 'number' ? rawIndex : Number(rawIndex)
    if (!Number.isFinite(index)) {
      return
    }
    const next = [...this.data.commentImagePaths]
    next.splice(index, 1)
    this.setData({
      commentImagePaths: next,
    })
  },
  onPreviewCommentDraftImage(event: WechatMiniprogram.TouchEvent): void {
    const rawIndex = event.currentTarget.dataset.index
    const index = typeof rawIndex === 'number' ? rawIndex : Number(rawIndex)
    if (!Number.isFinite(index)) {
      return
    }
    const urls = this.data.commentImagePaths
    if (urls.length === 0) {
      return
    }
    wx.previewImage({
      current: urls[index],
      urls,
    })
  },
  async onSubmitComment(): Promise<void> {
    if (this.data.submittingComment) {
      return
    }

    const auth = authStore.hydrate()
    if (!auth.isLoggedIn) {
      wx.showToast({
        title: '请先登录后评论',
        icon: 'none',
      })
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login',
        })
      }, 200)
      return
    }

    const content = this.data.commentDraft.trim()
    if (content.length === 0 && this.data.commentImagePaths.length === 0) {
      wx.showToast({
        title: '请输入评论内容或添加图片',
        icon: 'none',
      })
      return
    }

    this.setData({ submittingComment: true })
    try {
      const uploadedImages = await Promise.all(this.data.commentImagePaths.map(uploadImage))
      const images = uploadedImages.join(',')
      await publishComment({
        questionId: this.data.questionId,
        content,
        images,
      })
      const currentQuestion = this.data.question
      if (currentQuestion) {
        this.setData({
          question: {
            ...currentQuestion,
            commentCount: currentQuestion.commentCount + 1,
          },
        })
      }
      this.setData({
        commentDraft: '',
        commentImagePaths: [],
      })
      wx.showToast({
        title: '评论成功',
        icon: 'success',
      })
      await this.loadComments(true)
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, '评论失败'),
        icon: 'none',
      })
    } finally {
      this.setData({ submittingComment: false })
    }
  },
  onPreviewImage(event: WechatMiniprogram.TouchEvent) {
    const rawIndex = event.currentTarget.dataset.index
    const index = typeof rawIndex === 'number' ? rawIndex : Number(rawIndex)
    if (!Number.isFinite(index)) {
      return
    }
    const urls = this.data.imageList
    if (urls.length === 0) {
      return
    }
    wx.previewImage({
      current: urls[index],
      urls,
    })
  },
  onPreviewCommentImage(event: WechatMiniprogram.TouchEvent) {
    const rawCommentIndex = event.currentTarget.dataset.commentIndex
    const rawImageIndex = event.currentTarget.dataset.imageIndex
    const commentIndex = typeof rawCommentIndex === 'number' ? rawCommentIndex : Number(rawCommentIndex)
    const imageIndex = typeof rawImageIndex === 'number' ? rawImageIndex : Number(rawImageIndex)
    if (!Number.isFinite(commentIndex) || !Number.isFinite(imageIndex)) {
      return
    }
    const comment = this.data.comments[commentIndex]
    if (!comment || !comment.imageList || comment.imageList.length === 0) {
      return
    }
    wx.previewImage({
      current: comment.imageList[imageIndex],
      urls: comment.imageList,
    })
  },
})
