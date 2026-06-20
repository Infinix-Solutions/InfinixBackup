<script setup lang="ts">
const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const webhookId = route.params.webhookId as string
useHead({ title: `${t('webhooks.edit_title')} — Infinix Backup` })

const { data: webhook } = await useFetch<ApiWebhook>(`/api/webhooks/${webhookId}`)
if (!webhook.value) throw createError({ statusCode: 404, statusMessage: 'Webhook not found' })

const loading = ref(false)

async function handleSubmit(data: WebhookFormData) {
  loading.value = true
  try {
    await $fetch(`/api/webhooks/${webhookId}`, { method: 'PUT', body: data })
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
        { label: webhook!.name }
      ]" />
      <h1 class="text-xl font-semibold tracking-tight mt-3">{{ t('webhooks.edit_title') }}</h1>
    </div>

    <UCard>
      <WebhookForm :initial="webhook!" :loading="loading" @submit="handleSubmit" />
    </UCard>
  </div>
</template>
