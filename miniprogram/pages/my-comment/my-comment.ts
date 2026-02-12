import { getMyCommentPage } from '../../api/comment'
import { authStore } from '../../store/auth.store'
import type { CommentItem } from '../../types/comment'
import { formatDateTime } from '../../utils/day'
import { pickErrorMessage } from '../../utils/error'

interface MyCommentCard extends CommentItem {
  createTimeText: string
}

const DEFAULT_PAGE_SIZE = 10

Page({
  data: {
    loading: true,
    refreshing: false,
    loadingMore: false,
    hasMore: true,
    current: 1,
    size: DEFAULT_PAGE_SIZE,
    comments: [] as MyCommentCard[],
  },
  onShow() {
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
      }, 200)
      return
    }
    void this.loadComments(true)
  },
  async loadComments(reset: boolean): Promise<void> {
    if (!reset && (this.data.loading || this.data.loadingMore || !this.data.hasMore)) {
      return
    }

    const current = reset ? 1 : this.data.current
    if (reset) {
      this.setData({
        loading: this.data.comments.length === 0,
        refreshing: true,
        hasMore: true,
      })
    } else {
      this.setData({
        loadingMore: true,
      })
    }

    try {
      const page = await getMyCommentPage(current, this.data.size)
      const records = page.records.map((item) => ({
        ...item,
        createTimeText: formatDateTime(item.createTime),
      }))
      const merged = reset ? records : [...this.data.comments, ...records]
      const hasMore = page.current * page.size < page.total
      this.setData({
        comments: merged,
        current: current + 1,
        hasMore,
      })
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, '我的评论加载失败'),
        icon: 'none',
      })
    } finally {
      this.setData({
        loading: false,
        refreshing: false,
        loadingMore: false,
      })
    }
  },
  onRefresherRefresh(): void {
    if (this.data.refreshing) {
      return
    }
    void this.loadComments(true)
  },
  onScrollToLower(): void {
    void this.loadComments(false)
  },
  onCommentTap(event: WechatMiniprogram.TouchEvent): void {
    const rawQuestionId = event.currentTarget.dataset.questionId
    const questionId = typeof rawQuestionId === 'number' ? rawQuestionId : Number(rawQuestionId)
    if (!Number.isFinite(questionId) || questionId <= 0) {
      wx.showToast({
        title: '题目已不存在',
        icon: 'none',
      })
      return
    }
    wx.navigateTo({
      url: `/pages/question-detail/question-detail?id=${questionId}`,
    })
  },
})
