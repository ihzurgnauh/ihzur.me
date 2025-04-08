<script setup lang="ts">
import { useSharedMouseInElement } from "~/logics";

defineProps<{
  item: { content: string; date: string };
}>();

const el = ref<HTMLDivElement | null>(null);

const windowWidth = ref(window.innerWidth);

const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(() => {
  window.addEventListener("resize", updateWindowWidth);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateWindowWidth);
});

// Disable tracking if window width is less than 800px
const isDisabled = computed(() => windowWidth.value < 800);

// Get mouse position
const { elementX, elementY} = useSharedMouseInElement(el);

</script>

<template>
  <div
    ref="el"
    class="relative rounded-3.5 border-1 border-#fff dark:border-#1c1c1d"
    :style="{
      '--x': `${elementX}px`,
      '--y': `${elementY}px`,
      background: isDisabled
        ? 'transparent'
        : `radial-gradient(130px at var(--x) var(--y), var(--rg-color), transparent)`
    }"
  >
    <div style="line-height: 1.75;" class="card-shadow border-1 border-#00000000 m-0.5 rounded-3 dark:bg-#1c1c1df2 bg-#fff bg-op-86">
      <div class="m-4 tracking-wide">
        <div>{{ item.content }}</div>
        <div>
          <span class="op-70 text-xs">{{ item.date }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-shadow {
  box-shadow: 0 0 0 0px #fff, 0 0 #0000, 0 0 0 1px #9999, 0 0 #0000, 0 1px 2px 0 #0000001a, 0 1px 2px -1px #0000001a;
}
</style>
