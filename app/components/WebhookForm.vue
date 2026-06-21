<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  initial?: ApiWebhook
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: WebhookFormData]
}>()

const typeOptions = [
  { label: t('webhooks.form.type_generic'), value: 'generic' },
  { label: t('webhooks.form.type_discord'), value: 'discord' },
  { label: t('webhooks.form.type_slack'), value: 'slack' },
  { label: t('webhooks.form.type_openwa'), value: 'openwa' }
]

const PLACEHOLDERS = [
  { key: '{{job.name}}', desc: t('webhooks.form.ph_job_name') },
  { key: '{{job.id}}', desc: t('webhooks.form.ph_job_id') },
  { key: '{{event}}', desc: t('webhooks.form.ph_event') },
  { key: '{{run.status}}', desc: t('webhooks.form.ph_run_status') },
  { key: '{{run.id}}', desc: t('webhooks.form.ph_run_id') },
  { key: '{{run.fileName}}', desc: t('webhooks.form.ph_run_file') },
  { key: '{{run.fileSize}}', desc: t('webhooks.form.ph_run_size') },
  { key: '{{run.duration}}', desc: t('webhooks.form.ph_run_duration') },
  { key: '{{run.startedAt}}', desc: t('webhooks.form.ph_run_started') },
  { key: '{{run.error}}', desc: t('webhooks.form.ph_run_error') },
  { key: '{{job.nextAt}}', desc: t('webhooks.form.ph_job_next_at') }
]

const form = reactive<WebhookFormData>({
  name: props.initial?.name ?? '',
  type: props.initial?.type ?? 'generic',
  url: props.initial?.url ?? '',
  events: props.initial?.events ?? ['backup.success', 'backup.failed'],
  enabled: props.initial?.enabled ?? true,
  secret: props.initial?.secret ?? '',
  chatId: props.initial?.chatId ?? '',
  sessionId: props.initial?.sessionId ?? '',
  messageTemplate: props.initial?.messageTemplate ?? '',
  jobIds: props.initial?.jobIds ?? []
})

const { data: jobsData } = await useFetch<ApiJob[]>('/api/jobs')
const jobItems = computed(() => (jobsData.value ?? []).map(j => ({ label: j.name, value: j.id })))

const urlHint = computed(() => {
  if (form.type === 'discord') return t('webhooks.form.url_discord_hint')
  if (form.type === 'slack') return t('webhooks.form.url_slack_hint')
  if (form.type === 'openwa') return t('webhooks.form.url_openwa_hint')
  return t('webhooks.form.url_generic_hint')
})

const secretHint = computed(() =>
  form.type === 'openwa' ? t('webhooks.form.secret_openwa_hint') : t('webhooks.form.secret_generic_hint')
)

const templateRef = ref<HTMLTextAreaElement | null>(null)

function insertPlaceholder(key: string) {
  const el = templateRef.value
  if (!el) {
    form.messageTemplate += key
    return
  }
  const start = el.selectionStart ?? form.messageTemplate.length
  const end = el.selectionEnd ?? form.messageTemplate.length
  form.messageTemplate = form.messageTemplate.slice(0, start) + key + form.messageTemplate.slice(end)
  nextTick(() => {
    el.focus()
    el.setSelectionRange(start + key.length, start + key.length)
  })
}

function handleSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <UForm :state="form" class="space-y-5" @submit="handleSubmit">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField :label="t('webhooks.form.name')" name="name" required>
        <UInput
          v-model="form.name"
          :placeholder="t('webhooks.form.name_ph')"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="t('webhooks.form.type')" name="type" required>
        <USelect
          v-model="form.type"
          :items="typeOptions"
          value-key="value"
          label-key="label"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField :label="t('webhooks.form.url')" name="url" required :hint="urlHint">
      <UInput
        v-model="form.url"
        :placeholder="form.type === 'openwa' ? 'http://localhost:8002' : 'https://'"
        class="w-full"
      />
    </UFormField>

    <template v-if="form.type === 'openwa'">
      <UFormField :label="t('webhooks.form.session_id')" name="sessionId" required :hint="t('webhooks.form.session_id_hint')">
        <UInput
          v-model="form.sessionId"
          placeholder="my-session"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="t('webhooks.form.chat_id')" name="chatId" required :hint="t('webhooks.form.chat_id_hint')">
        <UInput
          v-model="form.chatId"
          placeholder="48123456789@c.us"
          class="w-full"
        />
      </UFormField>
    </template>

    <UFormField :label="t('webhooks.form.secret')" name="secret" :hint="secretHint">
      <UInput
        v-model="form.secret"
        type="password"
        placeholder="••••••••"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('webhooks.form.events')" name="events">
      <div class="flex flex-col gap-2">
        <label class="flex items-center gap-2 cursor-pointer">
          <UCheckbox
            :model-value="form.events.includes('backup.success')"
            @update:model-value="(v) => {
              if (v) form.events = [...form.events.filter(e => e !== 'backup.success'), 'backup.success']
              else form.events = form.events.filter(e => e !== 'backup.success')
            }"
          />
          <span class="text-sm">{{ t('webhooks.form.event_success') }}</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <UCheckbox
            :model-value="form.events.includes('backup.failed')"
            @update:model-value="(v) => {
              if (v) form.events = [...form.events.filter(e => e !== 'backup.failed'), 'backup.failed']
              else form.events = form.events.filter(e => e !== 'backup.failed')
            }"
          />
          <span class="text-sm">{{ t('webhooks.form.event_failed') }}</span>
        </label>
      </div>
    </UFormField>

    <UFormField :label="t('webhooks.form.jobs')" name="jobIds" :hint="t('webhooks.form.jobs_hint')">
      <USelect
        v-model="form.jobIds"
        :items="jobItems"
        value-key="value"
        label-key="label"
        multiple
        :placeholder="t('webhooks.form.jobs_ph')"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('webhooks.form.message_template')" name="messageTemplate" :hint="t('webhooks.form.message_template_hint')">
      <div class="space-y-2">
        <textarea
          ref="templateRef"
          v-model="form.messageTemplate"
          :placeholder="t('webhooks.form.message_template_ph')"
          rows="4"
          class="w-full rounded-md border border-default bg-default text-sm font-mono px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
        />
        <div class="rounded-lg border border-default bg-muted/40 p-3">
          <p class="text-xs text-muted font-medium mb-2 uppercase tracking-wide">{{ t('webhooks.form.placeholders') }}</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="ph in PLACEHOLDERS"
              :key="ph.key"
              type="button"
              :title="ph.desc"
              class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 transition-colors cursor-pointer border border-primary-500/20"
              @click="insertPlaceholder(ph.key)"
            >
              {{ ph.key }}
            </button>
          </div>
          <p class="text-xs text-muted mt-1.5">{{ t('webhooks.form.placeholders_hint') }}</p>
        </div>
      </div>
    </UFormField>

    <UFormField :label="t('webhooks.form.enabled')" name="enabled">
      <USwitch v-model="form.enabled" />
    </UFormField>

    <div class="flex items-center gap-3 pt-2">
      <UButton type="submit" :loading="loading">{{ t('common.save') }}</UButton>
      <UButton color="neutral" variant="ghost" @click="$router.back()">{{ t('common.cancel') }}</UButton>
    </div>
  </UForm>
</template>
