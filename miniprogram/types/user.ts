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
  studentId?: string
  userType?: string
  avatar?: string
  introduction?: string
  likeCount?: number
  collectCount?: number
  usefulCount?: number
  solvedCount?: number
  phone?: string
}

export interface RegisterPayload {
  username: string
  password: string
  mail: string
  code: string
}

export interface UpdateUserPayload {
  oldUsername: string
  newUsername?: string
  password?: string
  avatar?: string
  phone?: string
  introduction?: string
}

export interface ResetPasswordPayload {
  username: string
  code: string
  newPassword: string
}
