<script setup lang='ts'>
import { toggleDark } from '~/logics'
</script>

<template>
  <a class="select-none" title="Toggle Color Scheme" @click="toggleDark">
    <div i-line-md-moon-filled-to-sunny-filled-transition dark:i-line-md-sunny-filled-loop-to-moon-filled-transition />
  </a>
</template>
