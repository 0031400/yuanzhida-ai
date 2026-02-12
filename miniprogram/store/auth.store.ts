import type { AuthState } from '../types/auth'
import { STORAGE_KEYS, storage } from '../utils/storage'

const defaultState = (): AuthState => ({
  username: '',
  token: '',
  isLoggedIn: false,
})

let state: AuthState = defaultState()

const updateState = (next: Partial<AuthState>): void => {
  state = { ...state, ...next }
}

export const authStore = {
  hydrate(): AuthState {
    const username = storage.getString(STORAGE_KEYS.username)
    const token = storage.getString(STORAGE_KEYS.token)
    updateState({ username, token, isLoggedIn: Boolean(username && token) })
    return state
  },
  setAuth(payload: { username: string; token: string }): void {
    storage.setString(STORAGE_KEYS.username, payload.username)
    storage.setString(STORAGE_KEYS.token, payload.token)
    updateState({ username: payload.username, token: payload.token, isLoggedIn: true })
  },
  clearAuth(): void {
    storage.remove(STORAGE_KEYS.username)
    storage.remove(STORAGE_KEYS.token)
    state = defaultState()
  },
  getState(): AuthState {
    return state
  },
  getAuthHeaders(): Record<'username' | 'token', string> {
    return { username: state.username, token: state.token }
  },
}
