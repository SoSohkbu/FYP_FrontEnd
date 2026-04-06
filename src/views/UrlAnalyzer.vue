<script setup>
import { ref, computed } from 'vue'

import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'
import VueWordCloud from 'vuewordcloud'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

const inputUrl = ref('')
const isAnalyzing = ref(false)
const batchResults = ref(null)

const filterType = ref('all')
const currentPage = ref(1)
const itemsPerPage = 6

const isSummarizing = ref(false)
const aiSummaryData = ref(null)

const alertMessage = ref('')

const isValidUrl = (urlString) => {
  try {
    new URL(urlString)
    return true
  } catch {
    return false
  }
}

const startAnalysis = async () => {
  if (!inputUrl.value.trim() || !isValidUrl(inputUrl.value)) {
    alert('Please enter a valid URL (starting with http:// or https://).')
    return
  }

  isAnalyzing.value = true
  batchResults.value = null
  filterType.value = 'all'
  currentPage.value = 1
  aiSummaryData.value = null
  alertMessage.value = ''

  try {
    const response = await fetch('http://localhost:3000/api/analyze-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: inputUrl.value })
    })

    const data = await response.json()
    console.log("🔥 Raw data from server:", data);

    if (data.status === 'error' && !data.results) {
        throw new Error(data.message || 'Server returned an error.');
    }

    let finalArray = null;

    if (data.results && Array.isArray(data.results)) {
        finalArray = data.results;
    }
    else if (data.results && data.results.results && Array.isArray(data.results.results)) {
        finalArray = data.results.results;
    }
    else if (data.results && data.results.data && Array.isArray(data.results.data)) {
        finalArray = data.results.data;
    }
    else if (Array.isArray(data)) {
        finalArray = data;
    }
    else if (data.data && Array.isArray(data.data)) {
        finalArray = data.data;
    }

    if (finalArray && finalArray.length > 0) {
      if (data.status === 'error') {
        alertMessage.value = 'Scraping had issues, but partial data is displayed.'
      }
      batchResults.value = finalArray;
    } else {
      console.error("❌ Unrecognized data structure:", data);
      throw new Error('Data format mismatch or empty array. Check F12 Console.');
    }

  } catch (error) {
    alert('Analysis failed: ' + error.message)
  } finally {
    isAnalyzing.value = false
  }
}

const generateSummary = async () => {
  if (!batchResults.value || batchResults.value.length === 0) return
  isSummarizing.value = true
  try {
    const reviewsToSummarize = batchResults.value.slice(0, 30).map(r => ({ text: r.text }))
    const response = await fetch('http://localhost:3000/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviews: reviewsToSummarize })
    })
    const data = await response.json()
    if (data.success) {
      aiSummaryData.value = data.summary
    } else throw new Error(data.message)
  } catch (error) {
    alert("AI Summary failed: " + error.message)
  } finally {
    isSummarizing.value = false
  }
}

const clearUrl = () => {
  inputUrl.value = ''
  batchResults.value = null
  alertMessage.value = ''
}

const newAnalysis = () => {
  batchResults.value = null
  alertMessage.value = ''
}

const stats = computed(() => {
  if (!batchResults.value) return { total: 0, posCount: 0, negCount: 0, neuCount: 0, posPct: 0, negPct: 0 }
  const total = batchResults.value.length

  const posCount = batchResults.value.filter(r => r.overview && r.overview.type === 'positive').length
  const negCount = batchResults.value.filter(r => r.overview && r.overview.type === 'negative').length
  const neuCount = total - posCount - negCount

  return {
    total, posCount, negCount, neuCount,
    posPct: Math.round((posCount/total)*100) || 0,
    negPct: Math.round((negCount/total)*100) || 0
  }
})

const filteredResults = computed(() => {
  if (!batchResults.value) return []
  if (filterType.value === 'all') return batchResults.value
  return batchResults.value.filter(item => item.overview && item.overview.type === filterType.value)
})

const setFilter = (type) => { filterType.value = type; currentPage.value = 1 }

const totalPages = computed(() => Math.ceil(filteredResults.value.length / itemsPerPage))
const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredResults.value.slice(start, start + itemsPerPage)
})
const prevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }

const doughnutChartData = computed(() => {
  return {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [{
      backgroundColor: ['#2ecc71', '#bdc3c7', '#e74c3c'],
      data: [stats.value.posCount, stats.value.neuCount, stats.value.negCount]
    }]
  }
})
const doughnutChartOptions = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } }

const barChartData = computed(() => {
  if (!batchResults.value) return { labels: [], datasets: [] }
  return {
    labels: ['Str. Negative', 'Negative', 'Neutral', 'Positive', 'Str. Positive'],
    datasets: [{
      backgroundColor: ['#c0392b', '#e74c3c', '#bdc3c7', '#2ecc71', '#27ae60'],
      data: [
        batchResults.value.filter(r => r.overview && r.overview.type === 'negative' && (r.overview.negPct || 0) > 80).length,
        batchResults.value.filter(r => r.overview && r.overview.type === 'negative' && (r.overview.negPct || 0) <= 80).length,
        batchResults.value.filter(r => r.overview && r.overview.type === 'neutral').length,
        batchResults.value.filter(r => r.overview && r.overview.type === 'positive' && (r.overview.posPct || 0) <= 80).length,
        batchResults.value.filter(r => r.overview && r.overview.type === 'positive' && (r.overview.posPct || 0) > 80).length
      ]
    }]
  }
})
const barChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { border: { dash: [4, 4] } } } }

const wordCloudData = computed(() => {
  if (!filteredResults.value || filteredResults.value.length === 0) return []
  const wordCount = {}
  const stopWords = ['the', 'is', 'in', 'and', 'to', 'it', 'a', 'of', 'this', 'for', 'with', 'on', 'i', 'my']
  filteredResults.value.forEach(item => {
    if (!item.text) return;
    const words = item.text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
    words.forEach(word => {
      if (word.length > 2 && !stopWords.includes(word)) wordCount[word] = (wordCount[word] || 0) + 1
    })
  })
  return Object.entries(wordCount).sort((a, b) => b[1] - a[1]).slice(0, 30)
})

const getWordColor = ([, weight]) => {
  if (filterType.value === 'negative') return weight > 5 ? '#c0392b' : '#e74c3c'
  if (filterType.value === 'positive') return weight > 5 ? '#27ae60' : '#2ecc71'
  return weight > 5 ? '#2c3e50' : '#34495e'
}
</script>

<template>
  <div class="dashboard-wrapper">

    <div class="page-header">
      <h2>Webpage Article Analysis</h2>
      <div class="header-actions">
        <button v-if="batchResults" class="btn-new" @click="newAnalysis">＋ Analyze Another URL</button>
      </div>
    </div>

    <div v-if="!batchResults" class="input-container">
      <div class="input-zone">
        <div class="icon-header">🔗</div>
        <h3>Enter an Article URL</h3>
        <p class="hint">Paste the link of a news article or product review page. We will fetch the content and break it down.</p>

        <div class="url-input-group">
          <input
            type="url"
            v-model="inputUrl"
            class="url-input"
            placeholder="https://example.com/article..."
            @keyup.enter="startAnalysis"
          />
        </div>

        <div class="action-buttons">
          <button class="btn-clear" @click="clearUrl" :disabled="isAnalyzing || !inputUrl">Clear</button>
          <button class="btn-analyze" @click="startAnalysis" :disabled="isAnalyzing || !inputUrl">
            <span v-if="isAnalyzing" class="spinner"></span>
            {{ isAnalyzing ? 'Scraping & Analyzing...' : 'Analyze URL' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="dashboard-grid">

      <div v-if="alertMessage" class="alert-banner">
        ⚠️ {{ alertMessage }}
      </div>

      <div class="row metric-cards">
        <div class="card bg-purple">
          <div class="card-info">
            <h4>EXTRACTED SENTENCES</h4>
            <h2>{{ stats.total }}</h2>
          </div>
          <div class="card-icon">📝</div>
        </div>
        <div class="card bg-green">
          <div class="card-info">
            <h4>POSITIVE</h4>
            <h2>{{ stats.posCount }} <small>({{ stats.posPct }}%)</small></h2>
          </div>
          <div class="card-icon">😊</div>
        </div>
        <div class="card bg-orange">
          <div class="card-info">
            <h4>NEUTRAL</h4>
            <h2>{{ stats.neuCount }}</h2>
          </div>
          <div class="card-icon">😐</div>
        </div>
        <div class="card bg-blue">
          <div class="card-info">
            <h4>NEGATIVE</h4>
            <h2>{{ stats.negCount }} <small>({{ stats.negPct }}%)</small></h2>
          </div>
          <div class="card-icon">😡</div>
        </div>
      </div>

      <div class="row charts-row">
        <div class="panel chart-large">
          <div class="panel-header"><h3>Sentiment Intensity (By Sentence)</h3></div>
          <div class="chart-box"><Bar :data="barChartData" :options="barChartOptions" /></div>
        </div>
        <div class="panel chart-small">
          <div class="panel-header"><h3>Overall Article Tone</h3></div>
          <div class="chart-box doughnut-box"><Doughnut :data="doughnutChartData" :options="doughnutChartOptions" /></div>
        </div>
      </div>

      <div class="row bottom-row">
        <div class="panel list-panel">
          <div class="panel-header list-header">
            <h3>Article Breakdown</h3>
            <div class="filter-group">
              <button :class="{ active: filterType === 'all' }" @click="setFilter('all')">All</button>
              <button :class="{ active: filterType === 'positive' }" @click="setFilter('positive')">Pos</button>
              <button :class="{ active: filterType === 'negative' }" @click="setFilter('negative')">Neg</button>
            </div>
          </div>
          <div class="table-container">
            <div v-for="(item, index) in paginatedResults" :key="index" class="list-item">
              <div class="item-icon" :class="item.overview ? item.overview.type : 'neutral'"></div>
              <div class="item-text">{{ item.text || 'No text found' }}</div>
            </div>
            <div v-if="paginatedResults.length === 0" class="empty-state">No sentences match this filter.</div>
          </div>
          <div class="pagination" v-if="totalPages > 1">
            <button :disabled="currentPage === 1" @click="prevPage">Prev</button>
            <span>Page {{ currentPage }} of {{ totalPages }}</span>
            <button :disabled="currentPage === totalPages" @click="nextPage">Next</button>
          </div>
        </div>

        <div class="right-column-group">
          <div class="panel wordcloud-panel">
            <div class="panel-header"><h3>Article Themes</h3></div>
            <div class="cloud-box">
              <vue-word-cloud :words="wordCloudData" :color="getWordColor" font-family="Arial" :spacing="0.5" />
            </div>
          </div>

          <div class="panel ai-panel">
            <div class="panel-header ai-header">
              <h3>AI Summary</h3>
              <button class="btn-sm" @click="generateSummary" :disabled="isSummarizing">Generate</button>
            </div>
            <div class="ai-content" v-if="aiSummaryData">
              <div class="pros-cons">
                <div class="pro"><b>Main Pros:</b> {{ aiSummaryData.pros[0] }}</div>
                <div class="con"><b>Main Cons:</b> {{ aiSummaryData.cons[0] }}</div>
              </div>
            </div>
            <div v-else class="ai-empty">Click generate to let AI summarize this article.</div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.dashboard-wrapper { padding: 20px 40px 60px; background-color: #f4f6f9; min-height: 100%; color: #333; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.page-header h2 { margin: 0; font-size: 1.8rem; font-weight: 700; color: #2c3e50; }
.btn-new { background: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600;}

.alert-banner { background-color: #fff3cd; color: #856404; padding: 12px 20px; border-radius: 6px; margin-bottom: 20px; font-weight: 600; border: 1px solid #ffeeba; }

.input-container { max-width: 700px; margin: 60px auto 0; }
.input-zone { background: #fff; padding: 50px 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #ebeef5; text-align: center; }
.icon-header { font-size: 3rem; margin-bottom: 15px; }
.input-zone h3 { margin: 0 0 10px 0; color: #2c3e50; font-size: 1.6rem; font-weight: 700;}
.hint { color: #7f8c8d; font-size: 0.95rem; margin-bottom: 30px; }
.url-input-group { margin-bottom: 30px; }
.url-input { width: 100%; padding: 16px 20px; border: 2px solid #e2e8f0; border-radius: 50px; font-size: 1.05rem; color: #333; outline: none; transition: all 0.3s; box-sizing: border-box; text-align: center;}
.url-input:focus { border-color: #3498db; box-shadow: 0 0 0 4px rgba(52, 152, 219, 0.1); }
.action-buttons { display: flex; justify-content: center; gap: 15px; }
.btn-clear { background: transparent; color: #e74c3c; border: 1px solid #e74c3c; padding: 12px 24px; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all 0.2s;}
.btn-clear:hover:not(:disabled) { background: #fdf0ed; }
.btn-analyze { background: #3498db; color: #fff; border: none; padding: 12px 36px; border-radius: 50px; font-size: 1.05rem; font-weight: bold; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px;}
.btn-analyze:hover:not(:disabled) { background: #2980b9; box-shadow: 0 4px 10px rgba(52, 152, 219, 0.3); }
.btn-analyze:disabled, .btn-clear:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner { width: 16px; height: 16px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.row { display: flex; gap: 20px; margin-bottom: 20px; }
.panel { background: #fff; border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); display: flex; flex-direction: column; border: 1px solid #ebeef5; }
.panel-header { padding: 15px 20px; border-bottom: 1px solid #ebeef5; }
.panel-header h3 { margin: 0; font-size: 1.05rem; color: #34495e; font-weight: 600; }
.metric-cards { grid-template-columns: repeat(4, 1fr); display: grid; }
.card { border-radius: 6px; padding: 25px 20px; color: #fff; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.card-info h4 { margin: 0 0 5px 0; font-size: 0.85rem; font-weight: 600; opacity: 0.9; letter-spacing: 0.5px;}
.card-info h2 { margin: 0; font-size: 1.8rem; }
.card-info small { font-size: 0.9rem; opacity: 0.8; }
.card-icon { font-size: 2.5rem; opacity: 0.3; }
.bg-purple { background: linear-gradient(45deg, #a18cd1, #9b59b6); }
.bg-green { background: linear-gradient(45deg, #2ecc71, #27ae60); }
.bg-orange { background: linear-gradient(45deg, #f39c12, #e67e22); }
.bg-blue { background: linear-gradient(45deg, #3498db, #2980b9); }
.chart-large { flex: 2; height: 360px; }
.chart-small { flex: 1; height: 360px; }
.chart-box { padding: 20px; height: 290px; position: relative; }
.doughnut-box { display: flex; justify-content: center; align-items: center; }
.bottom-row { display: flex; align-items: stretch; }
.list-panel { flex: 2; display: flex; flex-direction: column; }
.right-column-group { flex: 1; display: flex; flex-direction: column; gap: 20px; }
.list-header { display: flex; justify-content: space-between; align-items: center; }
.filter-group button { border: 1px solid #ddd; background: #f9f9f9; padding: 4px 12px; cursor: pointer; margin-left: 5px; border-radius: 4px; font-size: 0.85rem;}
.filter-group button.active { background: #3498db; color: #fff; border-color: #3498db; }
.table-container { padding: 10px 20px; flex: 1; min-height: 250px;}
.list-item { display: flex; align-items: flex-start; gap: 15px; padding: 12px 0; border-bottom: 1px solid #f1f2f7; }
.list-item:last-child { border-bottom: none; }
.item-icon { width: 12px; height: 12px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
.item-icon.positive { background: #2ecc71; }
.item-icon.negative { background: #e74c3c; }
.item-icon.neutral { background: #bdc3c7; }
.item-text { font-size: 0.95rem; color: #555; line-height: 1.5; }
.empty-state { padding: 30px; text-align: center; color: #95a5a6; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 15px; padding: 15px; border-top: 1px solid #ebeef5; background: #fafbfc;}
.pagination button { border: 1px solid #ddd; background: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;}
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
.wordcloud-panel { height: 230px; }
.cloud-box { height: 170px; width: 100%; padding: 10px;}
.ai-panel { flex: 1; min-height: 160px;}
.ai-header { display: flex; justify-content: space-between; align-items: center; }
.btn-sm { background: #9b59b6; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;}
.ai-content { padding: 20px; font-size: 0.9rem; color: #444; }
.pro { color: #27ae60; margin-bottom: 10px; line-height: 1.5;}
.con { color: #c0392b; line-height: 1.5;}
.ai-empty { padding: 40px 20px; text-align: center; color: #95a5a6; font-style: italic; }

@media (max-width: 1024px) {
  .metric-cards { grid-template-columns: repeat(2, 1fr); }
  .charts-row, .bottom-row { flex-direction: column; }
  .chart-large, .chart-small, .list-panel, .right-column-group { width: 100%; height: auto;}
}
</style>
