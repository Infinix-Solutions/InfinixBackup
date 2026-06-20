<script setup lang="ts">
const { t } = useI18n()
const { animateIn } = usePageAnimate()
const toast = useToast()

useHead({ title: `${t('destinations.title')} — Infinix Backup` })

const { data: destinations, refresh } = await useFetch<ApiDestination[]>('/api/destinations', { default: (): ApiDestination[] => [] })
const search = ref('')
const deleteId = ref<string | null>(null)
const showDelete = computed({
  get: () => !!deleteId.value,
  set: (v: boolean) => { if (!v) deleteId.value = null }
})

const filteredDestinations = computed(() => {
  if (!search.value.trim()) return destinations.value
  const q = search.value.toLowerCase()
  return destinations.value.filter(d =>
    d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q)
  )
})

async function deleteDestination(id: string) {
  await $fetch(`/api/destinations/${id}`, { method: 'DELETE' })
  toast.add({ title: t('destinations.deleted'), color: 'success', icon: 'i-lucide-check-circle' })
  deleteId.value = null
  refresh()
}

async function testDestination(id: string) {
  try {
    await $fetch(`/api/destinations/${id}/test`, { method: 'POST' })
    toast.add({ title: t('common.connection_success'), icon: 'i-lucide-check-circle', color: 'success' })
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || t('common.connection_failed')
    toast.add({ title: t('common.connection_failed'), description: msg, color: 'error' })
  }
}

const columns = computed(() => [
  { accessorKey: 'name', header: t('common.name') },
  { accessorKey: 'type', header: t('common.type') },
  { accessorKey: 'jobsCount', header: t('common.jobs') },
  { accessorKey: 'createdAt', header: t('common.created') },
  { id: 'actions', header: '' }
])

onMounted(() => {
  animateIn('.anim-header', 0)
  animateIn('.anim-card', 0)
})
</script>

<template>
  <div class="py-8 px-6 lg:px-8 space-y-6">
    <div class="anim-header flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">{{ t('destinations.title') }}</h1>
        <p class="text-sm text-muted mt-0.5">{{ t('destinations.subtitle') }}</p>
      </div>
      <UButton to="/destinations/new" icon="i-lucide-plus" size="sm">
        {{ t('destinations.add') }}
      </UButton>
    </div>

    <UCard class="anim-card">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm text-muted">
            {{ filteredDestinations.length }}
            <span class="lowercase">{{ t('destinations.title') }}</span>
          </span>
          <UInput
            v-model="search"
            size="sm"
            :placeholder="t('common.search')"
            icon="i-lucide-search"
            class="w-52"
          />
        </div>
      </template>

      <div v-if="!destinations.length" class="py-16 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-elevated">
          <UIcon name="i-lucide-hard-drive" class="h-7 w-7 text-muted" />
        </div>
        <p class="text-sm font-medium mb-1">{{ t('destinations.no_destinations') }}</p>
        <UButton to="/destinations/new" size="sm" icon="i-lucide-plus" class="mt-3">
          {{ t('destinations.add') }}
        </UButton>
      </div>

      <div v-else-if="!filteredDestinations.length" class="py-12 text-center">
        <UIcon name="i-lucide-search-x" class="h-8 w-8 text-muted mx-auto mb-3" />
        <p class="text-sm text-muted mb-2">No destinations match "{{ search }}"</p>
        <UButton size="xs" variant="ghost" color="neutral" @click="search = ''">
          Clear search
        </UButton>
      </div>

      <UTable v-else :data="filteredDestinations" :columns="columns">
        <template #name-cell="{ row }">
          <div class="flex items-center gap-2.5">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-elevated">
              <UIcon
                :name="DESTINATION_TYPE_ICONS[row.original.type] || 'i-lucide-hard-drive'"
                class="h-3.5 w-3.5 text-muted"
              />
            </div>
            <span class="font-medium text-sm">{{ row.original.name }}</span>
          </div>
        </template>
        <template #type-cell="{ row }">
          <UBadge
            :label="DESTINATION_TYPE_LABELS[row.original.type] || row.original.type"
            color="neutral"
            variant="subtle"
            size="sm"
          />
        </template>
        <template #jobsCount-cell="{ row }">
          <span class="text-sm tabular-nums">{{ row.original.jobsCount }}</span>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-sm text-muted tabular-nums">{{ formatDateTime(row.original.createdAt) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-0.5 justify-end">
            <UTooltip :text="t('common.test_connection')">
              <UButton
                icon="i-lucide-plug-zap"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="testDestination(row.original.id)"
              />
            </UTooltip>
            <UTooltip :text="t('common.edit')">
              <UButton
                :to="`/destinations/${row.original.id}`"
                icon="i-lucide-pencil"
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
                @click="deleteId = row.original.id"
              />
            </UTooltip>
          </div>
        </template>
      </UTable>
    </UCard>

    <UModal v-model:open="showDelete" :title="t('destinations.delete_title')">
      <template #body>
        <p class="text-sm text-muted">{{ t('destinations.delete_msg') }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" size="sm" @click="showDelete = false">
            {{ t('common.cancel') }}
          </UButton>
          <UButton color="error" size="sm" @click="deleteDestination(deleteId!)">
            {{ t('common.delete') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
