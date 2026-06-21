<script setup lang="ts">
const props = defineProps<{
  initial?: Partial<ApiSshConnection>
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: { name: string, host: string, port: number, username: string, password?: string }]
}>()

const { t } = useI18n()

const isNew = !props.initial?.id

const form = reactive({
  name: props.initial?.name || '',
  host: props.initial?.host || '',
  port: props.initial?.port || 22,
  username: props.initial?.username || 'root',
  password: ''
})

function handleSubmit() {
  const { password, ...rest } = form
  emit('submit', password ? { ...rest, password } : rest)
}
</script>

<template>
  <UForm
    :state="form"
    class="space-y-5"
    @submit="handleSubmit"
  >
    <UFormField
      :label="t('ssh.form.name')"
      name="name"
      required
    >
      <UInput
        v-model="form.name"
        :placeholder="t('ssh.form.name_ph')"
        class="w-full"
      />
    </UFormField>

    <div class="grid grid-cols-3 gap-4">
      <UFormField
        :label="t('ssh.form.host')"
        name="host"
        required
        class="col-span-2"
      >
        <UInput
          v-model="form.host"
          :placeholder="t('ssh.form.host_ph')"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('ssh.form.port')"
        name="port"
      >
        <UInputNumber
          v-model="form.port"
          :min="1"
          :max="65535"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField
      :label="t('ssh.form.username')"
      name="username"
      required
    >
      <UInput
        v-model="form.username"
        :placeholder="t('ssh.form.username_ph')"
        class="w-full"
      />
    </UFormField>

    <UFormField
      :label="t('ssh.form.password')"
      name="password"
      :hint="isNew ? t('ssh.form.password_hint_new') : t('ssh.form.password_hint_edit')"
    >
      <UInput
        v-model="form.password"
        type="password"
        placeholder="••••••••"
        class="w-full"
      />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton
        to="/ssh-connections"
        color="neutral"
        variant="ghost"
      >
        {{ t('common.cancel') }}
      </UButton>
      <UButton
        type="submit"
        :loading="loading"
        icon="i-lucide-save"
      >
        {{ t('common.save') }}
      </UButton>
    </div>
  </UForm>
</template>
