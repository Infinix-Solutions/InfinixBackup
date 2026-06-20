<script setup lang="ts">
const { t } = useI18n()
const { animateIn } = usePageAnimate()
const toast = useToast()

useHead({ title: `${t('jobs.title')} — Infinix Backup` })

const { data: jobs, refresh } = await useFetch<ApiJob[]>('/api/jobs', { default: (): ApiJob[] => [] })

const deleteId = ref<string | null>(null)
const showDelete = computed({
  get: () => !!deleteId.value,
  set: (v: boolean) => { if (!v) deleteId.value = null }
})
const runningJobs = ref<Set<string>>(new Set())
const search = ref('')
type EnabledFilter = 'all' | 'active' | 'disabled'
const enabledFilter = ref<EnabledFilter>('all')

const enabledFilterOpts: Array<{ label: string; value: EnabledFilter }> = [
  { label: t('common.all'), value: 'all' },
  { label: t('common.active'), value: 'active' },
  { label: t('common.disabled'), value: 'disabled' }
]

const filteredJobs = computed(() => {
  let data = jobs.value
  if (enabledFilter.value === 'active') data = data.filter(j => j.enabled)
  else if (enabledFilter.value === 'disabled') data = data.filter(j => !j.enabled)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    data = data.filter(j =>
      j.name.toLowerCase().includes(q) || (j.sourceName?.toLowerCase().includes(q) ?? false)
    )
  }
  return data
})

async function deleteJob(id: string) {
  await $fetch(`/api/jobs/${id}`, { method: 'DELETE' })
  toast.add({ title: t('jobs.deleted'), color: 'success', icon: 'i-lucide-check-circle' })
  deleteId.value = null
  refresh()
}

async function runNow(id: string, name: string) {
  runningJobs.value = new Set(runningJobs.value).add(id)
  try {
    await $fetch(`/api/jobs/${id}/run`, { method: 'POST' })
    toast.add({ title: `${t('jobs.started')}: ${name}`, description: t('jobs.started_desc'), color: 'info', icon: 'i-lucide-play-circle' })
    setTimeout(() => {
      const next = new Set(runningJobs.value)
      next.delete(id)
      runningJobs.value = next
    }, 3000)
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || t('common.error')
    toast.add({ title: t('common.error'), description: msg, color: 'error' })
    const next = new Set(runningJobs.value)
    next.delete(id)
    runningJobs.value = next
  }
}

async function toggleEnabled(job: ApiJob) {
  await $fetch(`/api/jobs/${job.id}`, { method: 'PUT', body: { ...job, enabled: !job.enabled } })
  toast.add({ title: !job.enabled ? t('common.enabled') : t('common.disabled'), color: 'success' })
  refresh()
}

const columns = computed(() => [
  { accessorKey: 'name', header: t('common.name') },
  { accessorKey: 'sourceName', header: t('common.source') },
  { id: 'destinations', header: t('common.destinations') },
  { accessorKey: 'schedule', header: 'Schedule' },
  { accessorKey: 'enabled', header: t('common.status') },
  { accessorKey: 'lastRunAt', header: 'Last Run' },
  { id: 'actions', header: '' }
])

onMounted(() => {
  animateIn('.anim-header', 0)
  animateIn('.anim-card', 0.05)
})
</script>

<template>
  <div class="py-8 px-6 lg:px-8 space-y-6">
    <div class="anim-header flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">{{ t('jobs.title') }}</h1>
        <p class="text-sm text-muted mt-0.5">{{ t('jobs.subtitle') }}</p>
      </div>
      <UButton to="/jobs/new" icon="i-lucide-plus" size="sm">{{ t('jobs.add') }}</UButton>
    </div>

    <UCard class="anim-card">
      <template #header>
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <div class="flex rounded-lg border border-default overflow-hidden text-xs">
              <button
                v-for="opt in enabledFilterOpts"
                :key="opt.value"
                type="button"
                :class="[
                  'px-3 py-1.5 font-medium transition-colors border-r border-default last:border-r-0',
                  enabledFilter === opt.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-background text-muted hover:bg-elevated'
                ]"
                @click="enabledFilter = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted tabular-nums">{{ filteredJobs.length }} / {{ jobs.length }}</span>
            <UInput v-model="search" size="sm" :placeholder="t('common.search')" icon="i-lucide-search" class="w-44" />
          </div>
        </div>
      </template>

      <div v-if="!jobs.length" class="py-16 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-elevated">
          <UIcon name="i-lucide-calendar-clock" class="h-7 w-7 text-muted" />
        </div>
        <p class="text-sm font-semibold mb-1">{{ t('jobs.no_jobs') }}</p>
        <p class="text-xs text-muted mb-4">Utwórz pierwsze zadanie backupu aby zacząć.</p>
        <UButton to="/jobs/new" size="sm" icon="i-lucide-plus">{{ t('jobs.add') }}</UButton>
      </div>

      <div v-else-if="!filteredJobs.length" class="py-12 text-center">
        <UIcon name="i-lucide-search-x" class="h-8 w-8 text-muted mx-auto mb-3" />
        <p class="text-sm text-muted mb-2">Brak pasujących wyników</p>
        <UButton size="xs" variant="ghost" color="neutral" @click="search = ''; enabledFilter = 'all'">
          Wyczyść filtry
        </UButton>
      </div>

      <UTable v-else :data="filteredJobs" :columns="columns">
        <template #name-cell="{ row }">
          <NuxtLink :to="`/jobs/${row.original.id}`" class="font-medium text-sm hover:text-primary-500 transition-colors">
            {{ row.original.name }}
          </NuxtLink>
        </template>
        <template #sourceName-cell="{ row }">
          <div class="flex items-center gap-1.5">
            <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-elevated">
              <UIcon :name="(row.original.sourceType && SOURCE_TYPE_ICONS[row.original.sourceType]) || 'i-lucide-database'" class="h-3 w-3 text-muted" />
            </div>
            <span class="text-sm">{{ row.original.sourceName }}</span>
          </div>
        </template>
        <template #destinations-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <div
              v-for="dest in (row.original as ApiJob).destinations"
              :key="dest.id"
              class="flex items-center gap-1 rounded bg-elevated px-1.5 py-0.5"
            >
              <UIcon :name="DESTINATION_TYPE_ICONS[dest.type] || 'i-lucide-hard-drive'" class="h-3 w-3 text-muted" />
              <span class="text-xs">{{ dest.name }}</span>
            </div>
          </div>
        </template>
        <template #schedule-cell="{ row }">
          <code class="rounded-md bg-elevated px-2 py-0.5 font-mono text-xs">{{ row.original.schedule }}</code>
        </template>
        <template #enabled-cell="{ row }">
          <UBadge
            :label="row.original.enabled ? t('common.active') : t('common.disabled')"
            :color="row.original.enabled ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          />
        </template>
        <template #lastRunAt-cell="{ row }">
          <span class="text-sm text-muted tabular-nums">{{ formatDateTime(row.original.lastRunAt) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-0.5 justify-end">
            <UTooltip :text="t('common.run_now')">
              <UButton icon="i-lucide-play" size="xs" color="primary" variant="ghost" :loading="runningJobs.has(row.original.id)" @click="runNow(row.original.id, row.original.name)" />
            </UTooltip>
            <UTooltip :text="row.original.enabled ? t('common.disabled') : t('common.enabled')">
              <UButton :icon="row.original.enabled ? 'i-lucide-pause' : 'i-lucide-play-circle'" size="xs" color="neutral" variant="ghost" @click="toggleEnabled(row.original)" />
            </UTooltip>
            <UTooltip :text="t('common.edit')">
              <UButton :to="`/jobs/${row.original.id}`" icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" />
            </UTooltip>
            <UTooltip :text="t('common.delete')">
              <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="deleteId = row.original.id" />
            </UTooltip>
          </div>
        </template>
      </UTable>
    </UCard>

    <UModal v-model:open="showDelete" :title="t('jobs.delete_title')">
      <template #body>
        <p class="text-sm text-muted">{{ t('jobs.delete_msg') }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" size="sm" @click="showDelete = false">{{ t('common.cancel') }}</UButton>
          <UButton color="error" size="sm" @click="deleteJob(deleteId!)">{{ t('common.delete') }}</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
