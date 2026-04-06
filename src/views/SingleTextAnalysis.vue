<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'
import VueWordCloud from 'vuewordcloud'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

defineOptions({ name: 'SingleTextAnalysis' })

const router = useRouter()
const route = useRoute()

const viewMode = ref('input')
const inputText = ref('')
const isFocused = ref(false)

const analyzing = ref(false)
const currentUser = ref(null)

const overview = ref({ label: 'Neutral', type: 'neutral', posPct: 0, negPct: 0, neuPct: 100 })
const keywords = ref([])
const sentences = ref([])

const showSaveModal = ref(false)
const modalStep = ref(1)
const isSaving = ref(false)
const recordName = ref('')
const availablePlans = ref([])
const selectedPlanId = ref('')
const isGeneratingAI = ref(false)
const aiSummary = ref('')

const sentenceStats = computed(() => {
  const stats = { strNeg: 0, neg: 0, neu: 0, pos: 0, strPos: 0 }
  if (!sentences.value || sentences.value.length === 0) return stats

  sentences.value.forEach(s => {
    if (s.type === 'negative') stats.neg++
    else if (s.type === 'positive') stats.pos++
    else stats.neu++
  })

  if (overview.value.type === 'positive' && overview.value.posPct >= 80) stats.strPos = Math.max(1, Math.floor(stats.pos * 0.5))
  if (overview.value.type === 'negative' && overview.value.negPct >= 80) stats.strNeg = Math.max(1, Math.floor(stats.neg * 0.5))

  return stats
})

const barChartData = computed(() => ({
  labels: ['Str. Negative', 'Negative', 'Neutral', 'Positive', 'Str. Positive'],
  datasets: [{
    label: 'Sentence Count',
    backgroundColor: ['#ef4444', '#f87171', '#cbd5e1', '#34d399', '#10b981'],
    data: [sentenceStats.value.strNeg, sentenceStats.value.neg, sentenceStats.value.neu, sentenceStats.value.pos, sentenceStats.value.strPos],
    borderRadius: 4
  }]
}))

const barOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5] }, ticks: { stepSize: 1 } }, x: { grid: { display: false } } }
}

const donutChartData = computed(() => ({
  labels: ['Positive', 'Neutral', 'Negative'],
  datasets: [{
    backgroundColor: ['#10b981', '#cbd5e1', '#ef4444'],
    data: [overview.value?.posPct || 0, overview.value?.neuPct || 0, overview.value?.negPct || 0],
    borderWidth: 0
  }]
}))

const donutOptions = {
  responsive: true, maintainAspectRatio: false, cutout: '70%',
  plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } }
}

const wordCloudWords = computed(() => {
  if (keywords.value && keywords.value.length > 0) return keywords.value.map(k => [k.text, Math.floor(Math.random() * 5) + 3])
  const fallbackWords = inputText.value.split(/\s+/).filter(w => w.length > 4).slice(0, 10)
  if (fallbackWords.length > 0) return fallbackWords.map(w => [w.replace(/[^a-zA-Z0-9]/g, ''), Math.floor(Math.random() * 4) + 2])
  return [['Text', 5], ['Analysis', 4], ['Sentiment', 3]]
})

const getWordColor = () => {
  const colors = ['#334155', '#475569', '#64748b', '#94a3b8', '#3b82f6', '#10b981']
  return colors[Math.floor(Math.random() * colors.length)]
}

const clearInput = () => { inputText.value = '' }
const goToNewInput = () => { inputText.value = ''; viewMode.value = 'input' }

async function analyzeText() {
  if (!inputText.value.trim()) return
  viewMode.value = 'result'
  analyzing.value = true
  overview.value = { label: 'Analyzing...', type: 'neutral', posPct: 0, negPct: 0, neuPct: 100 }
  keywords.value = []
  sentences.value = []

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: inputText.value }), signal: controller.signal
    })
    clearTimeout(timeoutId)
    if (!response.ok) throw new Error(`Server Error: ${response.status}`)
    const data = await response.json()
    if (data.status === 'error') throw new Error(data.message)

    const results = data.results || {}
    const apiOverview = results.overview || {}

    overview.value = {
        label: apiOverview.label || 'Neutral', type: (apiOverview.type || 'neutral').toLowerCase(),
        posPct: Number(apiOverview.posPct) || 0, negPct: Number(apiOverview.negPct) || 0, neuPct: Number(apiOverview.neuPct) || 100
    }
    if (results.sentences && Array.isArray(results.sentences) && results.sentences.length > 0) {
        sentences.value = results.sentences
    } else {
        sentences.value = [{ text: inputText.value, type: overview.value.type }]
    }
    keywords.value = []
  } catch (error) {
    clearTimeout(timeoutId)
    overview.value = { label: 'Error', type: 'neutral', posPct: 0, negPct: 0, neuPct: 0 }
    sentences.value = [{ text: inputText.value, type: 'neutral' }]
    alert(`Analysis Failed: ${error.message}`)
  } finally {
    analyzing.value = false
  }
}

async function generateAISummary() {
  if (!inputText.value.trim()) return

  isGeneratingAI.value = true
  aiSummary.value = ''

  try {
    const response = await fetch('http://localhost:3000/api/deepseek/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: inputText.value,
        overview: overview.value,
        keywords: keywords.value,
        sentences: sentences.value
      })
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.message || `Server Error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status === 'error') {
      throw new Error(data.message)
    }

    aiSummary.value = data.summary

  } catch (error) {
    aiSummary.value = `Failed to generate AI summary: ${error.message}`
  } finally {
    isGeneratingAI.value = false
  }
}

async function openSaveFlow() {
  if (!currentUser.value) {
    if(confirm("Please login to save results. Go to login page?")) router.push('/login')
    return
  }
  recordName.value = `Analysis - ${new Date().toLocaleDateString()}`
  selectedPlanId.value = ''
  modalStep.value = 1
  showSaveModal.value = true

  try {
    const res = await fetch(`http://localhost:3000/api/growth-plans?userId=${currentUser.value._id}`)
    if (res.ok) availablePlans.value = await res.json()
  } catch (error) {
    console.error("Failed to load plans:", error)
  }
}

async function executeSaveDB() {
  isSaving.value = true
  try {
    const saveRes = await fetch('http://localhost:3000/api/history/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.value._id,
        name: recordName.value,
        inputText: inputText.value,
        overview: overview.value, keywords: keywords.value, sentences: sentences.value
      })
    })
    if (!saveRes.ok) throw new Error('Failed to save to database')

    modalStep.value = 2
  } catch (e) {
    alert("Save failed: " + e.message)
  } finally {
    isSaving.value = false
  }
}

function handleSkipPlan() {
  showSaveModal.value = false
}
function handleYesAddPlan() {
  modalStep.value = 3
}

async function executeAddToPlan() {
  if (!selectedPlanId.value) return
  isSaving.value = true
  try {
    let pos = 0; let neu = 0; let neg = 0;
    const currentType = overview.value?.type || 'neutral';
    if (currentType === 'positive') pos = 100;
    else if (currentType === 'negative') neg = 100;
    else neu = 100;

    const planRes = await fetch(`http://localhost:3000/api/growth-plans/${selectedPlanId.value}/data-points`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceType: 'single', posPct: pos, neuPct: neu, negPct: neg, analyzedCount: 1 })
    })
    if (!planRes.ok) throw new Error('Failed to link to Growth Plan')

    alert("Successfully added to Growth Plan!")
    showSaveModal.value = false
  } catch (e) {
    alert("Operation failed: " + e.message)
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  const storedUser = localStorage.getItem('user')
  if (storedUser) currentUser.value = JSON.parse(storedUser)
  if (route.query.q) {
    inputText.value = route.query.q
    analyzeText()
  }
})
</script>

<template>
  <div class="result-page-container">
    <div v-if="viewMode === 'input'" class="inner-content-wrapper input-centered">
      <div class="page-header">
        <h2>Sentiment Analysis</h2>
        <div class="header-actions">
          <button class="btn-cancel" @click="router.push('/dashboard')">Back to Home</button>
        </div>
      </div>

      <div class="upload-container">
        <h3 class="single-title">Single Text Analysis</h3>
        <p class="single-subtitle">Paste a customer review, tweet, or any text snippet to analyze.</p>

        <div class="upload-zone" :class="{ 'is-focused': isFocused || inputText.length > 0 }">
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

          <textarea v-model="inputText" class="text-input" maxlength="5000" @focus="isFocused = true" @blur="isFocused = false"></textarea>
        </div>

        <div class="action-footer">
          <span class="char-count">{{ inputText.length }} / 5000 characters</span>
          <div class="action-buttons-fancy">
            <button class="btn-text" @click="clearInput" :disabled="!inputText">Clear Text</button>
            <button class="btn-primary" @click="analyzeText" :disabled="!inputText.trim()">
              Analyze Sentiment
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="inner-content-wrapper">
      <div class="page-header">
        <h2>Analysis Result</h2>
        <div class="header-actions">
          <button class="btn-save-plan" @click="openSaveFlow" :disabled="analyzing">
            Save DB
          </button>
          <button class="btn-new" @click="goToNewInput" :disabled="analyzing">
            + New Analyze
          </button>
        </div>
      </div>

      <div v-if="analyzing" class="loading-state upload-container">
        <div class="spinner-box"><div class="spinner"></div></div>
        <h3 class="pulsing-text" style="margin-top: 20px;">Analyzing text, please wait...</h3>
        <p class="loading-subtext">Our AI model is processing your input.</p>
      </div>

      <div v-else class="dashboard-grid">
        <div class="row metric-cards">
          <div class="card bg-purple">
            <div class="card-info"><h4>TOTAL INPUT</h4><h2>1</h2></div>
            <div class="card-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
            </div>
          </div>
          <div class="card bg-green">
            <div class="card-info"><h4>POSITIVE SCORE</h4><h2>{{ overview?.posPct || 0 }} <small>%</small></h2></div>
            <div class="card-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
            </div>
          </div>
          <div class="card bg-orange">
            <div class="card-info"><h4>NEUTRAL SCORE</h4><h2>{{ overview?.neuPct || 100 }} <small>%</small></h2></div>
            <div class="card-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="15" x2="16" y2="15"></line><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
            </div>
          </div>
          <div class="card bg-blue">
            <div class="card-info"><h4>NEGATIVE SCORE</h4><h2>{{ overview?.negPct || 0 }} <small>%</small></h2></div>
            <div class="card-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
            </div>
          </div>
        </div>

        <div class="row charts-row">
          <div class="panel chart-large">
            <div class="panel-header"><h3>Sentiment Intensity</h3></div>
            <div class="chart-box"><Bar :data="barChartData" :options="barOptions"></Bar></div>
          </div>
          <div class="panel chart-small">
            <div class="panel-header"><h3>Sentiment Sources</h3></div>
            <div class="chart-box doughnut-box"><Doughnut :data="donutChartData" :options="donutOptions"></Doughnut></div>
          </div>
        </div>

        <div class="row bottom-row">
          <div class="panel list-panel">
            <div class="panel-header"><h3>Original Text & Breakdown</h3></div>
            <div class="table-container">
              <div class="list-item original-input">
                <div class="item-text">
                  <strong style="color: #64748b; font-size: 0.85rem; display: block; margin-bottom: 5px;">Your Input:</strong>
                  <span style="font-style: italic;">"{{ inputText }}"</span>
                </div>
              </div>
              <div v-for="(s, i) in sentences" :key="i" class="list-item">
                <div class="item-icon" :class="s?.type || 'neutral'"></div>
                <div class="item-text">{{ s?.text || '' }}</div>
              </div>
            </div>
          </div>

          <div class="right-column-group">
            <div class="panel wordcloud-panel">
              <div class="panel-header"><h3>Keywords</h3></div>
              <div class="cloud-box">
                <vue-word-cloud v-if="wordCloudWords.length" :words="wordCloudWords" :color="getWordColor" font-family="Inter" :spacing="0.5"></vue-word-cloud>
              </div>
            </div>

            <div class="panel ai-panel">
              <div class="panel-header ai-header">
                <h3>AI Summary</h3>
                <button class="btn-sm" @click="generateAISummary" :disabled="isGeneratingAI">Generate</button>
              </div>
              <div class="ai-content">
                <p v-if="aiSummary" style="margin:0;">{{ aiSummary }}</p>
                <div v-else class="ai-empty">Click generate for AI insights.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showSaveModal" class="modal-overlay" @click.self="showSaveModal = false">
        <div v-if="modalStep === 1" class="modal-content step-transition">
          <div class="modal-header-clean">
            <h3>Save Analysis Report</h3>
          </div>
          <div class="modal-body-clean">
            <p>Please enter a name for this report to save it to the database:</p>
            <input type="text" v-model="recordName" class="modal-input" placeholder="e.g., iPhone 15 Reviews Q1" />
          </div>
          <div class="modal-actions-clean">
            <button class="btn-clean-cancel" @click="showSaveModal = false">Cancel</button>
            <button class="btn-clean-submit blue" @click="executeSaveDB" :disabled="!recordName || isSaving">
              {{ isSaving ? 'Saving...' : 'Save Report' }}
            </button>
          </div>
        </div>

        <div v-else-if="modalStep === 2" class="modal-content step-transition text-center">
          <div class="success-icon-wrap">
            <svg viewBox="0 0 24 24" width="64" height="64" stroke="#10b981" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3 class="success-title">Report Saved!</h3>
          <p class="success-desc">Would you like to track these insights in your Growth Plan to monitor progress over time?</p>
          <div class="modal-actions-clean justify-center mt-4">
            <button class="btn-clean-cancel" @click="handleSkipPlan">No, Thanks</button>
            <button class="btn-clean-submit green" @click="handleYesAddPlan">Yes, Add to Plan</button>
          </div>
        </div>

        <div v-else-if="modalStep === 3" class="modal-content step-transition">
          <div class="modal-header-clean">
            <h3>Select Growth Plan</h3>
          </div>
          <div class="modal-body-clean">
            <p>Choose an active plan to append this batch analysis data:</p>
            <select v-model="selectedPlanId" class="modal-input select-style">
              <option value="" disabled>-- Select a Plan --</option>
              <option v-for="plan in availablePlans" :key="plan._id" :value="plan._id">{{ plan.name }}</option>
            </select>
          </div>
          <div class="modal-actions-clean">
            <button class="btn-clean-cancel" @click="showSaveModal = false">Cancel</button>
            <button class="btn-clean-submit green" @click="executeAddToPlan" :disabled="!selectedPlanId || isSaving">
              {{ isSaving ? 'Adding...' : 'Confirm Add' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-page-container {
  background-color: #f4f7f6;
  min-height: calc(100vh - 64px);
  width: 100%;
  display: flex;
  justify-content: center;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #334155;
  box-sizing: border-box;
}

.inner-content-wrapper {
  width: 100%;
  max-width: 1400px;
  padding: 30px 40px 80px 40px;
  box-sizing: border-box;
}

.input-centered { max-width: 900px; margin: 0 auto; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}
.page-header h2 { margin: 0; font-size: 2rem; font-weight: 700; color: #1e293b; }
.header-actions { display: flex; gap: 16px; }

.btn-primary, .btn-save-plan, .btn-new, .btn-cancel, .btn-sm {
  border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;
  font-weight: 600; font-size: 0.95rem; transition: all 0.2s ease;
  display: flex; align-items: center; justify-content: center;
}

.btn-primary { background: #3b82f6; color: white; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3); }
.btn-primary:hover:not(:disabled) { background: #2563eb; transform: translateY(-2px); box-shadow: 0 6px 8px -1px rgba(59,130,246,0.4); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

.btn-save-plan { background: #f59e0b; color: white; box-shadow: 0 4px 6px -1px rgba(245,158,11,0.3); }
.btn-save-plan:hover:not(:disabled) { background: #d97706; transform: translateY(-2px); }

.btn-new { background: #3b82f6; color: white; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3); }
.btn-new:hover { background: #2563eb; transform: translateY(-2px); }

.btn-cancel { background: #ffffff; color: #64748b; border: 1px solid #cbd5e1; }
.btn-cancel:hover { background: #f8fafc; }

.btn-sm { padding: 8px 16px; font-size: 0.85rem; border-radius: 6px; background: #8b5cf6; color: white; }
.btn-sm:hover { background: #7c3aed; }
.btn-text { background: transparent; border: none; color: #94a3b8; font-weight: 600; cursor: pointer; }
.btn-text:hover { color: #475569; }

.upload-container {
  background: #ffffff; padding: 50px 40px; border-radius: 16px; text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.04);
  margin: 20px auto; border: 1px solid #f1f5f9;
}
.single-title { color: #1e293b; font-size: 1.6rem; font-weight: 700; margin: 0 0 10px 0; }
.single-subtitle { color: #64748b; font-size: 1rem; margin: 0 0 30px 0; }
.upload-zone { border: 2px dashed #cbd5e1; border-radius: 12px; transition: all 0.3s ease; background-color: #f8fafc; position: relative; overflow: hidden; min-height: 280px; display: flex; }
.upload-zone.is-focused { border-color: #3b82f6; background-color: #eff6ff; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }
.upload-placeholder { position: absolute; top:0; left:0; right:0; bottom:0; display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: none; }
.upload-icon { width: 56px; height: 56px; margin-bottom: 15px; color: #94a3b8; }
.upload-placeholder h3 { color: #334155; font-size: 1.2rem; margin-bottom: 8px; font-weight: 600; }
.file-hint { color: #94a3b8; font-size: 0.95rem; }
.text-input { width: 100%; height: 100%; min-height: 280px; padding: 24px; border: none; background: transparent; font-size: 1.05rem; line-height: 1.6; resize: vertical; outline: none; z-index: 2; color:#1e293b;}
.action-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 25px; }
.char-count { font-size: 0.9rem; color: #94a3b8; }
.action-buttons-fancy { display: flex; gap: 15px; align-items: center; }

.dashboard-grid { width: 100%; display: flex; flex-direction: column; gap: 24px; }
.row { display: flex; gap: 24px; width: 100%; }

.metric-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.card { border-radius: 12px; padding: 28px 24px; color: #fff; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); min-height: 130px; box-sizing: border-box; }
.card-info h4 { margin: 0 0 10px 0; font-size: 0.85rem; font-weight: 600; opacity: 0.9; letter-spacing: 0.5px;}
.card-info h2 { margin: 0; font-size: 2.8rem; font-weight: 700; line-height: 1;}
.card-info small { font-size: 1.2rem; opacity: 0.8; margin-left: 2px;}
.card-icon { opacity: 0.2; transform: scale(1.4); }

.bg-purple { background: linear-gradient(135deg, #a855f7, #8b5cf6); }
.bg-green { background: linear-gradient(135deg, #10b981, #059669); }
.bg-orange { background: linear-gradient(135deg, #f59e0b, #d97706); }
.bg-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }

.panel { background: #fff; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); display: flex; flex-direction: column; border: 1px solid #f1f5f9; overflow: hidden;}
.panel-header { padding: 20px 28px; border-bottom: 1px solid #f1f5f9; background: #ffffff;}
.panel-header h3 { margin: 0; font-size: 1.15rem; color: #1e293b; font-weight: 600; }
.chart-large { flex: 5; height: 420px; }
.chart-small { flex: 3; height: 420px; }
.chart-box { padding: 24px; height: 330px; position: relative; }
.doughnut-box { display: flex; justify-content: center; align-items: center; }

.bottom-row { display: flex; align-items: stretch; gap: 24px; }
.list-panel { flex: 5; display: flex; flex-direction: column; }
.right-column-group { flex: 3; display: flex; flex-direction: column; gap: 24px; }

.table-container { padding: 0 28px 28px 28px; flex: 1; min-height: 300px; overflow-y: auto;}
.list-item { display: flex; align-items: flex-start; gap: 16px; padding: 20px 0; border-bottom: 1px solid #f1f5f9; }
.list-item:last-child { border-bottom: none; }
.item-icon { width: 12px; height: 12px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
.item-icon.positive { background: #10b981; }
.item-icon.negative { background: #ef4444; }
.item-icon.neutral { background: #94a3b8; }
.item-text { font-size: 1.05rem; color: #334155; line-height: 1.6; }

.original-input { background: #f8fafc; padding: 20px 24px; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; margin: 20px 0; border-bottom: none; }

.wordcloud-panel { flex: 1; min-height: 280px; }
.cloud-box { height: 100%; width: 100%; padding: 20px;}
.ai-panel { flex: none; min-height: 180px; }
.ai-header { display: flex; justify-content: space-between; align-items: center; }
.ai-content { padding: 28px; font-size: 1.05rem; color: #334155; line-height: 1.6;}
.ai-empty { text-align: center; color: #94a3b8; font-style: italic; padding: 15px 0; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); display: flex; justify-content: center; align-items: center; z-index: 9999; backdrop-filter: blur(4px); }
.modal-content { background: #fff; padding: 32px 40px; border-radius: 12px; width: 440px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); font-family: 'Inter', sans-serif;}
.text-center { text-align: center; }

.modal-header-clean h3 { margin: 0 0 15px 0; font-size: 1.3rem; color: #1e293b; font-weight: 700; }
.modal-body-clean p { color: #475569; font-size: 0.95rem; margin-bottom: 20px; line-height: 1.5; }

.modal-input { width: 100%; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; color: #1e293b; box-sizing: border-box;}
.modal-input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
.select-style { background-color: #fff; cursor: pointer;}

.modal-actions-clean { display: flex; justify-content: flex-end; gap: 12px; margin-top: 30px; }
.justify-center { justify-content: center; }
.mt-4 { margin-top: 24px; }

.btn-clean-cancel { background: #f8fafc; color: #475569; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-clean-cancel:hover { background: #e2e8f0; }

.btn-clean-submit { padding: 10px 20px; border-radius: 8px; border: none; color: white; font-weight: 600; cursor: pointer; transition: opacity 0.2s, transform 0.2s; }
.btn-clean-submit:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.9; }
.btn-clean-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-clean-submit.blue { background-color: #7b9fed; }
.btn-clean-submit.green { background-color: #34d399; }

.success-icon-wrap { margin-bottom: 20px; }
.success-title { font-size: 1.4rem; color: #1e293b; font-weight: 700; margin: 0 0 10px 0;}
.success-desc { color: #64748b; font-size: 0.95rem; line-height: 1.5; margin: 0 0 20px 0;}

.step-transition { animation: slideIn 0.3s ease-out forwards; }
@keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.spinner-box { display: flex; justify-content: center; }
.spinner { width: 50px; height: 50px; border: 4px solid #f1f5f9; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.pulsing-text { color: #3b82f6; font-size: 1.2rem; margin: 0; font-weight: 600; animation: pulse 2s infinite; }
@keyframes pulse { 0% { opacity: 0.7; } 50% { opacity: 1; } 100% { opacity: 0.7; } }
.loading-subtext { color: #64748b; font-size: 0.95rem; margin-top: 15px; }

@media (max-width: 1400px) {
  .chart-large { flex: 1; }
  .chart-small { flex: 1; }
  .list-panel { flex: 1; }
  .right-column-group { flex: 1; }
}

@media (max-width: 1024px) {
  .metric-cards { grid-template-columns: repeat(2, 1fr); }
  .charts-row, .bottom-row { flex-direction: column; }
  .chart-large, .chart-small, .list-panel, .right-column-group { width: 100%; height: auto;}
  .wordcloud-panel { min-height: 280px; }
}
@media (max-width: 640px) {
  .inner-content-wrapper { padding: 20px; }
  .metric-cards { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
  .header-actions { flex-direction: column; width: 100%; }
  .header-actions button { width: 100%; }
  .modal-content { width: 90%; padding: 24px; }
}
</style>
