<script setup lang="ts">
const { t } = useI18n()
const { animateIn } = usePageAnimate()
const toast = useToast()
const currentUser = useState<{ id: string, username: string, role: string } | null>('auth:user')

useHead({ title: `${t('users.title')} — Infinix Backup` })

if (currentUser.value?.role !== 'admin') {
  await navigateTo('/')
}

const { data: users, refresh } = await useFetch<ApiUser[]>('/api/users')

const showAdd = ref(false)
const addForm = reactive({ username: '', password: '', role: 'viewer' as 'admin' | 'viewer' })
const addLoading = ref(false)

async function addUser() {
  addLoading.value = true
  try {
    await $fetch('/api/users', { method: 'POST', body: addForm })
    toast.add({ title: t('users.added'), color: 'success', icon: 'i-lucide-check-circle' })
    showAdd.value = false
    addForm.username = ''
    addForm.password = ''
    addForm.role = 'viewer'
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || t('common.error'), color: 'error' })
  } finally {
    addLoading.value = false
  }
}

const deletingId = ref<string | null>(null)
async function deleteUser(id: string) {
  deletingId.value = id
  try {
    await $fetch(`/api/users/${id}`, { method: 'DELETE' })
    toast.add({ title: t('users.deleted'), color: 'success', icon: 'i-lucide-check-circle' })
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || t('common.error'), color: 'error' })
  } finally {
    deletingId.value = null
  }
}

const changePwdId = ref<string | null>(null)
const newPassword = ref('')
const changePwdLoading = ref(false)

async function changePassword(id: string) {
  changePwdLoading.value = true
  try {
    await $fetch(`/api/users/${id}`, { method: 'PUT', body: { password: newPassword.value } })
    toast.add({ title: t('users.password_changed'), color: 'success', icon: 'i-lucide-check-circle' })
    changePwdId.value = null
    newPassword.value = ''
  } catch (err: unknown) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || t('common.error'), color: 'error' })
  } finally {
    changePwdLoading.value = false
  }
}

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Viewer', value: 'viewer' }
]

const columns = computed(() => [
  { accessorKey: 'username', header: t('common.username') },
  { accessorKey: 'role', header: t('users.role') },
  { accessorKey: 'createdAt', header: t('common.created') },
  { id: 'actions', header: t('common.actions') }
])

onMounted(() => {
  animateIn('.anim-header', 0)
  animateIn('.anim-card', 0)
})
</script>

<template>
  <div class="py-8 px-6 lg:px-8 space-y-6">
    <div class="anim-header flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">{{ t('users.title') }}</h1>
        <p class="text-sm text-muted mt-0.5">{{ t('users.subtitle') }}</p>
      </div>
      <UButton icon="i-lucide-user-plus" size="sm" @click="showAdd = true">
        {{ t('users.add') }}
      </UButton>
    </div>

    <UCard class="anim-card">
      <UTable :data="users || []" :columns="columns">
        <template #username-cell="{ row }">
          <div class="flex items-center gap-2.5">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elevated">
              <UIcon name="i-lucide-circle-user" class="h-3.5 w-3.5 text-muted" />
            </div>
            <span class="font-medium text-sm">{{ row.original.username }}</span>
          </div>
        </template>
        <template #role-cell="{ row }">
          <UBadge
            :color="row.original.role === 'admin' ? 'primary' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ row.original.role }}
          </UBadge>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-sm text-muted tabular-nums">
            {{ new Date(row.original.createdAt).toLocaleDateString() }}
          </span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1.5">
            <template v-if="changePwdId !== row.original.id">
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-key-round"
                @click="changePwdId = row.original.id; newPassword = ''"
              >
                {{ t('users.change_password') }}
              </UButton>
            </template>
            <template v-else>
              <UInput
                v-model="newPassword"
                type="password"
                size="xs"
                :placeholder="t('users.new_password')"
                class="w-36"
              />
              <UButton
                size="xs"
                color="primary"
                :loading="changePwdLoading"
                :disabled="!newPassword"
                @click="changePassword(row.original.id)"
              >
                {{ t('common.save') }}
              </UButton>
              <UButton size="xs" color="neutral" variant="ghost" @click="changePwdId = null">
                {{ t('common.cancel') }}
              </UButton>
            </template>

            <UButton
              v-if="row.original.id !== currentUser?.id"
              size="xs"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              :loading="deletingId === row.original.id"
              @click="deleteUser(row.original.id)"
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <UModal v-model:open="showAdd" :title="t('users.add')">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('common.username')" required>
            <UInput v-model="addForm.username" icon="i-lucide-user" class="w-full" placeholder="johndoe" />
          </UFormField>
          <UFormField :label="t('common.password')" required>
            <UInput v-model="addForm.password" type="password" icon="i-lucide-lock" class="w-full" />
          </UFormField>
          <UFormField :label="t('users.role')">
            <USelect v-model="addForm.role" :items="roleOptions" value-key="value" label-key="label" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" size="sm" @click="showAdd = false">
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            size="sm"
            :loading="addLoading"
            :disabled="!addForm.username || !addForm.password"
            @click="addUser"
          >
            {{ t('users.add') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
