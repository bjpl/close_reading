# Next Steps Roadmap - Close Reading Platform
**Date:** November 11, 2025
**Current Status:** Production-ready, Fully modernized, Ready for ML enhancement

---

## Immediate Priorities (This Week)

### 1. Test & Validate (1-2 hours)

**In Browser (http://localhost:5173/):**
- [ ] Hard refresh (Ctrl+Shift+R) to get latest code
- [ ] Upload a NEW document (old ones won't work)
- [ ] Test highlighting feature (should show mode indicator)
- [ ] Test annotation editing (edit a note)
- [ ] Test paragraph linking (Shift+click, create link)
- [ ] Test citation export (all 6 formats)
- [ ] Verify delete dialog is centered
- [ ] Check console for any errors

**If Issues Found:**
- Document in GitHub issue
- We can fix quickly

### 2. Clean Up Repository (30 minutes)

```bash
# Add to .gitignore
echo ".claude-flow/metrics/" >> .gitignore
echo "*.backup" >> .gitignore
echo "clear-mock-db.html" >> .gitignore

# Remove tracked metrics
git rm --cached .claude-flow/metrics/system-metrics.json
git commit -m "chore: Clean up gitignore and remove metrics"

# Remove test upload file
git rm "test upload.txt"
git commit -m "chore: Remove test fixture from root"

git push
```

### 3. Fix Pre-existing TypeScript Errors (30 minutes - Optional)

**Current:** 16 unused variable warnings

**Quick fix:**
```typescript
// Remove or prefix with underscore
const _documentId = ... // Tells TypeScript "intentionally unused"
```

**Or add ESLint rule:**
```json
// .eslintrc
{
  "rules": {
    "@typescript-eslint/no-unused-vars": ["warn", {
      "argsIgnorePattern": "^_"
    }]
  }
}
```

---

## Short-term (Next 2 Weeks)

### Week 1: Quick ML Wins

**Monday-Tuesday: Specialized Libraries**
```bash
npm install natural sentiment text-statistics
```

**Implement:**
1. Text statistics panel (word count, readability scores)
2. TF-IDF keyword extraction
3. Basic sentiment analysis

**Time:** 1-2 days
**Value:** Immediate research utility
**Documentation:** Create user guide

**Wednesday-Thursday: ONNX Embeddings**
```bash
npm install onnxruntime-web
```

**Implement:**
1. Download all-MiniLM-L6-v2 model
2. Replace TensorFlow.js in linkSuggestions
3. Test semantic similarity improvements

**Time:** 1-2 days
**Value:** Better, faster semantic linking
**Benchmark:** Compare before/after quality

**Friday: Documentation & Testing**
1. Write user guide for new ML features
2. Add tests for ML services
3. Update README with ML capabilities

### Week 2: Local LLM Integration

**Monday-Tuesday: Ollama Client**
1. Create `src/services/ml/ollama-client.ts`
2. Test connection to your qwen 32B model
3. Handle offline gracefully

**Wednesday-Thursday: AI Features**
1. Document summarization
2. Question answering
3. AI Reading Assistant panel UI

**Friday: Polish**
1. Add settings to enable/disable AI
2. Show Ollama status in UI
3. Test all features end-to-end

---

## Medium-term (Months 2-3)

### Month 2: Research Features

**Week 3-4: Page Numbers & Metadata**
1. PDF page break detection
2. Page number display
3. Expanded document metadata (DOI, ISBN, publisher)
4. Page numbers in citations

**Week 5-6: Advanced ML**
1. Theme extraction (Natural LDA + Ollama option)
2. Named entity extraction (compromise)
3. Sentiment arc visualization

### Month 3: Polish & Documentation

**Week 7-8: User Research**
1. Interview 10 researchers
2. Interview 10 instructors
3. Usability testing
4. Validate feature priorities

**Week 9-10: Refinement**
1. Implement most-requested features
2. Fix usability issues
3. Performance optimization

**Week 11-12: Documentation**
1. Comprehensive user manual
2. Research methodology guides
3. Tutorial videos
4. API documentation

---

## Long-term (Months 4-6)

### Decision Point (After User Research)

**IF Research-Focused (Plan A):**
- Inter-rater reliability
- Annotation versioning
- REFI-QDA export
- Network analysis
- Collaborative research features

**IF Teaching-Focused (Plan B):**
- Assignment management
- Instructor dashboard
- Grading system
- Student roles
- Pedagogical scaffolding

**IF Hybrid (Plan C):**
- Both feature sets (12-16 weeks)

---

## Strategic Recommendations

### Recommended Path

**Phase 1 (Weeks 1-2): ML Enhancement** ← YOU ARE HERE
- Add specialized libraries
- ONNX embeddings
- Ollama integration
- **Result:** Significantly better research tool

**Phase 2 (Weeks 3-6): User Validation**
- Talk to potential users
- Validate research vs teaching direction
- Implement quick wins (page numbers)
- **Result:** Clear product direction

**Phase 3 (Weeks 7-12): Focused Development**
- Commit to research OR teaching
- Build validated feature set
- **Result:** Market-leading tool for chosen audience

### Why This Order

**1. ML First:**
- Leverages your existing Ollama setup
- Differentiates from competitors immediately
- Low risk (adding features, not changing core)
- Quick wins build momentum

**2. Validation Second:**
- ML features make platform more compelling for interviews
- Better demo for usability testing
- Can show unique capabilities
- Users help prioritize remaining work

**3. Focused Development Third:**
- Build with confidence (validated direction)
- No wasted effort on wrong features
- Optimized for proven market

---

## If You Want to Start NOW

### Immediate First Step: Test Ollama Integration

**1. Verify Ollama Running:**
```bash
# In PowerShell or CMD
ollama serve

# Test your model
ollama run qwen2.5-coder:32b-instruct "Summarize in one sentence: Los Angeles is California's largest county."
```

**2. Create Simple Test in Close Reading Platform:**

```typescript
// src/test-ollama.ts (temporary test file)
async function testOllama() {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:32b-instruct',
        prompt: 'Say hello in one sentence.',
        stream: false
      })
    });

    const data = await response.json();
    console.log('✅ Ollama response:', data.response);
    return data.response;
  } catch (error) {
    console.error('❌ Ollama not available:', error);
    return null;
  }
}

// Call from browser console
testOllama();
```

**3. If Test Works:**
- Proceed with full `ollama-client.ts` implementation
- Add AI Reading Assistant panel
- Ship first AI feature!

---

## Success Metrics

### Week 2 Goals:
- ✅ qwen 32B integrated and working
- ✅ Users can generate AI summaries
- ✅ Users can ask questions about documents
- ✅ Semantic linking improved with ONNX
- ✅ Text statistics dashboard added

### Month 2 Goals:
- ✅ 20 user interviews completed
- ✅ Product direction validated (research vs teaching)
- ✅ Page numbers implemented
- ✅ Advanced ML features polished

### Month 3 Goals:
- ✅ Either research OR teaching features at 80%
- ✅ Documentation comprehensive
- ✅ Beta testing program launched
- ✅ Ready for broader launch

---

## Key Documents for Reference

**Planning:**
- `docs/PLAN_A_STRATEGIC_ML_EVALUATION.md` - Which ML tool for each task
- `docs/PLAN_A_ENHANCED_ML_RESEARCH.md` - Full research-focused roadmap
- `docs/LLM_COMPARISON_LOCAL_VS_CLOUD.md` - Local vs Cloud analysis
- `docs/LOCAL_LLM_INTEGRATION.md` - How to integrate your Ollama models

**Assessment:**
- `daily_dev_startup_reports/2025-11-11_research_pedagogy_assessment.md` - Platform as research/teaching tool
- `docs/SESSION_SUMMARY_2025-11-10.md` - Yesterday's extraordinary achievements

**Technical:**
- `docs/PLAN_C_100_PERCENT_COMPLETE.md` - Complete modernization summary
- `docs/ARCHITECTURAL_DECISIONS.md` - Code patterns and standards

---

## Final Recommendation

**THIS WEEK:**
1. Validate all features work (1 hour)
2. Start Ollama integration (2-3 days)
3. Add specialized libraries (1-2 days)

**NEXT 2 WEEKS:**
- Complete ML enhancement (Plan A Phase 1-2)
- Platform becomes significantly more powerful for research

**THEN:**
- User research to validate direction (research vs teaching)
- Commit to Plan A or Plan B based on evidence

**RESULT IN 6 WEEKS:**
- Premier ML-powered close reading platform
- Clear target market
- Validated feature set
- Ready for launch

---

**Your platform is in excellent shape.**
**The foundation is rock-solid.**
**Now it's time to add the intelligence layer!** 🧠

---

**Next Action:** Test Ollama integration, then implement first AI feature (summarization)

