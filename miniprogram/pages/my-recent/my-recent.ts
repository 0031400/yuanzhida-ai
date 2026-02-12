import { getMyRecentQuestionPage } from '../../api/question'
import { authStore } from '../../store/auth.store'
import type { QuestionItem } from '../../types/question'
import { formatFromNow } from '../../utils/day'
import { pickErrorMessage } from '../../utils/error'

interface RecentQuestionCard extends QuestionItem {
  createTimeText: string
  solvedText: string
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
    questions: [] as RecentQuestionCard[],
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
    void this.loadQuestions(true)
  },
  mapToCard(question: QuestionItem): RecentQuestionCard {
    return {
      ...question,
      createTimeText: formatFromNow(question.createTime),
      solvedText: question.solvedFlag === 1 ? '已解决' : '待解决',
    }
  },
  async loadQuestions(reset: boolean): Promise<void> {
    if (!reset && (this.data.loading || this.data.loadingMore || !this.data.hasMore)) {
      return
    }

    const current = reset ? 1 : this.data.current
    if (reset) {
      this.setData({
        loading: this.data.questions.length === 0,
        refreshing: true,
        hasMore: true,
      })
    } else {
      this.setData({
        loadingMore: true,
      })
    }

    try {
      const page = await getMyRecentQuestionPage(current, this.data.size)
      const records = page.records.map((item) => this.mapToCard(item))
      const merged = reset ? records : [...this.data.questions, ...records]
      const hasMore = page.current * page.size < page.total
      this.setData({
        questions: merged,
        current: current + 1,
        hasMore,
      })
    } catch (error) {
      wx.showToast({
        title: pickErrorMessage(error, '最近浏览加载失败'),
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
    void this.loadQuestions(true)
  },
  onScrollToLower(): void {
    void this.loadQuestions(false)
  },
  onQuestionTap(event: WechatMiniprogram.TouchEvent): void {
    const rawId = event.currentTarget.dataset.id
    const id = typeof rawId === 'number' ? rawId : Number(rawId)
    if (!Number.isFinite(id) || id <= 0) {
      wx.showToast({
        title: '题目已不存在',
        icon: 'none',
      })
      return
    }
    wx.navigateTo({
      url: `/pages/question-detail/question-detail?id=${id}`,
    })
  },
})
