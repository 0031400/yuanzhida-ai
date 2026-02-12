export type RuntimeEnv = 'dev' | 'test' | 'prod'

export interface EnvConfig {
  env: RuntimeEnv
  baseUrl: string
  timeout: number
  // Optional: used to prefix relative image keys from COS/OSS.
  assetBaseUrl?: string
}

const ENV_CONFIG_MAP: Record<RuntimeEnv, EnvConfig> = {
  dev: {
    env: 'dev',
    baseUrl: 'http://192.168.6.188:8000',
    timeout: 10000,
    assetBaseUrl: 'https://yuanzhida-cos-1352975306.cos.ap-beijing.myqcloud.com/',
  },
  test: {
    env: 'test',
    baseUrl: 'https://test-api.example.com',
    timeout: 10000,
    assetBaseUrl: 'https://yuanzhida-cos-1352975306.cos.ap-beijing.myqcloud.com/',
  },
  prod: {
    env: 'prod',
    baseUrl: 'https://api.example.com',
    timeout: 10000,
    assetBaseUrl: 'https://yuanzhida-cos-1352975306.cos.ap-beijing.myqcloud.com/',
  },
}

type WxEnvVersion = WechatMiniprogram.AccountInfo['miniProgram']['envVersion']

const mapWxEnvVersion = (
  envVersion: WxEnvVersion,
): RuntimeEnv => {
  if (envVersion === 'release') return 'prod'
  if (envVersion === 'trial') return 'test'
  return 'dev'
}

export const getEnvConfig = (): EnvConfig => {
  const accountInfo = wx.getAccountInfoSync()
  const env = mapWxEnvVersion(accountInfo.miniProgram.envVersion)
  return ENV_CONFIG_MAP[env]
}
