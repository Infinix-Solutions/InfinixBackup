<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()

useHead({ title: `${t('ssh.new_title')} — Infinix Backup` })

interface TerminalLine {
  text: string
  state: 'pending' | 'running' | 'done' | 'error'
}

const loading = ref(false)
const savedConnection = ref<ApiSshConnection | null>(null)
const copied = ref(false)
const termLines = ref<TerminalLine[]>([])
const hasPassword = ref(false)
let pendingHost = ''
let pendingUsername = ''

function termSet(i: number, state: TerminalLine['state']) {
  if (termLines.value[i]) termLines.value[i].state = state
}

function addLine(text: string, state: TerminalLine['state'] = 'pending') {
  termLines.value.push({ text, state })
  return termLines.value.length - 1
}

function downloadKey() {
  if (!savedConnection.value) return
  const blob = new Blob([savedConnection.value.publicKey], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `infinix_${savedConnection.value.name.replace(/\s+/g, '_')}.pub`
  a.click()
  URL.revokeObjectURL(url)
}

async function copyKey() {
  if (!savedConnection.value) return
  await navigator.clipboard.writeText(savedConnection.value.publicKey)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
  toast.add({ title: t('ssh.public_key_copied'), icon: 'i-lucide-copy-check', color: 'success' })
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

async function save(data: { name: string; host: string; port: number; username: string; password?: string }) {
  loading.value = true
  hasPassword.value = !!data.password
  pendingHost = `${data.host}:${data.port}`
  pendingUsername = data.username
  termLines.value = []

  const iKey = addLine('Generating ED25519 key pair', 'running')
  const iSave = addLine('Saving to database', 'pending')
  const iInstall = data.password ? addLine(`Installing key on ${pendingUsername}@${pendingHost}`, 'pending') : -1
  await nextTick()

  let result: ApiSshConnection | null = null
  let error: string | null = null
  try {
    result = await $fetch<ApiSshConnection>('/api/ssh-connections', { method: 'POST', body: data })
  } catch (err: unknown) {
    error = (err as { data?: { message?: string } })?.data?.message || 'Unknown error'
  }

  await delay(60)
  termSet(iKey, result ? 'done' : 'error')
  await delay(60)
  termSet(iSave, result ? 'done' : 'error')

  if (result) {
    if (result.keyInstalling && iInstall >= 0) {
      await delay(60)
      termSet(iInstall, 'running')
      addLine('Running in background — check Server Logs for result', 'pending')
    }
    savedConnection.value = result
    toast.add({ title: t('ssh.saved'), color: 'success', icon: 'i-lucide-check-circle' })
  } else {
    if (iInstall >= 0) termSet(iInstall, 'pending')
    addLine(`Error: ${error}`, 'error')
    toast.add({ title: error || 'Error', color: 'error' })
  }

  loading.value = false
}
</script>

<template>
  <div class="py-8 px-6 lg:px-8">
    <div class="flex items-center gap-3 mb-6">
      <UButton to="/ssh-connections" icon="i-lucide-arrow-left" color="neutral" variant="ghost" size="sm" />
      <div>
        <h1 class="text-xl font-semibold tracking-tight">{{ t('ssh.new_title') }}</h1>
        <p class="text-sm text-muted mt-0.5">{{ t('ssh.subtitle') }}</p>
      </div>
    </div>

    <div :class="['grid gap-6', termLines.length ? 'grid-cols-2' : 'max-w-xl']">
      <!-- Form or success state -->
      <div class="space-y-4">
        <UCard v-if="!savedConnection">
          <SshConnectionForm :loading="loading" @submit="save" />
        </UCard>

        <template v-else>
          <UAlert color="success" icon="i-lucide-server" :title="`${savedConnection.name} — ${savedConnection.host}:${savedConnection.port}`" :description="hasPassword ? t('ssh.key_installing_bg') : t('ssh.key_manual')" />

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
                  <UButton
                    icon="i-lucide-download"
                    size="xs" color="neutral" variant="ghost"
                    @click="downloadKey"
                  >{{ t('ssh.download_key') }}</UButton>
                </div>
              </div>
            </template>
            <pre class="text-xs font-mono break-all whitespace-pre-wrap text-muted bg-elevated rounded p-3 select-all leading-relaxed">{{ savedConnection.publicKey }}</pre>
          </UCard>

          <div v-if="!hasPassword" class="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex gap-3">
            <UIcon name="i-lucide-triangle-alert" class="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div class="text-xs text-amber-700 dark:text-amber-400 space-y-1.5">
              <p class="font-medium">Dodaj klucz ręcznie na serwerze:</p>
              <code class="block font-mono bg-amber-500/10 rounded px-2 py-1">echo "{{ savedConnection.publicKey }}" >> ~/.ssh/authorized_keys</code>
            </div>
          </div>

          <div class="flex gap-2">
            <UButton to="/ssh-connections" color="neutral" variant="outline" icon="i-lucide-list">{{ t('ssh.title') }}</UButton>
            <UButton to="/ssh-connections/new" icon="i-lucide-plus">{{ t('ssh.add') }}</UButton>
          </div>
        </template>
      </div>

      <!-- Terminal preview -->
      <div v-if="termLines.length">
        <UCard class="h-full">
          <template #header>
            <div class="flex items-center gap-2">
              <div class="flex gap-1">
                <span class="h-3 w-3 rounded-full bg-red-500/70" />
                <span class="h-3 w-3 rounded-full bg-yellow-500/70" />
                <span class="h-3 w-3 rounded-full bg-green-500/70" />
              </div>
              <p class="text-xs font-mono text-muted ml-1">infinix-ssh-setup</p>
            </div>
          </template>
          <div class="bg-gray-950 dark:bg-black rounded-lg p-4 font-mono text-xs space-y-2 min-h-48">
            <div v-for="(line, i) in termLines" :key="i" class="flex items-start gap-2">
              <span class="mt-0.5 shrink-0">
                <UIcon v-if="line.state === 'running'" name="i-lucide-loader-circle" class="h-3.5 w-3.5 text-blue-400 animate-spin" />
                <UIcon v-else-if="line.state === 'done'" name="i-lucide-check" class="h-3.5 w-3.5 text-green-400" />
                <UIcon v-else-if="line.state === 'error'" name="i-lucide-x" class="h-3.5 w-3.5 text-red-400" />
                <span v-else class="inline-block h-3.5 w-3.5 text-gray-600">·</span>
              </span>
              <span :class="{
                'text-gray-300': line.state === 'running' || line.state === 'pending',
                'text-green-400': line.state === 'done',
                'text-red-400': line.state === 'error'
              }">{{ line.text }}</span>
            </div>
            <span v-if="loading" class="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-6" />
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
