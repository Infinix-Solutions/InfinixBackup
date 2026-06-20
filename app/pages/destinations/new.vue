<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const loading = ref(false)

useHead({ title: `${t('destinations.new_title')} — Infinix Backup` })

async function handleSubmit(data: DestinationFormData) {
  loading.value = true
  try {
    await $fetch('/api/destinations', { method: 'POST', body: data })
    toast.add({ title: t('destinations.saved'), color: 'success', icon: 'i-lucide-check-circle' })
    await navigateTo('/destinations')
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
        :items="[{ label: t('destinations.title'), to: '/destinations' }, { label: t('destinations.new_title') }]"
        class="mb-3"
      />
      <h1 class="text-xl font-semibold tracking-tight">{{ t('destinations.new_title') }}</h1>
    </div>
    <UCard>
      <DestinationForm :loading="loading" @submit="handleSubmit" />
    </UCard>
  </div>
</template>
