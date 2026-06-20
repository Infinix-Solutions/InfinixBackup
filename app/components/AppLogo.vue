<script setup lang="ts">
defineProps<{ class?: string }>()
</script>

<template>
  <div :class="$props.class" class="flex items-center gap-2">
    <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary-500">
      <UIcon name="i-lucide-archive" class="h-3.5 w-3.5 text-white" />
    </div>
    <span class="font-bold">Infinix Backup</span>
  </div>
</template>
