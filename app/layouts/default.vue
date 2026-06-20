<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { t, setLocale } = useI18n()
const router = useRouter()
const toast = useToast()

const currentUser = useState<{ id: string, username: string, role: string } | null>('auth:user')

const primaryNav = computed<NavigationMenuItem[]>(() => [
  { label: t('nav.dashboard'), icon: 'i-lucide-layout-dashboard', to: '/' },
  { label: t('nav.sources'), icon: 'i-lucide-database', to: '/sources' },
  { label: t('nav.destinations'), icon: 'i-lucide-hard-drive', to: '/destinations' },
  { label: t('nav.jobs'), icon: 'i-lucide-calendar-clock', to: '/jobs' },
  { label: t('nav.runs'), icon: 'i-lucide-history', to: '/runs' },
  { label: t('nav.ssh_connections'), icon: 'i-lucide-server', to: '/ssh-connections' }
])

const secondaryNav = computed<NavigationMenuItem[]>(() => {
  const items: NavigationMenuItem[] = [
    { label: t('nav.webhooks'), icon: 'i-lucide-webhook', to: '/webhooks' }
  ]
  if (currentUser.value?.role === 'admin') {
    items.push(
      { label: t('nav.users'), icon: 'i-lucide-users', to: '/users' },
      { label: t('nav.logs'), icon: 'i-lucide-scroll-text', to: '/logs' }
    )
  }
  return items
})

const langItems = computed(() => [[
  { label: '🇬🇧 English', onSelect: () => setLocale('en') },
  { label: '🇵🇱 Polski', onSelect: () => setLocale('pl') },
  { label: '🇩🇪 Deutsch', onSelect: () => setLocale('de') }
]])

const userMenuItems = computed(() => [[
  {
    label: t('nav.logout'),
    icon: 'i-lucide-log-out',
    onSelect: logout
  }
]])

async function logout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    currentUser.value = null
    useState('setup:installed').value = null
    await router.push('/login')
  } catch {
    toast.add({ title: 'Logout failed', color: 'error' })
  }
}
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/" class="flex items-center gap-2.5 px-1 min-w-0">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500 shadow shadow-primary-500/40">
            <UIcon name="i-lucide-archive" class="h-4 w-4 text-white" />
          </div>
          <Transition name="fade">
            <span v-if="!collapsed" class="font-semibold text-sm truncate">Infinix Backup</span>
          </Transition>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="primaryNav"
          orientation="vertical"
          tooltip
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="secondaryNav"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="px-1 py-1">
          <UDropdownMenu v-if="currentUser" :items="userMenuItems">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              class="w-full gap-2"
              :class="collapsed ? 'justify-center px-0' : 'justify-start'"
            >
              <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500/15">
                <UIcon name="i-lucide-user" class="h-3.5 w-3.5 text-primary-500" />
              </div>
              <template v-if="!collapsed">
                <span class="truncate text-sm font-medium">{{ currentUser.username }}</span>
                <UBadge v-if="currentUser.role === 'admin'" size="xs" color="primary" variant="subtle" class="ml-auto shrink-0">
                  admin
                </UBadge>
              </template>
            </UButton>
          </UDropdownMenu>
        </div>

        <div class="flex items-center gap-1 px-1 py-1" :class="collapsed ? 'justify-center' : ''">
          <UColorModeButton size="sm" color="neutral" variant="ghost" />
          <UDropdownMenu v-if="!collapsed" :items="langItems">
            <UButton icon="i-lucide-globe" size="sm" color="neutral" variant="ghost" />
          </UDropdownMenu>
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <UDashboardNavbar />

      <div class="overflow-y-auto">
        <slot />
      </div>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
