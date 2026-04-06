<template>
  <div class="register-page">
    <h1>Register</h1>
    <form @submit.prevent="onSubmit" class="form">

      <label class="field">
        <span>Username</span>
        <input v-model="username" type="text" required placeholder="e.g. JohnDoe" />
      </label>

      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" required placeholder="name@example.com" />
      </label>

      <label class="field">
        <span>Password</span>
        <input v-model="password" type="password" required minlength="6" />
      </label>

      <label class="field">
        <span>Confirm Password</span>
        <input v-model="confirmPassword" type="password" required />
      </label>

      <div class="checkbox-field">
        <label>
          <input type="checkbox" v-model="isBusiness" />
          Register as Business User?
        </label>
      </div>

      <div v-if="isBusiness" class="field business-section">
        <span>Company Name</span>
        <input
          v-model="companyName"
          type="text"
          :required="isBusiness"
          placeholder="e.g. Tech Corp Ltd."
        />
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <button class="btn" :disabled="loading">
        {{ loading ? 'Registering...' : 'Register' }}
      </button>
    </form>
  </div>
</template>

<script>
export default {
  name: 'RegisterView'
}
</script>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const isBusiness = ref(false)
const companyName = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  if (isBusiness.value && !companyName.value.trim()) {
    error.value = 'Company Name is required for Business accounts'
    return
  }

  loading.value = true

  try {
    const payload = {
      username: username.value,
      email: email.value,
      password: password.value,
      role: isBusiness.value ? 'Business' : 'User',
      companyName: isBusiness.value ? companyName.value : null
    }

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (res.status === 201) {
      router.push('/login')
      return
    }

    const body = await res.json().catch(() => ({ message: 'Unknown error' }))
    error.value = body.message || `Registration failed (${res.status})`

  } catch (e) {
    error.value = e.message || 'Network error'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  max-width: 420px;
  margin: 40px auto;
  padding: 30px;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

h1 {
  text-align: center;
  margin-bottom: 24px;
  color: #333;
}

.form { display: flex; flex-direction: column; gap: 16px; }

.field { display: flex; flex-direction: column; }
.field span { font-size: 0.9rem; margin-bottom: 6px; font-weight: 500; color: #555; }
input[type="text"],
input[type="email"],
input[type="password"] {
  padding: 10px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  transition: border-color 0.2s;
}

input:focus {
  border-color: #2b6ef6;
  outline: none;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.checkbox-field label {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
}

.business-section {
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  border: 1px dashed #ccc;
}

.btn {
  margin-top: 10px;
  padding: 12px;
  background: #2b6ef6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: background 0.2s;
}

.btn:hover { background: #1a5cd0; }

.btn[disabled] { opacity: 0.6; cursor: not-allowed; }
.error {
  color: #d32f2f;
  font-size: 0.9rem;
  text-align: center;
  padding: 8px;
  background: #ffebee;
  border-radius: 4px;
}
</style>
