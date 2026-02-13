import type { AuthState } from '../types/auth'
import { STORAGE_KEYS, storage } from '../utils/storage'

const defaultState = (): AuthState => ({
  username: '',
  token: '',
  isLoggedIn: false,
  userType: '',
})

let state: AuthState = defaultState()

const updateState = (next: Partial<AuthState>): void => {
  state = { ...state, ...next }
}

export const authStore = {
  hydrate(): AuthState {
    const username = storage.getString(STORAGE_KEYS.username)
    const token = storage.getString(STORAGE_KEYS.token)
    const userType = storage.getString(STORAGE_KEYS.userType)
    updateState({ username, token, userType, isLoggedIn: Boolean(username && token) })
    return state
  },
  setAuth(payload: { username: string; token: string; userType?: string }): void {
    storage.setString(STORAGE_KEYS.username, payload.username)
    storage.setString(STORAGE_KEYS.token, payload.token)
    if (payload.userType !== undefined) {
      storage.setString(STORAGE_KEYS.userType, payload.userType)
    }
    updateState({
      username: payload.username,
      token: payload.token,
      userType: payload.userType ?? state.userType,
      isLoggedIn: true,
    })
  },
  setUserType(userType?: string): void {
    const normalized = userType ? String(userType) : ''
    storage.setString(STORAGE_KEYS.userType, normalized)
    updateState({ userType: normalized })
  },
  clearAuth(): void {
    storage.remove(STORAGE_KEYS.username)
    storage.remove(STORAGE_KEYS.token)
    storage.remove(STORAGE_KEYS.userType)
    state = defaultState()
  },
  getState(): AuthState {
    return state
  },
  isAdmin(): boolean {
    return String(state.userType || '').toLowerCase() === 'admin'
  },
  getAuthHeaders(): Record<'username' | 'token', string> {
    return { username: state.username, token: state.token }
  },
}
