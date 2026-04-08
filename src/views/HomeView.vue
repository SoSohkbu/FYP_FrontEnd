<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const input = ref('')
const analyzing = ref(false)
const router = useRouter()

function goToAnalyzeresult() {
  if (!input.value.trim()) return
  router.push({ name: 'AnalyzeInput', query: { q: input.value } })
}

const scrollToSection = (id) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

onMounted(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
      }
    })
  }, { threshold: 0.15 })

  document.querySelectorAll('.scroll-reveal').forEach((el) => {
    observer.observe(el)
  })
})
</script>

<template>
  <div class="page-wrapper">

    <main class="home">

      <section id="hero" class="hero scroll-reveal">
        <div class="hero-content">
          <h1>Smart Sentiment <br/> <span class="text-gradient">Analysis System</span></h1>
          <p class="tagline">
            Instantly decode customer feedback. Discover what your shoppers truly love — or dislike — about your products.
          </p>
          <div class="cta-row">
            <button class="btn primary" @click="router.push('/dashboard')">Start Analyzing</button>
            <button class="btn secondary" @click="scrollToSection('features')">How it works</button>
          </div>
        </div>

        <div class="hero-visual">
           <div class="abstract-shape"></div>
           <div class="abstract-shape two"></div>
        </div>
      </section>

      <section id="demo" class="demo-section scroll-reveal">
        <div class="demo-card">
          <div class="card-header">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
            <span class="header-title">Live Analysis Engine</span>
          </div>

          <div class="card-body">
            <label class="input-label">Paste a review to test:</label>
            <div class="textarea-wrapper">
              <textarea
                v-model="input"
                placeholder="e.g. I absolutely love this wireless mouse! The battery life is fantastic and it feels great in hand."
                :disabled="analyzing"
              ></textarea>
            </div>

            <div class="controls">
              <button class="btn-analyze" :disabled="!input" @click="goToAnalyzeresult">
                {{ 'Analyze Sentiment →' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" class="features scroll-reveal">
        <div class="section-header">
          <h2>Why use our analyzer?</h2>
          <p>Turn raw text into actionable business intelligence.</p>
        </div>

        <div class="feature-grid">
          <div class="feature-card" style="transition-delay: 100ms">
            <div class="icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
            </div>
            <h3>Instant Insights</h3>
            <p>Analyze customer reviews in milliseconds to extract overall sentiment without delay.</p>
          </div>

          <div class="feature-card" style="transition-delay: 200ms">
            <div class="icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            </div>
            <h3>Trend Monitoring</h3>
            <p>Visualize feedback trends over time with our integrated dashboard tools.</p>
          </div>

          <div class="feature-card" style="transition-delay: 300ms">
            <div class="icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </div>
            <h3>Easy Export</h3>
            <p>Export analysis results to PDF, CSV or JSON for your weekly reporting.</p>
          </div>
        </div>
      </section>

      <footer class="site-footer scroll-reveal">
        <p>© 2026 Sentiment AI System. All rights reserved.</p>
      </footer>

    </main>
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #fffbeb 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
}

.home {
  width: 100%;
  max-width: 1100px;
  padding: 4rem 1.5rem 4rem 1.5rem;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #1e293b;
}

.scroll-reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.5, 0, 0, 1);
}
.scroll-reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

.hero {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}
.hero-content { max-width: 500px; }

.hero-visual {
  position: relative;
  width: 400px;
  height: 400px;
}
.abstract-shape {
  position: absolute;
  top: 0; right: 0;
  width: 300px; height: 300px;
  background: linear-gradient(45deg, #fef3c7, #fff7ed);
  border-radius: 50%;
  z-index: -1;
  filter: blur(40px);
}
.abstract-shape.two {
  bottom: 0; left: 0;
  width: 200px; height: 200px;
  background: #e0e7ff;
  opacity: 0.6;
}

h1 { font-size: 3rem; line-height: 1.1; margin-bottom: 1.5rem; letter-spacing: -0.03em; color: #0f172a; }
h2 { font-size: 2rem; margin-bottom: 0.5rem; color: #0f172a; }
p { line-height: 1.7; color: #475569; font-size: 1.1rem; }

.text-gradient {
  background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.cta-row { display: flex; gap: 1rem; margin-top: 2.5rem; }
.btn {
  padding: 0.9rem 1.8rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}
.btn.primary { background: #4f46e5; color: white; border: none; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.2); }
.btn.primary:hover { transform: translateY(-2px); background: #4338ca; }
.btn.secondary { background: white; color: #475569; border: 1px solid #cbd5e1; }
.btn.secondary:hover { border-color: #94a3b8; color: #1e293b; transform: translateY(-2px); }

.demo-section {
  margin: 10rem 0;
  display: flex;
  justify-content: center;
}
.demo-card {
  width: 100%;
  max-width: 700px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border: 1px solid #f1f5f9;
}
.card-header {
  background: #f8fafc;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.red { background: #ef4444; }
.dot.yellow { background: #f59e0b; }
.dot.green { background: #10b981; }
.header-title { margin-left: auto; font-size: 0.85rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; }

.card-body { padding: 2rem; }
.input-label { display: block; font-weight: 600; margin-bottom: 0.8rem; color: #334155; }

.textarea-wrapper {
  width: 100%;
  margin-bottom: 1.5rem;
}

.textarea-wrapper textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 140px;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  font-size: 1rem;
  resize: vertical;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;
  background-color: #fcfcfc;
}
.textarea-wrapper textarea:focus { border-color: #4f46e5; background-color: #fff; }

.controls {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.btn-analyze {
  background: #0f172a; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; font-weight: 600;
  cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;
}
.btn-analyze:hover:not(:disabled) { background: #1e293b; }
.btn-analyze:disabled { opacity: 0.7; cursor: not-allowed; }

.features { margin-bottom: 8rem; }
.section-header { text-align: center; margin-bottom: 5rem; }
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2.5rem;
}
.feature-card {
  background: white;
  padding: 2.5rem;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s;
}
.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  border-color: #fcd34d;
}

.icon-box {
  width: 48px;
  height: 48px;
  background: #fff7ed;
  color: #d97706;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}
.feature-card h3 { font-size: 1.3rem; margin-bottom: 0.8rem; color: #0f172a; }

.site-footer { text-align: center; color: #94a3b8; font-size: 0.9rem; margin-top: 4rem; padding-top: 2rem; border-top: 1px solid #e2e8f0; }

@media (max-width: 850px) {
  .hero { flex-direction: column; text-align: center; justify-content: center; min-height: auto; padding-top: 4rem; }
  .cta-row { justify-content: center; }
  .hero-visual { display: none; }
}
</style>
