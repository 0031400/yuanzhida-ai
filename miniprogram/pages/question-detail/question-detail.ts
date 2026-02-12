import { getQuestionCommentPage } from '../../api/comment'
import { getQuestionDetail } from '../../api/question'
import type { CommentItem } from '../../types/comment'
import type { QuestionDetail } from '../../types/question'
import { formatDateTime } from '../../utils/day'

interface CommentCard extends CommentItem {
  createTimeText: string
}

interface QuestionDetailQuery {
  id?: string
}

const DEFAULT_PAGE_SIZE = 10

const parseImageList = (images?: string): string[] => {
  if (!images) {
    return []
  }
  return images
    .split(',')
    .map((item) => item.trim())
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
})
