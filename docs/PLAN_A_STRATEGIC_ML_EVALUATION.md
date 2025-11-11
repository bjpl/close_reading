# Plan A: Strategic ML Technology Evaluation
## Balanced Assessment - Right Tool for Each Research Task

**Date:** November 11, 2025
**Objective:** Choose optimal ML approach for each research feature
**Methodology:** Compare local LLM, browser ML, specialized libraries, and cloud APIs

---

## Executive Summary

**Key Finding:** **NO SINGLE SOLUTION IS OPTIMAL FOR ALL TASKS**

The best strategy combines:
- **Specialized libraries** for fast, deterministic tasks (60% of features)
- **Browser ML** for real-time, privacy-sensitive embeddings (25% of features)
- **Local LLM** for complex analysis requiring deep understanding (10% of features)
- **Cloud APIs** for occasional advanced features users opt-into (5% of features)

**Recommended Hybrid Architecture:**
```
┌─────────────────────────────────────────┐
│  Feature Layer                          │
├─────────────────────────────────────────┤
│  • Fast tasks → Specialized libraries   │
│  • Embeddings → Browser ML (ONNX)       │
│  • Deep analysis → Local Ollama (32B)   │
│  • Optional advanced → Cloud APIs       │
└─────────────────────────────────────────┘
```

---

## FEATURE-BY-FEATURE EVALUATION

### 1. TEXT STATISTICS & READABILITY

**Task:** Calculate Flesch reading ease, word count, lexical diversity, etc.

#### Option A: Specialized Library (natural, text-statistics)
✅ **RECOMMENDED**

**Pros:**
- ⚡ Instant (< 1ms)
- 📦 Tiny bundle (5MB)
- 🎯 Deterministic results
- 🔧 No setup required
- ✅ Works offline

**Cons:**
- Limited to programmed metrics

**Implementation:**
```typescript
import { TextStatistics } from 'text-statistics';

const stats = new TextStatistics(text);
stats.fleschKincaidReadingEase();  // 0.5ms
stats.smogIndex();
stats.wordCount();
```

#### Option B: Local LLM (Ollama qwen 32B)
❌ **NOT RECOMMENDED**

**Pros:**
- Could provide narrative explanation

**Cons:**
- ⏱️ Slow (2-5 seconds)
- 🔧 Requires server running
- 🎲 Non-deterministic
- 💾 Overkill for simple math

**Verdict:** Use specialized library. LLM is massive overkill for statistics.

---

### 2. KEYWORD EXTRACTION

**Task:** Find most important terms in document

#### Option A: TF-IDF (natural library)
✅ **RECOMMENDED FOR AUTOMATIC**

**Pros:**
- ⚡ Fast (10-50ms)
- 🎯 Deterministic, reproducible
- 📊 Quantitative scores
- 📦 Small bundle

**Implementation:**
```typescript
import { TfIdf } from 'natural';

const tfidf = new TfIdf();
tfidf.addDocument(text);

// Get top 20 keywords
const keywords = tfidf.listTerms(0)
  .slice(0, 20)
  .map(item => ({ term: item.term, score: item.tfidf }));
```

#### Option B: Local LLM (Ollama qwen 32B)
✅ **RECOMMENDED FOR CONTEXT-AWARE**

**Pros:**
- 🧠 Understands context (finds "democracy" in text about "voting" even without word)
- 💡 Identifies concepts, not just frequent words
- 📚 Academic-quality selections

**Cons:**
- ⏱️ Slower (2-3 seconds)
- 🎲 Non-deterministic

**Use Case:**
```typescript
// LLM for contextual keywords
const prompt = `Extract 10 key academic concepts from this text (not just frequent words, but intellectually significant terms):

${text}

JSON array of keywords:`;

const result = await ollama.generate(prompt);
```

**Verdict:** **HYBRID APPROACH**
- TF-IDF for quick statistical keywords
- Ollama for "smart" conceptual keywords
- Let user choose: "Statistical" vs "AI-powered" keywords

---

### 3. DOCUMENT SUMMARIZATION

**Task:** Generate 3-4 sentence summary of academic text

#### Option A: Browser ML (transformers.js)
⚠️ **ACCEPTABLE BUT LIMITED**

**Pros:**
- 🌐 No server needed
- 🚀 Works in browser
- 📦 Model cached after first load

**Cons:**
- 📉 Quality limited (distilbart 6-layer)
- 📦 100MB model download
- ⏱️ Slower than local (no GPU)
- 📝 Generic, not academic-focused

```typescript
import { pipeline } from '@xenova/transformers';

const summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
const summary = await summarizer(text, { max_length: 100 });
```

#### Option B: Local LLM (Ollama qwen 32B)
✅ **RECOMMENDED**

**Pros:**
- 🏆 Superior quality (32B params vs 6-layer)
- 🎓 Can follow academic summary conventions
- 🎯 Customizable via prompts
- 🖥️ GPU acceleration (faster than browser)
- 📝 Can specify style (e.g., "focus on methodology")

**Cons:**
- 🔧 Requires Ollama running
- ⏱️ 2-5 seconds (but better quality)

**Implementation:**
```typescript
const prompt = `Provide a scholarly 3-4 sentence summary of this academic text. Focus on:
1. Main argument/thesis
2. Key evidence or methodology
3. Conclusions or implications

Text: ${text}

Summary:`;

const summary = await ollama.generate(prompt, {
  model: 'qwen2.5-coder:32b-instruct',
  temperature: 0.3
});
```

**Verdict:** **Use Ollama qwen 32B** - Quality difference is significant for academic texts

---

### 4. QUESTION ANSWERING

**Task:** Answer "What is the main argument?" from document

#### Option A: Browser ML (transformers.js distilbert-qa)
⚠️ **LIMITED QUALITY**

**Pros:**
- Works offline in browser
- Fast (100-300ms)

**Cons:**
- Struggles with complex academic language
- Limited context window (512 tokens)
- Generic model, not academic-tuned

#### Option B: Local LLM (Ollama qwen 32B)
✅ **RECOMMENDED**

**Pros:**
- 📚 Excellent on academic texts
- 📖 Large context (32K+ tokens)
- 🎯 Accurate comprehension
- 💡 Can provide reasoning with answer

**Cons:**
- Requires server
- Slower (but acceptable for research use)

**Verdict:** **Use Ollama qwen 32B** - Academic Q&A demands quality over speed

---

### 5. NAMED ENTITY RECOGNITION (NER)

**Task:** Extract people, places, organizations, dates

#### Option A: Specialized Library (compromise + plugins)
✅ **RECOMMENDED**

**Pros:**
- ⚡ Lightning fast (5-10ms)
- 🎯 Accurate for common entities
- 📦 Small bundle (compromise already installed)
- ✅ Deterministic

**Implementation:**
```typescript
import nlp from 'compromise';
import dates from 'compromise-dates';

nlp.extend(dates);
const doc = nlp(text);

const entities = {
  people: doc.people().out('array'),
  places: doc.places().out('array'),
  organizations: doc.organizations().out('array'),
  dates: doc.dates().json()
};
```

#### Option B: Local LLM (Ollama qwen 32B)
⚠️ **OVERKILL**

**Pros:**
- Can find obscure entities
- Understands context better

**Cons:**
- 1000× slower (5s vs 5ms)
- Non-deterministic
- Unnecessary for this task

**Verdict:** **Use compromise** - Specialized tool is perfect for this. Save LLM for harder tasks.

---

### 6. SENTIMENT ANALYSIS

**Task:** Analyze emotional tone of passages

#### Option A: Simple Library (sentiment, afinn)
✅ **RECOMMENDED FOR BASIC**

**Pros:**
- ⚡ Instant (< 1ms)
- 📊 Quantitative score
- 🎯 Reproducible
- 📦 Tiny (< 100KB)

```typescript
import Sentiment from 'sentiment';

const sentiment = new Sentiment();
const result = sentiment.analyze(text);
// { score: 5, comparative: 0.5, positive: ['happy', 'joy'], negative: [] }
```

#### Option B: Local LLM (Ollama qwen 32B)
✅ **RECOMMENDED FOR NUANCED**

**Pros:**
- 📚 Understands literary irony, sarcasm
- 🎭 Detects subtle emotional shifts
- 📖 Context-aware (whole document understanding)
- 💡 Can explain sentiment

**Use Case:**
```typescript
// Simple sentiment library for basic score
const quickScore = sentiment.analyze(text).comparative;

// LLM for nuanced analysis (optional, user-triggered)
const deepAnalysis = await ollama.generate(
  `Analyze the emotional tone of this passage. Consider irony, subtext, and narrative voice:\n\n${text}`,
  { model: 'qwen2.5-coder:32b-instruct' }
);
```

**Verdict:** **HYBRID**
- Use `sentiment` library for quick sentiment scores (always-on)
- Use Ollama for deep literary analysis (on-demand button)

---

### 7. TOPIC MODELING (LDA)

**Task:** Auto-discover themes in document

#### Option A: Classical LDA (natural library)
✅ **RECOMMENDED FOR STATISTICAL**

**Pros:**
- 📊 Quantitative (topic probabilities)
- 🔄 Reproducible (same input = same topics)
- ⚡ Fast (100-500ms)
- 📈 Established research methodology

```typescript
import { LDA } from 'natural';

const lda = new LDA(5); // 5 topics
lda.addDocuments(paragraphs);
lda.train();

const topics = lda.getTopics(10); // 10 terms per topic
```

#### Option B: Local LLM (Ollama qwen 32B)
✅ **RECOMMENDED FOR SEMANTIC**

**Pros:**
- 🧠 Understands theme semantics
- 📝 Provides descriptions, not just word lists
- 💡 Identifies abstract concepts
- 🎓 Academic-quality themes

```typescript
const prompt = `Identify 5 major themes in this text. For each:
- Theme name (conceptual, not just keywords)
- Brief explanation
- Example passages

${text}`;

const themes = await ollama.generate(prompt);
```

**Verdict:** **OFFER BOTH**
- LDA for traditional computational analysis (researchers who want statistics)
- Ollama for interpretive theme discovery (researchers who want insights)
- Side-by-side comparison teaches both approaches

---

### 8. EMBEDDINGS & SEMANTIC SIMILARITY

**Task:** Find semantically similar paragraphs

#### Option A: Browser ONNX (all-MiniLM-L6-v2)
✅ **RECOMMENDED**

**Pros:**
- ⚡ Very fast (50-100ms)
- 📦 Reasonable size (80MB)
- 🌐 No server dependency
- ✅ Excellent for semantic similarity
- 🔄 Deterministic
- 📱 Works on mobile

**Implementation:**
```typescript
import * as ort from 'onnxruntime-web';

// Load once, use many times
const session = await ort.InferenceSession.create('/models/all-MiniLM-L6-v2.onnx');
const embedding = await session.run(tokens);
```

**Quality:** State-of-art for semantic search (0.82 on STS benchmark)

#### Option B: Local LLM Embeddings (Ollama qwen 32B)
⚠️ **NOT OPTIMAL**

**Pros:**
- Uses model you have
- No additional download

**Cons:**
- ⏱️ Much slower (200-500ms per paragraph)
- 🔧 Requires server
- 📊 Ollama embeddings not optimized for similarity search
- 🎯 Specialized embedding models outperform general LLMs

**Benchmark Comparison:**
| Model | Speed | Quality (STS) | Best For |
|-------|-------|---------------|----------|
| all-MiniLM-L6-v2 (ONNX) | 50ms | 0.82 | Semantic search ✅ |
| qwen 32B embeddings | 300ms | ~0.75 | General purpose |
| Universal Sentence Encoder | 150ms | 0.78 | Legacy option |

**Verdict:** **Use ONNX all-MiniLM-L6-v2** - Purpose-built for this exact task, faster, better

---

### 9. SUMMARIZATION (Multiple Granularities)

**Task:** Summarize at different levels (document, paragraph, sentence)

#### Comparative Analysis

| Level | Best Tool | Reasoning |
|-------|-----------|-----------|
| **Document (1000+ words)** | Ollama qwen 32B ✅ | Needs deep comprehension, quality matters |
| **Paragraph (100-300 words)** | transformers.js ⚠️ | Fast enough, acceptable quality |
| **Sentence (< 50 words)** | Simple extraction ✅ | Just extract key phrase, no ML needed |

**Strategic Implementation:**
```typescript
async function summarize(text: string, level: 'document' | 'paragraph' | 'sentence') {
  switch (level) {
    case 'document':
      // Use Ollama for quality (user waits 3-5s, gets best summary)
      return await ollama.generate(`Summarize:\n${text}`, {
        model: 'qwen2.5-coder:32b-instruct'
      });

    case 'paragraph':
      // Use browser ML for speed (real-time as user reads)
      const summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
      return await summarizer(text, { max_length: 50 });

    case 'sentence':
      // Use simple extraction (instant)
      return text.split('.')[0] + '.';
  }
}
```

**Rationale:**
- Document summaries are generated once (user clicks button) → **Quality > Speed** → Ollama
- Paragraph summaries might be shown for many paragraphs → **Speed > Perfection** → Browser ML
- Sentence summaries are trivial → **No ML needed** → Simple logic

---

### 10. QUESTION GENERATION

**Task:** Generate critical thinking questions about text

#### Option A: Local LLM (Ollama qwen 32B)
✅ **RECOMMENDED**

**Pros:**
- 🎓 Academic-quality questions
- 🎯 Context-aware
- 💡 Multiple question types (clarification, critique, synthesis)
- 🌟 This is what LLMs excel at

**Cons:**
- Requires server
- Slower

**Implementation:**
```typescript
const prompt = `Generate 3 critical thinking questions about this passage for a graduate seminar. Include:
1. A clarification question (understanding)
2. A critical question (analysis)
3. A synthesis question (connections)

Passage: ${text}

Questions:`;

const questions = await ollama.generate(prompt, {
  model: 'qwen2.5-coder:32b-instruct',
  temperature: 0.8  // Higher for creative questions
});
```

#### Option B: Rule-based (template questions)
❌ **TOO SIMPLISTIC**

**Example:**
```typescript
const questions = [
  `What is the main argument in this passage?`,
  `What evidence supports this claim?`,
  `How does this relate to the broader text?`
];
```

**Problem:** Generic, not text-specific

**Verdict:** **Use Ollama qwen 32B** - Question generation is a perfect LLM use case

---

### 11. THEME EXTRACTION

**Task:** Identify major themes in document

#### Option A: Classical LDA (natural library)
✅ **RECOMMENDED FOR STATISTICAL RESEARCH**

**Pros:**
- 📊 Rigorous statistical model
- 🔄 Reproducible
- 📈 Topic probabilities
- 🎓 Established methodology (publishable)
- ⚡ Fast (200-500ms)

**Best for:** Computational literary analysis, digital humanities research requiring quantitative methods

#### Option B: Local LLM (Ollama qwen 32B)
✅ **RECOMMENDED FOR INTERPRETIVE RESEARCH**

**Pros:**
- 🧠 Semantic understanding
- 📚 Academic-quality theme descriptions
- 💡 Identifies abstract concepts
- 🎯 Contextually coherent themes

**Best for:** Close reading, literary criticism, qualitative analysis

**Verdict:** **OFFER BOTH** - Different research methodologies need different approaches

**UI Design:**
```
┌─ Theme Analysis ────────────────┐
│                                  │
│ Method:                          │
│ ○ Statistical (LDA)              │
│   Fast, reproducible, quantitative
│                                  │
│ ● AI-Powered (Local LLM)         │
│   Deep understanding, interpretive
│                                  │
│ [Generate Themes]                │
└──────────────────────────────────┘
```

---

### 12. ARGUMENT MINING

**Task:** Detect claims, evidence, counterarguments

#### Option A: Rule-based (compromise + custom patterns)
⚠️ **LIMITED BUT FAST**

**Pros:**
- Fast pattern matching
- Finds explicit markers ("argues that", "evidence shows")

**Cons:**
- Misses implicit arguments
- Can't understand logical structure

#### Option B: Local LLM (Ollama qwen 32B)
✅ **RECOMMENDED**

**Pros:**
- 🧠 Understands argumentative structure
- 💡 Finds implicit claims
- 🎯 Distinguishes claim from evidence
- 📚 Academic argumentation awareness

```typescript
const prompt = `Analyze the argumentative structure of this text:
1. Identify main claim(s)
2. Find supporting evidence for each claim
3. Note any counterarguments acknowledged
4. Assess strength of argumentation

Return as JSON: { claims: [], evidence: [], counterarguments: [], assessment: "" }

Text: ${text}`;
```

**Verdict:** **Use Ollama qwen 32B** - Argument mining requires deep understanding

---

### 13. CITATION/BIBLIOGRAPHY GENERATION

**Task:** Generate formatted citations

#### Option A: Specialized Library (Current implementation)
✅ **RECOMMENDED - KEEP CURRENT**

**Pros:**
- ⚡ Instant
- 🎯 Format-compliant (MLA, APA, Chicago standards)
- 🔄 Deterministic
- ✅ No dependencies on external services

**Current Implementation:**
```typescript
// src/services/citation/* - 11 specialized modules
exportBibTeX(citations, metadata);  // <1ms
exportMLA(citations, metadata);     // <1ms
```

**Verdict:** **Keep current implementation** - Citations require format precision, not intelligence

#### Option B: LLM
❌ **NOT RECOMMENDED**

**Why not:** Citation formatting is deterministic. LLM might make mistakes. Don't risk it.

---

### 14. ENTITY RELATIONSHIP EXTRACTION

**Task:** Find relationships between entities (e.g., "Character A influences Character B")

#### Option A: Dependency parsing (compromise)
⚠️ **LIMITED**

**Can detect:** Simple syntactic relationships
**Misses:** Implicit, cross-sentence relationships

#### Option B: Local LLM (Ollama qwen 32B)
✅ **RECOMMENDED**

**Pros:**
- 🧠 Understands narrative relationships
- 📖 Cross-sentence context
- 💡 Infers implicit relationships
- 🎭 Character dynamics, power structures

```typescript
const prompt = `Analyze relationships between people in this text:
- Who influences whom?
- What are power dynamics?
- Which characters are allies/adversaries?

Return as JSON: { relationships: [{ from: "X", to: "Y", type: "influences", evidence: "quote" }] }

Text: ${text}`;
```

**Verdict:** **Use Ollama qwen 32B** - Relationship detection requires understanding

---

### 15. PARAGRAPH LINKING (SEMANTIC)

**Task:** Suggest related paragraphs

#### Option A: ONNX Embeddings (all-MiniLM-L6-v2)
✅ **RECOMMENDED**

**Pros:**
- ⚡ Fast batch processing (50ms per paragraph)
- 🎯 Excellent semantic similarity
- 🔄 Deterministic (important for research)
- 📦 80MB model (acceptable)
- 🚀 Runs in browser (no server)

**Implementation:**
```typescript
// Generate embeddings for all paragraphs (do once, cache forever)
const embeddings = await Promise.all(
  paragraphs.map(p => onnxEmbedding.embed(p.content))
);

// Find similar (instant after embeddings cached)
function findSimilar(targetEmbedding) {
  return embeddings.map((emb, idx) => ({
    paragraphId: paragraphs[idx].id,
    similarity: cosineSimilarity(targetEmbedding, emb)
  })).sort((a, b) => b.similarity - a.similarity);
}
```

#### Option B: Ollama Embeddings
⚠️ **SLOWER, NOT BETTER**

**Cons:**
- 10× slower (300ms vs 30ms)
- Requires server
- Not optimized for similarity

**Verdict:** **Use ONNX all-MiniLM-L6-v2** - Purpose-built for this, faster, better

---

## STRATEGIC TECHNOLOGY MATRIX

### Decision Framework

| Task Type | Best Solution | Why |
|-----------|--------------|-----|
| **Simple deterministic** | Specialized library | Fast, small, accurate |
| **Statistical NLP** | natural, compromise | Established methods, reproducible |
| **Semantic similarity** | ONNX embeddings | Purpose-built, fast, excellent |
| **Deep comprehension** | Ollama qwen 32B | Quality, context, reasoning |
| **Creative generation** | Ollama qwen 32B | What LLMs do best |
| **Format compliance** | Rule-based | Precision required |

---

## RECOMMENDED HYBRID ARCHITECTURE

### Layer 1: Fast Deterministic (Always Available)

**Use:** Specialized JavaScript libraries
**Bundle:** ~10MB total

```
text-statistics    → Readability metrics
natural            → TF-IDF, tokenization, LDA
compromise         → NER, POS tagging
sentiment          → Basic sentiment
citation-js        → Citation formatting
```

**For:** Statistics, keywords, entities, basic sentiment, citations
**Why:** Instant response, no dependencies, works offline, small bundle

---

### Layer 2: Browser ML (Real-time Features)

**Use:** ONNX Runtime Web
**Bundle:** 80-100MB (cached)

```
onnxruntime-web         → Runtime
all-MiniLM-L6-v2.onnx  → Embeddings (80MB)
```

**For:** Semantic paragraph linking, similarity search
**Why:** Best-in-class for embeddings, fast, offline, deterministic

**Optional Add:**
```
@xenova/transformers   → Multi-task (if needed)
- distilbart-cnn-6-6   → Quick summarization (100MB)
- distilbert-qa        → Basic Q&A (67MB)
```

**For:** Paragraph-level summaries (if Ollama unavailable), basic Q&A fallback
**Why:** Acceptable quality, works offline, fallback for Ollama

---

### Layer 3: Local LLM (Deep Analysis)

**Use:** Ollama qwen2.5-coder:32b-instruct
**Requirements:** Ollama server running locally

```
qwen2.5-coder:32b-instruct (19GB) → Primary for deep tasks
qwen2.5:14b (7GB)                 → Fallback if 32B slow
mistral (4GB)                     → Fast fallback
```

**For:**
- Document-level summarization
- Question answering
- Theme extraction (semantic)
- Annotation suggestions
- Argument mining
- Relationship extraction
- Critical question generation

**Why:** Superior quality for complex academic analysis, runs on your GPU, free

**Graceful Degradation:**
```typescript
async function getDocumentSummary(text: string): Promise<string> {
  // Try Ollama first (best quality)
  if (await ollama.isAvailable()) {
    return await ollama.generate(prompt, { model: 'qwen2.5-coder:32b-instruct' });
  }

  // Fall back to browser ML (acceptable quality)
  if (await transformers.isLoaded()) {
    return await transformers.summarize(text);
  }

  // Last resort: simple extraction
  return extractFirstSentences(text, 3);
}
```

---

### Layer 4: Cloud APIs (Optional, User-Controlled)

**Use:** OpenAI, Anthropic Claude (opt-in only)

**For:**
- Cutting-edge features users specifically want
- When local resources insufficient
- Experimental features

**Examples:**
- GPT-4 for extremely long documents (100K+ tokens)
- Claude for citation verification against databases
- Specialized academic APIs (Semantic Scholar)

**Implementation:**
```typescript
// User must explicitly enable and provide API key
if (user.settings.enableCloudAI && user.apiKey) {
  return await openai.complete(prompt);
} else {
  return await ollama.generate(prompt); // Default to local
}
```

**Why offer:** Some users may want cutting-edge capabilities and accept cost/privacy trade-off

---

## FINAL TECHNOLOGY RECOMMENDATIONS

### Core Stack (Always Included)

**1. natural (5MB)** ✅ ESSENTIAL
```bash
npm install natural
```
**Use for:** TF-IDF keywords, LDA topic modeling, tokenization
**Reason:** Best for statistical NLP, fast, established

**2. compromise (2MB)** ✅ ALREADY INSTALLED
```bash
npm install compromise compromise-dates compromise-numbers
```
**Use for:** NER, POS tagging, date extraction
**Reason:** Excellent for entity extraction, fast, accurate

**3. sentiment (100KB)** ✅ ADD
```bash
npm install sentiment
```
**Use for:** Quick sentiment scoring
**Reason:** Instant, accurate for basic sentiment

**4. text-statistics (200KB)** ✅ ADD
```bash
npm install text-statistics
```
**Use for:** Readability metrics, text complexity
**Reason:** Comprehensive, established algorithms

**Total Bundle Impact:** ~7MB (negligible)

---

### Browser ML (Selectively Add)

**5. onnxruntime-web + all-MiniLM-L6-v2 (90MB)** ✅ HIGH PRIORITY
```bash
npm install onnxruntime-web
# Download model: all-MiniLM-L6-v2.onnx (80MB)
```
**Use for:** Embeddings, semantic similarity, paragraph linking
**Reason:** Best quality/speed/size trade-off for this task
**When to load:** First time user uses "find similar paragraphs"

**6. @xenova/transformers (varies)** ⚠️ OPTIONAL
```bash
npm install @xenova/transformers
```
**Use for:** Fallback summarization if Ollama unavailable
**Reason:** Acceptable quality, works offline
**When to skip:** If always using Ollama for summarization

**Total Bundle Impact:** 90-190MB (load on demand)

---

### Local LLM (External Dependency)

**7. Ollama qwen2.5-coder:32b-instruct** ✅ CRITICAL FOR RESEARCH
```bash
# User already has this!
ollama serve
```
**Use for:**
- Document summarization (main use)
- Question answering (main use)
- Theme extraction (when semantic, not statistical)
- Annotation suggestions
- Argument mining

**Reason:** Superior quality for deep analysis, runs locally, free

**Implementation Strategy:**
- Check availability on app load
- If available: Enable "AI Assistant" features
- If not: Show helpful message "Start Ollama for AI features"
- Provide fallbacks for critical features

---

### Cloud APIs (User Opt-In Only)

**8. OpenAI/Anthropic** ⚠️ OPTIONAL, USER-CONTROLLED

**Use for:** Nothing by default
**Offer as:** Premium opt-in feature
```
Settings → Advanced → Enable Cloud AI
[Checkbox] I understand data leaves my device
API Key: [____________]
```

**Only use if:** User explicitly enables + provides API key + accepts data sharing

---

## RECOMMENDED IMPLEMENTATION ROADMAP

### Week 1: Core Libraries (No LLM Yet)

**Install:**
```bash
npm install natural sentiment text-statistics
npm install compromise-dates compromise-numbers
```

**Implement:**
1. Text statistics dashboard
2. TF-IDF keyword extraction
3. NER with compromise
4. Basic sentiment analysis
5. LDA topic modeling

**Result:** Functional research features, all fast and offline

**Bundle Size:** +7MB (acceptable)

---

### Week 2: ONNX Embeddings (No LLM Yet)

**Install:**
```bash
npm install onnxruntime-web
```

**Download:** all-MiniLM-L6-v2.onnx (80MB, cache in public/models/)

**Implement:**
1. Replace TensorFlow.js embeddings
2. Semantic paragraph linking
3. Semantic search
4. Document similarity

**Result:** Best-in-class semantic features, faster than current

**Bundle Size:** +90MB (lazy loaded)

---

### Week 3: Ollama Integration (The Power-Up)

**Create:** Ollama client service

**Implement:**
1. Check Ollama availability
2. Document summarization with qwen 32B
3. Question answering with qwen 32B
4. AI Reading Assistant panel

**Result:** Premium features for users with Ollama

**Bundle Size:** +0MB (external service)

---

### Week 4: Advanced LLM Features (If Ollama Available)

**Implement:**
1. Semantic theme extraction (vs. statistical LDA)
2. Annotation suggestions
3. Argument mining
4. Critical question generation
5. Relationship extraction

**Result:** AI-augmented research platform

---

### Week 5: Polish & Optimization

1. **Performance:** Cache all ML results aggressively
2. **UX:** Loading states, progress bars for long operations
3. **Fallbacks:** Graceful degradation if Ollama down
4. **Settings:** Let users choose LDA vs LLM themes, etc.
5. **Documentation:** User guide explaining each ML feature

---

## COST-BENEFIT ANALYSIS

### Specialized Libraries (natural, compromise, sentiment)

**Cost:**
- Development: 1 week
- Bundle: +7MB
- Runtime: 0 (instant)

**Benefit:**
- Text statistics: ESSENTIAL for research
- Keyword extraction: HIGH value
- NER: HIGH value for many texts
- Topic modeling (LDA): MEDIUM-HIGH (some researchers need this)

**ROI:** ⭐⭐⭐⭐⭐ Excellent - Low cost, high value

---

### ONNX Embeddings (onnxruntime-web + model)

**Cost:**
- Development: 1 week
- Bundle: +90MB
- Runtime: 50ms per paragraph (acceptable)

**Benefit:**
- Semantic linking: HIGH value (core feature)
- Better than current TF.js
- 3× faster
- Better quality

**ROI:** ⭐⭐⭐⭐⭐ Excellent - Improves core feature significantly

---

### Local LLM (Ollama qwen 32B)

**Cost:**
- Development: 2-3 weeks (client + features)
- Bundle: +0MB (external)
- Runtime: 2-5s per request (acceptable for research)
- User requirement: Must have Ollama running

**Benefit:**
- Document summarization: VERY HIGH (differentiating feature)
- Q&A: HIGH (useful for research)
- Theme extraction: MEDIUM (LDA alternative)
- Annotation suggestions: MEDIUM (convenience)
- Argument mining: MEDIUM-HIGH (advanced research)

**ROI:** ⭐⭐⭐⭐ Very Good - High value for sophisticated users, zero cost

**Risk:** ⚠️ Requires user to run Ollama (setup barrier)
**Mitigation:** Make optional, provide excellent fallbacks

---

### transformers.js (Browser Transformers)

**Cost:**
- Development: 1-2 weeks
- Bundle: +100-200MB
- Runtime: 500-1000ms per task

**Benefit:**
- Summarization: MEDIUM (worse than Ollama, but works without server)
- Q&A: MEDIUM (limited by model size)
- Classification: LOW (can do with simpler methods)

**ROI:** ⭐⭐⭐ Moderate - Only valuable as fallback for Ollama

**Verdict:** ⚠️ **SKIP OR ADD LATER** - Ollama is better, specialized libs are faster

---

## STRATEGIC RECOMMENDATION: TIERED IMPLEMENTATION

### Phase 1: Proven Winners (Weeks 1-2)
✅ **IMPLEMENT THESE - Clear ROI**

1. **natural** - TF-IDF, LDA topics, statistics
2. **onnxruntime-web** - Best embeddings
3. **sentiment** - Quick sentiment scores
4. **text-statistics** - Readability metrics
5. **compromise plugins** - Better NER

**Why:** Low risk, high value, well-tested technologies

**Bundle:** ~100MB total
**Development:** 2 weeks
**Value:** Core research features, immediate utility

---

### Phase 2: Power Features (Weeks 3-5)
✅ **ADD IF TARGETING ADVANCED RESEARCHERS**

6. **Ollama qwen 32B integration**
   - Document summarization
   - Question answering
   - AI Reading Assistant

**Why:** Differentiates from all competitors, leverages models user already has

**Bundle:** +0MB (external service)
**Development:** 3 weeks
**Value:** Premium features, unique capabilities

**Condition:** Only if targeting researchers who would run Ollama (graduate students, faculty)

---

### Phase 3: Experimental (Weeks 6+)
⚠️ **EVALUATE AFTER PHASE 1 & 2**

7. **transformers.js** - Only if needed as fallback
8. **Cloud APIs** - Only if users request
9. **Custom fine-tuned models** - For specific domains

**Why:** Uncertain value, higher complexity

---

## FINAL STRATEGIC TECHNOLOGY STACK

### Recommended Configuration

```json
{
  "dependencies": {
    // TIER 1: Specialized Libraries (ALWAYS INCLUDE)
    "natural": "^6.10.0",                  // TF-IDF, LDA, statistics
    "compromise": "^14.14.4",              // NER, POS (already installed)
    "compromise-dates": "^1.3.0",          // Date extraction
    "compromise-numbers": "^1.3.0",        // Number extraction
    "sentiment": "^5.0.2",                 // Sentiment analysis
    "text-statistics": "^2.1.0",           // Readability

    // TIER 2: Browser ML (HIGH PRIORITY)
    "onnxruntime-web": "^1.17.0",          // ONNX inference
    // + all-MiniLM-L6-v2.onnx model (80MB) in public/models/

    // TIER 3: Optional Fallbacks
    "@xenova/transformers": "^2.17.0"      // If needed as Ollama fallback
  },

  "external": {
    // User must install separately
    "ollama": "qwen2.5-coder:32b-instruct" // For advanced features
  }
}
```

### Feature Routing Logic

```typescript
// Intelligent routing based on task and availability

async function analyzeDocument(document: Document, task: AnalysisTask) {
  switch (task) {
    case 'statistics':
      return textStatistics.analyze(document.content); // Always specialized lib

    case 'keywords':
      return natural.tfidf(document.content); // Always TF-IDF

    case 'entities':
      return compromise.extract(document.content); // Always compromise

    case 'embedding':
      return onnx.embed(text); // Always ONNX (best quality/speed)

    case 'sentiment-quick':
      return sentiment.analyze(text); // Quick score

    case 'topics-statistical':
      return natural.lda(paragraphs); // Computational analysis

    case 'summary-document':
      // Try Ollama first (best), fall back to transformers.js
      if (await ollama.isAvailable()) {
        return await ollama.summarize(text); // 32B quality
      }
      return await transformers.summarize(text); // Acceptable fallback

    case 'question-answering':
      // Ollama only (browser models too weak for academic Q&A)
      if (await ollama.isAvailable()) {
        return await ollama.qa(question, context);
      }
      return "Ollama required for Q&A. Please start Ollama service.";

    case 'themes-semantic':
      // Ollama for semantic themes, LDA available as alternative
      if (await ollama.isAvailable()) {
        return await ollama.extractThemes(text);
      }
      return "Using statistical LDA. For AI themes, start Ollama.";

    case 'argument-mining':
      // Ollama only (too complex for other methods)
      if (await ollama.isAvailable()) {
        return await ollama.mineArguments(text);
      }
      return null; // Feature unavailable without Ollama
  }
}
```

---

## BUNDLE SIZE OPTIMIZATION

### Current Baseline
- React + Chakra UI + Core app: ~2MB gzipped

### Adding Specialized Libs (Recommended)
- natural, compromise, sentiment, text-statistics: +7MB
- **Total:** ~9MB gzipped (acceptable)

### Adding ONNX (Recommended)
- onnxruntime-web: +2MB
- all-MiniLM-L6-v2 model: +80MB (lazy loaded, cached)
- **Total:** ~11MB initial + 80MB on first semantic search use

### Adding transformers.js (Optional)
- @xenova/transformers: +5MB
- distilbart model: +100MB (lazy loaded)
- **Total:** ~16MB initial + 180MB for all features

### Ollama Integration (External)
- Bundle impact: +0MB
- **Requirement:** User must run Ollama server

### Strategic Choice

**Minimal (Good Research Tool):**
- Specialized libs + ONNX
- 11MB + 80MB lazy = **~90MB total**
- No Ollama integration
- Solid features, all in-browser

**Recommended (Excellent Research Tool):**
- Specialized libs + ONNX + Ollama client
- 11MB + 80MB lazy = **~90MB bundle**
- Optional Ollama integration (0MB bundle, external server)
- Best features, hybrid approach

**Maximal (Overkill):**
- Everything + transformers.js
- 16MB + 280MB models = **~300MB total**
- Probably unnecessary

**Verdict:** **Go with "Recommended"** - 90MB is acceptable, Ollama adds premium features at zero bundle cost

---

## QUALITY COMPARISON BY TASK

### Summarization

| Approach | Quality | Speed | Offline | Bundle |
|----------|---------|-------|---------|--------|
| Simple extraction | 3/10 | Instant | ✅ | 0MB |
| transformers.js | 6/10 | 1-2s | ✅ | 100MB |
| **Ollama qwen 32B** | **9.5/10** | 2-5s | ✅ | 0MB |
| GPT-4 | 10/10 | 2-3s | ❌ | 0MB + cost |

**Winner:** Ollama qwen 32B (best quality, local, free)

### Semantic Similarity

| Approach | Quality | Speed | Offline | Bundle |
|----------|---------|-------|---------|--------|
| TF-IDF | 5/10 | Instant | ✅ | 5MB |
| Universal Sentence Encoder | 7.8/10 | 150ms | ✅ | 50MB |
| **all-MiniLM-L6-v2 (ONNX)** | **8.2/10** | 50ms | ✅ | 80MB |
| Ollama qwen embeddings | 7.5/10 | 300ms | ✅ | 0MB |

**Winner:** ONNX all-MiniLM-L6-v2 (best quality AND speed)

### Keyword Extraction

| Approach | Quality | Speed | Offline | Bundle |
|----------|---------|-------|---------|--------|
| **TF-IDF (natural)** | **8/10** | 10ms | ✅ | 5MB |
| Ollama qwen 32B | 9/10 | 2-3s | ✅ | 0MB |

**Winner:** TF-IDF (200× faster, minimal quality difference for keywords)

### Topic Modeling

| Approach | Quality | Speed | Offline | Bundle |
|----------|---------|-------|---------|--------|
| **LDA (natural)** | **8/10** | 200ms | ✅ | 5MB |
| Ollama qwen 32B | 9/10 | 3-5s | ✅ | 0MB |

**Winner:** BOTH - Offer "Statistical Topics" (LDA) and "AI Themes" (Ollama)

### Named Entity Recognition

| Approach | Quality | Speed | Offline | Bundle |
|----------|---------|-------|---------|--------|
| **compromise** | **8.5/10** | 5ms | ✅ | 2MB |
| transformers.js NER | 9/10 | 500ms | ✅ | 150MB |
| Ollama qwen 32B | 9/10 | 2-3s | ✅ | 0MB |

**Winner:** compromise (100× faster, tiny bundle, excellent quality)

### Question Answering

| Approach | Quality | Speed | Offline | Bundle |
|----------|---------|-------|---------|--------|
| distilbert-qa | 6/10 | 200ms | ✅ | 67MB |
| **Ollama qwen 32B** | **9.5/10** | 2-5s | ✅ | 0MB |
| GPT-4 | 10/10 | 2-3s | ❌ | 0MB + cost |

**Winner:** Ollama qwen 32B (much better quality, acceptable speed for research)

---

## FINAL STRATEGIC PLAN A

### Technology Stack

**Phase 1: Specialized Libraries (Week 1)**
```bash
npm install natural sentiment text-statistics compromise-dates compromise-numbers
```
**Features:** Statistics, keywords, NER, basic sentiment, LDA topics
**Bundle:** +7MB
**Value:** Immediate, core research features

**Phase 2: ONNX Embeddings (Week 2)**
```bash
npm install onnxruntime-web
# Download all-MiniLM-L6-v2.onnx
```
**Features:** Semantic linking (better than current)
**Bundle:** +90MB (lazy)
**Value:** Improves existing feature significantly

**Phase 3: Ollama Integration (Week 3)**
```typescript
// Create ollama-client.ts (no npm install needed)
```
**Features:** Summarization, Q&A, AI themes, suggestions
**Bundle:** +0MB
**Value:** Premium differentiation, leverages user's hardware

**Phase 4: Polish (Week 4)**
- Settings UI (enable/disable features)
- Fallback flows
- User documentation
- Performance optimization

### Features by Technology

**Specialized Libraries (Always Fast, Always Available):**
- ✅ Text statistics dashboard
- ✅ TF-IDF keyword extraction
- ✅ Statistical topic modeling (LDA)
- ✅ Named entity recognition
- ✅ Basic sentiment scores
- ✅ POS tagging
- ✅ Date/number extraction

**ONNX (Fast, High Quality, Offline):**
- ✅ Semantic paragraph linking
- ✅ Semantic document search
- ✅ Find similar passages

**Ollama qwen 32B (Best Quality, Requires Server):**
- ✅ Document summarization
- ✅ Question answering
- ✅ Semantic theme extraction
- ✅ Annotation suggestions
- ✅ Argument mining
- ✅ Critical question generation
- ✅ Relationship extraction

**transformers.js (Optional Fallback):**
- ⚠️ Basic summarization (if Ollama unavailable)
- ⚠️ Basic Q&A (if Ollama unavailable)

---

## USER EXPERIENCE DESIGN

### Settings Panel

```
┌─ ML & AI Features ─────────────────────────┐
│                                             │
│ Core Features (Always Available)            │
│ ✅ Text Statistics                          │
│ ✅ Keyword Extraction                       │
│ ✅ Named Entity Recognition                 │
│ ✅ Sentiment Analysis                       │
│ ✅ Semantic Paragraph Linking               │
│                                             │
│ ─────────────────────────────────────────  │
│                                             │
│ AI-Powered Features (Requires Ollama)       │
│ Ollama Status: ● Running (qwen 32B)         │
│ ✅ Document Summarization                   │
│ ✅ Question Answering                       │
│ ✅ AI Theme Extraction                      │
│ ✅ Smart Annotation Suggestions             │
│ ✅ Argument Mining                          │
│                                             │
│ [Configure Ollama]                          │
│                                             │
│ ─────────────────────────────────────────  │
│                                             │
│ Topic Modeling                              │
│ ○ Statistical (LDA) - Fast, reproducible   │
│ ● AI-Powered (Ollama) - Semantic, rich     │
│                                             │
│ ─────────────────────────────────────────  │
│                                             │
│ Cloud AI (Optional - Data Leaves Device)    │
│ ☐ Enable Cloud AI Features                 │
│ API Key: [__________________________]      │
│                                             │
└─────────────────────────────────────────────┘
```

**Design Principle:** Progressive enhancement - basic features always work, advanced features light up when available

---

## PERFORMANCE BENCHMARKS (Estimated)

### Inference Times (Single Operation)

| Task | Specialized Lib | ONNX | Ollama 32B | transformers.js |
|------|----------------|------|------------|-----------------|
| Statistics | 0.5ms ⚡ | N/A | N/A | N/A |
| Keywords (TF-IDF) | 10ms ⚡ | N/A | N/A | N/A |
| NER | 5ms ⚡ | N/A | N/A | N/A |
| Sentiment | 1ms ⚡ | N/A | N/A | N/A |
| Embedding | N/A | 50ms ⚡ | 300ms | 150ms |
| Summarize para | N/A | 800ms | 2-3s | 1-2s |
| Summarize doc | N/A | N/A | 3-5s ⭐ | 2-3s |
| Q&A | N/A | N/A | 2-5s ⭐ | 500ms |
| Topics (LDA) | 200ms ⚡ | N/A | N/A | N/A |
| Themes (AI) | N/A | N/A | 3-5s ⭐ | N/A |

**Legend:**
- ⚡ Real-time (< 100ms)
- ⭐ Best quality (worth the wait for research)

---

## CONCLUSION: Balanced Hybrid Approach

### What to Use When

**Use Specialized Libraries For:**
- Text statistics (text-statistics)
- Keyword extraction (natural TF-IDF)
- Named entities (compromise)
- Quick sentiment (sentiment)
- Topic modeling when quantitative (natural LDA)
- **Reason:** Fast, deterministic, proven, small bundle

**Use ONNX Browser ML For:**
- Semantic embeddings (all-MiniLM-L6-v2)
- Paragraph similarity and linking
- Semantic search
- **Reason:** Best quality/speed/size for this specific task

**Use Ollama qwen 32B For:**
- Document summarization (needs deep comprehension)
- Question answering (academic texts are complex)
- AI theme extraction (when semantic, not statistical)
- Annotation suggestions (requires understanding)
- Argument mining (requires reasoning)
- Critical question generation (creative task)
- **Reason:** Superior quality justifies 2-5s wait for research use

**Don't Use:**
- ❌ transformers.js for most tasks (ONNX or Ollama are better)
- ❌ Ollama for simple tasks (overkill, specialized libs faster)
- ❌ Cloud APIs by default (privacy, cost, complexity)

### Implementation Priority

**Week 1:** Specialized libraries (immediate value)
**Week 2:** ONNX embeddings (core feature improvement)
**Week 3:** Ollama integration (premium differentiation)
**Week 4:** Polish and optimize

**Bundle Size:** ~11MB initial + 80MB lazy = **91MB total** (acceptable)
**External:** Ollama (user already has)

**Result:** World-class research platform with optimal tool for each task

---

**Total commits: 28**
**Strategic evaluation complete** ✅
**Ready to implement with clear technology choices!** 🎯
