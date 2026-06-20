<script setup lang="ts">
import type { ComputedRef } from 'vue'

const props = defineProps<{
  initial?: Partial<SourceFormData>
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: SourceFormData]
}>()

const { t } = useI18n()

// SSH connections for server selector
const { data: sshConnectionsList } = useFetch<ApiSshConnection[]>('/api/ssh-connections', { default: () => [] })
const sshServerOptions = computed(() => [
  { label: t('ssh.form.server_local'), value: null },
  ...(sshConnectionsList.value || []).map(c => ({ label: `${c.name} (${c.host}:${c.port})`, value: c.id }))
])
const selectedSshId = ref<string | null>(props.initial?.sshConnectionId || null)

// Probe result for selected SSH server
const probing = ref(false)
const probe = ref<SshProbeResult | null>(null)

async function runProbe(sshId: string) {
  if (!sshId) { probe.value = null; return }
  probing.value = true
  try {
    probe.value = await $fetch<SshProbeResult>(`/api/ssh-connections/${sshId}/probe`, { method: 'POST' })
  } catch {
    probe.value = null
  } finally {
    probing.value = false
  }
}

let mounted = false
onMounted(() => {
  if (selectedSshId.value) runProbe(selectedSshId.value)
  mounted = true
})

watch(selectedSshId, (id) => {
  runProbe(id)
  if (mounted) form.config = {}
})

// Local docker containers (only used when no SSH selected)
const { data: dockerContainerList } = useFetch<Array<{ name: string; image: string }>>('/api/docker/containers', {
  default: () => []
})

const containerOptions = computed(() => {
  if (selectedSshId.value && probe.value) {
    return probe.value.containers.map(name => ({ value: name, label: name }))
  }
  return (dockerContainerList.value || []).map((c) => ({
    value: c.name,
    label: `${c.name} (${c.image})`
  }))
})

const form = reactive<SourceFormData>({
  name: props.initial?.name || '',
  type: props.initial?.type || 'postgresql',
  config: props.initial?.config ? { ...props.initial.config } : {},
  sshConnectionId: props.initial?.sshConnectionId || null
})

const sourceTypes = computed(() => {
  const allTypes = [
    { label: 'PostgreSQL', value: 'postgresql', icon: 'i-simple-icons-postgresql', needsDocker: false, needsPostgres: true, needsMysql: false, needsMongo: false },
    { label: 'MySQL / MariaDB', value: 'mysql', icon: 'i-simple-icons-mysql', needsDocker: false, needsPostgres: false, needsMysql: true, needsMongo: false },
    { label: 'MongoDB', value: 'mongodb', icon: 'i-simple-icons-mongodb', needsDocker: false, needsPostgres: false, needsMysql: false, needsMongo: true },
    { label: t('sources.form.type_files'), value: 'files', icon: 'i-lucide-folder', needsDocker: false, needsPostgres: false, needsMysql: false, needsMongo: false },
    { label: 'Docker → PostgreSQL', value: 'docker_postgresql', icon: 'i-simple-icons-docker', needsDocker: true, needsPostgres: false, needsMysql: false, needsMongo: false },
    { label: 'Docker → MySQL', value: 'docker_mysql', icon: 'i-simple-icons-docker', needsDocker: true, needsPostgres: false, needsMysql: false, needsMongo: false },
    { label: 'Docker → MongoDB', value: 'docker_mongodb', icon: 'i-simple-icons-docker', needsDocker: true, needsPostgres: false, needsMysql: false, needsMongo: false },
    { label: 'Docker → Folder / Volume', value: 'docker_folder', icon: 'i-simple-icons-docker', needsDocker: true, needsPostgres: false, needsMysql: false, needsMongo: false }
  ]
  if (!selectedSshId.value || !probe.value) return allTypes
  const p = probe.value
  return allTypes.filter(st =>
    (!st.needsDocker || p.docker) &&
    (!st.needsPostgres || p.postgres) &&
    (!st.needsMysql || p.mysql) &&
    (!st.needsMongo || p.mongo)
  )
}) as ComputedRef<{ label: string, value: string, icon: string }[]>

const isDockerDb = computed(() =>
  ['docker_postgresql', 'docker_mysql', 'docker_mongodb'].includes(form.type)
)
const isDocker = computed(() =>
  ['docker_postgresql', 'docker_mysql', 'docker_mongodb', 'docker_folder'].includes(form.type)
)
const needsDb = computed(() =>
  !['files', 'docker_folder'].includes(form.type)
)

watch(() => form.type, () => { form.config = {} })

function handleSubmit() {
  if (!form.config.port && ['postgresql', 'mysql', 'docker_postgresql', 'docker_mysql'].includes(form.type)) {
    form.config.port = form.type.includes('mysql') ? 3306 : 5432
  }
  form.sshConnectionId = selectedSshId.value || null
  emit('submit', { ...form })
}
</script>

<template>
  <UForm :state="form" class="space-y-5" @submit="handleSubmit">
    <UFormField :label="t('sources.form.name')" name="name" required>
      <UInput v-model="form.name" :placeholder="t('sources.form.name_ph')" class="w-full" />
    </UFormField>

    <!-- Server selector -->
    <UFormField :label="t('ssh.form.server')" name="sshConnectionId">
      <div class="flex items-center gap-2">
        <USelect
          v-model="selectedSshId"
          :items="sshServerOptions"
          value-key="value"
          label-key="label"
          class="w-full"
        />
        <UIcon v-if="probing" name="i-lucide-loader-circle" class="h-4 w-4 animate-spin text-muted shrink-0" />
        <UIcon v-else-if="probe && selectedSshId" name="i-lucide-check-circle" class="h-4 w-4 text-success-500 shrink-0" />
      </div>
    </UFormField>

    <UFormField :label="t('sources.form.type')" name="type" required>
      <USelect
        v-model="form.type"
        :items="sourceTypes"
        value-key="value"
        label-key="label"
        class="w-full"
      />
    </UFormField>

    <!-- Docker: Container Name -->
    <UFormField v-if="isDocker" :label="t('sources.form.container')" name="containerName" required>
      <USelect
        v-if="containerOptions.length"
        v-model="(form.config as Record<string, string>).containerName"
        :items="containerOptions"
        value-key="value"
        label-key="label"
        :placeholder="t('sources.form.container_ph')"
        class="w-full"
      />
      <UInput
        v-else
        v-model="(form.config as Record<string, string>).containerName"
        :placeholder="t('sources.form.container_ph')"
        class="w-full"
      />
    </UFormField>

    <!-- Docker Folder: folder path -->
    <template v-if="form.type === 'docker_folder'">
      <UFormField :label="t('sources.form.path')" name="folderPath" required :hint="t('sources.form.path_hint')">
        <UInput v-model="(form.config as Record<string, string>).folderPath" placeholder="/app/data" class="w-full" />
      </UFormField>
    </template>

    <!-- PostgreSQL (direct + docker) -->
    <template v-if="form.type === 'postgresql'">
      <div class="grid grid-cols-2 gap-4">
        <UFormField :label="t('common.host')" name="host" required>
          <UInput v-model="(form.config as Record<string, string>).host" placeholder="localhost" class="w-full" />
        </UFormField>
        <UFormField :label="t('common.port')" name="port">
          <UInputNumber v-model="(form.config as Record<string, number>).port" :default-value="5432" class="w-full" />
        </UFormField>
      </div>
      <UFormField :label="t('common.database')" name="database" required>
        <UInput v-model="(form.config as Record<string, string>).database" placeholder="mydb" class="w-full" />
      </UFormField>
      <div class="grid grid-cols-2 gap-4">
        <UFormField :label="t('common.username')" name="username" required>
          <UInput v-model="(form.config as Record<string, string>).username" placeholder="postgres" class="w-full" />
        </UFormField>
        <UFormField :label="t('common.password')" name="password">
          <UInput v-model="(form.config as Record<string, string>).password" type="password" placeholder="••••••••" class="w-full" />
        </UFormField>
      </div>
      <UFormField :label="t('sources.form.ssl')">
        <USwitch v-model="(form.config as Record<string, boolean>).ssl" :label="t('sources.form.ssl')" />
      </UFormField>
    </template>

    <!-- MySQL (direct) -->
    <template v-if="form.type === 'mysql'">
      <div class="grid grid-cols-2 gap-4">
        <UFormField :label="t('common.host')" name="host" required>
          <UInput v-model="(form.config as Record<string, string>).host" placeholder="localhost" class="w-full" />
        </UFormField>
        <UFormField :label="t('common.port')" name="port">
          <UInputNumber v-model="(form.config as Record<string, number>).port" :default-value="3306" class="w-full" />
        </UFormField>
      </div>
      <UFormField :label="t('common.database')" name="database" required>
        <UInput v-model="(form.config as Record<string, string>).database" placeholder="mydb" class="w-full" />
      </UFormField>
      <div class="grid grid-cols-2 gap-4">
        <UFormField :label="t('common.username')" name="username" required>
          <UInput v-model="(form.config as Record<string, string>).username" placeholder="root" class="w-full" />
        </UFormField>
        <UFormField :label="t('common.password')" name="password">
          <UInput v-model="(form.config as Record<string, string>).password" type="password" placeholder="••••••••" class="w-full" />
        </UFormField>
      </div>
    </template>

    <!-- MongoDB (direct) -->
    <template v-if="form.type === 'mongodb'">
      <UFormField :label="t('sources.form.uri')" name="uri" required hint="mongodb://user:pass@host:27017/db">
        <UInput v-model="(form.config as Record<string, string>).uri" placeholder="mongodb://localhost:27017/mydb" class="w-full font-mono text-sm" />
      </UFormField>
      <UFormField :label="t('common.database')" name="database" :hint="`${t('common.optional')} — ${t('sources.form.uri_overrides')}`">
        <UInput v-model="(form.config as Record<string, string>).database" placeholder="mydb" class="w-full" />
      </UFormField>
    </template>

    <!-- Docker PostgreSQL: db credentials -->
    <template v-if="form.type === 'docker_postgresql'">
      <UFormField :label="t('common.database')" name="database" required>
        <UInput v-model="(form.config as Record<string, string>).database" placeholder="mydb" class="w-full" />
      </UFormField>
      <div class="grid grid-cols-2 gap-4">
        <UFormField :label="t('common.username')" name="username" required>
          <UInput v-model="(form.config as Record<string, string>).username" placeholder="postgres" class="w-full" />
        </UFormField>
        <UFormField :label="t('common.password')" name="password">
          <UInput v-model="(form.config as Record<string, string>).password" type="password" placeholder="••••••••" class="w-full" />
        </UFormField>
      </div>
    </template>

    <!-- Docker MySQL: db credentials -->
    <template v-if="form.type === 'docker_mysql'">
      <UFormField :label="t('common.database')" name="database" required>
        <UInput v-model="(form.config as Record<string, string>).database" placeholder="mydb" class="w-full" />
      </UFormField>
      <div class="grid grid-cols-2 gap-4">
        <UFormField :label="t('common.username')" name="username" required>
          <UInput v-model="(form.config as Record<string, string>).username" placeholder="root" class="w-full" />
        </UFormField>
        <UFormField :label="t('common.password')" name="password">
          <UInput v-model="(form.config as Record<string, string>).password" type="password" placeholder="••••••••" class="w-full" />
        </UFormField>
      </div>
    </template>

    <!-- Docker MongoDB -->
    <template v-if="form.type === 'docker_mongodb'">
      <UFormField :label="t('sources.form.uri')" name="uri" :hint="`${t('common.optional')} — e.g. mongodb://user:pass@localhost/db`">
        <UInput v-model="(form.config as Record<string, string>).uri" placeholder="mongodb://localhost:27017/mydb" class="w-full font-mono text-sm" />
      </UFormField>
      <UFormField :label="t('common.database')" name="database" :hint="`${t('common.optional')} - dump specific DB`">
        <UInput v-model="(form.config as Record<string, string>).database" placeholder="mydb" class="w-full" />
      </UFormField>
      <div class="grid grid-cols-2 gap-4">
        <UFormField :label="t('common.username')" name="username">
          <UInput v-model="(form.config as Record<string, string>).username" placeholder="admin" class="w-full" />
        </UFormField>
        <UFormField :label="t('common.password')" name="password">
          <UInput v-model="(form.config as Record<string, string>).password" type="password" placeholder="••••••••" class="w-full" />
        </UFormField>
      </div>
    </template>

    <!-- Files -->
    <template v-if="form.type === 'files'">
      <div class="rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 flex gap-3">
        <UIcon name="i-lucide-container" class="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <div class="text-xs text-blue-700 dark:text-blue-400 space-y-1">
          <p class="font-medium">{{ t('sources.form.docker_hint_title') }}</p>
          <p>{{ t('sources.form.docker_hint_body') }}</p>
          <code class="block mt-1 font-mono bg-blue-500/10 rounded px-2 py-1">-v /host/data:/data</code>
          <p class="text-muted">{{ t('sources.form.docker_hint_then') }} <code class="font-mono">/data</code></p>
        </div>
      </div>
      <UFormField :label="t('common.path')" name="path" required :hint="t('sources.form.path_hint')">
        <UInput v-model="(form.config as Record<string, string>).path" placeholder="/var/data/uploads" class="w-full" />
      </UFormField>
    </template>

    <!-- Extra Args (for DB sources) -->
    <UFormField
      v-if="needsDb && form.type !== 'docker_folder'"
      :label="t('sources.form.extra_args')"
      name="extraArgs"
      :hint="t('sources.form.extra_args_hint')"
    >
      <UInput v-model="(form.config as Record<string, string>).extraArgs" placeholder="--schema=public" class="w-full" />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton to="/sources" color="neutral" variant="ghost">{{ t('common.cancel') }}</UButton>
      <UButton type="submit" :loading="loading" icon="i-lucide-save">
        {{ t('common.save') }}
      </UButton>
    </div>
  </UForm>
</template>
