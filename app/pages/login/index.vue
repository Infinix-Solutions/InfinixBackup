<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Login - Infinix Backup' })

const { t } = useI18n()
const router = useRouter()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

async function login() {
  error.value = ''
  loading.value = true
  try {
    const user = await $fetch('/api/auth/login', { method: 'POST', body: form })
    useState<typeof user | null>('auth:user').value = user
    await router.push('/')
  } catch (err: unknown) {
    error.value = (err as { data?: { message?: string } })?.data?.message || t('login.error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-3 mb-2">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500 shadow-lg shadow-primary-500/30">
            <UIcon
              name="i-lucide-archive"
              class="h-7 w-7 text-white"
            />
          </div>
          <span class="text-2xl font-bold text-white">Infinix Backup</span>
        </div>
        <p class="text-neutral-400 text-sm">
          {{ t('login.subtitle') }}
        </p>
      </div>

      <UCard class="shadow-2xl">
        <form
          class="space-y-5"
          @submit.prevent="login"
        >
          <div>
            <h1 class="text-xl font-bold">
              {{ t('login.title') }}
            </h1>
            <p class="text-muted text-sm mt-0.5">
              {{ t('login.description') }}
            </p>
          </div>

          <UAlert
            v-if="error"
            icon="i-lucide-alert-circle"
            color="error"
            variant="subtle"
            :title="error"
          />

          <UFormField
            :label="t('common.username')"
            name="username"
            required
          >
            <UInput
              v-model="form.username"
              autocomplete="username"
              icon="i-lucide-user"
              class="w-full"
              size="lg"
              :placeholder="t('login.username_ph')"
            />
          </UFormField>

          <UFormField
            :label="t('common.password')"
            name="password"
            required
          >
            <UInput
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              icon="i-lucide-lock"
              class="w-full"
              size="lg"
              :placeholder="t('login.password_ph')"
            />
          </UFormField>

          <UButton
            type="submit"
            size="lg"
            class="w-full"
            :loading="loading"
            justify="center"
          >
            {{ t('login.btn') }}
          </UButton>
        </form>
      </UCard>
    </div>
  </div>
</template>
