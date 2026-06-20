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
const showDelete = ref(false)
const copied = ref(false)

interface TerminalLine {
  text: string
  state: 'pending' | 'running' | 'done' | 'error' | 'info'
}

const termLines = ref<TerminalLine[]>([
  { text: `${connection.value?.name} — ${connection.value?.username}@${connection.value?.host}:${connection.value?.port}`, state: 'info' },
  { text: 'Click "Check Capabilities" to probe the server.', state: 'pending' },
  { text: 'Provide a password when saving to reinstall the key.', state: 'pending' },
])

function addLine(text: string, state: TerminalLine['state'] = 'pending') {
  termLines.value.push({ text, state })
  return termLines.value.length - 1
}

function termSet(i: number, state: TerminalLine['state'], text?: string) {
  if (termLines.value[i]) {
    termLines.value[i].state = state
    if (text) termLines.value[i].text = text
  }
}

async function save(data: { name: string; host: string; port: number; username: string; password?: string }) {
  loading.value = true
  const iSave = addLine('Saving changes...', 'running')
  const iInstall = data.password ? addLine(`Installing key on ${data.username}@${data.host}:${data.port}`, 'pending') : -1

  try {
    const result = await $fetch<ApiSshConnection>(`/api/ssh-connections/${id}`, { method: 'PUT', body: data })
    termSet(iSave, 'done', 'Changes saved')
    if (result.keyInstalling && iInstall >= 0) {
      termSet(iInstall, 'running')
      addLine('Running in background — check Server Logs', 'pending')
    }
    toast.add({ title: t('ssh.saved'), color: 'success', icon: 'i-lucide-check-circle' })
    refresh()
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || 'Error'
    termSet(iSave, 'error', `Save failed: ${msg}`)
    if (iInstall >= 0) termSet(iInstall, 'pending')
    toast.add({ title: msg, color: 'error' })
  } finally {
    loading.value = false
  }
}

async function probe() {
  const iProbe = addLine('Checking server capabilities...', 'running')
  try {
    const result = await $fetch<SshProbeResult>(`/api/ssh-connections/${id}/probe`, { method: 'POST' })
    termSet(iProbe, 'done', 'Probe complete')
    const caps = [
      result.docker && 'Docker',
      result.postgres && 'PostgreSQL',
      result.mysql && 'MySQL',
      result.mongo && 'MongoDB',
    ].filter(Boolean)
    addLine(`Capabilities: ${caps.length ? caps.join(', ') : 'none detected'}`, 'done')
    if (result.containers.length) {
      addLine(`Containers: ${result.containers.join(', ')}`, 'info')
    }
    toast.add({ title: t('ssh.probe_ok'), color: 'success', icon: 'i-lucide-check-circle' })
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || t('ssh.probe_failed')
    termSet(iProbe, 'error', `Probe failed: ${msg}`)
    toast.add({ title: t('ssh.probe_failed'), description: msg, color: 'error' })
  }
}

async function copyKey() {
  if (!connection.value) return
  await navigator.clipboard.writeText(connection.value.publicKey)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
  toast.add({ title: t('ssh.public_key_copied'), color: 'success', icon: 'i-lucide-copy-check' })
}

function downloadKey() {
  if (!connection.value) return
  const blob = new Blob([connection.value.publicKey], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `infinix_${connection.value.name.replace(/\s+/g, '_')}.pub`
  a.click()
  URL.revokeObjectURL(url)
}

async function deleteConnection() {
  await $fetch(`/api/ssh-connections/${id}`, { method: 'DELETE' })
  toast.add({ title: t('ssh.deleted'), color: 'success', icon: 'i-lucide-check-circle' })
  router.push('/ssh-connections')
}
</script>

<template>
  <div class="py-8 px-6 lg:px-8">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <UButton to="/ssh-connections" icon="i-lucide-arrow-left" color="neutral" variant="ghost" size="sm" />
        <div>
          <h1 class="text-xl font-semibold tracking-tight">{{ connection?.name }}</h1>
          <p class="text-sm text-muted mt-0.5 font-mono">{{ connection?.username }}@{{ connection?.host }}:{{ connection?.port }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-plug" color="primary" variant="outline" size="sm" @click="probe">
          {{ t('ssh.probe') }}
        </UButton>
        <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" @click="showDelete = true" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-6">
      <!-- Left: edit form -->
      <UCard>
        <SshConnectionForm v-if="connection" :initial="connection" :loading="loading" @submit="save" />
      </UCard>

      <!-- Right: terminal + public key -->
      <div class="space-y-4">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <div class="flex gap-1">
                <span class="h-3 w-3 rounded-full bg-red-500/70" />
                <span class="h-3 w-3 rounded-full bg-yellow-500/70" />
                <span class="h-3 w-3 rounded-full bg-green-500/70" />
              </div>
              <p class="text-xs font-mono text-muted ml-1">infinix-ssh-console</p>
            </div>
          </template>
          <div class="bg-gray-950 dark:bg-black rounded-lg p-4 font-mono text-xs space-y-2 min-h-40">
            <div v-for="(line, i) in termLines" :key="i" class="flex items-start gap-2">
              <span class="mt-0.5 shrink-0">
                <UIcon v-if="line.state === 'running'" name="i-lucide-loader-circle" class="h-3.5 w-3.5 text-blue-400 animate-spin" />
                <UIcon v-else-if="line.state === 'done'" name="i-lucide-check" class="h-3.5 w-3.5 text-green-400" />
                <UIcon v-else-if="line.state === 'error'" name="i-lucide-x" class="h-3.5 w-3.5 text-red-400" />
                <UIcon v-else-if="line.state === 'info'" name="i-lucide-terminal" class="h-3.5 w-3.5 text-primary-400" />
                <span v-else class="inline-block h-3.5 w-3.5 text-gray-600">·</span>
              </span>
              <span :class="{
                'text-primary-400 font-semibold': line.state === 'info',
                'text-gray-400': line.state === 'pending',
                'text-gray-200': line.state === 'running',
                'text-green-400': line.state === 'done',
                'text-red-400': line.state === 'error'
              }">{{ line.text }}</span>
            </div>
          </div>
        </UCard>

        <!-- Public key -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium">{{ t('ssh.public_key_label') }}</p>
              <div class="flex items-center gap-1">
                <UButton
                  :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                  size="xs" color="neutral" variant="ghost"
                  @click="copyKey"
                >{{ t('ssh.copy_key') }}</UButton>
                <UButton icon="i-lucide-download" size="xs" color="neutral" variant="ghost" @click="downloadKey">
                  {{ t('ssh.download_key') }}
                </UButton>
              </div>
            </div>
          </template>
          <pre class="text-xs font-mono break-all whitespace-pre-wrap text-muted bg-elevated rounded p-3 select-all leading-relaxed">{{ connection?.publicKey }}</pre>
        </UCard>
      </div>
    </div>

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
