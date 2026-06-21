<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const sourceId = route.params.sourceId as string
const toast = useToast()
const loading = ref(false)

useHead({ title: `${t('sources.edit_title')} — Infinix Backup` })

const { data: source } = await useFetch<ApiSourceDetail>(`/api/sources/${sourceId}`)

async function handleSubmit(data: SourceFormData) {
  loading.value = true
  try {
    await $fetch(`/api/sources/${sourceId}`, { method: 'PUT', body: data })
    toast.add({ title: t('sources.saved'), color: 'success', icon: 'i-lucide-check-circle' })
    await navigateTo('/sources')
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || t('common.error')
    toast.add({ title: t('common.error'), description: msg, color: 'error' })
  } finally {
    loading.value = false
  }
}

async function testConnection() {
  try {
    await $fetch(`/api/sources/${sourceId}/test`, { method: 'POST' })
    toast.add({ title: t('common.connection_success'), color: 'success', icon: 'i-lucide-check-circle' })
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || t('common.connection_failed')
    toast.add({ title: t('common.connection_failed'), description: msg, color: 'error' })
  }
}
</script>

<template>
  <div class="py-8 px-6 lg:px-8 max-w-3xl mx-auto">
    <div class="mb-6">
      <UBreadcrumb
        :items="[{ label: t('sources.title'), to: '/sources' }, { label: source?.name || t('sources.edit_title') }]"
        class="mb-3"
      />
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold tracking-tight">
          {{ t('sources.edit_title') }}
        </h1>
        <UButton
          icon="i-lucide-plug-zap"
          color="neutral"
          variant="outline"
          size="sm"
          @click="testConnection"
        >
          {{ t('common.test_connection') }}
        </UButton>
      </div>
    </div>
    <UCard v-if="source">
      <SourceForm
        :initial="source"
        :loading="loading"
        @submit="handleSubmit"
      />
    </UCard>
  </div>
</template>
