<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'

const router = useRouter()
const currentUser = ref(null)

function checkAuth() {
  const stored = localStorage.getItem('user')
  if (stored) {
    try { currentUser.value = JSON.parse(stored) }
    catch (e) { currentUser.value = null }
  } else { currentUser.value = null }
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
  <div class="app-container">
    <header class="navbar">
      <div class="logo"><RouterLink to="/">TruFeel</RouterLink></div>
      <nav class="nav-links">
        <RouterLink to="/" class="nav-item">Analyze</RouterLink>
        <RouterLink v-if="currentUser" to="/dashboard" class="nav-item">Dashboard</RouterLink>

        <div v-if="currentUser" class="user-menu">
          <span class="username">Hi, {{ currentUser.username || currentUser.email }}</span>
          <button @click="handleLogout" class="btn-logout">Logout</button>
        </div>
        <div v-else class="auth-buttons">
          <RouterLink to="/login" class="btn-text">Login</RouterLink>
          <RouterLink to="/register" class="btn-primary">Register</RouterLink>
        </div>
      </nav>
    </header>
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-container { min-height: 100vh; display: flex; flex-direction: column; font-family: 'Segoe UI', sans-serif; background-color: #f8f9fa; }
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 0 40px; height: 64px; background-color: #ffffff; border-bottom: 1px solid #eaeaea; box-shadow: 0 2px 4px rgba(0,0,0,0.02); position: sticky; top: 0; z-index: 100; }
.logo a { font-size: 1.5rem; font-weight: 700; color: #2b6ef6; text-decoration: none; letter-spacing: -0.5px; }
.nav-links { display: flex; align-items: center; gap: 24px; }
.nav-item { color: #555; text-decoration: none; font-weight: 500; font-size: 0.95rem; transition: color 0.2s; }
.nav-item:hover, .nav-item.router-link-active { color: #2b6ef6; }
.auth-buttons { display: flex; gap: 12px; align-items: center; }
.btn-text { color: #555; text-decoration: none; font-weight: 500; }
.btn-primary { background-color: #2b6ef6; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500; }
.user-menu { display: flex; align-items: center; gap: 16px; }
.username { color: #333; font-weight: 600; }
.btn-logout { background: none; border: 1px solid #ddd; padding: 6px 12px; border-radius: 4px; cursor: pointer; color: #666; font-size: 0.9rem; }
.main-content { flex: 1; padding: 20px; max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box; }
</style>
