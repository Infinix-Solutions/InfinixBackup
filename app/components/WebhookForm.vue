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

const form = reactive<WebhookFormData>({
  name: props.initial?.name ?? '',
  type: props.initial?.type ?? 'generic',
  url: props.initial?.url ?? '',
  events: props.initial?.events ?? ['backup.success', 'backup.failed'],
  enabled: props.initial?.enabled ?? true,
  secret: props.initial?.secret ?? '',
  chatId: props.initial?.chatId ?? ''
})

const urlHint = computed(() => {
  if (form.type === 'discord') return t('webhooks.form.url_discord_hint')
  if (form.type === 'slack') return t('webhooks.form.url_slack_hint')
  if (form.type === 'openwa') return t('webhooks.form.url_openwa_hint')
  return t('webhooks.form.url_generic_hint')
})

const secretHint = computed(() =>
  form.type === 'openwa' ? t('webhooks.form.secret_openwa_hint') : t('webhooks.form.secret_generic_hint')
)

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

    <UFormField v-if="form.type === 'openwa'" :label="t('webhooks.form.chat_id')" name="chatId" :hint="t('webhooks.form.chat_id_hint')">
      <UInput
        v-model="form.chatId"
        placeholder="48123456789@c.us"
        class="w-full"
      />
    </UFormField>

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

    <UFormField :label="t('webhooks.form.enabled')" name="enabled">
      <USwitch v-model="form.enabled" />
    </UFormField>

    <div class="flex items-center gap-3 pt-2">
      <UButton type="submit" :loading="loading">{{ t('common.save') }}</UButton>
      <UButton color="neutral" variant="ghost" @click="$router.back()">{{ t('common.cancel') }}</UButton>
    </div>
  </UForm>
</template>
