<script setup lang="ts">
const { t } = useI18n()
const { animateIn } = usePageAnimate()
const toast = useToast()

useHead({ title: `${t('runs.title')} — Infinix Backup` })

const route = useRoute()
const jobId = computed(() => route.query.jobId as string | undefined)

const { data: runs, refresh } = await useFetch<ApiRun[]>('/api/runs', {
  query: computed(() => ({ jobId: jobId.value })),
  default: (): ApiRun[] => []
})

const statusColors = {
  success: 'success',
  failed: 'error',
  running: 'info',
  pending: 'warning',
  cancelled: 'neutral'
} as const

const statusIcons = {
  success: 'i-lucide-check-circle-2',
  failed: 'i-lucide-x-circle',
  running: 'i-lucide-loader-circle',
  pending: 'i-lucide-clock',
  cancelled: 'i-lucide-slash'
} as const

const statusIconClass: Record<string, string> = {
  success: 'text-success-500',
  failed: 'text-error-500',
  running: 'animate-spin text-info-500',
  pending: 'text-warning-500',
  cancelled: 'text-neutral-500'
}

const search = ref('')
const statusFilter = ref<'all' | RunStatus>('all')
const deleteTarget = ref<ApiRun | null>(null)
const deleting = ref(false)

async function confirmDelete(run: ApiRun) {
  deleteTarget.value = run
}

async function deleteRun() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/runs/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('runs.deleted'), color: 'success', icon: 'i-lucide-check-circle' })
    deleteTarget.value = null
    refresh()
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || 'Delete failed'
    toast.add({ title: msg, color: 'error' })
  } finally {
    deleting.value = false
  }
}

const statusTabs: Array<{ label: string; value: 'all' | RunStatus }> = [
  { label: t('common.all'), value: 'all' },
  { label: 'Running', value: 'running' },
  { label: 'Success', value: 'success' },
  { label: 'Failed', value: 'failed' },
  { label: 'Pending', value: 'pending' }
]

const filteredRuns = computed(() => {
  let data = runs.value
  if (statusFilter.value !== 'all') data = data.filter(r => r.status === statusFilter.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    data = data.filter(r =>
      (r.jobName?.toLowerCase().includes(q) ?? false) ||
      (r.sourceName?.toLowerCase().includes(q) ?? false) ||
      (r.destinationName?.toLowerCase().includes(q) ?? false)
    )
  }
  return data
})

function getStatusCount(value: string): number {
  if (value === 'all') return runs.value.length
  return runs.value.filter(r => r.status === value).length
}

const columns = computed(() => [
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'jobName', header: 'Job' },
  { accessorKey: 'sourceName', header: t('common.source') },
  { id: 'destinations', header: t('common.destinations') },
  { accessorKey: 'startedAt', header: t('common.started') },
  { id: 'duration', header: t('common.duration') },
  { accessorKey: 'fileSizeBytes', header: t('common.size') },
  { id: 'actions', header: '' }
])

onMounted(() => {
  animateIn('.anim-header', 0)
  animateIn('.anim-card', 0)
  const refreshTimer = setInterval(() => refresh(), 10000)
  onUnmounted(() => clearInterval(refreshTimer))
})
</script>

<template>
  <div class="py-8 px-6 lg:px-8 space-y-6">
    <div class="anim-header flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">{{ t('runs.title') }}</h1>
        <p class="text-sm text-muted mt-0.5">{{ t('runs.subtitle') }}</p>
      </div>
    </div>

    <UCard class="anim-card">
      <template #header>
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-2.5">
            <span class="text-sm font-medium">{{ filteredRuns.length }} runs</span>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-success-500/10 px-2.5 py-1 text-[11px] font-semibold text-success-600">
              <span class="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
              {{ t('common.live') }}
            </span>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <div class="flex rounded-lg border border-default overflow-hidden text-xs">
              <button
                v-for="tab in statusTabs"
                :key="tab.value"
                type="button"
                :class="[
                  'px-2.5 py-1.5 font-medium transition-colors border-r border-default last:border-r-0',
                  statusFilter === tab.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-background text-muted hover:bg-elevated'
                ]"
                @click="statusFilter = tab.value"
              >
                {{ tab.label }}
                <span
                  v-if="getStatusCount(tab.value) > 0"
                  :class="[
                    'ml-1 text-[10px]',
                    statusFilter === tab.value ? 'text-white/70' : 'text-muted'
                  ]"
                >{{ getStatusCount(tab.value) }}</span>
              </button>
            </div>
            <UInput
              v-model="search"
              size="sm"
              :placeholder="t('common.search')"
              icon="i-lucide-search"
              class="w-40"
            />
            <UButton
              icon="i-lucide-refresh-cw"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="() => refresh()"
            />
          </div>
        </div>
      </template>

      <div v-if="!runs.length" class="py-16 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-elevated">
          <UIcon name="i-lucide-history" class="h-7 w-7 text-muted" />
        </div>
        <p class="text-sm font-medium mb-1">{{ t('runs.no_runs') }}</p>
      </div>

      <div v-else-if="!filteredRuns.length" class="py-12 text-center">
        <UIcon name="i-lucide-search-x" class="h-8 w-8 text-muted mx-auto mb-3" />
        <p class="text-sm text-muted mb-2">No runs match the current filter</p>
        <UButton size="xs" variant="ghost" color="neutral" @click="search = ''; statusFilter = 'all'">
          Clear filters
        </UButton>
      </div>

      <UTable v-else :data="filteredRuns" :columns="columns">
        <template #status-cell="{ row }">
          <div class="flex items-center gap-1.5">
            <UIcon
              :name="statusIcons[row.original.status as keyof typeof statusIcons] || 'i-lucide-circle'"
              :class="['h-3.5 w-3.5 shrink-0', statusIconClass[row.original.status] || 'text-muted']"
            />
            <UBadge
              :color="statusColors[row.original.status as keyof typeof statusColors]"
              :label="row.original.status"
              variant="subtle"
              size="sm"
            />
          </div>
        </template>
        <template #jobName-cell="{ row }">
          <NuxtLink
            :to="`/jobs/${row.original.jobId}`"
            class="font-medium text-sm hover:text-primary-500 transition-colors"
          >
            {{ row.original.jobName }}
          </NuxtLink>
        </template>
        <template #sourceName-cell="{ row }">
          <span class="text-sm text-muted">{{ row.original.sourceName }}</span>
        </template>
        <template #destinations-cell="{ row }">
          <span class="text-sm text-muted">{{ (row.original as ApiRun).destinationNames?.join(', ') || '—' }}</span>
        </template>
        <template #startedAt-cell="{ row }">
          <span class="text-sm text-muted tabular-nums">{{ formatDateTime(row.original.startedAt) }}</span>
        </template>
        <template #duration-cell="{ row }">
          <span class="text-sm tabular-nums">{{ formatDuration(row.original.startedAt, row.original.completedAt) }}</span>
        </template>
        <template #fileSizeBytes-cell="{ row }">
          <span class="text-sm tabular-nums">{{ formatBytes(row.original.fileSizeBytes) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UTooltip v-if="row.original.status === 'success' && row.original.fileName" :text="t('runs.download')">
              <UButton
                :href="`/api/runs/${row.original.id}/download`"
                external
                icon="i-lucide-download"
                size="xs"
                color="neutral"
                variant="ghost"
              />
            </UTooltip>
            <UTooltip :text="t('common.view')">
              <UButton
                :to="`/runs/${row.original.id}`"
                icon="i-lucide-eye"
                size="xs"
                color="neutral"
                variant="ghost"
              />
            </UTooltip>
            <UTooltip :text="t('common.delete')">
              <UButton
                icon="i-lucide-trash-2"
                size="xs"
                color="error"
                variant="ghost"
                @click="confirmDelete(row.original as ApiRun)"
              />
            </UTooltip>
          </div>
        </template>
      </UTable>
    </UCard>

    <UModal v-model:open="deleteTarget" :title="t('runs.delete_title')">
      <template #body>
        <p class="text-sm text-muted">{{ t('runs.delete_msg') }}</p>
        <p v-if="deleteTarget?.fileName" class="mt-2 text-xs font-mono text-muted bg-elevated rounded px-2 py-1">{{ deleteTarget.fileName }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" size="sm" @click="deleteTarget = null">{{ t('common.cancel') }}</UButton>
          <UButton color="error" size="sm" :loading="deleting" @click="deleteRun">{{ t('common.delete') }}</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
