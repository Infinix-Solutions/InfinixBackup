<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n()

const props = defineProps<{
  initial?: Partial<JobFormData>
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: JobFormData]
}>()

const { data: sources } = await useFetch<ApiSource[]>('/api/sources', { default: (): ApiSource[] => [] })
const { data: destinations } = await useFetch<ApiDestination[]>('/api/destinations', { default: (): ApiDestination[] => [] })

const form = reactive<JobFormData>({
  name: props.initial?.name ?? '',
  sourceId: props.initial?.sourceId ?? '',
  destinationIds: props.initial?.destinationIds ?? [],
  schedule: props.initial?.schedule ?? '0 2 * * *',
  enabled: props.initial?.enabled ?? true,
  retentionDays: props.initial?.retentionDays ?? 30,
  retentionCount: props.initial?.retentionCount ?? 0,
  compression: props.initial?.compression ?? 'gzip',
  filenamePrefix: props.initial?.filenamePrefix ?? 'backup'
})

const CUSTOM_VALUE = '__custom__'

const useCustomCron = ref(
  !CRON_PRESETS.some(p => p.value === form.schedule)
)
const selectedPreset = ref(useCustomCron.value ? CUSTOM_VALUE : form.schedule)

watch(selectedPreset, (val) => {
  if (val === CUSTOM_VALUE) {
    useCustomCron.value = true
  } else if (val) {
    form.schedule = val
    useCustomCron.value = false
  }
})

const cronItems = computed(() => [
  ...CRON_PRESETS,
  { label: t('jobs.form.schedule_custom'), value: CUSTOM_VALUE }
])

const compressionOptions = computed(() => [
  { label: t('jobs.form.compression_gzip'), value: 'gzip' as CompressionType },
  { label: t('jobs.form.compression_zip'), value: 'zip' as CompressionType },
  { label: t('jobs.form.compression_none'), value: 'none' as CompressionType }
])

const sourceItems = computed(() =>
  sources.value.map(s => ({
    label: s.name,
    value: s.id,
    hint: SOURCE_TYPE_LABELS[s.type] || s.type
  }))
)

function toggleDestination(id: string) {
  const idx = form.destinationIds.indexOf(id)
  if (idx >= 0) {
    form.destinationIds.splice(idx, 1)
  } else {
    form.destinationIds.push(id)
  }
}

function handleSubmit(_e?: FormSubmitEvent<JobFormData>) {
  emit('submit', { ...form })
}
</script>

<template>
  <UForm :state="form" class="space-y-6" @submit="handleSubmit">
    <UFormField :label="t('jobs.form.name')" name="name" required>
      <UInput v-model="form.name" :placeholder="t('jobs.form.name_ph')" class="w-full" />
    </UFormField>

    <UFormField :label="t('jobs.form.source')" name="sourceId" required>
      <USelect
        v-model="form.sourceId"
        :items="sourceItems"
        value-key="value"
        label-key="label"
        :placeholder="t('jobs.form.source_ph')"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('jobs.form.destinations')" name="destinationIds" required :hint="t('jobs.form.destinations_hint')">
      <div v-if="destinations.length === 0" class="text-sm text-muted py-2">
        {{ t('jobs.form.no_destinations') }}
        <NuxtLink to="/destinations/new" class="text-primary-500 hover:underline">{{ t('jobs.form.add_destination') }}</NuxtLink>
      </div>
      <div v-else class="space-y-2">
        <label
          v-for="dest in destinations"
          :key="dest.id"
          class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
          :class="form.destinationIds.includes(dest.id)
            ? 'border-primary-500 bg-primary-500/5'
            : 'border-default hover:bg-elevated'"
          @click="toggleDestination(dest.id)"
        >
          <UCheckbox
            :model-value="form.destinationIds.includes(dest.id)"
            @click.prevent
          />
          <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-elevated">
            <UIcon :name="DESTINATION_TYPE_ICONS[dest.type] || 'i-lucide-hard-drive'" class="h-3.5 w-3.5 text-muted" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium leading-none">{{ dest.name }}</p>
            <p class="text-xs text-muted mt-0.5">{{ DESTINATION_TYPE_LABELS[dest.type] || dest.type }}</p>
          </div>
        </label>
      </div>
    </UFormField>

    <UFormField
      :label="t('jobs.form.schedule')"
      name="schedule"
      required
      :hint="t('jobs.form.schedule_hint')"
    >
      <div class="space-y-2 w-full">
        <USelect
          v-model="selectedPreset"
          :items="cronItems"
          value-key="value"
          label-key="label"
          :placeholder="t('jobs.form.schedule_ph')"
          class="w-full"
        />
        <UInput
          v-if="useCustomCron"
          v-model="form.schedule"
          placeholder="0 2 * * *"
          class="w-full font-mono"
        />
        <p class="text-xs text-muted">
          {{ t('jobs.form.schedule_current') }}:
          <code class="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">{{ form.schedule }}</code>
        </p>
      </div>
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField :label="t('jobs.form.compression')" name="compression">
        <USelect
          v-model="form.compression"
          :items="compressionOptions"
          value-key="value"
          label-key="label"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="t('jobs.form.prefix')" name="filenamePrefix">
        <UInput v-model="form.filenamePrefix" placeholder="backup" class="w-full" />
      </UFormField>
    </div>

    <fieldset class="rounded-lg border border-default p-4 space-y-3">
      <legend class="px-1 text-sm font-medium">{{ t('jobs.form.retention') }}</legend>
      <p class="text-xs text-muted">{{ t('jobs.form.retention_hint') }}</p>
      <div class="grid grid-cols-2 gap-4">
        <UFormField :label="t('jobs.form.retention_days')" name="retentionDays">
          <UInputNumber v-model="form.retentionDays" :min="0" :max="3650" class="w-full" />
        </UFormField>
        <UFormField :label="t('jobs.form.retention_count')" name="retentionCount">
          <UInputNumber v-model="form.retentionCount" :min="0" :max="9999" class="w-full" />
        </UFormField>
      </div>
    </fieldset>

    <UFormField :label="t('common.status')" name="enabled">
      <USwitch
        v-model="form.enabled"
        :label="form.enabled ? t('jobs.form.status_enabled') : t('jobs.form.status_disabled')"
      />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton to="/jobs" color="neutral" variant="ghost">{{ t('common.cancel') }}</UButton>
      <UButton type="submit" :loading="loading" icon="i-lucide-save">
        {{ t('common.save') }}
      </UButton>
    </div>
  </UForm>
</template>
