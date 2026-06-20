<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const { t } = useI18n()
const colorMode = useColorMode()
const { animateIn } = usePageAnimate()

const { data: stats, refresh } = await useFetch<ApiDashboardStats>('/api/dashboard/stats', {
  default: (): ApiDashboardStats => ({
    sourcesCount: 0, destinationsCount: 0, jobsCount: 0,
    runsToday: 0, failuresToday: 0, totalSizeBytes: 0, recentRuns: []
  })
})

const { data: chartData } = await useFetch<Array<{ date: string, success: number, failed: number }>>('/api/dashboard/chart', {
  default: () => []
})

useHead({ title: `${t('dashboard.title')} — Infinix Backup` })

type SemanticColor = 'primary' | 'info' | 'error' | 'neutral' | 'success' | 'warning'

const successRate = computed(() => {
  if (!stats.value.runsToday) return null
  return Math.round((1 - stats.value.failuresToday / stats.value.runsToday) * 100)
})

const statCards = computed(() => [
  {
    label: t('dashboard.sources_card'),
    value: stats.value.sourcesCount,
    icon: 'i-lucide-database',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-500',
    to: '/sources'
  },
  {
    label: t('dashboard.destinations_card'),
    value: stats.value.destinationsCount,
    icon: 'i-lucide-hard-drive',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-500',
    to: '/destinations'
  },
  {
    label: t('jobs.title'),
    value: stats.value.jobsCount,
    icon: 'i-lucide-calendar-clock',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-500',
    to: '/jobs'
  },
  {
    label: t('dashboard.runs_today'),
    value: stats.value.runsToday,
    icon: 'i-lucide-play-circle',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    to: '/runs'
  },
  {
    label: t('dashboard.failures_24h'),
    value: stats.value.failuresToday,
    icon: 'i-lucide-triangle-alert',
    iconBg: stats.value.failuresToday > 0 ? 'bg-red-500/10' : 'bg-neutral-500/10',
    iconColor: stats.value.failuresToday > 0 ? 'text-red-500' : 'text-neutral-400',
    to: '/runs'
  },
  {
    label: t('dashboard.success_rate'),
    value: successRate.value !== null ? `${successRate.value}%` : '—',
    icon: 'i-lucide-shield-check',
    iconBg: successRate.value !== null && successRate.value < 100 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
    iconColor: successRate.value !== null && successRate.value < 100 ? 'text-amber-500' : 'text-emerald-500',
    to: '/runs'
  }
])

const isDark = computed(() => colorMode.value === 'dark')

const barChartData = computed(() => {
  const labels = chartData.value.map(d => {
    const date = new Date(d.date)
    return date.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })
  })
  return {
    labels,
    datasets: [
      {
        label: 'Sukces',
        data: chartData.value.map(d => d.success),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: 'Błąd',
        data: chartData.value.map(d => d.failed),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  }
})

const barChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: isDark.value ? '#a1a1aa' : '#52525b',
        font: { size: 12 },
        boxWidth: 12,
        boxHeight: 12,
        borderRadius: 3
      }
    },
    tooltip: {
      backgroundColor: isDark.value ? '#18181b' : '#fff',
      titleColor: isDark.value ? '#e4e4e7' : '#18181b',
      bodyColor: isDark.value ? '#a1a1aa' : '#52525b',
      borderColor: isDark.value ? '#3f3f46' : '#e4e4e7',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: { color: isDark.value ? '#71717a' : '#a1a1aa', font: { size: 11 } },
      border: { display: false }
    },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: { color: isDark.value ? '#71717a' : '#a1a1aa', font: { size: 11 }, stepSize: 1 },
      grid: { color: isDark.value ? '#27272a' : '#f4f4f5' },
      border: { display: false }
    }
  }
}))

const columns = computed(() => [
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'jobName', header: 'Job' },
  { accessorKey: 'sourceName', header: t('common.source') },
  { accessorKey: 'startedAt', header: t('common.started') },
  { id: 'duration', header: t('common.duration') },
  { accessorKey: 'fileSizeBytes', header: t('common.size') }
])

const statusColors: Record<string, SemanticColor> = {
  success: 'success', failed: 'error', running: 'info', pending: 'warning', cancelled: 'neutral'
}

const hasChartData = computed(() => chartData.value.some(d => d.success + d.failed > 0))

onMounted(() => {
  animateIn('.anim-stat', 0.05)
  animateIn('.anim-chart', 0.08)
  animateIn('.anim-body', 0.1)
  const refreshTimer = setInterval(() => refresh(), 15000)
  onUnmounted(() => clearInterval(refreshTimer))
})
</script>

<template>
  <div class="py-8 px-6 lg:px-8 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">{{ t('dashboard.title') }}</h1>
        <p class="text-sm text-muted mt-0.5">{{ t('dashboard.subtitle') }}</p>
      </div>
      <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="sm" @click="() => refresh()">
        {{ t('common.refresh') }}
      </UButton>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
      <NuxtLink
        v-for="card in statCards"
        :key="card.label"
        :to="card.to"
        class="anim-stat block"
      >
        <UCard :ui="{ root: 'h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md' }">
          <div class="flex flex-col gap-4">
            <div class="flex items-start justify-between gap-2">
              <p class="text-[11px] font-medium text-muted uppercase tracking-wider leading-none">{{ card.label }}</p>
              <div :class="['shrink-0 flex h-8 w-8 items-center justify-center rounded-lg', card.iconBg]">
                <UIcon :name="card.icon" :class="['h-4 w-4', card.iconColor]" />
              </div>
            </div>
            <p class="text-2xl font-bold tabular-nums leading-none tracking-tight">{{ card.value }}</p>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <UCard class="anim-chart lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-sm font-semibold">Aktywność backupów (7 dni)</h2>
              <p class="text-xs text-muted mt-0.5">Liczba uruchomień z podziałem na sukces / błąd</p>
            </div>
            <UBadge color="neutral" variant="subtle" size="sm" label="Ostatnie 7 dni" icon="i-lucide-calendar" />
          </div>
        </template>
        <div class="h-52">
          <div v-if="!hasChartData" class="h-full flex flex-col items-center justify-center gap-2">
            <UIcon name="i-lucide-bar-chart-2" class="h-8 w-8 text-muted" />
            <p class="text-sm text-muted">Brak danych z ostatnich 7 dni</p>
          </div>
          <Bar v-else :data="barChartData" :options="barChartOptions" />
        </div>
      </UCard>

      <UCard class="anim-chart">
        <template #header>
          <h2 class="text-sm font-semibold">Szybkie akcje</h2>
        </template>
        <div class="space-y-2">
          <NuxtLink to="/jobs/new" class="flex items-center gap-3 p-3 rounded-lg border border-default hover:bg-elevated transition-colors group">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
              <UIcon name="i-lucide-plus-circle" class="h-4.5 w-4.5 text-violet-500" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium">Nowe zadanie</p>
              <p class="text-xs text-muted truncate">Zaplanuj backup</p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="h-4 w-4 text-muted ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </NuxtLink>
          <NuxtLink to="/sources/new" class="flex items-center gap-3 p-3 rounded-lg border border-default hover:bg-elevated transition-colors group">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
              <UIcon name="i-lucide-database" class="h-4.5 w-4.5 text-blue-500" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium">Nowe źródło</p>
              <p class="text-xs text-muted truncate">Dodaj bazę lub pliki</p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="h-4 w-4 text-muted ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </NuxtLink>
          <NuxtLink to="/destinations/new" class="flex items-center gap-3 p-3 rounded-lg border border-default hover:bg-elevated transition-colors group">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
              <UIcon name="i-lucide-hard-drive" class="h-4.5 w-4.5 text-emerald-500" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium">Nowe miejsce docelowe</p>
              <p class="text-xs text-muted truncate">S3, FTP, SFTP, lokalny</p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="h-4 w-4 text-muted ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </NuxtLink>
          <NuxtLink to="/webhooks/new" class="flex items-center gap-3 p-3 rounded-lg border border-default hover:bg-elevated transition-colors group">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
              <UIcon name="i-lucide-webhook" class="h-4.5 w-4.5 text-amber-500" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium">Nowy webhook</p>
              <p class="text-xs text-muted truncate">Discord, Slack, WhatsApp</p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="h-4 w-4 text-muted ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </NuxtLink>
        </div>
      </UCard>
    </div>

    <UCard class="anim-body">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <h2 class="text-sm font-semibold">{{ t('dashboard.recent_runs') }}</h2>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-success-500/10 px-2.5 py-1 text-[11px] font-semibold text-success-600">
              <span class="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
              {{ t('common.live') }}
            </span>
          </div>
          <UButton to="/runs" size="sm" variant="ghost" color="neutral" trailing-icon="i-lucide-arrow-right">
            {{ t('common.view_all') }}
          </UButton>
        </div>
      </template>

      <div v-if="!stats.recentRuns.length" class="py-14 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-elevated">
          <UIcon name="i-lucide-inbox" class="h-6 w-6 text-muted" />
        </div>
        <p class="text-sm font-medium mb-1">{{ t('dashboard.no_runs') }}</p>
        <UButton to="/jobs/new" size="sm" icon="i-lucide-plus" class="mt-3">
          {{ t('dashboard.create_job') }}
        </UButton>
      </div>

      <UTable v-else :data="stats.recentRuns" :columns="columns">
        <template #status-cell="{ row }">
          <UBadge
            :color="statusColors[row.original.status as string] || 'neutral'"
            :label="String(row.original.status ?? '')"
            variant="subtle"
            size="sm"
          />
        </template>
        <template #jobName-cell="{ row }">
          <NuxtLink :to="`/jobs/${row.original.jobId}`" class="font-medium text-sm hover:text-primary-500 transition-colors">
            {{ row.original.jobName }}
          </NuxtLink>
        </template>
        <template #sourceName-cell="{ row }">
          <span class="text-sm text-muted">{{ row.original.sourceName }}</span>
        </template>
        <template #startedAt-cell="{ row }">
          <span class="text-sm text-muted tabular-nums">{{ formatDateTime(row.original.startedAt as string) }}</span>
        </template>
        <template #duration-cell="{ row }">
          <span class="text-sm tabular-nums">{{ formatDuration(row.original.startedAt as string, row.original.completedAt as string | null) }}</span>
        </template>
        <template #fileSizeBytes-cell="{ row }">
          <span class="text-sm tabular-nums">{{ formatBytes(row.original.fileSizeBytes as number) }}</span>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
