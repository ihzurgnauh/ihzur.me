<script setup lang='ts'>
import { toggleDark } from '~/logics'
</script>

<template>
  <a class="select-none" title="Toggle Color Scheme" @click="toggleDark">
    <div i-line-md-moon-to-sunny-outline-transition dark:i-line-md-sunny-outline-to-moon-transition class="@hover:animate-swing"/>
  </a>
</template>
