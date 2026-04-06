<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'
import VueWordCloud from 'vuewordcloud'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

const router = useRouter()
const currentUser = ref(null)

const reports = ref([])
const plans = ref([])

const compareMode = ref('reports')
const selectionAId = ref('')
const selectionBId = ref('')

const isGeneratingAI = ref(false)
const aiInsight = ref(null)

const fetchData = async () => {
  if (!currentUser.value) return
  try {
    const resReports = await fetch(`http://localhost:3000/api/history?userId=${currentUser.value._id}`)
    if (resReports.ok) {
      const data = await resReports.json()
      reports.value = data.filter(item => item.recordType === 'batch')
    }
    const resPlans = await fetch(`http://localhost:3000/api/growth-plans?userId=${currentUser.value._id}`)
    if (resPlans.ok) {
      plans.value = await resPlans.json()
    }
  } catch (error) {
    console.error("Fetch Data Error:", error)
  }
}

const setMode = (mode) => {
  compareMode.value = mode
  selectionAId.value = ''
  selectionBId.value = ''
  aiInsight.value = null
}

const handleSelectionChange = () => {
  aiInsight.value = null
}

const extractWordsFromItems = (analyzedDataArray) => {
  const stopWords = ['the', 'is', 'in', 'and', 'to', 'it', 'a', 'of', 'this', 'for', 'with', 'on', 'i', 'my', 'was', 'as', 'that', 'but', 'are', 'not', 'have', 'you', 'they']
  const wordCount = {}
  analyzedDataArray.forEach(item => {
    if (!item.text) return
    const words = item.text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
    words.forEach(w => {
      if (w.length > 3 && !stopWords.includes(w)) {
        wordCount[w] = (wordCount[w] || 0) + 1
      }
    })
  })
  return Object.entries(wordCount).sort((a, b) => b[1] - a[1]).slice(0, 20)
}

const getExtremeReviewsFromItems = (analyzedDataArray, type) => {
  const filtered = analyzedDataArray.filter(r => r.overview && r.overview.type === type)
  return filtered.sort((a, b) => {
    const scoreA = type === 'positive' ? (a.overview.posPct || 0) : (a.overview.negPct || 0)
    const scoreB = type === 'positive' ? (b.overview.posPct || 0) : (b.overview.negPct || 0)
    return scoreB - scoreA
  }).slice(0, 2)
}

const processData = (id) => {
  if (!id) return null

  if (compareMode.value === 'reports') {
    const report = reports.value.find(r => r._id === id)
    if (!report || !report.analyzedData) return null

    const data = report.analyzedData
    const pos = data.filter(r => r.overview && r.overview.type === 'positive').length
    const neg = data.filter(r => r.overview && r.overview.type === 'negative').length
    const neu = data.length - pos - neg
    const total = data.length

    const posPct = Math.round((pos / total) * 100) || 0
    const negPct = Math.round((neg / total) * 100) || 0
    const neuPct = 100 - posPct - negPct

    return {
      name: report.reportName || 'Unnamed Report',
      total, pos, neu, neg, posPct, neuPct, negPct,
      netScore: posPct - negPct,
      words: extractWordsFromItems(data),
      extremePos: getExtremeReviewsFromItems(data, 'positive'),
      extremeNeg: getExtremeReviewsFromItems(data, 'negative')
    }
  } else {
    const plan = plans.value.find(p => p._id === id)
    if (!plan || !plan.dataPoints || plan.dataPoints.length === 0) return null

    let total = 0, posDec = 0, negDec = 0
    let allAnalyzedData = []

    plan.dataPoints.forEach(dp => {
      const count = dp.analyzedCount || 1
      total += count
      posDec += (dp.posPct / 100) * count
      negDec += (dp.negPct / 100) * count
      if (dp.originalData && Array.isArray(dp.originalData)) {
        allAnalyzedData = allAnalyzedData.concat(dp.originalData)
      }
    })

    const posPct = Math.round((posDec / total) * 100) || 0
    const negPct = Math.round((negDec / total) * 100) || 0
    const neuPct = 100 - posPct - negPct

    return {
      name: plan.name || 'Unnamed Plan',
      total, pos: Math.round(posDec), neg: Math.round(negDec), neu: total - Math.round(posDec) - Math.round(negDec),
      posPct, neuPct, negPct,
      netScore: posPct - negPct,
      words: extractWordsFromItems(allAnalyzedData),
      extremePos: getExtremeReviewsFromItems(allAnalyzedData, 'positive'),
      extremeNeg: getExtremeReviewsFromItems(allAnalyzedData, 'negative')
    }
  }
}

const dataA = computed(() => processData(selectionAId.value))
const dataB = computed(() => processData(selectionBId.value))

const scoreDifference = computed(() => {
  if (!dataA.value || !dataB.value) return 0
  return dataB.value.netScore - dataA.value.netScore
})

const getDonutData = (dataObj) => ({
  labels: ['Positive', 'Neutral', 'Negative'],
  datasets: [{
    backgroundColor: ['#10b981', '#cbd5e1', '#ef4444'],
    data: [dataObj.pos, dataObj.neu, dataObj.neg],
    borderWidth: 0
  }]
})

const donutOptions = {
  responsive: true, maintainAspectRatio: false, cutout: '75%',
  plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15 } } }
}

const comparisonBarData = computed(() => {
  return {
    labels: ['Positive Ratio (%)', 'Negative Ratio (%)'],
    datasets: [
      {
        label: dataA.value?.name || 'Dataset A',
        backgroundColor: '#94a3b8',
        data: [dataA.value?.posPct || 0, dataA.value?.negPct || 0],
        borderRadius: 4
      },
      {
        label: dataB.value?.name || 'Dataset B',
        backgroundColor: '#3b82f6',
        data: [dataB.value?.posPct || 0, dataB.value?.negPct || 0],
        borderRadius: 4
      }
    ]
  }
})

const barOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'top' } },
  scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (value) => value + '%' } } }
}

const getWordColorA = ([, weight]) => weight > 5 ? '#64748b' : '#94a3b8'
const getWordColorB = ([, weight]) => weight > 5 ? '#3b82f6' : '#93c5fd'

const generateComparisonAI = async () => {
  if (!dataA.value || !dataB.value) return
  isGeneratingAI.value = true
  aiInsight.value = null

  try {
    const wordsA = dataA.value.words.map(w => w[0]).slice(0, 10).join(', ')
    const wordsB = dataB.value.words.map(w => w[0]).slice(0, 10).join(', ')

    const promptText = `
      [Data Comparison Analysis Request]
      As a professional business data analyst, please compare the following two sets of sentiment analysis data:
      Baseline Dataset (${dataA.value.name}): Total ${dataA.value.total}, Positive ${dataA.value.posPct}%, Negative ${dataA.value.negPct}%, Core Keywords: ${wordsA || 'None'}.
      Comparison Dataset (${dataB.value.name}): Total ${dataB.value.total}, Positive ${dataB.value.posPct}%, Negative ${dataB.value.negPct}%, Core Keywords: ${wordsB || 'None'}.

      The difference in Net Score is: ${scoreDifference.value > 0 ? '+' : ''}${scoreDifference.value} points.
      Based on the changes in the above data and keywords, please provide a professional summary and specific recommendations. Infer the reasons based on the data and keywords, and limit your response to 3 to 4 sentences.
    `

    const response = await fetch('http://localhost:3000/api/deepseek/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: promptText,
        overview: { posPct: 50, neuPct: 0, negPct: 50 },
        keywords: []
      })
    })

    if (!response.ok) throw new Error('API Request Failed')
    const data = await response.json()

    if (data.status === 'success') {
      aiInsight.value = data.summary
    } else {
      throw new Error(data.message)
    }
  } catch (error) {
    aiInsight.value = "Failed to generate AI analysis. Please try again later. (" + error.message + ")"
  } finally {
    isGeneratingAI.value = false
  }
}

onMounted(() => {
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    currentUser.value = JSON.parse(storedUser)
    fetchData()
  } else {
    router.push('/login')
  }
})
</script>

<template>
  <div class="page-wrapper">
    <div class="header-section">
      <div class="title-area">
        <h2>Advanced Sentiment Comparison</h2>
        <p>Evaluate datasets or growth plans to identify sentiment shifts and critical trend drivers.</p>
      </div>
    </div>

    <div class="controls-panel">
      <div class="mode-toggle">
        <button :class="{'active': compareMode === 'reports'}" @click="setMode('reports')">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Individual Reports
        </button>
        <button :class="{'active': compareMode === 'plans'}" @click="setMode('plans')">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          Growth Plans
        </button>
      </div>

      <div class="selector-container">
        <div class="selector-box">
          <label class="badge-a">Baseline (A)</label>
          <select v-model="selectionAId" @change="handleSelectionChange">
            <option value="">-- Select Baseline --</option>
            <template v-if="compareMode === 'reports'">
              <option v-for="r in reports" :key="r._id" :value="r._id" :disabled="r._id === selectionBId">{{ r.reportName }}</option>
            </template>
            <template v-else>
              <option v-for="p in plans" :key="p._id" :value="p._id" :disabled="p._id === selectionBId">{{ p.name }}</option>
            </template>
          </select>
        </div>

        <div class="vs-circle">VS</div>

        <div class="selector-box">
          <label class="badge-b">Comparison (B)</label>
          <select v-model="selectionBId" @change="handleSelectionChange">
            <option value="">-- Select Comparison --</option>
            <template v-if="compareMode === 'reports'">
              <option v-for="r in reports" :key="r._id" :value="r._id" :disabled="r._id === selectionAId">{{ r.reportName }}</option>
            </template>
            <template v-else>
              <option v-for="p in plans" :key="p._id" :value="p._id" :disabled="p._id === selectionAId">{{ p.name }}</option>
            </template>
          </select>
        </div>
      </div>
    </div>

    <div v-if="dataA && dataB" class="dashboard-content">

      <div class="top-overview-row">
        <div class="overview-left">
          <div class="metric-card summary-card">
            <h4>Net Sentiment Shift</h4>
            <div class="shift-display">
              <span class="score" :class="scoreDifference >= 0 ? 'text-green' : 'text-red'">
                {{ scoreDifference > 0 ? '+' : '' }}{{ scoreDifference }}
              </span>
              <span class="trend-icon" v-if="scoreDifference > 0">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="16 6 23 6 23 13"></polyline></svg>
              </span>
              <span class="trend-icon" v-else-if="scoreDifference < 0">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="16 18 23 18 23 11"></polyline></svg>
              </span>
            </div>
            <p class="shift-desc">Difference in Net Score (A vs B)</p>
          </div>

          <div class="metric-card bar-chart-card">
            <h4>Ratio Comparison</h4>
            <div class="bar-wrap">
              <Bar :data="comparisonBarData" :options="barOptions" />
            </div>
          </div>
        </div>

        <div class="overview-right">
          <div class="metric-card ai-panel">
            <div class="ai-header">
              <h4 class="ai-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12c-2.4 0-4.6-1.16-6-3.25A7.44 7.44 0 0 1 12 3c0 2.4-1.16 4.6-3.25 6A7.44 7.44 0 0 1 3 12c2.4 0 4.6 1.16 6 3.25A7.44 7.44 0 0 1 12 21c0-2.4 1.16-4.6 3.25-6A7.44 7.44 0 0 1 21 12Z"></path></svg>
                AI Executive Summary
              </h4>
              <button class="btn-ai" @click="generateComparisonAI" :disabled="isGeneratingAI">
                {{ isGeneratingAI ? 'Processing...' : 'Generate Analysis' }}
              </button>
            </div>
            <div class="ai-body">
              <p v-if="aiInsight" style="white-space: pre-line;">{{ aiInsight }}</p>
              <div v-else class="ai-placeholder">
                Run AI cross-analysis to interpret the statistical differences automatically based on data and keywords.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="split-board">
        <div class="column">
          <div class="column-header a-header">
            <h3>{{ dataA.name }}</h3>
            <span class="record-count">{{ dataA.total }} records</span>
          </div>

          <div class="kpi-row">
            <div class="kpi-box pos-box"><span class="label">Positive</span><span class="value">{{ dataA.posPct }}%</span></div>
            <div class="kpi-box neg-box"><span class="label">Negative</span><span class="value">{{ dataA.negPct }}%</span></div>
            <div class="kpi-box net-box"><span class="label">Net Score</span><span class="value">{{ dataA.netScore }}</span></div>
          </div>

          <div class="chart-section">
            <div class="donut-wrap"><Doughnut :data="getDonutData(dataA)" :options="donutOptions" /></div>
          </div>

          <div class="chart-section">
            <h4>Keywords (Dataset A)</h4>
            <div class="cloud-wrap"><vue-word-cloud :words="dataA.words" :color="getWordColorA" font-family="Inter" /></div>
          </div>

          <div class="review-section">
            <h4>Strongest Positive</h4>
            <div class="review-bubble good" v-if="dataA.extremePos.length">"{{ dataA.extremePos[0].text }}"</div>
            <div class="review-bubble empty" v-else>No highly positive reviews found.</div>
            <h4 style="margin-top: 1rem;">Most Critical Complaint</h4>
            <div class="review-bubble bad" v-if="dataA.extremeNeg.length">"{{ dataA.extremeNeg[0].text }}"</div>
            <div class="review-bubble empty" v-else>No highly negative reviews found.</div>
          </div>
        </div>

        <div class="column">
          <div class="column-header b-header">
            <h3>{{ dataB.name }}</h3>
            <span class="record-count">{{ dataB.total }} records</span>
          </div>

          <div class="kpi-row">
            <div class="kpi-box pos-box"><span class="label">Positive</span><span class="value">{{ dataB.posPct }}%</span></div>
            <div class="kpi-box neg-box"><span class="label">Negative</span><span class="value">{{ dataB.negPct }}%</span></div>
            <div class="kpi-box net-box"><span class="label">Net Score</span><span class="value">{{ dataB.netScore }}</span></div>
          </div>

          <div class="chart-section">
            <div class="donut-wrap"><Doughnut :data="getDonutData(dataB)" :options="donutOptions" /></div>
          </div>

          <div class="chart-section">
            <h4>Keywords (Dataset B)</h4>
            <div class="cloud-wrap"><vue-word-cloud :words="dataB.words" :color="getWordColorB" font-family="Inter" /></div>
          </div>

          <div class="review-section">
            <h4>Strongest Positive</h4>
            <div class="review-bubble good" v-if="dataB.extremePos.length">"{{ dataB.extremePos[0].text }}"</div>
            <div class="review-bubble empty" v-else>No highly positive reviews found.</div>
            <h4 style="margin-top: 1rem;">Most Critical Complaint</h4>
            <div class="review-bubble bad" v-if="dataB.extremeNeg.length">"{{ dataB.extremeNeg[0].text }}"</div>
            <div class="review-bubble empty" v-else>No highly negative reviews found.</div>
          </div>
        </div>
      </div>

    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#cbd5e1" stroke-width="1.5"><path d="M12 20V4M5 12h14"></path></svg>
      </div>
      <h3>Select Datasets to Compare</h3>
      <p>Choose two items from the dropdowns above to activate the comparison dashboard.</p>
    </div>
  </div>
</template>

<style scoped>
.page-wrapper {
  padding: 2rem 3rem;
  background: #f1f5f9;
  min-height: calc(100vh - 64px);
  color: #1e293b;
  font-family: 'Inter', -apple-system, sans-serif;
}

.header-section { margin-bottom: 2rem; }
.title-area h2 { margin: 0 0 0.5rem 0; font-size: 1.8rem; color: #0f172a; font-weight: 700; }
.title-area p { margin: 0; color: #64748b; font-size: 1rem; }

.controls-panel {
  background: white;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);
  margin-bottom: 2rem;
  border: 1px solid #e2e8f0;
}

.mode-toggle {
  display: flex;
  gap: 10px;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.mode-toggle button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-toggle button.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.selector-container {
  display: flex;
  align-items: center;
  gap: 2rem;
  position: relative;
}

.selector-box { flex: 1; display: flex; flex-direction: column; gap: 0.8rem; }
.badge-a { font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.badge-b { font-size: 0.8rem; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; }

.selector-box select {
  width: 100%; padding: 0.8rem 1rem; border-radius: 8px; border: 2px solid #e2e8f0;
  background: #f8fafc; font-size: 1rem; color: #1e293b; cursor: pointer; outline: none; transition: 0.2s; font-weight: 500;
}
.selector-box select:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }
.selector-box select:disabled { opacity: 0.5; cursor: not-allowed; }

.vs-circle {
  background: #0f172a; color: white; width: 44px; height: 44px; border-radius: 50%;
  display: flex; justify-content: center; align-items: center; font-weight: 900;
  font-size: 1rem; flex-shrink: 0; box-shadow: 0 0 0 6px #fff; z-index: 2; margin-top: 1.5rem;
}

.top-overview-row { display: flex; gap: 1.5rem; margin-bottom: 1.5rem; }
.overview-left { flex: 1; display: flex; flex-direction: column; gap: 1.5rem; }
.overview-right { flex: 1.5; display: flex; flex-direction: column; }

.metric-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); height: 100%; box-sizing: border-box; }

.summary-card { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
.summary-card h4, .bar-chart-card h4 { margin: 0 0 1rem 0; color: #64748b; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.05em; text-align: center;}
.shift-display { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.score { font-size: 3.5rem; font-weight: 800; line-height: 1; }
.text-green { color: #10b981; }
.text-red { color: #ef4444; }
.trend-icon { display: flex; align-items: center; justify-content: center; margin-left: 4px; }
.shift-desc { margin: 0; color: #94a3b8; font-size: 0.9rem; }

.bar-wrap { height: 180px; position: relative; }

.ai-panel { background: linear-gradient(145deg, #1e293b, #0f172a); color: white; border: none; display: flex; flex-direction: column;}
.ai-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.8rem; }
.ai-title { margin: 0; font-size: 1.1rem; color: #f8fafc; display: flex; align-items: center; gap: 8px; }
.btn-ai { background: #3b82f6; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 0.85rem; }
.btn-ai:hover:not(:disabled) { background: #2563eb; }
.btn-ai:disabled { opacity: 0.7; cursor: wait; }
.ai-body { flex: 1; display: flex; flex-direction: column; justify-content: center;}
.ai-body p { margin: 0; line-height: 1.8; color: #e2e8f0; font-size: 1.05rem; }
.ai-placeholder { color: #64748b; font-style: italic; text-align: center; padding: 2rem 0; font-size: 1rem; }

.split-board { display: flex; gap: 1.5rem; align-items: stretch; }
.column { flex: 1; display: flex; flex-direction: column; gap: 1.5rem; }

.column-header { padding: 1.2rem 1.5rem; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; color: white;}
.a-header { background: #64748b; }
.b-header { background: #3b82f6; }
.column-header h3 { margin: 0; font-size: 1.1rem; font-weight: 600;}
.record-count { background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }

.kpi-row { display: flex; gap: 0.8rem; }
.kpi-box { flex: 1; background: white; padding: 1rem; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);}
.kpi-box .label { display: block; font-size: 0.75rem; text-transform: uppercase; color: #64748b; margin-bottom: 4px; font-weight: 600; }
.kpi-box .value { font-size: 1.4rem; font-weight: 700; color: #1e293b; }
.pos-box .value { color: #10b981; }
.neg-box .value { color: #ef4444; }
.net-box .value { color: #3b82f6; }

.chart-section { background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.chart-section h4 { margin: 0 0 1rem 0; font-size: 0.9rem; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }

.donut-wrap { height: 200px; position: relative; }
.cloud-wrap { height: 180px; width: 100%; }

.review-section { background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; height: 100%;}
.review-section h4 { margin: 0 0 0.8rem 0; font-size: 0.85rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.review-bubble { padding: 1rem; border-radius: 8px; font-size: 0.95rem; line-height: 1.6; font-style: italic; }
.review-bubble.good { background: #f0fdf4; border-left: 4px solid #10b981; color: #065f46; }
.review-bubble.bad { background: #fef2f2; border-left: 4px solid #ef4444; color: #991b1b; }
.review-bubble.empty { background: #f8fafc; color: #94a3b8; text-align: center; font-style: normal; }

.empty-state { text-align: center; padding: 6rem 0; background: white; border-radius: 12px; border: 2px dashed #cbd5e1; margin-top: 2rem; }
.empty-icon { display: flex; justify-content: center; margin-bottom: 1rem; opacity: 0.6; }
.empty-state h3 { margin: 0 0 0.5rem 0; color: #1e293b; font-size: 1.5rem; }
.empty-state p { color: #64748b; margin: 0; }

@media (max-width: 1024px) {
  .top-overview-row { flex-direction: column; }
  .split-board { flex-direction: column; }
  .selector-container { flex-direction: column; gap: 1rem;}
  .vs-circle { margin-top: 0; }
}
</style>
