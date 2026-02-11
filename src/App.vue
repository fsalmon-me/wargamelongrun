<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from './stores/authStore';

const auth = useAuthStore();
onMounted(() => auth.init());
</script>

<template>
  <div id="midgard-app">
    <router-view />
  </div>
</template>

<style scoped>
#midgard-app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
