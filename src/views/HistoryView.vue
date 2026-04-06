<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const historyList = ref([])
const loading = ref(true)
const currentUser = ref(null)
const selectedItem = ref(null)

async function fetchHistory() {
  if (!currentUser.value) return

  try {
    const userId = currentUser.value._id
    const res = await fetch(`http://localhost:3000/api/history?userId=${userId}`)

    if (!res.ok) throw new Error('Failed to fetch history')

    historyList.value = await res.json()
  } catch (e) {
    console.error(e)
    alert("Could not load history.")
  } finally {
    loading.value = false
  }
}

async function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this record?")) return

  try {
    const res = await fetch(`http://localhost:3000/api/history/${id}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      historyList.value = historyList.value.filter(item => item._id !== id)
      if (selectedItem.value && selectedItem.value._id === id) {
        closeDetail()
      }
    } else {
      alert("Delete failed")
    }
  } catch (e) {
    console.error(e)
    alert("Error deleting item")
  }
}

function openDetail(item) {
  selectedItem.value = item
}

function closeDetail() {
  selectedItem.value = null
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown Date'
  return new Date(dateString).toLocaleString()
}

function formatScore(score) {
  if (score === undefined || score === null) return '0.0%';
  const num = Number(score);
  if (num <= 1 && num !== 0) {
    return (num * 100).toFixed(1) + '%';
  }
  return num.toFixed(1) + '%';
}

function viewFullDashboard() {
  if (selectedItem.value.recordType === 'batch') {
    sessionStorage.setItem('savedBatchData', JSON.stringify({
      reportName: selectedItem.value.reportName,
      sourceName: selectedItem.value.sourceName,
      results: selectedItem.value.analyzedData
    }))
  } else if (selectedItem.value.recordType === 'single') {
    const fakeBatchResult = [{
      text: selectedItem.value.originalText,
      overview: {
        label: selectedItem.value.overallLabel,
        type: selectedItem.value.overallLabel?.toLowerCase() || 'neutral',
        posPct: selectedItem.value.scores?.positive || 0,
        neuPct: selectedItem.value.scores?.neutral || 0,
        negPct: selectedItem.value.scores?.negative || 0
      },
      keywords: selectedItem.value.keyTerms || [],
      sentences: selectedItem.value.sentences || []
    }]

    sessionStorage.setItem('savedBatchData', JSON.stringify({
      reportName: 'Single Analysis Record',
      sourceName: 'Manual Input',
      results: fakeBatchResult
    }))
  }

  closeDetail()
  router.push('/analyze-batch')
}

onMounted(() => {
  const storedUser = localStorage.getItem('user')
  if (!storedUser) {
    alert("Please login to view history")
    router.push('/login')
    return
  }

  currentUser.value = JSON.parse(storedUser)
  fetchHistory()
})
</script>

<template>
  <div class="page-wrapper">

    <main class="container">
      <header class="header">
        <div class="header-top">
          <button class="btn-back" @click="router.push('/dashboard')">← Back to Dashboard</button>
        </div>

        <h2>Analysis History</h2>
        <p class="subtitle">Welcome back, {{ currentUser?.username }}</p>
      </header>

      <div v-if="loading" class="loading">Loading history...</div>

      <div v-else-if="historyList.length === 0" class="empty-state">
        <p>No history found.</p>
        <button class="btn-primary" @click="router.push('/dashboard')">Start your first analysis</button>
      </div>

      <div v-else class="history-grid">
        <div v-for="item in historyList" :key="item._id" class="history-card">
          <div class="card-header">
            <span class="date">{{ formatDate(item.displayDate) }}</span>
            <span class="badge" :class="item.overallLabel?.toLowerCase()">
              {{ item.recordType === 'batch' ? 'BATCH - ' : 'SINGLE - ' }}{{ item.overallLabel }}
            </span>
          </div>

          <div class="card-body">
            <p class="preview-text">
              <strong>[{{ item.recordType === 'batch' ? item.reportName : 'Single Analysis' }}]</strong><br />
              <span v-if="item.recordType === 'batch'">
                [Batch Report] {{ item.reportName }} - Analysed sentences from {{ item.sourceName }}.
              </span>
              <span v-else>
                {{ item.originalText.length > 80 ? item.originalText.substring(0, 80) + '...' : item.originalText }}
              </span>
            </p>
          </div>

          <div class="card-footer">
            <button class="btn-small btn-danger" @click.stop="deleteItem(item._id)">
              Delete
            </button>

            <button class="btn-small btn-info" @click="openDetail(item)">
              View Detail
            </button>
          </div>
        </div>
      </div>
    </main>

    <div v-if="selectedItem" class="modal-overlay" @click.self="closeDetail">
      <div class="modal-content">
        <header class="modal-header">
          <h3>{{ selectedItem.recordType === 'batch' ? 'Batch Report Overview' : 'Single Analysis Overview' }}</h3>
          <button class="close-btn" @click="closeDetail">×</button>
        </header>

        <div class="modal-body">

          <div class="detail-section">
            <h4>Report Info</h4>
            <div class="info-box">
              <p><strong>Report Name:</strong> {{ selectedItem.recordType === 'batch' ? selectedItem.reportName : 'Manual Text Analysis' }}</p>
              <p><strong>Source File:</strong> {{ selectedItem.recordType === 'batch' ? selectedItem.sourceName : 'Direct Input' }}</p>
            </div>
          </div>

          <div class="detail-row">
            <div class="detail-item">
              <h4>Result</h4>
              <span class="badge" :class="selectedItem.overallLabel?.toLowerCase()">
                {{ selectedItem.overallLabel }}
              </span>
            </div>

            <div class="detail-item">
              <h4>Date</h4>
              <span>{{ formatDate(selectedItem.displayDate) }}</span>
            </div>

            <div class="action-item">
               <button class="btn-download" @click="viewFullDashboard" style="background: #3b82f6;">
                View Full Dashboard
               </button>
            </div>
          </div>

          <div class="detail-section" v-if="selectedItem.scores">
            <h4>Overall Confidence Scores</h4>
            <div class="scores-grid">
              <div class="score-item positive">
                <span>Positive</span>
                <strong>{{ formatScore(selectedItem.scores.positive) }}</strong>
              </div>
              <div class="score-item neutral">
                <span>Neutral</span>
                <strong>{{ formatScore(selectedItem.scores.neutral) }}</strong>
              </div>
              <div class="score-item negative">
                <span>Negative</span>
                <strong>{{ formatScore(selectedItem.scores.negative) }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 100vh;
  background: #f8fafc;
  font-family: 'Inter', sans-serif;
}

.container {
  max-width: 1000px; margin: 2rem auto; padding: 0 1.5rem;
}

.header { margin-bottom: 2rem; }
.header h2 { font-size: 1.8rem; color: #1e293b; margin-bottom: 0.5rem; }
.subtitle { color: #64748b; }

.header-top { margin-bottom: 1rem; }
.btn-back {
  background: none; border: none; color: #64748b; font-weight: 600; cursor: pointer; padding: 0;
  font-size: 0.9rem;
}
.btn-back:hover { color: #4f46e5; }

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.history-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  display: flex; flex-direction: column; gap: 1rem;
  transition: transform 0.2s;
}
.history-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }

.card-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.date { font-size: 0.8rem; color: #94a3b8; }

.badge {
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  line-height: 1.2;
}

.badge.positive { background: #dcfce7; color: #166534; }
.badge.negative { background: #fee2e2; color: #991b1b; }
.badge.neutral { background: #f1f5f9; color: #475569; }

.preview-text { color: #334155; line-height: 1.5; flex: 1; font-size: 0.95rem; }

.card-footer {
  display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 1rem; gap: 8px;
}

.btn-small {
  border: none; padding: 8px 12px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; cursor: pointer; transition: background-color 0.2s;
  background: #eff6ff; color: #4f46e5;
}
.btn-small:hover { background: #e0e7ff; }

.btn-small.btn-danger { background: #fee2e2; color: #b91c1c; }
.btn-small.btn-danger:hover { background: #fecaca; }

.btn-small.btn-info { background: #f1f5f9; color: #334155; }
.btn-small.btn-info:hover { background: #e2e8f0; }

.empty-state { text-align: center; padding: 4rem; color: #64748b; }
.btn-primary {
  background: #4f46e5; color: white; border: none; padding: 10px 20px;
  border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 1rem;
}

.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex; justify-content: center; align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  width: 100%; max-width: 600px;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: slideIn 0.2s ease-out;
  display: flex; flex-direction: column;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-header {
  padding: 1.5rem; border-bottom: 1px solid #e2e8f0;
  display: flex; justify-content: space-between; align-items: center;
}
.modal-header h3 { margin: 0; color: #1e293b; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }

.modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

.detail-section h4, .detail-item h4 {
  font-size: 0.85rem; text-transform: uppercase; color: #64748b; margin: 0 0 0.5rem 0; letter-spacing: 0.05em;
}

.text-box {
  background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;
  color: #334155; line-height: 1.6; max-height: 200px; overflow-y: auto;
}

.info-box {
  background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;
  color: #334155; line-height: 1.8;
}
.info-box p { margin: 0; font-size: 1rem;}

.detail-row {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-item {
  margin-left: auto;
  margin-top: 24px;
}
.btn-download {
  background: #10b981;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
  font-size: 0.9rem;
  height: 36px;
}
.btn-download:hover { opacity: 0.9; }

.scores-grid { display: flex; gap: 1rem; }
.score-item {
  flex: 1; padding: 0.75rem; border-radius: 8px; text-align: center;
}
.score-item span { display: block; font-size: 0.75rem; margin-bottom: 4px; opacity: 0.8; }
.score-item strong { display: block; font-size: 1.1rem; }

.score-item.positive { background: #dcfce7; color: #166534; }
.score-item.neutral { background: #f1f5f9; color: #475569; }
.score-item.negative { background: #fee2e2; color: #991b1b; }
</style>
