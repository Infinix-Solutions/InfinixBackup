<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  initial?: Partial<DestinationFormData>
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: DestinationFormData]
}>()

const form = reactive<DestinationFormData>({
  name: props.initial?.name || '',
  type: props.initial?.type || 's3',
  config: props.initial?.config ? { ...props.initial.config } : {}
})

const destTypes = computed(() => [
  { label: 'Amazon S3 / S3-Compatible', value: 's3' },
  { label: 'FTP', value: 'ftp' },
  { label: 'SFTP', value: 'sftp' },
  { label: t('destinations.form.type_local'), value: 'local' }
])

watch(() => form.type, () => {
  form.config = {}
})

function handleSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <UForm
    :state="form"
    class="space-y-6"
    @submit="handleSubmit"
  >
    <UFormField
      :label="t('destinations.form.name')"
      name="name"
      required
    >
      <UInput
        v-model="form.name"
        :placeholder="t('destinations.form.name_ph')"
        class="w-full"
      />
    </UFormField>

    <UFormField
      :label="t('destinations.form.type')"
      name="type"
      required
    >
      <USelect
        v-model="form.type"
        :items="destTypes"
        value-key="value"
        label-key="label"
        class="w-full"
      />
    </UFormField>

    <!-- S3 -->
    <template v-if="form.type === 's3'">
      <div class="grid grid-cols-2 gap-4">
        <UFormField
          :label="t('destinations.form.bucket')"
          name="bucket"
          required
        >
          <UInput
            v-model="(form.config as Record<string, string>).bucket"
            placeholder="my-backup-bucket"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('destinations.form.region')"
          name="region"
          required
        >
          <UInput
            v-model="(form.config as Record<string, string>).region"
            placeholder="eu-central-1"
            class="w-full"
          />
        </UFormField>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <UFormField
          :label="t('destinations.form.access_key')"
          name="accessKeyId"
          required
        >
          <UInput
            v-model="(form.config as Record<string, string>).accessKeyId"
            placeholder="AKIA..."
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('destinations.form.secret_key')"
          name="secretAccessKey"
          required
        >
          <UInput
            v-model="(form.config as Record<string, string>).secretAccessKey"
            type="password"
            placeholder="••••••••"
            class="w-full"
          />
        </UFormField>
      </div>
      <UFormField
        :label="t('destinations.form.endpoint')"
        name="endpoint"
        :hint="t('destinations.form.endpoint_hint')"
      >
        <UInput
          v-model="(form.config as Record<string, string>).endpoint"
          placeholder="https://s3.example.com"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('destinations.form.path_prefix')"
        name="pathPrefix"
        :hint="t('destinations.form.path_prefix_hint')"
      >
        <UInput
          v-model="(form.config as Record<string, string>).pathPrefix"
          placeholder="backups/production"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="t('destinations.form.force_path_style')">
        <USwitch
          v-model="(form.config as Record<string, boolean>).forcePathStyle"
          :label="t('destinations.form.force_path_style_label')"
        />
      </UFormField>
    </template>

    <!-- FTP -->
    <template v-if="form.type === 'ftp'">
      <div class="grid grid-cols-2 gap-4">
        <UFormField
          :label="t('common.host')"
          name="host"
          required
        >
          <UInput
            v-model="(form.config as Record<string, string>).host"
            placeholder="ftp.example.com"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('common.port')"
          name="port"
        >
          <UInputNumber
            v-model="(form.config as Record<string, number>).port"
            :default-value="21"
            class="w-full"
          />
        </UFormField>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <UFormField
          :label="t('common.username')"
          name="username"
          required
        >
          <UInput
            v-model="(form.config as Record<string, string>).username"
            placeholder="ftpuser"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('common.password')"
          name="password"
          required
        >
          <UInput
            v-model="(form.config as Record<string, string>).password"
            type="password"
            placeholder="••••••••"
            class="w-full"
          />
        </UFormField>
      </div>
      <UFormField
        :label="t('destinations.form.remote_path')"
        name="remotePath"
        required
      >
        <UInput
          v-model="(form.config as Record<string, string>).remotePath"
          placeholder="/backups"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="t('destinations.form.security')">
        <USwitch
          v-model="(form.config as Record<string, boolean>).secure"
          :label="t('destinations.form.secure_ftp')"
        />
      </UFormField>
    </template>

    <!-- SFTP -->
    <template v-if="form.type === 'sftp'">
      <div class="grid grid-cols-2 gap-4">
        <UFormField
          :label="t('common.host')"
          name="host"
          required
        >
          <UInput
            v-model="(form.config as Record<string, string>).host"
            placeholder="sftp.example.com"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('common.port')"
          name="port"
        >
          <UInputNumber
            v-model="(form.config as Record<string, number>).port"
            :default-value="22"
            class="w-full"
          />
        </UFormField>
      </div>
      <UFormField
        :label="t('common.username')"
        name="username"
        required
      >
        <UInput
          v-model="(form.config as Record<string, string>).username"
          placeholder="sftpuser"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('common.password')"
        name="password"
        :hint="t('destinations.form.password_sftp_hint')"
      >
        <UInput
          v-model="(form.config as Record<string, string>).password"
          type="password"
          placeholder="••••••••"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('destinations.form.private_key')"
        name="privateKey"
        :hint="t('destinations.form.private_key_hint')"
      >
        <UTextarea
          v-model="(form.config as Record<string, string>).privateKey"
          placeholder="-----BEGIN RSA PRIVATE KEY-----"
          :rows="4"
          class="w-full font-mono text-xs"
        />
      </UFormField>
      <UFormField
        :label="t('destinations.form.passphrase')"
        name="passphrase"
        :hint="t('destinations.form.passphrase_hint')"
      >
        <UInput
          v-model="(form.config as Record<string, string>).passphrase"
          type="password"
          placeholder="••••••••"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('destinations.form.remote_path')"
        name="remotePath"
        required
      >
        <UInput
          v-model="(form.config as Record<string, string>).remotePath"
          placeholder="/home/user/backups"
          class="w-full"
        />
      </UFormField>
    </template>

    <!-- Local -->
    <template v-if="form.type === 'local'">
      <div class="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex gap-3">
        <UIcon
          name="i-lucide-container"
          class="h-4 w-4 text-amber-500 mt-0.5 shrink-0"
        />
        <div class="text-xs text-amber-700 dark:text-amber-400 space-y-1">
          <p class="font-medium">
            {{ t('destinations.form.docker_hint_title') }}
          </p>
          <p>{{ t('destinations.form.docker_hint_body') }}</p>
          <code class="block mt-1 font-mono bg-amber-500/10 rounded px-2 py-1">-v /host/backups:/backups</code>
        </div>
      </div>
      <UFormField
        :label="t('destinations.form.local_path')"
        name="path"
        required
        :hint="t('destinations.form.local_path_hint')"
      >
        <UInput
          v-model="(form.config as Record<string, string>).path"
          placeholder="/backups"
          class="w-full"
        />
      </UFormField>
    </template>

    <div class="flex justify-end gap-2 pt-2">
      <UButton
        to="/destinations"
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
