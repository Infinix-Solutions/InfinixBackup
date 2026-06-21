<script setup lang="ts">
const { t } = useI18n()
const { animateIn } = usePageAnimate()
const toast = useToast()

useHead({ title: `${t('ssh.title')} — Infinix Backup` })

const { data: connections, refresh } = await useFetch<ApiSshConnection[]>('/api/ssh-connections', { default: (): ApiSshConnection[] => [] })

const deleteId = ref<string | null>(null)
const probingId = ref<string | null>(null)
const probeResult = ref<SshProbeResult | null>(null)
const probeError = ref<string | null>(null)
const showDelete = computed({
  get: () => !!deleteId.value,
  set: (v: boolean) => { if (!v) deleteId.value = null }
})

const columns = computed(() => [
  { accessorKey: 'name', header: t('common.name') },
  { accessorKey: 'host', header: t('ssh.form.host') },
  { accessorKey: 'username', header: t('ssh.form.username') },
  { accessorKey: 'createdAt', header: t('common.created') },
  { id: 'actions', header: '' }
])

async function probeConnection(id: string) {
  probingId.value = id
  probeResult.value = null
  probeError.value = null
  try {
    const result = await $fetch<SshProbeResult>(`/api/ssh-connections/${id}/probe`, { method: 'POST' })
    probeResult.value = result
    toast.add({ title: t('ssh.probe_ok'), color: 'success', icon: 'i-lucide-check-circle' })
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || t('ssh.probe_failed')
    probeError.value = msg
    toast.add({ title: t('ssh.probe_failed'), description: msg, color: 'error' })
  } finally {
    probingId.value = null
  }
}

async function deleteConnection(id: string) {
  await $fetch(`/api/ssh-connections/${id}`, { method: 'DELETE' })
  toast.add({ title: t('ssh.deleted'), color: 'success', icon: 'i-lucide-check-circle' })
  deleteId.value = null
  refresh()
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}

onMounted(() => {
  animateIn('.anim-header', 0)
  animateIn('.anim-card', 0)
})
</script>

<template>
  <div class="py-8 px-6 lg:px-8 space-y-6">
    <div class="anim-header flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">
          {{ t('ssh.title') }}
        </h1>
        <p class="text-sm text-muted mt-0.5">
          {{ t('ssh.subtitle') }}
        </p>
      </div>
      <UButton
        to="/ssh-connections/new"
        icon="i-lucide-plus"
        size="sm"
      >
        {{ t('ssh.add') }}
      </UButton>
    </div>

    <UCard class="anim-card">
      <div
        v-if="!connections.length"
        class="py-16 text-center"
      >
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-elevated">
          <UIcon
            name="i-lucide-server"
            class="h-7 w-7 text-muted"
          />
        </div>
        <p class="text-sm font-medium mb-1">
          {{ t('ssh.no_connections') }}
        </p>
        <UButton
          to="/ssh-connections/new"
          size="sm"
          icon="i-lucide-plus"
          class="mt-3"
        >
          {{ t('ssh.add') }}
        </UButton>
      </div>

      <UTable
        v-else
        :data="connections"
        :columns="columns"
      >
        <template #name-cell="{ row }">
          <NuxtLink
            :to="`/ssh-connections/${row.original.id}`"
            class="font-medium text-sm hover:text-primary-500 transition-colors"
          >
            {{ row.original.name }}
          </NuxtLink>
        </template>
        <template #host-cell="{ row }">
          <span class="text-sm font-mono">{{ row.original.host }}:{{ row.original.port }}</span>
        </template>
        <template #username-cell="{ row }">
          <span class="text-sm text-muted">{{ row.original.username }}</span>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-sm text-muted">{{ formatDate(row.original.createdAt) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-0.5 justify-end">
            <UTooltip :text="t('ssh.probe')">
              <UButton
                icon="i-lucide-plug"
                size="xs"
                color="primary"
                variant="ghost"
                :loading="probingId === row.original.id"
                @click="probeConnection(row.original.id)"
              />
            </UTooltip>
            <UTooltip :text="t('common.edit')">
              <UButton
                :to="`/ssh-connections/${row.original.id}`"
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

    <UModal
      v-model:open="showDelete"
      :title="t('ssh.delete_title')"
    >
      <template #body>
        <p class="text-sm text-muted">
          {{ t('ssh.delete_msg') }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            @click="showDelete = false"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            color="error"
            size="sm"
            @click="deleteConnection(deleteId!)"
          >
            {{ t('common.delete') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
