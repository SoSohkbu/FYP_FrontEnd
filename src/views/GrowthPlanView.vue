<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const router = useRouter()
const currentUser = ref(null)

const plans = ref([])
const selectedPlanId = ref('')
const showCreateModal = ref(false)
const newPlanName = ref('')
const newPlanDesc = ref('')
const isSaving = ref(false)

const fetchPlans = async () => {
  if (!currentUser.value) return
  try {
    const res = await fetch(`http://localhost:3000/api/growth-plans?userId=${currentUser.value._id}`)
    if (res.ok) {
      plans.value = await res.json()
    }
  } catch (error) {
    console.error(error)
  }
}

const currentPlan = computed(() => {
  return plans.value.find(p => p._id === selectedPlanId.value) || null
})

const kpiStats = computed(() => {
  if (!currentPlan.value || !currentPlan.value.dataPoints || currentPlan.value.dataPoints.length === 0) {
    return { totalRecords: 0, avgPos: 0, avgNeg: 0, netScore: 0 }
  }

  const points = currentPlan.value.dataPoints
  let totalRecords = 0
  let sumPos = 0
  let sumNeg = 0

  points.forEach(pt => {
    totalRecords += pt.analyzedCount || 1
    sumPos += (pt.posPct || 0)
    sumNeg += (pt.negPct || 0)
  })

  const avgPos = Math.round(sumPos / points.length)
  const avgNeg = Math.round(sumNeg / points.length)

  return {
    totalRecords,
    avgPos,
    avgNeg,
    netScore: avgPos - avgNeg
  }
})

const trendChartData = computed(() => {
  if (!currentPlan.value || !currentPlan.value.dataPoints || currentPlan.value.dataPoints.length === 0) {
    return { labels: [], datasets: [] }
  }

  const sortedPoints = [...currentPlan.value.dataPoints].sort((a, b) => new Date(a.date) - new Date(b.date))

  const labels = sortedPoints.map(pt => {
    const d = new Date(pt.date)
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
  })

  const posData = sortedPoints.map(pt => pt.posPct || 0)
  const negData = sortedPoints.map(pt => pt.negPct || 0)

  const sourceNames = sortedPoints.map(pt => pt.sourceName || pt.sourceType || 'Unknown Source')
  const recordCounts = sortedPoints.map(pt => pt.analyzedCount || 0)

  return {
    labels,
    sourceNames,
    recordCounts,
    datasets: [
      {
        label: 'Positive Sentiment (%)',
        data: posData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#10b981',
        pointRadius: 5,
        pointHoverRadius: 8,
        fill: true,
        tension: 0.4
      },
      {
        label: 'Negative Sentiment (%)',
        data: negData,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderWidth: 3,
        pointBackgroundColor: '#ef4444',
        pointRadius: 5,
        pointHoverRadius: 8,
        fill: true,
        tension: 0.4
      }
    ]
  }
})

const chartOptions = computed(() => {
  if (!trendChartData.value.datasets || trendChartData.value.datasets.length === 0) return {}

  const posData = trendChartData.value.datasets[0].data
  const negData = trendChartData.value.datasets[1].data
  const allData = [...posData, ...negData]
  const minVal = Math.max(0, Math.min(...allData) - 10)
  const maxVal = Math.min(100, Math.max(...allData) + 10)

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 15,
        titleFont: { size: 14 },
        bodyFont: { size: 14, padding: 5 },
        callbacks: {
          beforeBody: function(context) {
            const idx = context[0].dataIndex;
            const sourceName = trendChartData.value.sourceNames[idx];
            const count = trendChartData.value.recordCounts[idx];
            return `Source: ${sourceName}\nRecords: ${count}`;
          },
          label: function(context) {
            return ` ${context.dataset.label}: ${context.parsed.y}%`;
          }
        }
      }
    },
    scales: {
      y: {
        suggestedMin: minVal,
        suggestedMax: maxVal,
        grid: { color: '#f1f5f9' },
        ticks: { callback: (value) => value + '%' }
      },
      x: { grid: { display: false } }
    }
  }
})

const createPlan = async () => {
  if (!newPlanName.value.trim() || !currentUser.value) return
  isSaving.value = true

  try {
    const res = await fetch('http://localhost:3000/api/growth-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.value._id,
        name: newPlanName.value,
        description: newPlanDesc.value
      })
    })

    if (res.ok) {
      const newPlan = await res.json()
      plans.value.push(newPlan)
      selectedPlanId.value = newPlan._id
      showCreateModal.value = false
      newPlanName.value = ''
      newPlanDesc.value = ''
    }
  } catch (error) {
    console.error(error)
  } finally {
    isSaving.value = false
  }
}

const deletePlan = async () => {
  if (!currentPlan.value) return

  if (!confirm(`Are you sure you want to completely delete the plan "${currentPlan.value.name}"? All tracking data inside it will be lost.`)) {
    return
  }

  try {
    const res = await fetch(`http://localhost:3000/api/growth-plans/${currentPlan.value._id}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      plans.value = plans.value.filter(p => p._id !== currentPlan.value._id)
      selectedPlanId.value = ''
    } else {
      throw new Error('Failed to delete the plan.')
    }
  } catch (error) {
    alert("Error deleting plan: " + error.message)
  }
}

const viewDataPoint = (pt) => {
  let targetRoute = '/analyze-batch'

  if (pt.sourceType === 'single') targetRoute = '/'
  else if (pt.sourceType === 'url') targetRoute = '/url'
  else if (pt.sourceType === 'batch') targetRoute = '/analyze-batch'

  sessionStorage.setItem('savedBatchData', JSON.stringify({
    reportName: pt.sourceName || 'Historical Record',
    sourceName: pt.sourceType,
    results: pt.originalData || []
  }))

  router.push(targetRoute).catch(err => {
    console.error(err)
  })
}

const removeDataPoint = async (pointId) => {
  if (!confirm('Are you sure you want to remove this data point from the plan?')) return

  try {
    const res = await fetch(`http://localhost:3000/api/growth-plans/${currentPlan.value._id}/data-points/${pointId}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      const targetPlan = plans.value.find(p => p._id === currentPlan.value._id)
      if (targetPlan) {
        targetPlan.dataPoints = targetPlan.dataPoints.filter(pt => pt._id !== pointId)
      }
    } else {
      throw new Error('Failed to delete data point')
    }
  } catch (error) {
    alert("Error removing data point: " + error.message)
  }
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

onMounted(() => {
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    currentUser.value = JSON.parse(storedUser)
    fetchPlans()
  } else {
    router.push('/login')
  }
})
</script>

<template>
  <div class="page-wrapper">
    <div class="header-section">
      <div class="title-area">
        <h2>Growth Plan Analysis</h2>
        <p>Track sentiment trends over time by continuously adding new data to your custom plans.</p>
      </div>
      <button class="btn-primary" @click="showCreateModal = true">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Create New Plan
      </button>
    </div>

    <div class="control-panel">
      <div class="selector-wrapper">
        <label>Active Tracking Plan</label>
        <select v-model="selectedPlanId" class="plan-select">
          <option value="" disabled>-- Select a Plan to View --</option>
          <option v-for="plan in plans" :key="plan._id" :value="plan._id">
            {{ plan.name }}
          </option>
        </select>
      </div>

      <div class="plan-info" v-if="currentPlan">
        <div class="plan-details-text">
          <p class="plan-desc">{{ currentPlan.description || 'No description provided.' }}</p>
          <span class="plan-date">Created: {{ new Date(currentPlan.createdAt).toLocaleDateString() }}</span>
        </div>
        <button class="btn-delete-plan" @click="deletePlan" title="Delete Entire Plan">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          Delete Plan
        </button>
      </div>
    </div>

    <div v-if="currentPlan" class="dashboard-content">

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon blue">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Total Records Tracked</span>
            <span class="kpi-value">{{ kpiStats.totalRecords }}</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon green">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Avg. Positive Trend</span>
            <span class="kpi-value text-green">{{ kpiStats.avgPos }}%</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon red">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline></svg>
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Avg. Negative Trend</span>
            <span class="kpi-value text-red">{{ kpiStats.avgNeg }}%</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon purple">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Net Growth Score</span>
            <span class="kpi-value" :class="kpiStats.netScore >= 0 ? 'text-blue' : 'text-red'">
              {{ kpiStats.netScore > 0 ? '+' : '' }}{{ kpiStats.netScore }}
            </span>
          </div>
        </div>
      </div>

      <div class="chart-section" v-if="currentPlan.dataPoints && currentPlan.dataPoints.length > 0">
        <div class="chart-header">
          <h3>Sentiment Evolution Timeline</h3>
        </div>
        <div class="chart-container">
          <Line :data="trendChartData" :options="chartOptions"></Line>
        </div>
      </div>

      <div v-else class="empty-state-card">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        </div>
        <h4>No Data Points Yet</h4>
        <p>Run a Single, Batch, or URL analysis and save the results to this plan to start building your trend timeline.</p>
      </div>

      <div class="history-section" v-if="currentPlan.dataPoints && currentPlan.dataPoints.length > 0">
        <h3>Tracking History</h3>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Source Name / Type</th>
                <th>Analyzed Size</th>
                <th>Positive</th>
                <th>Negative</th>
                <th>Neutral</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pt in currentPlan.dataPoints.slice().reverse()" :key="pt._id">
                <td style="white-space: nowrap;">{{ formatDate(pt.date) }}</td>
                <td>
                  <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">{{ pt.sourceName || (pt.sourceType === 'batch' ? 'Batch Analysis' : 'Single Analysis') }}</div>
                  <span class="source-badge" :class="pt.sourceType">{{ pt.sourceType }}</span>
                </td>
                <td>{{ pt.analyzedCount }} records</td>
                <td class="text-green font-medium">{{ pt.posPct }}%</td>
                <td class="text-red font-medium">{{ pt.negPct }}%</td>
                <td class="text-gray">{{ pt.neuPct }}%</td>
                <td style="text-align: right;">
                  <div class="action-buttons">
                    <button class="btn-view" @click="viewDataPoint(pt)" title="View Details">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      <span>View</span>
                    </button>
                    <button class="btn-remove" @click="removeDataPoint(pt._id)" title="Remove from Plan">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <div v-else class="empty-state">
      <div class="empty-icon-large">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
      </div>
      <h3>Select or Create a Plan</h3>
      <p>Choose a plan from the dropdown above or create a new one to monitor long-term sentiment growth.</p>
    </div>

    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create Growth Plan</h3>
          <button class="btn-close" @click="showCreateModal = false">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Plan Name</label>
            <input type="text" v-model="newPlanName" placeholder="e.g., Q3 Product Launch Tracking" />
          </div>
          <div class="form-group">
            <label>Description (Optional)</label>
            <textarea v-model="newPlanDesc" rows="3" placeholder="Briefly describe what this plan tracks..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showCreateModal = false">Cancel</button>
          <button class="btn-confirm" @click="createPlan" :disabled="!newPlanName.trim() || isSaving">
            {{ isSaving ? 'Creating...' : 'Create Plan' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.page-wrapper {
  padding: 2rem 3rem;
  background: #f8fafc;
  min-height: calc(100vh - 64px);
  color: #1e293b;
  font-family: 'Inter', sans-serif;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.title-area h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
  color: #0f172a;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.title-area p {
  margin: 0;
  color: #64748b;
  font-size: 1rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
  font-size: 0.95rem;
}
.btn-primary:hover { background: #2563eb; }

.control-panel {
  background: white;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  border: 1px solid #e2e8f0;
  margin-bottom: 2rem;
  display: flex;
  gap: 3rem;
  align-items: center;
}

.selector-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 350px;
}
.selector-wrapper label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.plan-select {
  width: 100%;
  padding: 0.8rem 1rem;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  background: #f8fafc;
  font-size: 1rem;
  color: #1e293b;
  cursor: pointer;
  outline: none;
  transition: 0.2s;
  font-weight: 500;
}
.plan-select:focus {
  border-color: #3b82f6;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(59,130,246,0.1);
}

.plan-info {
  flex: 1;
  padding-left: 2rem;
  border-left: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.plan-details-text {
  display: flex;
  flex-direction: column;
}
.plan-desc {
  margin: 0 0 0.5rem 0;
  color: #334155;
  font-size: 1rem;
  line-height: 1.5;
}
.plan-date {
  font-size: 0.85rem;
  color: #94a3b8;
}

.btn-delete-plan {
  background: white;
  color: #ef4444;
  border: 1px solid #fecaca;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-delete-plan:hover {
  background: #fef2f2;
  border-color: #ef4444;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.kpi-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  display: flex;
  align-items: center;
  gap: 1.2rem;
}

.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.kpi-icon.blue { background: #eff6ff; color: #3b82f6; }
.kpi-icon.green { background: #f0fdf4; color: #10b981; }
.kpi-icon.red { background: #fef2f2; color: #ef4444; }
.kpi-icon.purple { background: #f5f3ff; color: #8b5cf6; }

.kpi-data {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.kpi-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
  letter-spacing: 0.05em;
}
.kpi-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1;
}

.text-green { color: #10b981; }
.text-red { color: #ef4444; }
.text-blue { color: #3b82f6; }
.text-gray { color: #64748b; }
.font-medium { font-weight: 600; }

.chart-section {
  background: white;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.chart-header h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.2rem;
  color: #0f172a;
}
.chart-container {
  height: 350px;
  width: 100%;
}

.history-section {
  background: white;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.history-section h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.2rem;
  color: #0f172a;
}

.table-container {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.data-table th {
  padding: 1rem;
  background: #f8fafc;
  color: #475569;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #e2e8f0;
}
.data-table td {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  color: #334155;
  font-size: 0.95rem;
  vertical-align: middle;
}
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover { background: #f8fafc; }

.source-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: #f1f5f9;
  color: #475569;
}
.source-badge.single { background: #eff6ff; color: #3b82f6; }
.source-badge.batch { background: #f5f3ff; color: #8b5cf6; }
.source-badge.url { background: #ecfdf5; color: #10b981; }

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-view {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #3b82f6;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-view:hover {
  background: #dbeafe;
  border-color: #3b82f6;
}

.btn-remove {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #ef4444;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-remove:hover {
  background: #fee2e2;
  border-color: #ef4444;
}

.empty-state {
  text-align: center;
  padding: 8rem 0;
  background: white;
  border-radius: 12px;
  border: 2px dashed #cbd5e1;
}
.empty-icon-large {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}
.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-size: 1.5rem;
}
.empty-state p { color: #64748b; margin: 0; }

.empty-state-card {
  text-align: center;
  padding: 4rem 0;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
}
.empty-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}
.empty-state-card h4 { margin: 0 0 0.5rem 0; color: #334155; font-size: 1.1rem; }
.empty-state-card p { color: #64748b; margin: 0; font-size: 0.95rem; }

.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(15, 23, 42, 0.6);
  display: flex; justify-content: center; align-items: center;
  z-index: 9999; backdrop-filter: blur(2px);
}
.modal-content {
  background: white; width: 480px; border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
  display: flex; flex-direction: column;
}
.modal-header {
  padding: 1.5rem 2rem; border-bottom: 1px solid #e2e8f0;
  display: flex; justify-content: space-between; align-items: center;
}
.modal-header h3 { margin: 0; font-size: 1.25rem; color: #0f172a; }
.btn-close {
  background: none; border: none; color: #94a3b8; cursor: pointer;
  padding: 0; display: flex; align-items: center;
}
.btn-close:hover { color: #ef4444; }

.modal-body { padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label { font-size: 0.85rem; font-weight: 600; color: #475569; }
.form-group input, .form-group textarea {
  width: 100%; padding: 0.8rem; border: 1px solid #cbd5e1; border-radius: 8px;
  font-family: inherit; font-size: 0.95rem; box-sizing: border-box; outline: none;
}
.form-group input:focus, .form-group textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.form-group textarea { resize: vertical; }

.modal-footer {
  padding: 1.5rem 2rem; border-top: 1px solid #e2e8f0; background: #f8fafc;
  display: flex; justify-content: flex-end; gap: 1rem; border-radius: 0 0 12px 12px;
}
.btn-cancel {
  background: white; border: 1px solid #cbd5e1; color: #475569;
  padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer;
}
.btn-cancel:hover { background: #f1f5f9; }
.btn-confirm {
  background: #3b82f6; border: none; color: white;
  padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer;
}
.btn-confirm:hover:not(:disabled) { background: #2563eb; }
.btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
