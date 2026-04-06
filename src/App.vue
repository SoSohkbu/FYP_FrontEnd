<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import DefaultLayout from './layouts/DefaultLayout.vue'
import AdminLayout from './layouts/AdminLayout.vue'

const route = useRoute()

const layouts = {
  DefaultLayout,
  AdminLayout
}

const currentLayout = computed(() => {
  return layouts[route.meta.layout || 'DefaultLayout']
})
</script>

<template>
  <component :is="currentLayout">
  </component>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f8f9fa;
}
</style>
