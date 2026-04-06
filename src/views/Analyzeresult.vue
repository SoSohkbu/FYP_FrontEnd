<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'
import VueWordCloud from 'vuewordcloud'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

defineOptions({
  name: 'AnalyzeResultView'
})

const route = useRoute()
const router = useRouter()
const input = ref(route.query.q || '')
const analyzing = ref(false)
const saving = ref(false)
const currentUser = ref(null)

const overview = ref({
  label: 'Neutral',
  type: 'neutral',
  posPct: 0,
  negPct: 0,
  neuPct: 100
})
const keywords = ref([])
const sentences = ref([])

const showPlanModal = ref(false)
const availablePlans = ref([])
const selectedPlanId = ref('')
const isAddingToPlan = ref(false)
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

const barChartData = computed(() => {
  return {
    labels: ['Str. Negative', 'Negative', 'Neutral', 'Positive', 'Str. Positive'],
    datasets: [{
      label: 'Sentence Count',
      backgroundColor: ['#c0392b', '#e74c3c', '#bdc3c7', '#2ecc71', '#27ae60'],
      data: [sentenceStats.value.strNeg, sentenceStats.value.neg, sentenceStats.value.neu, sentenceStats.value.pos, sentenceStats.value.strPos],
      borderRadius: 4
    }]
  }
})

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { borderDash: [5, 5] }, ticks: { stepSize: 1 } },
    x: { grid: { display: false } }
  }
}

const donutChartData = computed(() => {
  return {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [{
      backgroundColor: ['#2ecc71', '#bdc3c7', '#e74c3c'],
      data: [overview.value?.posPct || 0, overview.value?.neuPct || 0, overview.value?.negPct || 0],
      borderWidth: 0
    }]
  }
})

const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
  }
}

const wordCloudWords = computed(() => {
  if (keywords.value && keywords.value.length > 0) {
    return keywords.value.map(k => [k.text, Math.floor(Math.random() * 5) + 3])
  }

  const fallbackWords = input.value.split(/\s+/).filter(w => w.length > 4).slice(0, 10)
  if (fallbackWords.length > 0) {
    return fallbackWords.map(w => [w.replace(/[^a-zA-Z0-9]/g, ''), Math.floor(Math.random() * 4) + 2])
  }

  return [['Text', 5], ['Analysis', 4], ['Sentiment', 3]]
})

const getWordColor = () => {
  const colors = ['#2c3e50', '#34495e', '#7f8c8d', '#95a5a6', '#4f46e5', '#10b981']
  return colors[Math.floor(Math.random() * colors.length)]
}

async function analyzeText() {
  if (!input.value.trim()) {
    alert("No text to analyze! Redirecting to input page.");
    router.push('/analyze');
    return;
  }

  analyzing.value = true;
  overview.value = { label: 'Analyzing...', type: 'neutral', posPct: 0, negPct: 0, neuPct: 100 };
  keywords.value = [];
  sentences.value = [];
  aiSummary.value = '';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input.value }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Server Error: ${response.status}`);

    const data = await response.json();

    if (data.status === 'error') throw new Error(data.message);

    const results = data.results || {};
    const apiOverview = results.overview || {};

    overview.value = {
        label: apiOverview.label || 'Neutral',
        type: (apiOverview.type || 'neutral').toLowerCase(),
        posPct: Number(apiOverview.posPct) || 0,
        negPct: Number(apiOverview.negPct) || 0,
        neuPct: Number(apiOverview.neuPct) || 100
    };

    if (results.sentences && Array.isArray(results.sentences) && results.sentences.length > 0) {
        sentences.value = results.sentences;
    } else {
        sentences.value = [{ text: input.value, type: overview.value.type }];
    }

    if (results.keywords && Array.isArray(results.keywords)) {
        keywords.value = results.keywords;
    } else {
        keywords.value = [];
    }

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') alert('Analysis Failed: Server timeout.');
    else alert(`Analysis Failed: ${error.message}`);

    overview.value = { label: 'Error', type: 'neutral', posPct: 0, negPct: 0, neuPct: 0 };
    sentences.value = [{ text: input.value, type: 'neutral' }];
  } finally {
    analyzing.value = false;
  }
}

async function generateAISummary() {
  if (!input.value.trim()) return

  isGeneratingAI.value = true
  aiSummary.value = ''

  try {
    const kwPayload = keywords.value.length > 0
      ? keywords.value
      : wordCloudWords.value.slice(0, 5).map(w => ({ text: w[0] }))

    const response = await fetch('http://localhost:3000/api/deepseek/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: input.value,
        overview: overview.value,
        keywords: kwPayload
      })
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.message || `Server Error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status === 'success') {
      aiSummary.value = data.summary
    } else {
      throw new Error(data.message || "Failed to generate summary")
    }

  } catch (error) {
    aiSummary.value = `Failed to generate AI summary: ${error.message}`
  } finally {
    isGeneratingAI.value = false
  }
}

async function saveResult() {
  if (!currentUser.value) {
    if(confirm("Please login to save results. Go to login page?")) router.push('/login')
    return
  }
  saving.value = true
  try {
    const res = await fetch('http://localhost:3000/api/history/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.value._id, inputText: input.value,
        overview: overview.value, keywords: keywords.value, sentences: sentences.value
      })
    })
    if (res.ok) alert("Result saved successfully!")
    else throw new Error('Failed to save')
  } catch (e) {
    alert("Save failed: " + e.message)
  } finally {
    saving.value = false
  }
}

async function loadPlans() {
  if (!currentUser.value) { alert("Please login first."); router.push('/login'); return }
  try {
    const res = await fetch(`http://localhost:3000/api/growth-plans?userId=${currentUser.value._id}`)
    if (res.ok) {
      availablePlans.value = await res.json()
      if (availablePlans.value.length > 0) showPlanModal.value = true
      else alert("You have no active Growth Plans.")
    }
  } catch (error) {
    alert("Failed to load plans: " + error.message)
  }
}

async function confirmAddToPlan() {
  if (!selectedPlanId.value) return
  isAddingToPlan.value = true
  let pos = 0; let neu = 0; let neg = 0;
  const currentType = overview.value?.type || 'neutral';
  if (currentType === 'positive') pos = 100;
  else if (currentType === 'negative') neg = 100;
  else neu = 100;

  try {
    const res = await fetch(`http://localhost:3000/api/growth-plans/${selectedPlanId.value}/data-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceType: 'single', posPct: pos, neuPct: neu, negPct: neg, analyzedCount: 1 })
    })
    if (res.ok) {
      alert("Successfully added to Growth Plan!")
      showPlanModal.value = false
      selectedPlanId.value = ''
    } else throw new Error('Failed to add to plan')
  } catch (e) { alert("Operation failed: " + e.message) }
  finally { isAddingToPlan.value = false }
}

onMounted(() => {
  const storedUser = localStorage.getItem('user')
  if (storedUser) currentUser.value = JSON.parse(storedUser)
  if (input.value) analyzeText()
})
</script>

<template>
  <div class="result-page-container">

    <div class="inner-content-wrapper">

      <div class="page-header">
        <h2>Single Text Analysis</h2>
        <div class="header-actions">
          <div class="btn-group">
            <button class="btn-save" @click="saveResult" :disabled="saving || analyzing">
              Save to DB
            </button>
            <button class="btn-plan-confirm" @click="loadPlans" :disabled="analyzing">
              Growth Plan
            </button>
          </div>
          <button class="btn-new" @click="router.push('/analyze')">
            + New Input
          </button>
        </div>
      </div>

      <div v-if="analyzing" class="loading-state upload-container">
        <div class="spinner-box">
          <div class="spinner"></div>
        </div>
        <h3 class="pulsing-text" style="margin-top: 20px;">Analyzing data, please wait...</h3>
        <p class="loading-subtext">Our AI model is processing your text.</p>
      </div>

      <div v-else class="dashboard-grid">

        <div class="row metric-cards">
          <div class="card bg-purple">
            <div class="card-info">
              <h4>TOTAL INPUT</h4>
              <h2>1</h2>
            </div>
            <div class="card-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
            </div>
          </div>
          <div class="card bg-green">
            <div class="card-info">
              <h4>POSITIVE SCORE</h4>
              <h2>{{ overview?.posPct || 0 }} <small>%</small></h2>
            </div>
            <div class="card-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
            </div>
          </div>
          <div class="card bg-orange">
            <div class="card-info">
              <h4>NEUTRAL SCORE</h4>
              <h2>{{ overview?.neuPct || 100 }} <small>%</small></h2>
            </div>
            <div class="card-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="8" y1="15" x2="16" y2="15"></line>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
            </div>
          </div>
          <div class="card bg-blue">
            <div class="card-info">
              <h4>NEGATIVE SCORE</h4>
              <h2>{{ overview?.negPct || 0 }} <small>%</small></h2>
            </div>
            <div class="card-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
            </div>
          </div>
        </div>

        <div class="row charts-row">
          <div class="panel chart-large">
            <div class="panel-header"><h3>Sentiment Intensity</h3></div>
            <div class="chart-box">
              <Bar :data="barChartData" :options="barOptions"></Bar>
            </div>
          </div>
          <div class="panel chart-small">
            <div class="panel-header"><h3>Sentiment Sources</h3></div>
            <div class="chart-box doughnut-box">
              <Doughnut :data="donutChartData" :options="donutOptions"></Doughnut>
            </div>
          </div>
        </div>

        <div class="row bottom-row">
          <div class="panel list-panel reviews-panel">
            <div class="panel-header list-header">
              <h3>Original Text & Breakdown</h3>
            </div>
            <div class="table-container reviews-list">
              <div class="list-item original-input">
                <div class="item-text">
                  <strong style="color: #7f8c8d; text-transform: uppercase; font-size: 0.85rem; display: block; margin-bottom: 5px;">Your Input:</strong>
                  <span style="font-style: italic;">"{{ input }}"</span>
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
              <div class="panel-header"><h3>Keywords Trend</h3></div>
              <div class="cloud-box cloud-container">
                <vue-word-cloud v-if="wordCloudWords.length" :words="wordCloudWords" :color="getWordColor" font-family="Inter" :spacing="0.5"></vue-word-cloud>
              </div>
            </div>

            <div class="panel ai-panel">
              <div class="panel-header ai-header">
                <h3>AI Summary</h3>
                <button class="btn-sm" @click="generateAISummary" :disabled="isGeneratingAI">
                  {{ isGeneratingAI ? 'Generating...' : 'Generate' }}
                </button>
              </div>
              <div class="ai-content">
                <p v-if="aiSummary" style="margin:0; white-space: pre-line;">{{ aiSummary }}</p>
                <div v-else class="ai-empty">Click generate for AI insights.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showPlanModal" class="modal-overlay" @click.self="showPlanModal = false">
        <div class="modal-content step-transition">
          <div class="modal-header-custom">
            <h3 style="margin:0; font-size: 1.2rem; color: #1e293b;">Select Growth Plan</h3>
          </div>
          <div style="padding: 20px 0;">
            <p style="margin: 0 0 15px 0; color: #64748b;">Choose an active plan to append this text data:</p>
            <select v-model="selectedPlanId" class="modal-input">
              <option value="" disabled>-- Select a Plan --</option>
              <option v-for="plan in availablePlans" :key="plan._id" :value="plan._id">{{ plan.name }}</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showPlanModal = false">Cancel</button>
            <button class="btn-plan-confirm" @click="confirmAddToPlan" :disabled="!selectedPlanId || isAddingToPlan" style="border-radius: 8px;">
              {{ isAddingToPlan ? 'Adding...' : 'Confirm Add' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.result-page-container {
  background-color: #f8fafc;
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
  max-width: 1200px;
  padding: 40px 20px 80px 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}
.page-header h2 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-group {
  display: flex;
  align-items: center;
  gap: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border-radius: 8px;
}

.btn-save, .btn-plan-confirm, .btn-new, .btn-cancel {
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.btn-save {
  background: #f59e0b;
  color: white;
  border-radius: 8px 0 0 8px;
}
.btn-save:hover:not(:disabled) {
  background: #d97706;
}
.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-plan-confirm {
  background: #10b981;
  color: white;
  border-radius: 0 8px 8px 0;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
}
.btn-plan-confirm:hover:not(:disabled) {
  background: #059669;
}
.btn-plan-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-new {
  background: #3b82f6;
  color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.btn-new:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-cancel {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}
.btn-cancel:hover {
  background: #e2e8f0;
}

.upload-container {
  background: #ffffff;
  padding: 60px 40px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.03);
  max-width: 600px;
  margin: 60px auto;
  border: 1px solid #e2e8f0;
}
.spinner-box {
  display: flex;
  justify-content: center;
}
.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f1f5f9;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.pulsing-text {
  color: #3b82f6;
  font-size: 1.2rem;
  margin: 0;
  font-weight: 600;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}
.loading-subtext {
  color: #64748b;
  font-size: 0.95rem;
  margin-top: 15px;
}

.dashboard-grid {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.row {
  display: flex;
  gap: 24px;
  width: 100%;
}

.metric-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}
.card {
  border-radius: 12px;
  padding: 24px 20px;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
}
.card-info h4 {
  margin: 0 0 8px 0;
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0.9;
  letter-spacing: 0.5px;
}
.card-info h2 {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 700;
  line-height: 1;
}
.card-info small {
  font-size: 1rem;
  opacity: 0.8;
  margin-left: 2px;
}
.card-icon {
  opacity: 0.25;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: scale(1.2);
  transform-origin: right center;
}

.bg-purple { background: linear-gradient(135deg, #a855f7, #8b5cf6); }
.bg-green { background: linear-gradient(135deg, #10b981, #059669); }
.bg-orange { background: linear-gradient(135deg, #f59e0b, #d97706); }
.bg-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }

.panel {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
.panel-header {
  padding: 18px 24px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafafa;
}
.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1e293b;
  font-weight: 600;
}
.chart-large {
  flex: 2;
  height: 380px;
}
.chart-small {
  flex: 1;
  height: 380px;
}
.chart-box {
  padding: 24px;
  height: 300px;
  position: relative;
}
.doughnut-box {
  display: flex;
  justify-content: center;
  align-items: center;
}

.bottom-row {
  display: flex;
  align-items: stretch;
  gap: 24px;
}
.list-panel {
  flex: 2;
  display: flex;
  flex-direction: column;
}
.right-column-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.table-container {
  padding: 0 24px 24px 24px;
  flex: 1;
  min-height: 250px;
  overflow-y: auto;
}
.list-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #f1f5f9;
}
.list-item:last-child {
  border-bottom: none;
}
.item-icon {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}
.item-icon.positive { background: #10b981; }
.item-icon.negative { background: #ef4444; }
.item-icon.neutral { background: #94a3b8; }
.item-text {
  font-size: 0.95rem;
  color: #334155;
  line-height: 1.6;
  width: 100%;
}

.original-input {
  background: #f8fafc;
  padding: 16px 20px;
  border-left: 4px solid #3b82f6;
  border-radius: 0 8px 8px 0;
  margin: 20px 0 10px 0;
  border-bottom: none;
}

.wordcloud-panel { height: 260px; }
.cloud-box {
  height: 200px;
  width: 100%;
  padding: 10px;
}

.ai-panel {
  flex: 1;
  min-height: 160px;
}
.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.btn-sm {
  background: #8b5cf6;
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 0.2s;
}
.btn-sm:hover:not(:disabled) {
  background: #7c3aed;
}
.btn-sm:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.ai-content {
  padding: 24px;
  font-size: 0.95rem;
  color: #334155;
  line-height: 1.6;
}
.ai-empty {
  text-align: center;
  color: #94a3b8;
  font-style: italic;
  padding: 20px 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}
.modal-content {
  background: #fff;
  padding: 32px 40px;
  border-radius: 16px;
  width: 420px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
}
.modal-header-custom {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 16px;
}
.modal-input {
  width: 100%;
  padding: 12px 16px;
  margin-bottom: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.2s;
  color: #1e293b;
}
.modal-input:focus {
  border-color: #3b82f6;
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
.step-transition {
  animation: slideIn 0.3s ease-out forwards;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 1024px) {
  .metric-cards { grid-template-columns: repeat(2, 1fr); }
  .charts-row, .bottom-row { flex-direction: column; }
  .chart-large, .chart-small, .list-panel, .right-column-group { width: 100%; height: auto;}
  .wordcloud-panel { height: 300px; }
}
@media (max-width: 640px) {
  .metric-cards { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
  .header-actions { width: 100%; flex-wrap: wrap; }
}
</style>
