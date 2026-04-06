<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const features = [
  {
    id: 'single',
    title: 'Single Text Analysis',
    description: 'Paste a single review or text snippet for instant sentiment breakdown.',
    tag: 'QUICK START',
    colorClass: 'gradient-blue',
    route: '/analyze',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="9" y1="10" x2="15" y2="10"></line></svg>`
  },
  {
    id: 'batch',
    title: 'Batch CSV Analysis',
    description: 'Upload a CSV file with multiple reviews to analyze them all at once.',
    tag: 'POWER TOOL',
    colorClass: 'gradient-purple',
    route: '/analyze-batch',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
  },
  {
    id: 'url',
    title: 'Amazon URL Analysis',
    description: 'Paste an Amazon product URL to automatically fetch and analyze its latest reviews.',
    tag: 'REAL-TIME SCRAPER',
    colorClass: 'gradient-green',
    route: '/url-analyze',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
  },
  {
    id: 'compare',
    title: 'Compare Datasets',
    description: 'Select two saved reports to analyze sentiment shifts and identify key drivers.',
    tag: 'ADVANCED ANALYTICS',
    colorClass: 'gradient-teal',
    route: '/compare',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line><path d="M8 12h.01"></path><path d="M16 12h.01"></path></svg>`
  },
  {
    id: 'reports',
    title: 'History & Reports',
    description: 'View previously saved analysis results and export them as PDF documents.',
    tag: 'MANAGEMENT',
    colorClass: 'gradient-orange',
    route: '/history',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`
  }
]

const navigateTo = (path) => {
  router.push(path)
}
</script>

<template>
  <div class="dashboard-wrapper">

    <header class="header">
      <h2 class="title">Select Your Tool</h2>
      <p class="subtitle">Choose the type of analysis you want to perform today.</p>
    </header>

    <main class="feature-grid">
      <div
        v-for="feature in features"
        :key="feature.id"
        class="feature-card"
        @click="navigateTo(feature.route)"
      >
        <div class="card-decorator" :class="feature.colorClass"></div>

        <div class="card-content">
          <div class="card-top-row">
            <span class="feature-tag" :class="feature.colorClass + '-text'">{{ feature.tag }}</span>
            <div class="icon-wrapper" :class="feature.colorClass + '-bg-light'" v-html="feature.icon"></div>
          </div>

          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>

          <div class="card-footer">
            <span class="select-btn">Open Tool &rarr;</span>
          </div>
        </div>
      </div>
    </main>

  </div>
</template>

<style scoped>
.dashboard-wrapper {
  min-height: 100vh;
  background-color: #f8fafc;
  font-family: 'Inter', sans-serif;
  padding: 3rem 2rem 5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header {
  text-align: center;
  margin-bottom: 4rem;
}

.title {
  font-size: 2.5rem;
  color: #0f172a;
  margin: 0 0 0.5rem 0;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.subtitle {
  color: #64748b;
  font-size: 1.15rem;
  margin: 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 2rem;
  width: 100%;
  max-width: 1200px;
}

.feature-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  min-height: 280px;
  position: relative;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02);
  border-color: #cbd5e1;
}

.card-decorator {
  height: 6px;
  width: 100%;
}

.card-content {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.card-top-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.feature-tag {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  background: #f8fafc;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
}

.icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.icon-wrapper svg {
  width: 20px;
  height: 20px;
  stroke: currentColor;
}

.feature-card h3 {
  font-size: 1.4rem;
  color: #0f172a;
  margin: 0 0 0.8rem 0;
  font-weight: 700;
}

.feature-card p {
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 2rem 0;
  flex-grow: 1;
}

.card-footer {
  border-top: 1px solid #f1f5f9;
  padding-top: 1.2rem;
  display: flex;
  justify-content: flex-end;
}

.select-btn {
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.feature-card:hover .select-btn {
  color: #4f46e5;
  transform: translateX(4px);
}

.gradient-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.gradient-purple { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
.gradient-orange { background: linear-gradient(135deg, #f97316, #ea580c); }
.gradient-green { background: linear-gradient(135deg, #10b981, #059669); }
.gradient-teal { background: linear-gradient(135deg, #14b8a6, #0d9488); }

.gradient-blue-text { color: #2563eb; }
.gradient-purple-text { color: #7c3aed; }
.gradient-orange-text { color: #ea580c; }
.gradient-green-text { color: #059669; }
.gradient-teal-text { color: #0d9488; }

.gradient-blue-bg-light { background: #eff6ff; color: #2563eb; }
.gradient-purple-bg-light { background: #f5f3ff; color: #7c3aed; }
.gradient-orange-bg-light { background: #fff7ed; color: #ea580c; }
.gradient-green-bg-light { background: #ecfdf5; color: #059669; }
.gradient-teal-bg-light { background: #f0fdfa; color: #0d9488; }

@media (max-width: 768px) {
  .header { margin-bottom: 2.5rem; }
  .title { font-size: 2rem; }
  .feature-grid { gap: 1.5rem; }
  .dashboard-wrapper { padding: 2rem 1rem 4rem; }
}
</style>
