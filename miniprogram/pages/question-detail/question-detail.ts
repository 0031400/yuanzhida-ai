import {
  deleteComment,
  getQuestionCommentPage,
  likeComment,
  publishComment,
  toggleCommentUseful,
} from '../../api/comment'
import { uploadImage } from '../../api/upload'
import { envConfig } from '../../config/index'
import { getQuestionDetail, resolveQuestion } from '../../api/question'
import { authStore } from '../../store/auth.store'
import type { CommentItem } from '../../types/comment'
import type { QuestionDetail } from '../../types/question'
import { formatDateTime } from '../../utils/day'
import { pickErrorMessage } from '../../utils/error'

interface CommentCard extends CommentItem {
  createTimeText: string
  imageList: string[]
  childCards: CommentCard[]
  isMine: boolean
}

interface QuestionDetailQuery {
  id?: string
}

type InputEvent = WechatMiniprogram.CustomEvent<{ value: string }>

const DEFAULT_PAGE_SIZE = 10
const MAX_COMMENT_IMAGE_COUNT = 9

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
    replyParentCommentId: 0,
    replyTopCommentId: 0,
    replyToUsername: '',
    currentUsername: '',
    canResolveQuestion: false,
    resolvingQuestion: false,
  },
  onLoad(query: QuestionDetailQuery) {
    const auth = authStore.hydrate()
    this.setData({
      currentUsername: auth.username,
    })
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
    const auth = authStore.hydrate()
    this.setData({
      currentUsername: auth.username,
    })
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
      const canResolveQuestion =
        this.data.currentUsername.length > 0 &&
        detail.username !== undefined &&
        detail.username !== null &&
        detail.username === this.data.currentUsername
      this.setData({
        question: detail,
        imageList: parseImageList(detail.images),
        questionTimeText: formatDateTime(detail.createTime),
        canResolveQuestion,
      })
    } catch (_error) {
      wx.showToast({
        title: '题目加载失败',
        icon: 'none',
      })
    }
  },
  async onMarkResolved(): Promise<void> {
    if (this.data.resolvingQuestion) {
      return
    }
    const question = this.data.question
    if (!question) {
      return
    }
    if (!this.ensureLoginForAction()) {
      return
    }
    if (!this.data.canResolveQuestion) {
      wx.showToast({
        title: '仅题主可标记已解决',
        icon: 'none',
      })
      return
    }

    this.setData({ resolvingQuestion: true })
    try {
      const nextSolvedFlag = question.solvedFlag === 1 ? 0 : 1
      await resolveQuestion(question.id)
      this.setData({
        question: {
          ...question,
          solvedFlag: nextSolvedFlag,
        },
      })
      wx.showToast({
        title: nextSolvedFlag === 1 ? '已标记为已解决' : '已取消已解决',
        icon: 'success',
      })
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, '标记失败'),
        icon: 'none',
      })
    } finally {
      this.setData({ resolvingQuestion: false })
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
      const records = page.records.map((item) => this.toCommentCard(item))
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
  toCommentCard(comment: CommentItem): CommentCard {
    const source = comment as unknown as { childComments?: CommentItem[] }
    const rawChildren = Array.isArray(source.childComments) ? source.childComments : []
    const childCards = rawChildren.map((child) => this.toCommentCard({ ...child, childComments: [] }))

    return {
      ...comment,
      createTimeText: formatDateTime(comment.createTime),
      imageList: parseImageList(comment.images),
      childCards,
      isMine:
        this.data.currentUsername.length > 0 &&
        comment.username !== undefined &&
        comment.username !== null &&
        comment.username === this.data.currentUsername,
    }
  },
  ensureLoginForAction(): boolean {
    const auth = authStore.hydrate()
    this.setData({
      currentUsername: auth.username,
    })
    if (auth.isLoggedIn) {
      return true
    }
    wx.showToast({
      title: '请先登录',
      icon: 'none',
    })
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/login/login',
      })
    }, 200)
    return false
  },
  async onLikeComment(event: WechatMiniprogram.TouchEvent): Promise<void> {
    if (!this.ensureLoginForAction()) {
      return
    }
    const rawId = event.currentTarget.dataset.id
    const username = String(event.currentTarget.dataset.username || '')
    const id = typeof rawId === 'number' ? rawId : Number(rawId)
    if (!Number.isFinite(id) || id <= 0) {
      return
    }
    if (username && username === this.data.currentUsername) {
      wx.showToast({
        title: '不能点赞自己的评论',
        icon: 'none',
      })
      return
    }

    try {
      const likePayload: { id: number; entityUserId?: number } = { id }
      const question = this.data.question
      const entityUserId =
        question && question.userId !== undefined && question.userId !== null ? Number(question.userId) : NaN
      if (Number.isFinite(entityUserId)) {
        likePayload.entityUserId = entityUserId
      }
      await likeComment(likePayload)
      wx.showToast({
        title: '操作成功',
        icon: 'success',
      })
      await this.loadComments(true)
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, '点赞失败'),
        icon: 'none',
      })
    }
  },
  onDeleteComment(event: WechatMiniprogram.TouchEvent): void {
    if (!this.ensureLoginForAction()) {
      return
    }
    const rawId = event.currentTarget.dataset.id
    const username = String(event.currentTarget.dataset.username || '')
    const rawHasChildren = event.currentTarget.dataset.hasChildren
    const id = typeof rawId === 'number' ? rawId : Number(rawId)
    const hasChildren = rawHasChildren === true || rawHasChildren === 'true'
    if (!Number.isFinite(id) || id <= 0) {
      return
    }
    if (username !== this.data.currentUsername) {
      wx.showToast({
        title: '只能删除自己的评论',
        icon: 'none',
      })
      return
    }
    if (hasChildren) {
      wx.showToast({
        title: '该评论有回复，暂不支持删除',
        icon: 'none',
      })
      return
    }

    wx.showModal({
      title: '删除评论',
      content: '确认删除这条评论吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await deleteComment(id)
          await this.loadQuestionDetail()
          wx.showToast({
            title: '删除成功',
            icon: 'success',
          })
          await this.loadComments(true)
        } catch (error) {
          wx.showToast({
            title: pickErrorMessage(error, '删除失败'),
            icon: 'none',
          })
        }
      },
    })
  },
  async onToggleCommentUseful(event: WechatMiniprogram.TouchEvent): Promise<void> {
    if (!this.ensureLoginForAction()) {
      return
    }
    if (!this.data.canResolveQuestion) {
      wx.showToast({
        title: '仅题主可标记有用',
        icon: 'none',
      })
      return
    }
    const rawId = event.currentTarget.dataset.id
    const rawUseful = event.currentTarget.dataset.useful
    const id = typeof rawId === 'number' ? rawId : Number(rawId)
    if (!Number.isFinite(id) || id <= 0) {
      return
    }

    try {
      await toggleCommentUseful(id)
      wx.showToast({
        title: rawUseful === 1 || rawUseful === '1' ? '已取消有用' : '已标记有用',
        icon: 'success',
      })
      await this.loadComments(true)
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, '操作失败'),
        icon: 'none',
      })
    }
  },
  onReplyTopComment(event: WechatMiniprogram.TouchEvent): void {
    const rawId = event.currentTarget.dataset.id
    const username = String(event.currentTarget.dataset.username || '')
    const parentId = typeof rawId === 'number' ? rawId : Number(rawId)
    if (!Number.isFinite(parentId) || parentId <= 0) {
      return
    }
    this.setData({
      replyParentCommentId: parentId,
      replyTopCommentId: parentId,
      replyToUsername: username,
    })
  },
  onReplyChildComment(event: WechatMiniprogram.TouchEvent): void {
    const rawTopId = event.currentTarget.dataset.topId
    const username = String(event.currentTarget.dataset.username || '')
    const topId = typeof rawTopId === 'number' ? rawTopId : Number(rawTopId)
    if (!Number.isFinite(topId) || topId <= 0) {
      return
    }
    // Enforce at most one child layer by always replying under top comment.
    this.setData({
      replyParentCommentId: topId,
      replyTopCommentId: topId,
      replyToUsername: username,
    })
  },
  onCancelReply(): void {
    this.setData({
      replyParentCommentId: 0,
      replyTopCommentId: 0,
      replyToUsername: '',
    })
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
        parentCommentId: this.data.replyParentCommentId,
        topCommentId: this.data.replyTopCommentId,
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
        replyParentCommentId: 0,
        replyTopCommentId: 0,
        replyToUsername: '',
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
  onPreviewChildCommentImage(event: WechatMiniprogram.TouchEvent) {
    const rawTopIndex = event.currentTarget.dataset.topIndex
    const rawChildIndex = event.currentTarget.dataset.childIndex
    const rawImageIndex = event.currentTarget.dataset.imageIndex
    const topIndex = typeof rawTopIndex === 'number' ? rawTopIndex : Number(rawTopIndex)
    const childIndex = typeof rawChildIndex === 'number' ? rawChildIndex : Number(rawChildIndex)
    const imageIndex = typeof rawImageIndex === 'number' ? rawImageIndex : Number(rawImageIndex)
    if (!Number.isFinite(topIndex) || !Number.isFinite(childIndex) || !Number.isFinite(imageIndex)) {
      return
    }
    const topComment = this.data.comments[topIndex]
    if (!topComment || !topComment.childCards || topComment.childCards.length <= childIndex) {
      return
    }
    const childComment = topComment.childCards[childIndex]
    if (!childComment || !childComment.imageList || childComment.imageList.length === 0) {
      return
    }
    wx.previewImage({
      current: childComment.imageList[imageIndex],
      urls: childComment.imageList,
    })
  },
})
