<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const loading = ref(false)

useHead({ title: `${t('sources.new_title')} — Infinix Backup` })

async function handleSubmit(data: SourceFormData) {
  loading.value = true
  try {
    await $fetch('/api/sources', { method: 'POST', body: data })
    toast.add({ title: t('sources.saved'), color: 'success', icon: 'i-lucide-check-circle' })
    await navigateTo('/sources')
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || t('common.error')
    toast.add({ title: t('common.error'), description: msg, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="py-8 px-6 lg:px-8 max-w-3xl mx-auto">
    <div class="mb-6">
      <UBreadcrumb
        :items="[{ label: t('sources.title'), to: '/sources' }, { label: t('sources.new_title') }]"
        class="mb-3"
      />
      <h1 class="text-xl font-semibold tracking-tight">{{ t('sources.new_title') }}</h1>
    </div>
    <UCard>
      <SourceForm :loading="loading" @submit="handleSubmit" />
    </UCard>
  </div>
</template>
