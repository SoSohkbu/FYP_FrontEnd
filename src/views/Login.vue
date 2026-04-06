<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Welcome Back</h1>
      <p class="subtitle">Sign in to unlock full analytics features</p>

      <form @submit.prevent="handleLogin" class="form">
        <label>Email</label>
        <input v-model="email" type="email" required placeholder="name@example.com" />

        <label>Password</label>
        <input v-model="password" type="password" required />

        <div v-if="error" class="error-msg">{{ error }}</div>

        <button class="btn-primary" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <p class="footer">
        Don't have an account?
        <router-link to="/register">Register here</router-link>
      </p>
    </div>
  </div>
</template>

<script>
export default { name: 'LoginView' }
</script>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  loading.value = true
  error.value = ''

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    })

    const data = await res.json()

    if (res.ok) {
      localStorage.setItem('user', JSON.stringify(data))

      window.dispatchEvent(new Event('auth-change'))

      router.push('/')
    } else {
      error.value = data.message || 'Login failed'
    }
  } catch (e) {
    error.value = 'Network error'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  background-color: #f8f9fa;
}
.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}
h1 { text-align: center; margin-bottom: 8px; color: #333; }
.subtitle { text-align: center; color: #666; margin-bottom: 30px; font-size: 0.9rem; }
.form { display: flex; flex-direction: column; gap: 16px; }
label { font-weight: 500; font-size: 0.9rem; color: #444; }
input { padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; }
input:focus { border-color: #2b6ef6; outline: none; }
.btn-primary {
  margin-top: 10px;
  padding: 12px;
  background: #2b6ef6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-primary:hover { background: #1a5cd0; }
.error-msg { color: #d32f2f; font-size: 0.9rem; text-align: center; }
.footer { margin-top: 24px; text-align: center; font-size: 0.9rem; color: #666; }
.footer a { color: #2b6ef6; text-decoration: none; font-weight: 500; }
</style>
