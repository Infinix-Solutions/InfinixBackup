<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const id = route.params.id as string
useHead({ title: `${t('ssh.edit_title')} — Infinix Backup` })

const { data: connection, refresh } = await useFetch<ApiSshConnection>(`/api/ssh-connections/${id}`)
if (!connection.value) throw createError({ statusCode: 404 })

const loading = ref(false)
const probing = ref(false)
const probeResult = ref<SshProbeResult | null>(null)
const probeError = ref<string | null>(null)
const copied = ref(false)
const showDelete = ref(false)

async function save(data: { name: string; host: string; port: number; username: string }) {
  loading.value = true
  try {
    await $fetch(`/api/ssh-connections/${id}`, { method: 'PUT', body: data })
    toast.add({ title: t('ssh.saved'), color: 'success', icon: 'i-lucide-check-circle' })
    refresh()
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || 'Error'
    toast.add({ title: msg, color: 'error' })
  } finally {
    loading.value = false
  }
}

async function probe() {
  probing.value = true
  probeResult.value = null
  probeError.value = null
  try {
    const result = await $fetch<SshProbeResult>(`/api/ssh-connections/${id}/probe`, { method: 'POST' })
    probeResult.value = result
    toast.add({ title: t('ssh.probe_ok'), color: 'success', icon: 'i-lucide-check-circle' })
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || t('ssh.probe_failed')
    probeError.value = msg
    toast.add({ title: t('ssh.probe_failed'), description: msg, color: 'error' })
  } finally {
    probing.value = false
  }
}

async function copyKey() {
  if (!connection.value) return
  await navigator.clipboard.writeText(connection.value.publicKey)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
  toast.add({ title: t('ssh.public_key_copied'), color: 'success', icon: 'i-lucide-copy-check' })
}

async function deleteConnection() {
  await $fetch(`/api/ssh-connections/${id}`, { method: 'DELETE' })
  toast.add({ title: t('ssh.deleted'), color: 'success', icon: 'i-lucide-check-circle' })
  router.push('/ssh-connections')
}
</script>

<template>
  <div class="py-8 px-6 lg:px-8 space-y-6 max-w-2xl">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton to="/ssh-connections" icon="i-lucide-arrow-left" color="neutral" variant="ghost" size="sm" />
        <div>
          <h1 class="text-xl font-semibold tracking-tight">{{ connection?.name }}</h1>
          <p class="text-sm text-muted mt-0.5 font-mono">{{ connection?.username }}@{{ connection?.host }}:{{ connection?.port }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-plug"
          color="primary"
          variant="outline"
          size="sm"
          :loading="probing"
          @click="probe"
        >
          {{ t('ssh.probe') }}
        </UButton>
        <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" @click="showDelete = true" />
      </div>
    </div>

    <!-- Probe result -->
    <UCard v-if="probeResult">
      <template #header>
        <p class="text-sm font-medium">{{ t('ssh.capabilities') }}</p>
      </template>
      <div class="flex flex-wrap gap-2">
        <UBadge
          :color="probeResult.docker ? 'success' : 'neutral'"
          :icon="probeResult.docker ? 'i-simple-icons-docker' : 'i-lucide-x'"
          :label="t('ssh.cap_docker')"
          variant="subtle"
        />
        <UBadge
          :color="probeResult.postgres ? 'success' : 'neutral'"
          :icon="probeResult.postgres ? 'i-simple-icons-postgresql' : 'i-lucide-x'"
          :label="t('ssh.cap_postgres')"
          variant="subtle"
        />
        <UBadge
          :color="probeResult.mysql ? 'success' : 'neutral'"
          :icon="probeResult.mysql ? 'i-simple-icons-mysql' : 'i-lucide-x'"
          :label="t('ssh.cap_mysql')"
          variant="subtle"
        />
        <UBadge
          :color="probeResult.mongo ? 'success' : 'neutral'"
          :icon="probeResult.mongo ? 'i-simple-icons-mongodb' : 'i-lucide-x'"
          :label="t('ssh.cap_mongo')"
          variant="subtle"
        />
      </div>
      <div v-if="probeResult.containers.length" class="mt-3">
        <p class="text-xs text-muted mb-1.5">{{ t('ssh.cap_containers') }}</p>
        <div class="flex flex-wrap gap-1.5">
          <UBadge
            v-for="c in probeResult.containers"
            :key="c"
            :label="c"
            color="primary"
            icon="i-simple-icons-docker"
            variant="subtle"
            size="sm"
          />
        </div>
      </div>
    </UCard>

    <UAlert v-if="probeError" color="error" icon="i-lucide-alert-circle" :title="t('ssh.probe_failed')" :description="probeError" />

    <!-- Edit form -->
    <UCard>
      <SshConnectionForm v-if="connection" :initial="connection" :loading="loading" @submit="save" />
    </UCard>

    <!-- Public key -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium">{{ t('ssh.public_key_label') }}</p>
          <UButton
            :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="copyKey"
          >
            {{ t('ssh.copy_key') }}
          </UButton>
        </div>
      </template>
      <pre class="text-xs font-mono break-all whitespace-pre-wrap text-muted bg-elevated rounded p-3 select-all">{{ connection?.publicKey }}</pre>
    </UCard>

    <UModal v-model:open="showDelete" :title="t('ssh.delete_title')">
      <template #body>
        <p class="text-sm text-muted">{{ t('ssh.delete_msg') }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" size="sm" @click="showDelete = false">{{ t('common.cancel') }}</UButton>
          <UButton color="error" size="sm" @click="deleteConnection">{{ t('common.delete') }}</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
