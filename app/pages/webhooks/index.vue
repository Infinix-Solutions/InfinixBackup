<script setup lang="ts">
const { t } = useI18n()
const { animateIn } = usePageAnimate()
const toast = useToast()

useHead({ title: `${t('webhooks.title')} — Infinix Backup` })

const { data: webhooks, refresh } = await useFetch<ApiWebhook[]>('/api/webhooks', { default: (): ApiWebhook[] => [] })

const deleteId = ref<string | null>(null)
const testingId = ref<string | null>(null)
const showDelete = computed({
  get: () => !!deleteId.value,
  set: (v: boolean) => { if (!v) deleteId.value = null }
})

const WEBHOOK_TYPE_ICONS: Record<string, string> = {
  discord: 'i-simple-icons-discord',
  slack: 'i-simple-icons-slack',
  openwa: 'i-lucide-message-circle',
  generic: 'i-lucide-webhook'
}

const WEBHOOK_TYPE_COLORS: Record<string, string> = {
  discord: 'primary',
  slack: 'success',
  openwa: 'success',
  generic: 'neutral'
}

async function deleteWebhook(id: string) {
  await $fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
  toast.add({ title: t('webhooks.deleted'), color: 'success', icon: 'i-lucide-check-circle' })
  deleteId.value = null
  refresh()
}

async function testWebhook(id: string) {
  testingId.value = id
  try {
    await $fetch(`/api/webhooks/${id}/test`, { method: 'POST' })
    toast.add({ title: t('webhooks.test_sent'), color: 'success', icon: 'i-lucide-send' })
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || t('webhooks.test_failed')
    toast.add({ title: t('webhooks.test_failed'), description: msg, color: 'error' })
  } finally {
    testingId.value = null
  }
}

const columns = computed(() => [
  { accessorKey: 'name', header: t('common.name') },
  { accessorKey: 'type', header: t('webhooks.form.type') },
  { accessorKey: 'events', header: t('webhooks.form.events') },
  { accessorKey: 'url', header: t('webhooks.form.url') },
  { accessorKey: 'enabled', header: t('common.status') },
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
        <h1 class="text-xl font-semibold tracking-tight">
          {{ t('webhooks.title') }}
        </h1>
        <p class="text-sm text-muted mt-0.5">
          {{ t('webhooks.subtitle') }}
        </p>
      </div>
      <UButton
        to="/webhooks/new"
        icon="i-lucide-plus"
        size="sm"
      >
        {{ t('webhooks.add') }}
      </UButton>
    </div>

    <UCard class="anim-card">
      <div
        v-if="!webhooks.length"
        class="py-16 text-center"
      >
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-elevated">
          <UIcon
            name="i-lucide-webhook"
            class="h-7 w-7 text-muted"
          />
        </div>
        <p class="text-sm font-medium mb-1">
          {{ t('webhooks.no_webhooks') }}
        </p>
        <UButton
          to="/webhooks/new"
          size="sm"
          icon="i-lucide-plus"
          class="mt-3"
        >
          {{ t('webhooks.add') }}
        </UButton>
      </div>

      <UTable
        v-else
        :data="webhooks"
        :columns="columns"
      >
        <template #name-cell="{ row }">
          <NuxtLink
            :to="`/webhooks/${row.original.id}`"
            class="font-medium text-sm hover:text-primary-500 transition-colors"
          >
            {{ row.original.name }}
          </NuxtLink>
        </template>
        <template #type-cell="{ row }">
          <UBadge
            :color="(WEBHOOK_TYPE_COLORS[row.original.type] as 'primary' | 'success' | 'neutral') || 'neutral'"
            :icon="WEBHOOK_TYPE_ICONS[row.original.type] || 'i-lucide-webhook'"
            :label="row.original.type"
            variant="subtle"
            size="sm"
          />
        </template>
        <template #events-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="ev in row.original.events"
              :key="ev"
              :color="ev === 'backup.success' ? 'success' : 'error'"
              :label="ev === 'backup.success' ? '✓ success' : '✗ failed'"
              variant="subtle"
              size="sm"
            />
          </div>
        </template>
        <template #url-cell="{ row }">
          <span
            class="text-sm text-muted truncate max-w-48 block"
            :title="row.original.url"
          >
            {{ row.original.url }}
          </span>
        </template>
        <template #enabled-cell="{ row }">
          <UBadge
            :label="row.original.enabled ? t('common.active') : t('common.disabled')"
            :color="row.original.enabled ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-0.5 justify-end">
            <UTooltip :text="t('webhooks.test')">
              <UButton
                icon="i-lucide-send"
                size="xs"
                color="primary"
                variant="ghost"
                :loading="testingId === row.original.id"
                @click="testWebhook(row.original.id)"
              />
            </UTooltip>
            <UTooltip :text="t('common.edit')">
              <UButton
                :to="`/webhooks/${row.original.id}`"
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
      :title="t('webhooks.delete_title')"
    >
      <template #body>
        <p class="text-sm text-muted">
          {{ t('webhooks.delete_msg') }}
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
            @click="deleteWebhook(deleteId!)"
          >
            {{ t('common.delete') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
