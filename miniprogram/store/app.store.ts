interface AppState {
  unreadMessageCount: number
}

let state: AppState = { unreadMessageCount: 0 }

export const appStore = {
  getState(): AppState {
    return state
  },
  setUnreadMessageCount(count: number): void {
    state = { ...state, unreadMessageCount: Math.max(0, count) }
  },
  reset(): void {
    state = { unreadMessageCount: 0 }
  },
}
