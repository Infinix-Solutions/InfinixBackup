export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/setup') || to.path.startsWith('/login')) return

  const isInstalled = useState<boolean | null>('setup:installed', () => null)
  if (isInstalled.value === null) {
    try {
      const status = await $fetch<{ installed: boolean }>('/api/setup/status')
      isInstalled.value = status.installed ?? false
    } catch {
      isInstalled.value = false
    }
  }
  if (!isInstalled.value) return navigateTo('/setup')

  const currentUser = useState<ApiAuthUser | null>('auth:user', () => null)
  if (currentUser.value === null) {
    try {
      const headers = useRequestHeaders(['cookie'])
      currentUser.value = await $fetch<ApiAuthUser>('/api/auth/me', { headers })
    } catch {
      currentUser.value = null
    }
  }

  if (!currentUser.value) return navigateTo('/login')
})
