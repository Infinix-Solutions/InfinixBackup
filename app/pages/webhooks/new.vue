<script setup lang="ts">
const { t } = useI18n()
const router = useRouter()
const toast = useToast()

useHead({ title: `${t('webhooks.new_title')} — Infinix Backup` })

const loading = ref(false)

async function handleSubmit(data: WebhookFormData) {
  loading.value = true
  try {
    await $fetch('/api/webhooks', { method: 'POST', body: data })
    toast.add({ title: t('webhooks.saved'), color: 'success', icon: 'i-lucide-check-circle' })
    await router.push('/webhooks')
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
      <UBreadcrumb :items="[
        { label: t('webhooks.title'), to: '/webhooks' },
        { label: t('webhooks.new_title') }
      ]" />
      <h1 class="text-xl font-semibold tracking-tight mt-3">{{ t('webhooks.new_title') }}</h1>
    </div>

    <UCard>
      <WebhookForm :loading="loading" @submit="handleSubmit" />
    </UCard>
  </div>
</template>
