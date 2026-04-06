<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const inputText = ref('')
const isFocused = ref(false)

const goToResult = () => {
  if (!inputText.value.trim()) return
  router.push({ name: 'Analyzeresult', query: { q: inputText.value } })
}

const clearInput = () => {
  inputText.value = ''
}
</script>

<template>
  <div class="dashboard-wrapper">

    <!-- 頂部 Header 對齊 Batch -->
    <div class="page-header">
      <h2>Sentiment Dashboard</h2>
      <div class="header-actions">
        <button class="btn-back" @click="router.push('/dashboard')">Back to Home</button>
      </div>
    </div>

    <!-- 中間上傳卡片，完全套用 Batch 的 upload-container 結構與 CSS -->
    <div class="upload-container">

      <!-- 標題部分 -->
      <h3 class="single-title">Single Text Analysis</h3>
      <p class="single-subtitle">Paste a single customer review, tweet, or any text snippet to analyze.</p>

      <!-- 虛線框區域，套用 Batch 的 upload-zone 風格 -->
      <div
        class="upload-zone"
        :class="{ 'is-focused': isFocused || inputText.length > 0 }"
      >
        <div v-if="!inputText" class="upload-placeholder">
          <div class="upload-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <h3>Paste Your Text Here</h3>
          <p class="file-hint">Type or paste the content you want to analyze.</p>
        </div>

        <textarea
          v-model="inputText"
          class="text-input"
          maxlength="5000"
          @focus="isFocused = true"
          @blur="isFocused = false"
        ></textarea>
      </div>

      <!-- 底部字數與按鈕，套用 Batch 的按鈕風格 -->
      <div class="action-footer">
        <span class="char-count">{{ inputText.length }} / 5000 characters</span>
        <div class="action-buttons-fancy">
          <button class="btn-text" @click="clearInput" :disabled="!inputText">Clear Text</button>
          <button class="btn-solid-blue" @click="goToResult" :disabled="!inputText.trim()">
            Analyze Sentiment
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* --- 頁面與 Header，直接複製 Batch --- */
.dashboard-wrapper {
  padding: 20px 40px 60px;
  background-color: #f8fafc;
  min-height: calc(100vh - 60px);
  font-family: 'Inter', 'Open Sans', sans-serif;
  color: #334155;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.page-header h2 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  color: #1e293b;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-back {
  background: transparent;
  color: #64748b;
  border: 1px solid #cbd5e1;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #f1f5f9;
  color: #1e293b;
}

/* --- 中央卡片，直接複製 Batch 的 upload-container --- */
.upload-container {
  background: #ffffff;
  padding: 50px 40px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.03);
  max-width: 700px;
  margin: 40px auto;
  border: 1px solid #f1f5f9;
}

.single-title {
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.single-subtitle {
  color: #94a3b8;
  font-size: 0.95rem;
  margin: 0 0 30px 0;
}

/* --- 虛線框，直接複製 Batch 的 upload-zone --- */
.upload-zone {
  border: 2px dashed #cbd5e1;
  padding: 0; /* 這裡拿掉 padding 讓 textarea 可以填滿 */
  border-radius: 12px;
  transition: all 0.3s ease;
  background-color: #f8fafc;
  position: relative;
  overflow: hidden;
  min-height: 250px;
  display: flex;
}

.upload-zone.is-focused {
  background-color: #eff6ff;
  border-color: #3b82f6;
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
}

/* --- Placeholder --- */
.upload-placeholder {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  pointer-events: none; /* 讓點擊穿透到下方的 textarea */
}

.upload-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 15px;
  color: #94a3b8;
  transition: color 0.3s;
}

.upload-zone.is-focused .upload-icon {
  color: #3b82f6;
}

.upload-placeholder h3 {
  color: #334155;
  font-size: 1.2rem;
  margin-bottom: 8px;
  font-weight: 600;
}

.file-hint {
  color: #94a3b8;
  font-size: 0.95rem;
  margin-bottom: 0;
}

/* --- Textarea --- */
.text-input {
  width: 100%;
  height: 100%;
  min-height: 250px;
  box-sizing: border-box;
  padding: 30px;
  border: none;
  background: transparent;
  font-size: 1rem;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  font-family: inherit;
  color: #1e293b;
  z-index: 2; /* 蓋在 placeholder 上面 */
}

.text-input::placeholder {
  color: transparent;
}

/* --- 底部 Action 區域 --- */
.action-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 25px;
}

.char-count {
  font-size: 0.85rem;
  color: #94a3b8;
}

.action-buttons-fancy {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  align-items: center;
}

.btn-text {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;
}

.btn-text:hover:not(:disabled) {
  color: #475569;
}

.btn-text:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 類似 Batch 的漸層藍色按鈕 (對應其 Browse File 的按鈕風格) */
.btn-solid-blue {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
  transition: all 0.3s ease;
}

.btn-solid-blue:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
}

.btn-solid-blue:disabled {
  background: #94a3b8;
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}
</style>
