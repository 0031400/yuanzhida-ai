import { getUserProfile, login } from '../api/user'
import { authStore } from '../store/auth.store'
import type { LoginPayload, UserProfile } from '../types/user'

export const loginByPassword = async (
  payload: LoginPayload,
  captchaCookie?: string,
): Promise<UserProfile> => {
  const loginResult = await login(payload, captchaCookie)
  authStore.setAuth({ username: payload.username, token: loginResult.token })
  return getUserProfile(payload.username)
}

export const logout = (): void => {
  authStore.clearAuth()
}
