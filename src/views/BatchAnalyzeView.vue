<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Papa from 'papaparse'

import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'
import VueWordCloud from 'vuewordcloud'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

const router = useRouter()

const isDragging = ref(false)
const selectedFile = ref(null)
const csvData = ref([])
const tableHeaders = ref([])

const isAnalyzing = ref(false)
const progress = ref(0)
const batchResults = ref(null)

const filterType = ref('all')
const currentPage = ref(1)
const itemsPerPage = 6

const isSummarizing = ref(false)
const aiSummaryData = ref(null)

const showSaveModal = ref(false)
const modalStep = ref(1)
const reportName = ref('')
const isSaving = ref(false)
const availablePlans = ref([])
const selectedPlanId = ref('')
const isAddingToPlan = ref(false)

const handleDragOver = (e) => { e.preventDefault(); isDragging.value = true }
const handleDragLeave = (e) => { e.preventDefault(); isDragging.value = false }
const handleDrop = (e) => {
  e.preventDefault(); isDragging.value = false
  if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0])
}
const handleFileSelect = (e) => {
  if (e.target.files.length > 0) processFile(e.target.files[0])
}

const processFile = (file) => {
  if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
    alert('Please upload a valid CSV file.')
    return
  }
  selectedFile.value = file
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (results.data.length > 0) tableHeaders.value = Object.keys(results.data[0])
      csvData.value = results.data
    }
  })
}

const clearFile = () => {
  selectedFile.value = null
  csvData.value = []
  tableHeaders.value = []
  batchResults.value = null
  filterType.value = 'all'
  currentPage.value = 1
  aiSummaryData.value = null
  progress.value = 0
}

const newBatch = () => clearFile()

const startBatchAnalysis = async () => {
  if (csvData.value.length === 0) return

  let targetColumn = tableHeaders.value.find(h =>
    h.toLowerCase().includes('text') || h.toLowerCase().includes('review')
  ) || tableHeaders.value[0]

  const textsArray = csvData.value
    .map(row => row[targetColumn])
    .filter(text => text && text.trim().length > 0)

  if (textsArray.length === 0) {
    alert('No valid text found.')
    return
  }

  isAnalyzing.value = true
  progress.value = 0

  const chunkSize = 100
  const totalItems = textsArray.length
  let tempResults = []

  try {
    for (let i = 0; i < totalItems; i += chunkSize) {
      const chunk = textsArray.slice(i, i + chunkSize)

      const response = await fetch('http://localhost:3000/api/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: chunk })
      })

      if (!response.ok) throw new Error(`Server Error: ${response.status}`)
      const data = await response.json()

      if (data.status === 'error' && !data.results) {
        throw new Error(data.message || 'Server returned an error.')
      }

      let parsedArray = null
      if (data.results && Array.isArray(data.results)) {
        parsedArray = data.results
      } else if (data.results && data.results.results && Array.isArray(data.results.results)) {
        parsedArray = data.results.results
      } else if (data.results && data.results.data && Array.isArray(data.results.data)) {
        parsedArray = data.results.data
      } else if (Array.isArray(data)) {
        parsedArray = data
      } else if (data.data && Array.isArray(data.data)) {
        parsedArray = data.data
      }

      if (parsedArray) {
        tempResults.push(...parsedArray)
      } else {
        throw new Error('Data format mismatch.')
      }

      progress.value = Math.round(Math.min(((i + chunk.length) / totalItems) * 100, 100))
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    batchResults.value = tempResults
  } catch (error) {
    alert('Analysis failed: ' + error.message)
    batchResults.value = null
  } finally {
    isAnalyzing.value = false
    progress.value = 0
  }
}

const openSaveModal = () => {
  showSaveModal.value = true
  modalStep.value = 1
  reportName.value = ''
}

const saveToDatabase = async () => {
  if (!reportName.value.trim()) {
    alert("Please enter a report name.");
    return;
  }

  const storedUser = localStorage.getItem('user')
  const userId = storedUser ? JSON.parse(storedUser)._id : null

  if (!userId) {
    alert("Please login first to save the report.");
    return;
  }

  isSaving.value = true;
  try {
    const response = await fetch('http://localhost:3000/api/history/save-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        reportName: reportName.value,
        sourceName: selectedFile.value ? selectedFile.value.name : 'History Data',
        analyzedData: batchResults.value
      })
    })

    const data = await response.json()
    if (data.success) {
      modalStep.value = 2;
    } else {
      throw new Error(data.message)
    }
  } catch (error) {
    alert('Save failed: ' + error.message)
  } finally {
    isSaving.value = false;
  }
}

const loadPlansForStep3 = async () => {
  const storedUser = localStorage.getItem('user')
  const userId = storedUser ? JSON.parse(storedUser)._id : null

  if (!userId) return;

  try {
    const res = await fetch(`http://localhost:3000/api/growth-plans?userId=${userId}`)
    if (res.ok) {
      availablePlans.value = await res.json()
      if (availablePlans.value.length > 0) {
        modalStep.value = 3
      } else {
        alert("You have no active Growth Plans. Please create one in the Growth Plan Dashboard first.")
        showSaveModal.value = false
      }
    }
  } catch (e) {
    alert("Failed to load plans: " + e.message)
    showSaveModal.value = false
  }
}

const confirmAddToPlan = async () => {
  if (!selectedPlanId.value) return

  isAddingToPlan.value = true

  try {
    const res = await fetch(`http://localhost:3000/api/growth-plans/${selectedPlanId.value}/data-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceType: 'batch',
        sourceName: reportName.value || (selectedFile.value ? selectedFile.value.name : 'Batch Analysis'),
        posPct: stats.value.posPct,
        neuPct: stats.value.neuPct || (100 - stats.value.posPct - stats.value.negPct),
        negPct: stats.value.negPct,
        analyzedCount: stats.value.total,
        originalData: batchResults.value
      })
    })

    if (res.ok) {
      alert("Successfully saved and added to your Growth Plan!")
      showSaveModal.value = false
      selectedPlanId.value = ''
    } else {
      const data = await res.json()
      throw new Error(data.message || 'Failed to add to plan')
    }
  } catch (e) {
    alert("Operation failed: " + e.message)
  } finally {
    isAddingToPlan.value = false
  }
}

const stats = computed(() => {
  if (!batchResults.value || !Array.isArray(batchResults.value) || batchResults.value.length === 0) {
    return { total: 0, posCount: 0, negCount: 0, neuCount: 0, posPct: 0, negPct: 0, neuPct: 0 }
  }
  const total = batchResults.value.length
  const posCount = batchResults.value.filter(r => r.overview && r.overview.type === 'positive').length
  const negCount = batchResults.value.filter(r => r.overview && r.overview.type === 'negative').length
  const neuCount = total - posCount - negCount
  return {
    total, posCount, negCount, neuCount,
    posPct: Math.round((posCount/total)*100) || 0,
    negPct: Math.round((negCount/total)*100) || 0,
    neuPct: Math.round((neuCount/total)*100) || 0
  }
})

const filteredResults = computed(() => {
  if (!batchResults.value || !Array.isArray(batchResults.value)) return []
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
const doughnutChartOptions = {
  responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } }
}

const barChartData = computed(() => {
  if (!batchResults.value || !Array.isArray(batchResults.value)) {
    return { labels: [], datasets: [] }
  }
  return {
    labels: ['Str. Negative', 'Negative', 'Neutral', 'Positive', 'Str. Positive'],
    datasets: [{
      backgroundColor: ['#c0392b', '#e74c3c', '#bdc3c7', '#2ecc71', '#27ae60'],
      data: [
        batchResults.value.filter(r => r.overview && r.overview.type === 'negative' && r.overview.negPct > 80).length,
        batchResults.value.filter(r => r.overview && r.overview.type === 'negative' && r.overview.negPct <= 80).length,
        batchResults.value.filter(r => r.overview && r.overview.type === 'neutral').length,
        batchResults.value.filter(r => r.overview && r.overview.type === 'positive' && r.overview.posPct <= 80).length,
        batchResults.value.filter(r => r.overview && r.overview.type === 'positive' && r.overview.posPct > 80).length
      ]
    }]
  }
})
const barChartOptions = {
  responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false } }, y: { border: { dash: [4, 4] } } }
}

const wordCloudData = computed(() => {
  if (!filteredResults.value || filteredResults.value.length === 0) return []
  const wordCount = {}
  const stopWords = ['the', 'is', 'in', 'and', 'to', 'it', 'a', 'of', 'this', 'for', 'with', 'on', 'i', 'my']
  filteredResults.value.forEach(item => {
    if(!item.text) return;
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

const generateSummary = async () => {
  if (!batchResults.value || batchResults.value.length === 0 || !Array.isArray(batchResults.value)) return
  isSummarizing.value = true
  aiSummaryData.value = null

  try {
    const topKeywords = wordCloudData.value.slice(0, 10).map(item => item[0]).join(', ')

    const combinedText = `Batch Report: ${stats.value.total} items.
    Overview: ${stats.value.posPct}% Positive, ${stats.value.neuPct}% Neutral, ${stats.value.negPct}% Negative.
    Keywords: ${topKeywords}`

    const response = await fetch('http://localhost:3000/api/deepseek/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: combinedText,
        overview: {
            posPct: stats.value.posPct,
            neuPct: stats.value.neuPct,
            negPct: stats.value.negPct
        },
        keywords: []
      })
    })

    const data = await response.json()
    if (response.ok && data.status === 'success') {
      aiSummaryData.value = data.summary
    } else {
      throw new Error(data.message || "Failed to generate summary")
    }
  } catch (error) {
    alert("AI Summary failed: " + error.message)
  } finally {
    isSummarizing.value = false
  }
}

onMounted(() => {
  const savedData = sessionStorage.getItem('savedBatchData')
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData)
      if (Array.isArray(parsed.results) && parsed.results.length > 0) {
        batchResults.value = parsed.results
        selectedFile.value = { name: `${parsed.reportName} (${parsed.sourceName})` }
      } else {
        batchResults.value = []
        selectedFile.value = { name: `${parsed.reportName} (No detail records saved)` }
      }
      sessionStorage.removeItem('savedBatchData')
    } catch (e) {
      console.error("Failed to load historical batch data", e)
    }
  }
})
</script>

<template>
  <div class="dashboard-wrapper">
    <div class="page-header">
      <h2>Sentiment Dashboard</h2>
      <div class="header-actions">
        <button v-if="!batchResults" class="btn-back" @click="router.push('/dashboard')">Back to Home</button>
        <button v-if="batchResults" class="btn-save" @click="openSaveModal">Save to DB</button>
        <button v-if="batchResults" class="btn-new" @click="newBatch">+ New Analysis</button>
      </div>
    </div>

    <div v-if="!batchResults" class="upload-container">
      <div v-if="!selectedFile" class="upload-zone" :class="{ 'is-dragging': isDragging }" @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop">
        <div class="upload-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>

        <h3>Drag & Drop your CSV file here</h3>
        <p class="file-hint">Supported format: .csv</p>
        <label class="btn-browse-fancy">
          Browse Files <input type="file" accept=".csv" @change="handleFileSelect" style="display: none;" />
        </label>
      </div>

      <div v-else class="preview-zone">
        <div v-if="isAnalyzing" class="loading-state">
          <div class="loading-header">
            <h3 class="pulsing-text">Analyzing data, please wait...</h3>
            <span class="progress-percentage">{{ progress }}%</span>
          </div>

          <div class="progress-bar-wrapper">
            <div class="progress-bar-fill stripes-animated" :style="{ width: progress + '%' }"></div>
          </div>
          <p class="loading-subtext">Our AI model is processing your reviews.</p>
        </div>

        <div v-else class="file-ready-state">
          <div class="file-icon-large">
            <svg viewBox="0 0 24 24" width="56" height="56" stroke="#94a3b8" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div class="file-info">
            <h3>{{ selectedFile.name }}</h3>
            <p class="badge-blue">{{ csvData.length }} rows detected</p>
          </div>

          <div class="action-buttons-fancy">
            <button class="btn-outline-red" @click="clearFile" :disabled="isAnalyzing">Cancel</button>
            <button class="btn-solid-green" @click="startBatchAnalysis" :disabled="isAnalyzing">Start Analysis</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="dashboard-grid">
      <div v-if="selectedFile && !csvData.length" class="history-banner">
        <strong>Viewing Historical Data:</strong> {{ selectedFile.name }}
      </div>

      <div class="row metric-cards">
        <div class="card bg-purple">
          <div class="card-info">
            <h4>TOTAL REVIEWS</h4>
            <h2>{{ stats.total }}</h2>
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
            <h4>POSITIVE</h4>
            <h2>{{ stats.posCount }} <small>({{ stats.posPct }}%)</small></h2>
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
            <h4>NEUTRAL</h4>
            <h2>{{ stats.neuCount }} <small>({{ stats.neuPct }}%)</small></h2>
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
            <h4>NEGATIVE</h4>
            <h2>{{ stats.negCount }} <small>({{ stats.negPct }}%)</small></h2>
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
            <Bar :data="barChartData" :options="barChartOptions"></Bar>
          </div>
        </div>
        <div class="panel chart-small">
          <div class="panel-header"><h3>Sentiment Sources</h3></div>
          <div class="chart-box doughnut-box">
            <Doughnut :data="doughnutChartData" :options="doughnutChartOptions"></Doughnut>
          </div>
        </div>
      </div>

      <div class="row bottom-row">
        <div class="panel list-panel">
          <div class="panel-header list-header">
            <h3>Recent Reviews</h3>
            <div class="filter-group">
              <button :class="{ active: filterType === 'all' }" @click="setFilter('all')">All</button>
              <button :class="{ active: filterType === 'positive' }" @click="setFilter('positive')">Pos</button>
              <button :class="{ active: filterType === 'negative' }" @click="setFilter('negative')">Neg</button>
            </div>
          </div>
          <div class="table-container">
            <div v-for="(item, index) in paginatedResults" :key="index" class="list-item">
              <div class="item-icon" :class="item.overview ? item.overview.type : 'neutral'"></div>
              <div class="item-text">{{ item.text || 'No text content' }}</div>
            </div>
            <div v-if="paginatedResults.length === 0" class="empty-state">No results found.</div>
          </div>
          <div class="pagination" v-if="totalPages > 1">
            <button :disabled="currentPage === 1" @click="prevPage">Prev</button>
            <span>Page {{ currentPage }} of {{ totalPages }}</span>
            <button :disabled="currentPage === totalPages" @click="nextPage">Next</button>
          </div>
        </div>

        <div class="right-column-group">
          <div class="panel wordcloud-panel">
            <div class="panel-header"><h3>Keywords Trend</h3></div>
            <div class="cloud-box">
              <vue-word-cloud :words="wordCloudData" :color="getWordColor" font-family="Arial" :spacing="0.5"></vue-word-cloud>
            </div>
          </div>

          <div class="panel ai-panel">
            <div class="panel-header ai-header">
              <h3>AI Summary</h3>
              <button class="btn-sm" @click="generateSummary" :disabled="isSummarizing">
                {{ isSummarizing ? 'Generating...' : 'Generate' }}
              </button>
            </div>
            <div class="ai-content" v-if="aiSummaryData">
              <p style="white-space: pre-line; margin: 0;">{{ aiSummaryData }}</p>
            </div>
            <div v-else class="ai-empty">Click generate for AI insights.</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showSaveModal" class="modal-overlay" @click.self="showSaveModal = false">
      <div class="modal-content">

        <div v-if="modalStep === 1">
          <h3>Save Analysis Report</h3>
          <p>Please enter a name for this report to save it to the database:</p>
          <input type="text" v-model="reportName" placeholder="e.g., iPhone 15 Reviews Q1" @keyup.enter="saveToDatabase" class="modal-input" />
          <div class="modal-actions">
            <button @click="showSaveModal = false" class="btn-cancel">Cancel</button>
            <button @click="saveToDatabase" class="btn-confirm" :disabled="!reportName || isSaving">
              {{ isSaving ? 'Saving...' : 'Save Report' }}
            </button>
          </div>
        </div>

        <div v-else-if="modalStep === 2" class="step-transition">
          <div class="success-icon-wrapper">
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="#10b981" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3 class="text-center">Report Saved!</h3>
          <p class="text-center">Would you like to track these insights in your Growth Plan to monitor progress over time?</p>
          <div class="modal-actions justify-center mt-4">
            <button @click="showSaveModal = false" class="btn-cancel">No, Thanks</button>
            <button @click="loadPlansForStep3" class="btn-plan-confirm">Yes, Add to Plan</button>
          </div>
        </div>

        <div v-else-if="modalStep === 3" class="step-transition">
          <h3>Select Growth Plan</h3>
          <p>Choose an active plan to append this batch analysis data:</p>
          <select v-model="selectedPlanId" class="modal-input mt-2">
            <option value="" disabled>-- Select a Plan --</option>
            <option v-for="plan in availablePlans" :key="plan._id" :value="plan._id">
              {{ plan.name }}
            </option>
          </select>
          <div class="modal-actions">
            <button @click="showSaveModal = false" class="btn-cancel">Cancel</button>
            <button @click="confirmAddToPlan" class="btn-plan-confirm" :disabled="!selectedPlanId || isAddingToPlan">
              {{ isAddingToPlan ? 'Adding...' : 'Confirm Add' }}
            </button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
.dashboard-wrapper {
  padding: 20px 40px 60px;
  background-color: #f8fafc;
  min-height: calc(100vh - 60px);
  font-family: 'Inter', 'Open Sans', sans-serif;
  color: #334155;
}

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.page-header h2 { margin: 0; font-size: 1.8rem; font-weight: 700; color: #1e293b; }
.header-actions { display: flex; gap: 10px; }
.btn-new { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;}
.btn-back { background: transparent; color: #64748b; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; cursor: pointer; }

.upload-container {
  background: #ffffff; padding: 50px 40px; border-radius: 16px; text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.03); max-width: 700px; margin: 40px auto; border: 1px solid #f1f5f9;
}

.upload-zone {
  border: 2px dashed #cbd5e1; padding: 50px 20px; border-radius: 12px; transition: all 0.3s ease;
  background-color: #f8fafc; cursor: pointer; position: relative; overflow: hidden;
}

.upload-zone.is-dragging {
  background-color: #eff6ff; border-color: #3b82f6; transform: scale(1.02);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
}

.upload-icon {
  width: 64px; height: 64px; margin: 0 auto 20px; color: #94a3b8; transition: color 0.3s;
}

.upload-zone.is-dragging .upload-icon { color: #3b82f6; animation: bounce 1s infinite alternate; }

.upload-zone h3 { color: #334155; font-size: 1.4rem; margin-bottom: 8px; font-weight: 600;}
.file-hint { color: #94a3b8; font-size: 0.95rem; margin-bottom: 25px;}

.btn-browse-fancy {
  background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; padding: 12px 30px;
  border-radius: 8px; cursor: pointer; display: inline-block; font-weight: 600;
  box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3); transition: all 0.3s ease;
}
.btn-browse-fancy:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4); }

@keyframes bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-10px); }
}

.preview-zone { padding: 20px; animation: fadeIn 0.4s ease-out; }
.file-ready-state { display: flex; flex-direction: column; align-items: center; gap: 15px; }
.file-icon-large { margin-bottom: -10px; }
.file-info h3 { color: #1e293b; font-size: 1.5rem; margin: 10px 0 5px 0;}
.badge-blue { background: #e0f2fe; color: #0284c7; padding: 6px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 600; display: inline-block; margin-bottom: 20px;}

.action-buttons-fancy { display: flex; justify-content: center; gap: 15px; width: 100%;}
.btn-outline-red {
  background: white; color: #ef4444; border: 2px solid #fecaca; padding: 12px 24px;
  border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s;
}
.btn-outline-red:hover { background: #fef2f2; border-color: #ef4444; }

.btn-solid-green {
  background: linear-gradient(135deg, #10b981, #059669); color: #fff; padding: 12px 36px; border: none;
  border-radius: 8px; font-size: 1.05rem; font-weight: 700; cursor: pointer;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); transition: all 0.3s ease;
}
.btn-solid-green:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4); }
.btn-solid-green:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none;}

.loading-state {
  background: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; animation: fadeIn 0.3s ease-out;
}

.loading-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; }
.pulsing-text { color: #3b82f6; font-size: 1.1rem; margin: 0; font-weight: 600; animation: pulse 2s infinite; }
.progress-percentage { font-size: 1.5rem; font-weight: 800; color: #10b981; }

.progress-bar-wrapper {
  width: 100%; height: 16px; background-color: #e2e8f0; border-radius: 8px; overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); position: relative;
}

.progress-bar-fill {
  height: 100%; border-radius: 8px; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: #10b981; background-image: linear-gradient(
    45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%,
    transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%,
    transparent 75%, transparent
  );
  background-size: 1rem 1rem;
}

.stripes-animated { animation: move-stripes 1s linear infinite; }
.loading-subtext { color: #64748b; font-size: 0.9rem; margin-top: 15px; }

@keyframes move-stripes {
  from { background-position: 1rem 0; }
  to { background-position: 0 0; }
}
@keyframes pulse {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.row { display: flex; gap: 20px; margin-bottom: 20px; }
.panel {
  background: #fff; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  display: flex; flex-direction: column; border: 1px solid #f1f5f9;
}
.panel-header { padding: 15px 20px; border-bottom: 1px solid #f1f5f9; }
.panel-header h3 { margin: 0; font-size: 1.05rem; color: #1e293b; font-weight: 600; }

.metric-cards { grid-template-columns: repeat(4, 1fr); display: grid; }
.card {
  border-radius: 10px; padding: 25px 20px; color: #fff; display: flex; justify-content: space-between; align-items: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}
.card-info h4 { margin: 0 0 5px 0; font-size: 0.85rem; font-weight: 600; opacity: 0.9; letter-spacing: 0.5px;}
.card-info h2 { margin: 0; font-size: 1.8rem; }
.card-info small { font-size: 0.9rem; opacity: 0.8; }
.card-icon { opacity: 0.3; display: flex; align-items: center; justify-content: center;}
.bg-purple { background: linear-gradient(45deg, #a18cd1, #9b59b6); }
.bg-green { background: linear-gradient(45deg, #10b981, #059669); }
.bg-orange { background: linear-gradient(45deg, #f59e0b, #d97706); }
.bg-blue { background: linear-gradient(45deg, #3b82f6, #2563eb); }

.chart-large { flex: 2; height: 360px; }
.chart-small { flex: 1; height: 360px; }
.chart-box { padding: 20px; height: 290px; position: relative; }
.doughnut-box { display: flex; justify-content: center; align-items: center; }

.bottom-row { display: flex; align-items: stretch; }
.list-panel { flex: 2; display: flex; flex-direction: column; }
.right-column-group { flex: 1; display: flex; flex-direction: column; gap: 20px; }
.list-header { display: flex; justify-content: space-between; align-items: center; }
.filter-group button { border: 1px solid #e2e8f0; background: #f8fafc; padding: 4px 12px; cursor: pointer; margin-left: 5px; border-radius: 6px; font-size: 0.85rem;}
.filter-group button.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.table-container { padding: 10px 20px; flex: 1; min-height: 250px;}
.list-item { display: flex; align-items: flex-start; gap: 15px; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
.list-item:last-child { border-bottom: none; }
.item-icon { width: 12px; height: 12px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
.item-icon.positive { background: #10b981; }
.item-icon.negative { background: #ef4444; }
.item-icon.neutral { background: #94a3b8; }
.item-text { font-size: 0.95rem; color: #475569; line-height: 1.5; }
.empty-state { padding: 30px; text-align: center; color: #94a3b8; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 15px; padding: 15px; border-top: 1px solid #f1f5f9; background: #f8fafc; border-bottom-left-radius: 10px; border-bottom-right-radius: 10px;}
.pagination button { border: 1px solid #e2e8f0; background: white; padding: 5px 12px; border-radius: 6px; cursor: pointer;}
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }

.wordcloud-panel { height: 230px; }
.cloud-box { height: 170px; width: 100%; padding: 10px;}
.ai-panel { flex: 1; min-height: 160px;}
.ai-header { display: flex; justify-content: space-between; align-items: center; }
.btn-sm { background: #8b5cf6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600;}
.btn-sm:disabled { opacity: 0.7; cursor: not-allowed; }
.ai-content { padding: 20px; font-size: 0.9rem; color: #334155; }
.ai-empty { padding: 40px 20px; text-align: center; color: #94a3b8; font-style: italic; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); display: flex; justify-content: center; align-items: center; z-index: 9999; backdrop-filter: blur(4px); }
.modal-content { background: #fff; padding: 30px 40px; border-radius: 12px; width: 400px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); transition: all 0.3s ease-in-out; }
.modal-input { width: 100%; padding: 12px 15px; margin-bottom: 25px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 1rem; box-sizing: border-box; transition: border-color 0.2s; }
.modal-input:focus { border-color: #3b82f6; outline: none; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; }

.btn-save { background: #f59e0b; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: background 0.2s;}
.btn-save:hover { background: #d97706; }

.btn-plan-confirm { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;}
.btn-plan-confirm:hover:not(:disabled) { background: #059669; }
.btn-plan-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel { background: #f1f5f9; color: #64748b; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;}
.btn-cancel:hover { background: #e2e8f0; }
.btn-confirm { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;}
.btn-confirm:hover:not(:disabled) { background: #2563eb; }
.btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }

.text-center { text-align: center; }
.justify-center { justify-content: center; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.success-icon-wrapper { display: flex; justify-content: center; margin-bottom: 15px; }

.step-transition { animation: slideIn 0.3s ease-out forwards; }
@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

@media (max-width: 1024px) {
  .metric-cards { grid-template-columns: repeat(2, 1fr); }
  .charts-row, .bottom-row { flex-direction: column; }
  .chart-large, .chart-small, .list-panel, .right-column-group { width: 100%; height: auto;}
}
</style>
