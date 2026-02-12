export type RuntimeEnv = 'dev' | 'test' | 'prod'

export interface EnvConfig {
  env: RuntimeEnv
  baseUrl: string
  timeout: number
}

const ENV_CONFIG_MAP: Record<RuntimeEnv, EnvConfig> = {
  dev: {
    env: 'dev',
    baseUrl: 'http://localhost:8080',
    timeout: 10000,
  },
  test: {
    env: 'test',
    baseUrl: 'https://test-api.example.com',
    timeout: 10000,
  },
  prod: {
    env: 'prod',
    baseUrl: 'https://api.example.com',
    timeout: 10000,
  },
}

const mapWxEnvVersion = (
  envVersion: WechatMiniprogram.AccountInfoMiniProgram['envVersion'] | undefined,
): RuntimeEnv => {
  if (envVersion === 'release') return 'prod'
  if (envVersion === 'trial') return 'test'
  return 'dev'
}

export const getEnvConfig = (): EnvConfig => {
  const accountInfo = wx.getAccountInfoSync?.()
  const env = mapWxEnvVersion(accountInfo?.miniProgram?.envVersion)
  return ENV_CONFIG_MAP[env]
}
