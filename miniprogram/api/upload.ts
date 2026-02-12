import { envConfig } from '../config/index'
import { authStore } from '../store/auth.store'

export const uploadImage = (filePath: string): Promise<string> => {
  const { username, token } = authStore.getAuthHeaders()

  return new Promise<string>((resolve, reject) => {
    wx.uploadFile({
      url: `${envConfig.baseUrl}/cos/upload`,
      filePath,
      name: 'file',
      header: username && token ? { username, token } : {},
      success: (res) => {
        let payload: { code: string; message: string | null; data: string }
        try {
          payload = JSON.parse(res.data) as { code: string; message: string | null; data: string }
        } catch (_error) {
          reject('上传响应解析失败')
          return
        }
        if (typeof payload.code !== 'string') {
          reject('响应格式错误')
          return
        }
        if (payload.code !== '0') {
          reject(payload.message ?? '上传失败')
          return
        }
        resolve(payload.data)
      },
      fail: () => reject('上传失败，请检查网络'),
    })
  })
}
