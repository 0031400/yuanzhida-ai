export interface LoginPayload {
  username: string
  password: string
  code: string
}

export interface LoginResult {
  token: string
}

export interface UserProfile {
  id: number
  username: string
  avatar?: string
  introduction?: string
}
