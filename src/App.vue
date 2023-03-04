<script setup lang="ts">
useHead({
  meta: [
    { property: 'og:title', content: 'ihzurgnauh' },
    { property: 'og:image', content: 'https://ihzurgnauh.github.io/og-icon.png' },
    { name: 'description', content: 'ihzurgnauh\'s Portfolio' },
  ],
})
</script>

<template>
  <NavBar />
  <main class="px-7 py-10">
    <router-view />
    <Footer />
  </main>
</template>
