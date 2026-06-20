<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const destId = route.params.destId as string
const toast = useToast()
const loading = ref(false)

useHead({ title: `${t('destinations.edit_title')} — Infinix Backup` })

const { data: destination } = await useFetch<ApiDestinationDetail>(`/api/destinations/${destId}`)

async function handleSubmit(data: DestinationFormData) {
  loading.value = true
  try {
    await $fetch(`/api/destinations/${destId}`, { method: 'PUT', body: data })
    toast.add({ title: t('destinations.saved'), color: 'success', icon: 'i-lucide-check-circle' })
    await navigateTo('/destinations')
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || t('common.error')
    toast.add({ title: t('common.error'), description: msg, color: 'error' })
  } finally {
    loading.value = false
  }
}

async function testConnection() {
  try {
    await $fetch(`/api/destinations/${destId}/test`, { method: 'POST' })
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
        :items="[{ label: t('destinations.title'), to: '/destinations' }, { label: destination?.name || t('destinations.edit_title') }]"
        class="mb-3"
      />
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold tracking-tight">{{ t('destinations.edit_title') }}</h1>
        <UButton icon="i-lucide-plug-zap" color="neutral" variant="outline" size="sm" @click="testConnection">
          {{ t('common.test_connection') }}
        </UButton>
      </div>
    </div>
    <UCard v-if="destination">
      <DestinationForm :initial="destination" :loading="loading" @submit="handleSubmit" />
    </UCard>
  </div>
</template>
