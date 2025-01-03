<script setup lang='ts'>
const props = defineProps({
  show: Boolean
})
</script>

<template>
  <Transition name="modal">
    <div v-if="props.show" class="modal-mask fixed flex top-0 left-0 w-100% h-100%">
      <div class="modal-container border-solid border-1 border-#9999 shadow-md backdrop-blur-md rounded-md w-350px px-20px py-15px m-auto">
        <div class="modal-header mt-0">
          <button class="float-right hover:animate-jello" @click="$emit('close')">
            <i i-iconamoon-close-light/>
          </button>
          <slot name="header"></slot>
        </div>

        <div class="my-20px">
          <slot name="body"></slot>
        </div>

        <div>
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
.modal-mask {
  z-index: 9998;
  transition: opacity 0.3s ease;
}

.modal-container {
  transition: all 0.3s ease;
}

.modal-header h3 {
  color: var(--fg-deeper);
}

.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}
</style>
