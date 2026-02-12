import { getCategoryList } from '../../api/category'
import { getQuestionPage } from '../../api/question'
import { authStore } from '../../store/auth.store'
import type { CategoryItem } from '../../types/category'
import type { QuestionItem, QuestionPageQuery } from '../../types/question'
import { formatFromNow } from '../../utils/day'

type SearchInputEvent = WechatMiniprogram.CustomEvent<string>
type TapEvent = WechatMiniprogram.TouchEvent

interface QuestionCard extends QuestionItem {
  categoryName: string
  createTimeText: string
  solvedText: string
}

const ALL_CATEGORY_ID = 0
const DEFAULT_PAGE_SIZE = 10

const toCategoryId = (question: QuestionItem): number => {
  if (typeof question.categoryId === 'number') {
    return question.categoryId
  }
  if (typeof question.category === 'number') {
    return question.category
  }
  return 0
}

Component({
  data: {
    keyword: '',
    categories: [] as CategoryItem[],
    activeCategoryId: ALL_CATEGORY_ID,
    questions: [] as QuestionCard[],
    loading: true,
    loadingMore: false,
    refreshing: false,
    hasMore: true,
    current: 1,
    size: DEFAULT_PAGE_SIZE,
  },
  lifetimes: {
    attached() {
      void this.bootstrap()
    },
  },
  pageLifetimes: {
    show() {
      if (!this.data.loading) {
        void this.loadQuestions(true)
      }
    },
  },
  methods: {
    async bootstrap(): Promise<void> {
      await this.loadCategories()
      await this.loadQuestions(true)
    },
    async loadCategories(): Promise<void> {
      try {
        const categories = await getCategoryList()
        this.setData({ categories })
      } catch (_error) {
        wx.showToast({
          title: '主题加载失败',
          icon: 'none',
        })
      }
    },
    getQuery(current: number): QuestionPageQuery {
      const query: QuestionPageQuery = {
        current,
        size: this.data.size,
        solvedFlag: 2,
      }
      const keyword = this.data.keyword.trim()
      if (keyword) {
        query.keyword = keyword
      }
      if (this.data.activeCategoryId !== ALL_CATEGORY_ID) {
        query.categoryId = this.data.activeCategoryId
      }
      return query
    },
    mapToCard(question: QuestionItem): QuestionCard {
      const categoryId = toCategoryId(question)
      const categoryName = this.data.categories.find((item) => item.id === categoryId)?.name ?? '未分类'
      return {
        ...question,
        categoryId,
        categoryName,
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
          refreshing: true,
          loading: this.data.questions.length === 0,
          hasMore: true,
        })
      } else {
        this.setData({
          loadingMore: true,
        })
      }

      try {
        const page = await getQuestionPage(this.getQuery(current))
        const mappedRecords = page.records.map((item) => this.mapToCard(item))
        const mergedRecords = reset ? mappedRecords : [...this.data.questions, ...mappedRecords]
        const hasMore = page.current * page.size < page.total
        this.setData({
          questions: mergedRecords,
          current: current + 1,
          hasMore,
        })
      } catch (_error) {
        wx.showToast({
          title: '问题加载失败',
          icon: 'none',
        })
      } finally {
        this.setData({
          loading: false,
          loadingMore: false,
          refreshing: false,
        })
      }
    },
    onKeywordInput(event: SearchInputEvent): void {
      this.setData({
        keyword: event.detail,
      })
    },
    onSearchConfirm(): void {
      void this.loadQuestions(true)
    },
    onSearchClear(): void {
      this.setData({
        keyword: '',
      })
      void this.loadQuestions(true)
    },
    onCategoryTap(event: TapEvent): void {
      const rawId = event.currentTarget.dataset.id
      const categoryId = typeof rawId === 'number' ? rawId : Number(rawId)
      if (!Number.isFinite(categoryId) || categoryId === this.data.activeCategoryId) {
        return
      }
      this.setData({
        activeCategoryId: categoryId,
      })
      void this.loadQuestions(true)
    },
    onScrollToLower(): void {
      void this.loadQuestions(false)
    },
    onRefresherRefresh(): void {
      if (this.data.refreshing) {
        return
      }
      void this.loadQuestions(true)
    },
    onQuestionTap(event: TapEvent): void {
      const rawId = event.currentTarget.dataset.id
      const id = typeof rawId === 'number' ? rawId : Number(rawId)
      if (!Number.isFinite(id)) {
        return
      }
      wx.navigateTo({
        url: `/pages/question-detail/question-detail?id=${id}`,
      })
    },
    onAskTap(): void {
      const auth = authStore.hydrate()
      if (!auth.isLoggedIn) {
        wx.showToast({
          title: '请先登录再提问',
          icon: 'none',
        })
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/login/login',
          })
        }, 200)
        return
      }
      wx.navigateTo({
        url: '/pages/ask/ask',
      })
    },
  },
})
