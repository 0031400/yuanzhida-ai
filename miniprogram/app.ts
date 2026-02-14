import { appStore } from './store/app.store'
import { authStore } from './store/auth.store'

App<IAppOption>({
  globalData: {},
  onLaunch() {
    authStore.hydrate()
    appStore.reset()
  },
})
