<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const runId = route.params.runId as string

useHead({ title: `${t('runs.details_title')} — Infinix Backup` })

const { data: run, refresh } = await useFetch<ApiRunDetail>(`/api/runs/${runId}`)

const statusColors = {
  success: 'success',
  failed: 'error',
  running: 'info',
  pending: 'warning',
  cancelled: 'neutral'
} as const

const isRunning = computed(() => run.value?.status === 'running' || run.value?.status === 'pending')

onMounted(() => {
  if (isRunning.value) {
    const interval = setInterval(async () => {
      await refresh()
      if (!isRunning.value) clearInterval(interval)
    }, 5000)
    onUnmounted(() => clearInterval(interval))
  }
})
</script>

<template>
  <div class="py-8 px-6 lg:px-8 max-w-4xl space-y-6">
    <div>
      <UBreadcrumb
        :items="[{ label: t('runs.title'), to: '/runs' }, { label: t('runs.details_title') }]"
        class="mb-3"
      />
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold">
          {{ t('runs.details_title') }}
        </h1>
        <UBadge
          v-if="run"
          :color="statusColors[run.status as keyof typeof statusColors]"
          :label="run.status"
          variant="subtle"
        />
      </div>
    </div>

    <div
      v-if="run"
      class="grid grid-cols-2 gap-4"
    >
      <UCard>
        <template #header>
          <h3 class="text-sm font-semibold text-muted uppercase tracking-wide">
            {{ t('runs.job_info') }}
          </h3>
        </template>
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between">
            <dt class="text-muted">
              {{ t('runs.job') }}
            </dt>
            <dd class="font-medium">
              <NuxtLink
                :to="`/jobs/${run.job?.id}`"
                class="hover:text-primary-500"
              >
                {{ run.job?.name }}
              </NuxtLink>
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted">
              {{ t('common.source') }}
            </dt>
            <dd>{{ run.job?.source?.name }}</dd>
          </div>
          <div class="flex flex-col gap-2 pt-1">
            <dt class="text-muted">
              {{ t('common.destinations') }}
            </dt>
            <dd class="space-y-1.5">
              <template v-if="run.destinationResults?.length">
                <div
                  v-for="dest in run.destinationResults"
                  :key="dest.id"
                  class="flex items-center justify-between gap-2 rounded-md border border-default px-2.5 py-1.5"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <UIcon
                      :name="dest.status === 'success' ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'"
                      :class="dest.status === 'success' ? 'text-success-500' : 'text-error-500'"
                      class="h-3.5 w-3.5 shrink-0"
                    />
                    <span class="text-xs font-medium truncate">{{ dest.name }}</span>
                    <UBadge
                      :label="dest.type"
                      size="xs"
                      color="neutral"
                      variant="subtle"
                    />
                  </div>
                  <UTooltip
                    v-if="dest.status === 'success' && run.fileName"
                    :text="t('runs.download')"
                  >
                    <UButton
                      :href="`/api/runs/${runId}/download?destinationId=${dest.id}`"
                      external
                      icon="i-lucide-download"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                    />
                  </UTooltip>
                  <UTooltip
                    v-else-if="dest.error"
                    :text="dest.error"
                  >
                    <UIcon
                      name="i-lucide-info"
                      class="h-3.5 w-3.5 text-error-400 shrink-0"
                    />
                  </UTooltip>
                </div>
              </template>
              <template v-else-if="run.job?.destinations?.length">
                <div
                  v-for="dest in run.job.destinations"
                  :key="dest.id"
                  class="flex items-center justify-between gap-2 rounded-md border border-default px-2.5 py-1.5"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-medium">{{ dest.name }}</span>
                    <UBadge
                      :label="dest.type"
                      size="xs"
                      color="neutral"
                      variant="subtle"
                    />
                  </div>
                  <UTooltip
                    v-if="run.status === 'success' && run.fileName"
                    :text="t('runs.download')"
                  >
                    <UButton
                      :href="`/api/runs/${runId}/download?destinationId=${dest.id}`"
                      external
                      icon="i-lucide-download"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                    />
                  </UTooltip>
                </div>
              </template>
              <span
                v-else
                class="text-xs text-muted"
              >—</span>
            </dd>
          </div>
        </dl>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-sm font-semibold text-muted uppercase tracking-wide">
            {{ t('runs.execution') }}
          </h3>
        </template>
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between">
            <dt class="text-muted">
              {{ t('common.started') }}
            </dt>
            <dd>{{ formatDateTime(run.startedAt) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted">
              {{ t('runs.completed') }}
            </dt>
            <dd>{{ formatDateTime(run.completedAt) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted">
              {{ t('common.duration') }}
            </dt>
            <dd>{{ formatDuration(run.startedAt, run.completedAt) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted">
              {{ t('common.size') }}
            </dt>
            <dd>{{ formatBytes(run.fileSizeBytes) }}</dd>
          </div>
          <div
            v-if="run.fileName"
            class="flex justify-between"
          >
            <dt class="text-muted">
              {{ t('runs.file_name') }}
            </dt>
            <dd class="font-mono text-xs">
              {{ run.fileName }}
            </dd>
          </div>
        </dl>
      </UCard>
    </div>

    <UCard v-if="run?.errorMessage">
      <template #header>
        <h3 class="text-sm font-semibold text-error uppercase tracking-wide flex items-center gap-2">
          <UIcon name="i-lucide-alert-circle" />
          {{ t('common.error') }}
        </h3>
      </template>
      <pre class="text-sm text-error font-mono whitespace-pre-wrap break-words">{{ run.errorMessage }}</pre>
    </UCard>

    <UCard v-if="run">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-muted uppercase tracking-wide">
            {{ t('runs.logs') }}
          </h3>
          <UButton
            v-if="isRunning"
            icon="i-lucide-refresh-cw"
            size="xs"
            color="neutral"
            variant="ghost"
            :loading="true"
          >
            {{ t('common.live') }}
          </UButton>
        </div>
      </template>
      <UScrollArea class="h-96">
        <pre
          v-if="run.logs"
          class="text-xs font-mono whitespace-pre-wrap break-words text-muted p-2 leading-relaxed"
        >{{ run.logs }}</pre>
        <div
          v-else
          class="py-8 text-center text-muted text-sm"
        >
          {{ t('runs.no_logs') }}
        </div>
      </UScrollArea>
    </UCard>
  </div>
</template>
