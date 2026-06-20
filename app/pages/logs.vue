<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()

useHead({ title: 'Server Logs — Infinix Backup' })

interface LogEntry {
  id: number
  ts: string
  level: 'debug' | 'info' | 'warn' | 'error'
  category: string
  message: string
}

const logs = ref<LogEntry[]>([])
const autoScroll = ref(true)
const autoRefresh = ref(true)
const filterLevel = ref<string>('all')
const filterCat = ref('')
const lastId = ref(0)
const logEl = ref<HTMLElement | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

const LEVEL_COLORS: Record<string, string> = {
  debug: 'text-gray-500',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400'
}

const LEVEL_BG: Record<string, string> = {
  debug: 'bg-gray-500/10',
  info: 'bg-blue-500/10',
  warn: 'bg-yellow-500/10',
  error: 'bg-red-500/10'
}

const filteredLogs = computed(() => {
  return logs.value.filter(l => {
    if (filterLevel.value !== 'all' && l.level !== filterLevel.value) return false
    if (filterCat.value && !l.category.includes(filterCat.value)) return false
    return true
  })
})

const categories = computed(() => {
  const cats = new Set(logs.value.map(l => l.category))
  return Array.from(cats).sort()
})

async function fetchLogs(since?: number) {
  try {
    const params = since ? `?sinceId=${since}&limit=500` : '?limit=500'
    const data = await $fetch<LogEntry[]>(`/api/logs${params}`)
    if (since) {
      logs.value.push(...data)
      if (logs.value.length > 2000) logs.value = logs.value.slice(-2000)
    } else {
      logs.value = data
    }
    if (data.length > 0) lastId.value = data[data.length - 1].id
    if (autoScroll.value) scrollToBottom()
  } catch {
    // ignore
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
  })
}

async function clearLogs() {
  await $fetch('/api/logs/clear', { method: 'POST' })
  logs.value = []
  lastId.value = 0
  toast.add({ title: 'Logi wyczyszczone', color: 'success', icon: 'i-lucide-check-circle' })
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleTimeString('pl', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })
}

onMounted(async () => {
  await fetchLogs()
  pollTimer = setInterval(async () => {
    if (autoRefresh.value) await fetchLogs(lastId.value > 0 ? lastId.value : undefined)
  }, 2000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

watch(autoScroll, (v) => { if (v) scrollToBottom() })
</script>

<template>
  <div class="py-6 px-6 lg:px-8 flex flex-col gap-4">
    <!-- Header -->
    <div class="flex items-center justify-between flex-shrink-0">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">Server Logs</h1>
        <p class="text-sm text-muted mt-0.5">Backend log stream (last 2000 entries, in-memory)</p>
      </div>
      <div class="flex items-center gap-2">
        <UBadge :color="autoRefresh ? 'success' : 'neutral'" variant="subtle" size="sm">
          <span class="flex items-center gap-1">
            <span v-if="autoRefresh" class="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            {{ autoRefresh ? 'Live' : 'Paused' }}
          </span>
        </UBadge>
        <UButton
          :icon="autoRefresh ? 'i-lucide-pause' : 'i-lucide-play'"
          size="sm"
          color="neutral"
          variant="ghost"
          @click="autoRefresh = !autoRefresh"
        />
        <UButton
          icon="i-lucide-arrow-down-to-line"
          size="sm"
          color="neutral"
          variant="ghost"
          :class="autoScroll ? 'text-primary-500' : ''"
          @click="autoScroll = !autoScroll"
        />
        <UButton icon="i-lucide-refresh-cw" size="sm" color="neutral" variant="ghost" @click="fetchLogs()" />
        <UButton icon="i-lucide-trash-2" size="sm" color="error" variant="ghost" @click="clearLogs" />
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 flex-shrink-0">
      <div class="flex gap-1">
        <UButton
          v-for="lvl in ['all', 'debug', 'info', 'warn', 'error']"
          :key="lvl"
          size="xs"
          :color="filterLevel === lvl ? 'primary' : 'neutral'"
          :variant="filterLevel === lvl ? 'solid' : 'ghost'"
          @click="filterLevel = lvl"
        >{{ lvl }}</UButton>
      </div>
      <UInput
        v-model="filterCat"
        size="sm"
        placeholder="Filter by category (e.g. ssh:install)"
        class="w-64"
        icon="i-lucide-filter"
      />
      <span class="text-xs text-muted ml-auto">{{ filteredLogs.length }} / {{ logs.length }} entries</span>
    </div>

    <!-- Terminal -->
    <div
      ref="logEl"
      class="overflow-y-auto bg-gray-950 dark:bg-black rounded-xl border border-default font-mono text-xs p-4 space-y-0.5"
      style="height: calc(100svh - 16rem)"
      @scroll="autoScroll = false"
    >
      <div v-if="!filteredLogs.length" class="text-gray-600 text-center py-8">
        No log entries yet. Trigger an action to see logs here.
      </div>
      <div
        v-for="entry in filteredLogs"
        :key="entry.id"
        class="flex items-start gap-2 py-0.5 px-1 rounded hover:bg-white/5 group"
      >
        <span class="text-gray-600 shrink-0 tabular-nums">{{ formatTs(entry.ts) }}</span>
        <span :class="['shrink-0 w-10 text-center text-[10px] font-bold uppercase rounded px-1', LEVEL_BG[entry.level], LEVEL_COLORS[entry.level]]">
          {{ entry.level }}
        </span>
        <span class="text-purple-400 shrink-0 min-w-20">{{ entry.category }}</span>
        <span :class="['flex-1 break-all', LEVEL_COLORS[entry.level] || 'text-gray-300']">{{ entry.message }}</span>
      </div>
      <div ref="bottomAnchor" />
    </div>
  </div>
</template>
