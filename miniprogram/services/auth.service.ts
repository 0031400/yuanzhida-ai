import { getUserProfile, login } from '../api/user'
import { authStore } from '../store/auth.store'
import type { LoginPayload, UserProfile } from '../types/user'

export const loginByPassword = async (
  payload: LoginPayload,
  captchaCookie?: string,
): Promise<UserProfile> => {
  const loginResult = await login(payload, captchaCookie)
  authStore.setAuth({ username: payload.username, token: loginResult.token })
  const profile = await getUserProfile(payload.username)
  if (profile && profile.userType) {
    authStore.setUserType(profile.userType)
  }
  return profile
}

export const logout = (): void => {
  authStore.clearAuth()
}
