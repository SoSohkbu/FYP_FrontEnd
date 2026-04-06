<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const currentUser = ref(null)

function checkAuth() {
  const stored = localStorage.getItem('user')
  if (stored) {
    try {
      currentUser.value = JSON.parse(stored)
    } catch (e) {
      currentUser.value = null
    }
  } else {
    currentUser.value = null
    router.push('/login')
  }
}

function handleLogout() {
  localStorage.removeItem('user')
  currentUser.value = null
  router.push('/login')
}

onMounted(() => {
  checkAuth()
  window.addEventListener('auth-change', checkAuth)
})
</script>

<template>
  <div class="admin-layout">

    <aside class="sidebar">
      <div class="sidebar-header">
        <h2 class="brand">
          <span class="icon"></span> TruFeel
        </h2>
      </div>

      <ul class="nav-menu">
        <li class="nav-title">MAIN MENU</li>

        <li :class="{ active: route.path === '/dashboard' }" @click="router.push('/dashboard')">
          <span class="icon"></span> Dashboard
        </li>

        <li :class="{ active: route.path === '/analyze' }" @click="router.push('/analyze')">
          <span class="icon"></span> Text Analysis
        </li>

        <li :class="{ active: route.path === '/url-analyze' }" @click="router.push('/url-analyze')">
          <span class="icon"></span> URL Analysis
        </li>

        <li :class="{ active: route.path === '/analyze-batch' }" @click="router.push('/analyze-batch')">
          <span class="icon"></span> Batch Analysis
        </li>

        <li :class="{ active: route.path === '/compare' }" @click="router.push('/compare')">
          <span class="icon"></span> Data Compare
        </li>

        <li :class="{ active: route.path === '/history' }" @click="router.push('/history')">
          <span class="icon"></span> History
        </li>

        <li :class="{ active: route.path === '/growth' }" @click="router.push('/growth')">
          <span class="icon"></span> Growth Plan Tracking
        </li>
      </ul>
    </aside>

    <div class="main-container">

      <header class="top-header">
        <div class="header-spacer"></div>

        <div class="user-profile">
          <div class="avatar">👤</div>
          <span class="username" v-if="currentUser">
            Hi, {{ currentUser.username || currentUser.email || 'Admin' }}
          </span>
          <button class="btn-logout" @click="handleLogout">Logout</button>
        </div>
      </header>

      <main class="content-wrapper">
        <router-view />
      </main>

    </div>

  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: #f4f6f9;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  background-color: #272c33;
  color: #fff;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background-color: #1f2328;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.brand {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: #fff;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-menu {
  list-style: none;
  padding: 20px 0;
  margin: 0;
  overflow-y: auto;
}

.nav-title {
  font-size: 0.75rem;
  color: #8a909d;
  padding: 10px 25px;
  font-weight: 700;
  letter-spacing: 1px;
}

.nav-menu li:not(.nav-title) {
  padding: 14px 25px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 15px;
  color: #a3a9b3;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  border-left: 4px solid transparent;
}

.nav-menu li:hover:not(.nav-title) {
  background-color: rgba(255,255,255,0.05);
  color: #fff;
}

.nav-menu li.active {
  background-color: #323840;
  color: #fff;
  border-left-color: #3498db;
  font-weight: 600;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-header {
  height: 64px;
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  z-index: 10;
  flex-shrink: 0;
}

.header-spacer {
  flex: 1;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 15px;
}

.username {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.95rem;
}

.btn-logout {
  background: transparent;
  border: 1px solid #e74c3c;
  color: #e74c3c;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: #e74c3c;
  color: #fff;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto;
  background-color: #f4f6f9;
}
</style>
