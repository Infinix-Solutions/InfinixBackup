<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Setup — Infinix Backup' })

const { t, locale, setLocale } = useI18n()
const router = useRouter()

const step = ref(0)
const restarting = ref(false)
const restartSeconds = ref(0)
const restartAttempts = ref(0)

const languageOptions = [
  { label: 'English', value: 'en', flag: '🇬🇧' },
  { label: 'Polski', value: 'pl', flag: '🇵🇱' },
  { label: 'Deutsch', value: 'de', flag: '🇩🇪' }
]

const db = reactive({
  host: 'localhost',
  port: 5432,
  database: 'infinix_backup',
  username: 'postgres',
  password: '',
  ssl: false
})
const testStatus = ref<'idle' | 'testing' | 'ok' | 'error'>('idle')
const testMsg = ref('')
const saving = ref(false)
const saveError = ref('')

function generateHex(): string {
  const buf = new Uint8Array(32)
  crypto.getRandomValues(buf)
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

const encKey = ref('')
const sessKey = ref('')
const encKeyVisible = ref(false)
const sessKeyVisible = ref(false)
const encKeyCopied = ref(false)
const sessKeyCopied = ref(false)

onMounted(() => {
  encKey.value = generateHex()
  sessKey.value = generateHex()
})

async function copyKey(value: string, which: 'enc' | 'sess') {
  try {
    await navigator.clipboard.writeText(value)
    if (which === 'enc') {
      encKeyCopied.value = true
      setTimeout(() => { encKeyCopied.value = false }, 2000)
    } else {
      sessKeyCopied.value = true
      setTimeout(() => { sessKeyCopied.value = false }, 2000)
    }
  } catch (_e) { /* clipboard unavailable */ }
}

const installing = ref(false)
const installError = ref('')

const adminForm = reactive({ username: 'admin', password: '', confirm: '' })
const adminLoading = ref(false)
const adminError = ref('')

const fieldCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-violet-600 focus:ring-2 focus:ring-violet-700/20'

const steps = computed(() => [
  { title: t('setup.steps.language') },
  { title: t('setup.steps.database') },
  { title: t('setup.steps.admin') },
  { title: t('setup.steps.complete') }
])

async function testConnection() {
  testStatus.value = 'testing'
  testMsg.value = ''
  try {
    await $fetch('/api/setup/test-fields', { method: 'POST', body: { ...db } })
    testStatus.value = 'ok'
    testMsg.value = t('setup.database.test_ok')
  } catch (err: unknown) {
    testStatus.value = 'error'
    testMsg.value = (err as { data?: { message?: string } })?.data?.message || t('common.connection_failed')
  }
}

async function saveAndRestart() {
  saving.value = true
  saveError.value = ''
  try {
    const result = await $fetch('/api/setup/save-config', {
      method: 'POST',
      body: { ...db, encryptionKey: encKey.value, sessionSecret: sessKey.value }
    }) as { devReload?: boolean }

    if (result.devReload) {
      saving.value = false
      await runInstall()
    } else {
      restarting.value = true
      restartSeconds.value = 0
      restartAttempts.value = 0
      pollUntilReady()
    }
  } catch (err: unknown) {
    saveError.value = (err as { data?: { message?: string } })?.data?.message || t('common.connection_failed')
    saving.value = false
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null

function pollUntilReady() {
  const tick = setInterval(() => { restartSeconds.value++ }, 1000)
  pollTimer = setInterval(async () => {
    restartAttempts.value++
    try {
      const data = await $fetch('/api/setup/status')
      if ((data as { reason?: string }).reason !== 'no_database_url') {
        clearInterval(pollTimer!)
        clearInterval(tick)
        restarting.value = false
        saving.value = false
        await runInstall()
      }
    } catch (_e) { /* server restarting */ }
  }, 2500)
}

async function runInstall() {
  installing.value = true
  installError.value = ''
  try {
    await $fetch('/api/setup/install', { method: 'POST' })
    step.value = 2
  } catch (err: unknown) {
    installError.value = (err as { data?: { message?: string } })?.data?.message || 'Migration failed'
  } finally {
    installing.value = false
  }
}

async function createAdmin() {
  adminError.value = ''
  if (adminForm.password !== adminForm.confirm) {
    adminError.value = t('setup.admin.password_mismatch')
    return
  }
  adminLoading.value = true
  try {
    const user = await $fetch('/api/setup/admin', {
      method: 'POST',
      body: { username: adminForm.username, password: adminForm.password }
    })
    useState<typeof user | null>('auth:user').value = user
    step.value = 3
  } catch (err: unknown) {
    adminError.value = (err as { data?: { message?: string } })?.data?.message || 'Failed to create admin'
  } finally {
    adminLoading.value = false
  }
}

async function goToDashboard() {
  useState('setup:installed').value = true
  await router.push('/')
}

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-[#09080f]">
    <div class="w-full max-w-2xl">
      <!-- Logo -->
      <div class="flex items-center justify-center gap-3 mb-8">
        <div class="size-10 rounded-xl bg-violet-700 flex items-center justify-center">
          <UIcon
            name="i-lucide-archive"
            class="size-5 text-white"
          />
        </div>
        <span class="text-xl font-bold text-white tracking-tight">Infinix Backup</span>
      </div>

      <!-- Stepper -->
      <div class="flex items-center mb-8 px-2">
        <template
          v-for="(s, i) in steps"
          :key="i"
        >
          <div class="flex items-center gap-2">
            <div
              class="size-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all"
              :class="i < step
                ? 'bg-violet-700 text-white'
                : i === step
                  ? 'bg-white text-[#09080f] ring-2 ring-offset-2 ring-offset-[#09080f] ring-violet-700'
                  : 'bg-white/5 text-white/30'"
            >
              <UIcon
                v-if="i < step"
                name="i-lucide-check"
                class="size-4"
              />
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span
              class="text-sm hidden sm:block font-medium transition-colors"
              :class="i === step ? 'text-white' : i < step ? 'text-violet-400' : 'text-white/25'"
            >{{ s.title }}</span>
          </div>
          <div
            v-if="i < steps.length - 1"
            class="flex-1 mx-3 h-px transition-colors"
            :class="i < step ? 'bg-violet-700' : 'bg-white/10'"
          />
        </template>
      </div>

      <!-- Card -->
      <div class="rounded-2xl border border-[#1e1a35] bg-[#100e1d] overflow-hidden">
        <!-- Step 0: Language -->
        <div
          v-if="step === 0"
          class="p-8 space-y-6"
        >
          <div>
            <h1 class="text-xl font-bold text-white tracking-tight">
              {{ $t('setup.welcome.title') }}
            </h1>
            <p class="text-sm text-white/50 mt-1 leading-relaxed">
              {{ $t('setup.welcome.subtitle') }}
            </p>
          </div>

          <div class="space-y-2 max-w-xs">
            <button
              v-for="lang in languageOptions"
              :key="lang.value"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors"
              :class="locale === lang.value
                ? 'border-violet-700 bg-violet-950/60 text-violet-300'
                : 'border-white/8 bg-white/3 text-white/60 hover:border-white/15'"
              @click="setLocale(lang.value as 'en' | 'pl' | 'de')"
            >
              <span class="text-2xl leading-none">{{ lang.flag }}</span>
              <span class="font-medium text-sm">{{ lang.label }}</span>
              <UIcon
                v-if="locale === lang.value"
                name="i-lucide-check"
                class="size-4 ml-auto text-violet-400"
              />
            </button>
          </div>

          <div class="flex justify-end">
            <UButton
              trailing-icon="i-lucide-arrow-right"
              @click="step = 1"
            >
              {{ $t('setup.welcome.next') }}
            </UButton>
          </div>
        </div>

        <!-- Step 1: DB + sub-states -->
        <div v-else-if="step === 1">
          <!-- Restarting -->
          <div
            v-if="restarting"
            class="p-8 space-y-5"
          >
            <div class="flex items-center gap-3">
              <UIcon
                name="i-lucide-loader-2"
                class="size-5 text-violet-400 animate-spin shrink-0"
              />
              <h2 class="text-xl font-bold text-white tracking-tight">
                {{ $t('setup.restart.title') }}
              </h2>
            </div>
            <p class="text-sm text-white/50 leading-relaxed">
              {{ $t('setup.restart.subtitle') }}
            </p>

            <div class="border border-white/8 rounded-xl px-4 py-3.5 space-y-2.5">
              <div class="flex items-center gap-2.5 text-sm text-white/50">
                <UIcon
                  name="i-lucide-check"
                  class="size-3.5 text-green-400 shrink-0"
                />
                Config written to <code class="font-mono text-xs text-violet-400">data/config.json</code>
              </div>
              <div class="flex items-center gap-2.5 text-sm text-white/50">
                <UIcon
                  name="i-lucide-loader-2"
                  class="size-3.5 text-violet-400 shrink-0 animate-spin"
                />
                Waiting for server to come back online...
              </div>
            </div>

            <div class="space-y-1.5">
              <div class="h-1 rounded-full bg-white/8 overflow-hidden">
                <div
                  class="h-full bg-violet-700 rounded-full transition-[width] duration-1000"
                  :style="{ width: `${Math.min(restartSeconds * 3, 88)}%` }"
                />
              </div>
              <p class="text-xs text-white/30">
                {{ $t('setup.restart.elapsed', { s: restartSeconds, n: restartAttempts }) }}
              </p>
            </div>

            <div class="flex items-center gap-2 text-xs text-orange-400">
              <UIcon
                name="i-lucide-alert-triangle"
                class="size-3.5 shrink-0"
              />
              {{ $t('setup.restart.warning') }}
            </div>
          </div>

          <!-- Installing -->
          <div
            v-else-if="installing || installError"
            class="p-8 space-y-4"
          >
            <div class="flex items-center gap-3">
              <UIcon
                :name="installError ? 'i-lucide-alert-circle' : 'i-lucide-database'"
                class="size-5 shrink-0"
                :class="installError ? 'text-red-400' : 'text-violet-400 animate-pulse'"
              />
              <h2 class="text-xl font-bold text-white tracking-tight">
                {{ installError ? 'Migration Failed' : $t('setup.install.title') }}
              </h2>
            </div>
            <p class="text-sm text-white/50 leading-relaxed">
              {{ installError || $t('setup.install.subtitle') }}
            </p>
            <UButton
              v-if="installError"
              leading-icon="i-lucide-rotate-ccw"
              @click="runInstall"
            >
              Retry
            </UButton>
          </div>

          <!-- DB form -->
          <div
            v-else
            class="p-8 space-y-6"
          >
            <div>
              <h2 class="text-xl font-bold text-white tracking-tight">
                {{ $t('setup.database.title') }}
              </h2>
              <p class="text-sm text-white/50 mt-1 leading-relaxed">
                {{ $t('setup.database.subtitle') }}
              </p>
            </div>

            <!-- Connection -->
            <div class="space-y-3">
              <div class="grid grid-cols-[1fr_100px] gap-3">
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-white/50">{{ $t('common.host') }}</label>
                  <input
                    v-model="db.host"
                    placeholder="localhost"
                    :class="fieldCls"
                  >
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-white/50">{{ $t('common.port') }}</label>
                  <input
                    v-model.number="db.port"
                    type="number"
                    placeholder="5432"
                    :class="fieldCls"
                  >
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-white/50">{{ $t('common.database') }}</label>
                <input
                  v-model="db.database"
                  placeholder="infinix_backup"
                  :class="fieldCls"
                >
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-white/50">{{ $t('common.username') }}</label>
                  <input
                    v-model="db.username"
                    autocomplete="off"
                    placeholder="postgres"
                    :class="fieldCls"
                  >
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-white/50">{{ $t('common.password') }}</label>
                  <input
                    v-model="db.password"
                    type="password"
                    autocomplete="new-password"
                    placeholder="••••••••"
                    :class="fieldCls"
                  >
                </div>
              </div>

              <label class="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  class="relative w-9 h-5 rounded-full shrink-0 transition-colors"
                  :class="db.ssl ? 'bg-violet-700' : 'bg-white/10'"
                  @click="db.ssl = !db.ssl"
                >
                  <div
                    class="absolute top-[3px] size-3.5 rounded-full bg-white transition-[left]"
                    :class="db.ssl ? 'left-[18px]' : 'left-[3px]'"
                  />
                </div>
                <span class="text-sm text-white/60">{{ $t('sources.form.ssl') }}</span>
              </label>
            </div>

            <!-- Security keys -->
            <div class="border-t border-white/8 pt-5 space-y-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-widest text-white/30 mb-1">
                  {{ $t('setup.security.title') }}
                </p>
                <p class="text-xs text-white/30 leading-relaxed">
                  {{ $t('setup.security.hint') }}
                </p>
              </div>

              <div class="space-y-3">
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-white/50">{{ $t('setup.security.enc_key') }}</label>
                  <div class="flex gap-1.5">
                    <input
                      :value="encKey"
                      :type="encKeyVisible ? 'text' : 'password'"
                      readonly
                      :class="[fieldCls, 'flex-1 font-mono text-[11px] focus:border-white/10 focus:ring-0 cursor-default']"
                    >
                    <UButton
                      :icon="encKeyVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                      color="neutral"
                      variant="outline"
                      size="sm"
                      @click="encKeyVisible = !encKeyVisible"
                    />
                    <UButton
                      :icon="encKeyCopied ? 'i-lucide-check' : 'i-lucide-copy'"
                      color="neutral"
                      variant="outline"
                      size="sm"
                      :class="encKeyCopied ? 'text-green-400' : ''"
                      @click="copyKey(encKey, 'enc')"
                    />
                    <UButton
                      icon="i-lucide-refresh-cw"
                      color="neutral"
                      variant="outline"
                      size="sm"
                      @click="encKey = generateHex()"
                    />
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-white/50">{{ $t('setup.security.sess_key') }}</label>
                  <div class="flex gap-1.5">
                    <input
                      :value="sessKey"
                      :type="sessKeyVisible ? 'text' : 'password'"
                      readonly
                      :class="[fieldCls, 'flex-1 font-mono text-[11px] focus:border-white/10 focus:ring-0 cursor-default']"
                    >
                    <UButton
                      :icon="sessKeyVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                      color="neutral"
                      variant="outline"
                      size="sm"
                      @click="sessKeyVisible = !sessKeyVisible"
                    />
                    <UButton
                      :icon="sessKeyCopied ? 'i-lucide-check' : 'i-lucide-copy'"
                      color="neutral"
                      variant="outline"
                      size="sm"
                      :class="sessKeyCopied ? 'text-green-400' : ''"
                      @click="copyKey(sessKey, 'sess')"
                    />
                    <UButton
                      icon="i-lucide-refresh-cw"
                      color="neutral"
                      variant="outline"
                      size="sm"
                      @click="sessKey = generateHex()"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Status -->
            <div
              v-if="testStatus === 'ok'"
              class="flex items-center gap-2 text-sm text-green-400 bg-green-950/40 border border-green-900/50 rounded-lg px-3 py-2.5"
            >
              <UIcon
                name="i-lucide-check-circle"
                class="size-4 shrink-0"
              /> {{ testMsg }}
            </div>
            <div
              v-if="testStatus === 'error'"
              class="flex items-start gap-2 text-sm text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2.5"
            >
              <UIcon
                name="i-lucide-alert-circle"
                class="size-4 shrink-0 mt-0.5"
              /> {{ testMsg }}
            </div>
            <div
              v-if="saveError"
              class="flex items-start gap-2 text-sm text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2.5"
            >
              <UIcon
                name="i-lucide-alert-circle"
                class="size-4 shrink-0 mt-0.5"
              /> {{ saveError }}
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between pt-2">
              <UButton
                variant="ghost"
                color="neutral"
                leading-icon="i-lucide-arrow-left"
                @click="step = 0"
              >
                {{ $t('setup.database.back') }}
              </UButton>
              <div class="flex gap-2">
                <UButton
                  variant="outline"
                  :loading="testStatus === 'testing'"
                  :disabled="testStatus === 'testing' || !db.host || !db.database"
                  leading-icon="i-lucide-plug"
                  @click="testConnection"
                >
                  {{ $t('setup.database.test_btn') }}
                </UButton>
                <button
                  class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                  :disabled="saving || !db.host || !db.database || !db.username"
                  @click="saveAndRestart"
                >
                  <UIcon
                    :name="saving ? 'i-lucide-loader-2' : 'i-lucide-save'"
                    class="size-3.5"
                    :class="saving ? 'animate-spin' : ''"
                  />
                  {{ saving ? $t('setup.database.saving') : $t('setup.database.save_btn') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Admin -->
        <div
          v-else-if="step === 2"
          class="p-8 space-y-6"
        >
          <div>
            <h2 class="text-xl font-bold text-white tracking-tight">
              {{ $t('setup.admin.title') }}
            </h2>
            <p class="text-sm text-white/50 mt-1 leading-relaxed">
              {{ $t('setup.admin.subtitle') }}
            </p>
          </div>

          <div
            v-if="adminError"
            class="flex items-start gap-2 text-sm text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2.5"
          >
            <UIcon
              name="i-lucide-alert-circle"
              class="size-4 shrink-0 mt-0.5"
            /> {{ adminError }}
          </div>

          <div class="space-y-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-white/50">{{ $t('common.username') }}</label>
              <input
                v-model="adminForm.username"
                autocomplete="username"
                placeholder="admin"
                :class="fieldCls"
              >
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-white/50">
                {{ $t('common.password') }}
                <span class="text-white/25 font-normal ml-1">{{ $t('setup.admin.password_hint') }}</span>
              </label>
              <input
                v-model="adminForm.password"
                type="password"
                autocomplete="new-password"
                placeholder="••••••••"
                :class="fieldCls"
              >
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-white/50">{{ $t('setup.admin.confirm_password') }}</label>
              <input
                v-model="adminForm.confirm"
                type="password"
                autocomplete="new-password"
                placeholder="••••••••"
                :class="fieldCls"
              >
            </div>
          </div>

          <div class="flex justify-end pt-2">
            <UButton
              :loading="adminLoading"
              :disabled="adminLoading || !adminForm.username || !adminForm.password || !adminForm.confirm"
              leading-icon="i-lucide-user-check"
              @click="createAdmin"
            >
              {{ $t('setup.admin.btn') }}
            </UButton>
          </div>
        </div>

        <!-- Step 3: Complete -->
        <div
          v-else
          class="p-8 space-y-6"
        >
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl bg-violet-700/20 flex items-center justify-center shrink-0">
              <UIcon
                name="i-lucide-check"
                class="size-5 text-violet-400"
              />
            </div>
            <div>
              <h2 class="text-xl font-bold text-white tracking-tight">
                {{ $t('setup.complete.title') }}
              </h2>
              <p class="text-sm text-white/50 mt-0.5">
                {{ $t('setup.complete.subtitle') }}
              </p>
            </div>
          </div>

          <div class="border border-white/8 rounded-xl p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-widest text-white/30">
              {{ $t('setup.complete.tip_title') }}
            </p>
            <div class="space-y-2.5">
              <div class="flex items-start gap-2.5 text-sm text-white/50">
                <UIcon
                  name="i-lucide-database"
                  class="size-4 shrink-0 mt-0.5 text-violet-500"
                />
                {{ $t('setup.complete.tip_1') }}
              </div>
              <div class="flex items-start gap-2.5 text-sm text-white/50">
                <UIcon
                  name="i-lucide-hard-drive"
                  class="size-4 shrink-0 mt-0.5 text-orange-500"
                />
                {{ $t('setup.complete.tip_2') }}
              </div>
              <div class="flex items-start gap-2.5 text-sm text-white/50">
                <UIcon
                  name="i-lucide-calendar-clock"
                  class="size-4 shrink-0 mt-0.5 text-violet-500"
                />
                {{ $t('setup.complete.tip_3') }}
              </div>
            </div>
          </div>

          <UButton
            trailing-icon="i-lucide-arrow-right"
            @click="goToDashboard"
          >
            {{ $t('setup.complete.btn') }}
          </UButton>
        </div>
      </div>

      <p class="text-center text-white/20 text-xs mt-6">
        Infinix Backup · Automated Backup System
      </p>
    </div>
  </div>
</template>

<style scoped>
input[type='number']::-webkit-outer-spin-button,
input[type='number']::-webkit-inner-spin-button {
  display: none;
}
input[type='number'] {
  appearance: textfield;
}
</style>
