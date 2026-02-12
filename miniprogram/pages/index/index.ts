import { getCategoryList } from '../../api/category'
import { getQuestionPage, getQuestionSuggest } from '../../api/question'
import { authStore } from '../../store/auth.store'
import type { CategoryItem } from '../../types/category'
import type { QuestionItem, QuestionPageQuery } from '../../types/question'
import { formatFromNow } from '../../utils/day'

type SearchInputEvent = WechatMiniprogram.CustomEvent<string | { value?: string }>
type TapEvent = WechatMiniprogram.TouchEvent

interface QuestionCard extends QuestionItem {
  createTimeText: string
  solvedText: string
}

const ALL_CATEGORY_ID = 0
const DEFAULT_PAGE_SIZE = 10
const SUGGEST_DEBOUNCE_MS = 220
let suggestTimer: number | null = null
let suggestRequestSeq = 0

const toNumberId = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return 0
}

Component({
  data: {
    keyword: '',
    suggestions: [] as string[],
    showSuggestions: false,
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
    detached() {
      this.clearSuggestTimer()
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
    clearSuggestTimer(): void {
      if (suggestTimer !== null) {
        clearTimeout(suggestTimer)
        suggestTimer = null
      }
    },
    async fetchSuggestions(keyword: string): Promise<void> {
      const trimmed = keyword.trim()
      if (!trimmed) {
        this.setData({
          suggestions: [],
          showSuggestions: false,
        })
        return
      }

      const seq = suggestRequestSeq + 1
      suggestRequestSeq = seq
      try {
        const suggestions = await getQuestionSuggest(trimmed)
        if (seq !== suggestRequestSeq) {
          return
        }
        this.setData({
          suggestions: suggestions.slice(0, 8),
          showSuggestions: suggestions.length > 0 && this.data.keyword.trim().length > 0,
        })
      } catch (_error) {
        if (seq !== suggestRequestSeq) {
          return
        }
        this.setData({
          suggestions: [],
          showSuggestions: false,
        })
      }
    },
    scheduleSuggestFetch(keyword: string): void {
      this.clearSuggestTimer()
      suggestTimer = setTimeout(() => {
        void this.fetchSuggestions(keyword)
      }, SUGGEST_DEBOUNCE_MS)
    },
    async bootstrap(): Promise<void> {
      await this.loadCategories()
      await this.loadQuestions(true)
    },
    async loadCategories(): Promise<void> {
      try {
        const categories = await getCategoryList()
        const normalized = categories
          .map((item) => {
            const id = toNumberId((item as unknown as { id?: unknown }).id)
            return {
              ...item,
              id,
            }
          })
          .filter((item) => item.id > 0)
        this.setData({ categories: normalized })
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
      const detail = event.detail
      const keyword =
        typeof detail === 'string'
          ? detail
          : detail && typeof detail.value === 'string'
            ? detail.value
            : ''
      this.setData({
        keyword,
      })
      this.scheduleSuggestFetch(keyword)
    },
    onSearchConfirm(): void {
      this.clearSuggestTimer()
      this.setData({
        showSuggestions: false,
      })
      void this.loadQuestions(true)
    },
    onSearchClear(): void {
      this.clearSuggestTimer()
      suggestRequestSeq += 1
      this.setData({
        keyword: '',
        suggestions: [],
        showSuggestions: false,
      })
      void this.loadQuestions(true)
    },
    onSuggestionTap(event: TapEvent): void {
      const keyword = String(event.currentTarget.dataset.keyword || '').trim()
      if (!keyword) {
        return
      }
      this.clearSuggestTimer()
      this.setData({
        keyword,
        showSuggestions: false,
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
