<script setup lang="ts">

function toTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

const { y: scroll } = useWindowScroll()

const showEmail = ref(false)

</script>

<template>
  <header class="header z-40">
    <RouterLink
      class="h-12 absolute xl:fixed m-5 select-none outline-none"
      to="/"
      focusable="false"
    >
      <Logo class="ml-3 mr-3"/>
    </RouterLink>
    <button
      title="Scroll to top"
      fixed right-3 bottom-3 w-10 h-10 hover:op100 rounded-full
      hover-bg-hex-8883 transition duration-300 z-100 print:hidden
      :class="scroll > 300 ? 'op30' : 'op0! pointer-events-none'"
      @click="toTop()"
    >
      <div i-ri-arrow-up-line />
    </button>
    <nav class="nav">
      <div class="spacer" />
      <div class="right" print:op0>
        <RouterLink to="/posts" title="随笔">
          <span class="lt-md:hidden">随笔</span>
          <div i-line-md-text-box md:hidden />
        </RouterLink>
        <RouterLink to="/notes" class="lt-md:hidden" title="杂记">
          杂记
        </RouterLink>
        <RouterLink to="/strange-thinkings" title="奇思怪想">
          <span class="lt-md:hidden">奇思</span>
          <div i-line-md-watch-loop md:hidden />
        </RouterLink>
        <RouterLink to="/bookmarks" title="书签">
          <div i-mingcute-bookmarks-line />
        </RouterLink>
        <a href="https://github.com/ihzurgnauh" target="_blank" title="GitHub" class="lt-md:hidden">
          <div i-line-md-github />
        </a>
        <a @click="showEmail = true" target="_blank" title="Email">
          <div i-line-md-email />
          <Teleport to="body">
            <modal :show="showEmail" @close="showEmail = false">
              <template #body>
                <em>
                  <a href="mailto:zhiruhuang7@gmail.com" class="ml-3px">
                    <i i-iconoir-send-mail class="@hover:animate-swing"/>
                  </a>: 
                  <TextCopy inline>zhiruhuang7@gmail.com</TextCopy>
                </em>
              </template>
            </modal>
          </Teleport>
        </a>
        <a href="/feed.xml" target="_blank" title="RSS" class="lt-md:hidden">
          <div i-ic-sharp-rss-feed />
        </a>
        <toggle-theme />
      </div>
    </nav>
  </header>
</template>

<style scoped>
.header h1 {
  margin-bottom: 0;
}

.logo {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
}

.nav {
  padding: 2rem;
  width: 100%;
  display: grid;
  grid-template-columns: auto max-content;
  box-sizing: border-box;
}

.nav > * {
  margin: auto;
}

.nav img {
  margin-bottom: 0;
}

.nav a {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s ease;
  opacity: 0.6;
  outline: none;
}

.nav a:hover {
  opacity: 1;
  text-decoration-color: inherit;
}

.nav .right {
  display: grid;
  grid-gap: 1.2rem;
  grid-auto-flow: column;
}

.nav .right > * {
  margin: auto;
}
</style>
