<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const jobId = route.params.jobId as string
const toast = useToast()

useHead({ title: `${t('jobs.edit_title')} — Infinix Backup` })

const { data: job } = await useFetch<ApiJobDetail>(`/api/jobs/${jobId}`)

const loading = ref(false)
const running = ref(false)

async function handleSubmit(data: JobFormData) {
  loading.value = true
  try {
    await $fetch(`/api/jobs/${jobId}`, { method: 'PUT', body: data })
    toast.add({ title: t('jobs.saved'), color: 'success', icon: 'i-lucide-check-circle' })
    await navigateTo('/jobs')
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || t('common.error')
    toast.add({ title: t('common.error'), description: msg, color: 'error' })
  } finally {
    loading.value = false
  }
}

async function runNow() {
  running.value = true
  try {
    await $fetch(`/api/jobs/${jobId}/run`, { method: 'POST' })
    toast.add({ title: t('jobs.started'), description: t('jobs.started_desc'), color: 'info', icon: 'i-lucide-play-circle' })
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || t('common.error')
    toast.add({ title: t('common.error'), description: msg, color: 'error' })
  } finally {
    setTimeout(() => { running.value = false }, 3000)
  }
}

const initialData = computed(() =>
  job.value
    ? {
        name: job.value.name,
        sourceId: job.value.sourceId,
        destinationIds: job.value.destinationIds ?? [],
        schedule: job.value.schedule,
        enabled: job.value.enabled,
        retentionDays: job.value.retentionDays,
        retentionCount: job.value.retentionCount,
        compression: job.value.compression,
        filenamePrefix: job.value.filenamePrefix ?? 'backup'
      }
    : undefined
)
</script>

<template>
  <div class="py-8 px-6 lg:px-8 max-w-3xl mx-auto">
    <div class="mb-6">
      <UBreadcrumb
        :items="[{ label: t('jobs.title'), to: '/jobs' }, { label: job?.name || t('jobs.edit_title') }]"
        class="mb-3"
      />
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold tracking-tight">{{ t('jobs.edit_title') }}</h1>
        <div class="flex gap-2">
          <UButton
            icon="i-lucide-history"
            color="neutral"
            variant="outline"
            size="sm"
            :to="`/runs?jobId=${jobId}`"
          >
            {{ t('jobs.run_history') }}
          </UButton>
          <UButton
            icon="i-lucide-play"
            size="sm"
            :loading="running"
            @click="runNow"
          >
            {{ t('common.run_now') }}
          </UButton>
        </div>
      </div>
    </div>

    <UCard v-if="job">
      <JobForm :initial="initialData" :loading="loading" @submit="handleSubmit" />
    </UCard>
  </div>
</template>
