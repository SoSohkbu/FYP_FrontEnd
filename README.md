# lab-spa

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant HistoryView
    participant SingleTextAnalysis
    participant BatchAnalyzeView
    participant UrlAnalyzer
    participant SessionStorage
    participant Backend

    %% ─── Flow 1: View Analysis History ───
    Note over User,Backend: Flow 1 – Browse & Replay History Records

    User->>HistoryView: Open /history
    HistoryView->>Backend: GET /api/history?userId=...
    Backend-->>HistoryView: Return history list (single / batch / url-analyzer)
    HistoryView-->>User: Display history cards with type badge

    User->>HistoryView: Click "View Detail" on a card
    HistoryView-->>User: Open detail modal (Report Info, Scores, Date)

    User->>HistoryView: Click "View Full Dashboard"

    alt recordType === 'single'
        HistoryView->>SessionStorage: setItem('savedSingleData', { originalText, overallLabel, scores, keyTerms, sentences })
        HistoryView->>SingleTextAnalysis: router.push('/analyze')
        SingleTextAnalysis->>SessionStorage: getItem('savedSingleData')
        SessionStorage-->>SingleTextAnalysis: Return saved data
        SingleTextAnalysis->>SessionStorage: removeItem('savedSingleData')
        SingleTextAnalysis-->>User: Render result in History Mode (history hero banner + "← Back to History")
    else recordType === 'batch'
        HistoryView->>SessionStorage: setItem('savedBatchData', { reportName, sourceName, results })
        HistoryView->>BatchAnalyzeView: router.push('/analyze-batch')
        BatchAnalyzeView->>SessionStorage: getItem('savedBatchData')
        SessionStorage-->>BatchAnalyzeView: Return saved data
        BatchAnalyzeView->>SessionStorage: removeItem('savedBatchData')
        BatchAnalyzeView-->>User: Render result in History Mode (history hero banner + "← Back to History")
    else recordType === 'url-analyzer'
        HistoryView->>SessionStorage: setItem('savedUrlData', { reportName, sourceName, results })
        HistoryView->>UrlAnalyzer: router.push('/url-analyze')
        UrlAnalyzer->>SessionStorage: getItem('savedUrlData')
        SessionStorage-->>UrlAnalyzer: Return saved data
        UrlAnalyzer->>SessionStorage: removeItem('savedUrlData')
        UrlAnalyzer-->>User: Render result in History Mode (history hero banner + "← Back to History")
    end

    User->>User: Click "← Back to History"
    User->>HistoryView: router.push('/history')

    %% ─── Flow 2: URL Analyzer – New Analysis & Save ───
    Note over User,Backend: Flow 2 – URL Analyzer: Scrape, Analyse, Save & Track

    User->>UrlAnalyzer: Enter URL and click Analyze
    UrlAnalyzer->>Backend: POST /api/analyze-url  { url }
    Backend-->>UrlAnalyzer: Return { results: [...] }
    UrlAnalyzer-->>User: Display sentiment results & charts

    opt Generate AI Summary
        User->>UrlAnalyzer: Click "AI Summary"
        UrlAnalyzer->>Backend: POST /api/summarize  { reviews }
        Backend-->>UrlAnalyzer: Return { success, summary }
        UrlAnalyzer-->>User: Show AI summary panel
    end

    User->>UrlAnalyzer: Click "Save to DB"
    UrlAnalyzer-->>User: Modal Step 1 – Enter report name

    User->>UrlAnalyzer: Submit report name
    UrlAnalyzer->>Backend: POST /api/history/save-report  { userId, reportName, sourceName, recordType: 'url-analyzer' }
    Backend-->>UrlAnalyzer: { success: true }
    UrlAnalyzer-->>User: Modal Step 2 – "Report Saved! Add to Growth Plan?"

    alt User clicks "Yes, Add to Plan"
        UrlAnalyzer->>Backend: GET /api/growth-plans?userId=...
        Backend-->>UrlAnalyzer: Return available plans
        UrlAnalyzer-->>User: Modal Step 3 – Select Growth Plan dropdown

        User->>UrlAnalyzer: Select plan and click "Confirm Add"
        UrlAnalyzer->>Backend: POST /api/growth-plans/:planId/data-points  { sourceType, sourceName, posPct, neuPct, negPct, analyzedCount, originalData }
        Backend-->>UrlAnalyzer: 200 OK
        UrlAnalyzer-->>User: Alert "Successfully saved and added to your Growth Plan!"
    else User clicks "No, Thanks"
        UrlAnalyzer-->>User: Close modal
    end

    %% ─── Flow 3: Single Text Analysis – New Analysis & Save ───
    Note over User,Backend: Flow 3 – Single Text Analysis: Analyse & Save

    User->>SingleTextAnalysis: Enter text and click Analyze
    SingleTextAnalysis->>Backend: POST /api/analyze  { text }
    Backend-->>SingleTextAnalysis: Return { label, scores, keyTerms, sentences }
    SingleTextAnalysis-->>User: Display result view (donut chart, word cloud, sentences)

    User->>SingleTextAnalysis: Click "Save DB"
    SingleTextAnalysis-->>User: Modal Step 1 – Enter record name

    User->>SingleTextAnalysis: Submit record name
    SingleTextAnalysis->>Backend: POST /api/history/save-report  { userId, recordName, recordType: 'single', ... }
    Backend-->>SingleTextAnalysis: { success: true }
    SingleTextAnalysis-->>User: Modal Step 2 – "Saved! Add to Growth Plan?"

    alt User adds to Growth Plan
        SingleTextAnalysis->>Backend: GET /api/growth-plans?userId=...
        Backend-->>SingleTextAnalysis: Return available plans
        User->>SingleTextAnalysis: Select plan and confirm
        SingleTextAnalysis->>Backend: POST /api/growth-plans/:planId/data-points
        Backend-->>SingleTextAnalysis: 200 OK
        SingleTextAnalysis-->>User: "Successfully added to Growth Plan!"
    end

    %% ─── Flow 4: Batch CSV Analysis – New Analysis & Save ───
    Note over User,Backend: Flow 4 – Batch CSV Analysis: Upload, Analyse & Save

    User->>BatchAnalyzeView: Upload CSV file
    BatchAnalyzeView-->>User: Preview table with headers & rows

    User->>BatchAnalyzeView: Click "Start Analysis"
    loop For each chunk of rows
        BatchAnalyzeView->>Backend: POST /api/batch-analyze  { texts: [...] }
        Backend-->>BatchAnalyzeView: Return chunk results
        BatchAnalyzeView-->>User: Update progress bar
    end
    BatchAnalyzeView-->>User: Display full results, charts & word cloud

    User->>BatchAnalyzeView: Click "Save to DB"
    BatchAnalyzeView-->>User: Modal – Enter report name
    User->>BatchAnalyzeView: Submit report name
    BatchAnalyzeView->>Backend: POST /api/history/save-report  { userId, reportName, sourceName, recordType: 'batch', analyzedData }
    Backend-->>BatchAnalyzeView: { success: true }
    BatchAnalyzeView-->>User: Option to add data point to Growth Plan
```
