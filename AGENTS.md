# AGENTS.md — Agentic AI Contributor & Coding Assistant Guide

Welcome to **EcoLeak**. This document is a foundational manual for AI coding agents (such as Antigravity, Cursor, Claude Code, GitHub Copilot) and human developers working alongside automated agents on this codebase.

It outlines architectural principles, hard constraints, directory mappings, coding standards, and verification workflows. **All agents operating on this repository must adhere to these instructions.**

---

## 🧭 1. Architectural Philosophy: "Deterministic First"

EcoLeak operates under an absolute architectural boundary:

> **CRITICAL INVARIANT:**  
> **LLMs are NEVER permitted to perform arithmetic, estimate carbon emissions, compute financial ROI, or generate numerical factors.**

1. **LLM Domain:** Large Language Models (Groq `openai/gpt-oss-120b`, Google Gemini `gemini-3.6-flash`) are restricted strictly to:
   - Natural language comprehension (extracting activities and units from conversational text or raw PDF documents).
   - Entity disambiguation fallback when rule-based alias dictionaries cannot match an input.
2. **Local Deterministic Domain:** Python engines (`emission_engine.py`, `circular_engine.py`, `leak_detector.py`) handle 100% of:
   - Physical unit normalization and dimensional checking.
   - Carbon emission calculations ($Q \times EF$).
   - Pareto 80/20 hotspot detection.
   - Williams' 0.65 Rule dynamic CAPEX scaling.
   - OPEX savings and payback period calculations.

Any proposal or pull request that delegates mathematical calculations or emission factor selection to an LLM prompt will be rejected.

---

## 🛡️ 2. Non-Negotiable Hard Guardrails

When modifying or adding features, preserve the following invariants:

### A. Lifecycle Phase Guardrails (`backend/services/entity_mapper.py`)
- Materials have distinct lifecycle phases: **Virgin Material**, **Recycled / Circular Input**, and **Post-Industrial Waste**.
- **Negative Constraints:** Terms containing tokens like `"waste"`, `"scrap"`, `"reject"`, `"effluent"` must **never** resolve to a virgin material key (e.g. `"plastic scrap"` must resolve to `waste_plastic_mixed`, never to `virgin_hdpe_plastic`).
- Recycled tokens (`"rpet"`, `"regrind"`, `"pcr"`, `"recycled"`) must resolve to `ActivityCategory.RECYCLED`.
- Always check `detect_lifecycle_hint()` before alias or semantic lookups.

### B. Physical Unit Conversions & Audit Trails (`backend/services/emission_engine.py`)
- Standard base units are `kg` (mass), `l` (liquid volume), `m3` (gas/water volume), and `kWh` (electrical energy).
- Cross-dimensional conversions (e.g., fuel mass in kg to volume in liters) must strictly use defined physical properties (`density_kg_per_l` in `FUEL_PROPERTIES`).
- Never perform silent unit conversions. Every conversion must append an explicit explanation to `EmissionResult.audit_note` (e.g., `"Converted 500 kg to 595.24 L using density 0.84 kg/L"`).

### C. ChromaDB Determinism (`backend/services/chroma_service.py`)
- Do not generate random UUIDs for ChromaDB documents.
- Document IDs must follow the format `circular_{virgin_material_key}`.
- Always use `collection.upsert()` during `sync_collection()` to maintain idempotence across restarts and avoid duplicate entries.

### D. Financial Currency Localization (`backend/services/circular_engine.py`)
- The primary presentation currency is the **Indian Rupee (₹ INR)**.
- Internal conversion uses `USD_TO_INR = 95.0` when referencing legacy USD intervention data.
- Never output arbitrary currency symbols. Format monetary values on the frontend using `formatINR()` from `frontend/src/services/api.js`.

---

## 🗂️ 3. Codebase Map & Responsibilities

```
EcoLeak/
├── backend/
│   ├── main.py                     # App lifespan, CORS, static SPA serving, router mounting
│   ├── api/
│   │   ├── analyze.py              # POST /api/analyze & /api/analyze/document (core pipeline)
│   │   ├── chat.py                 # POST /api/analyze/chat (natural language pipeline)
│   │   ├── health.py               # GET /health (liveness & service readiness)
│   │   └── recommendations.py      # POST /api/recommend (direct circular query)
│   ├── models/
│   │   └── schemas.py              # Pydantic v2 schemas: AnalyzeRequest, AnalyzeResponse, etc.
│   └── services/
│       ├── chroma_service.py       # ChromaDB vector collection sync and query
│       ├── circular_engine.py      # Substitution caps, Williams' rule, INR economics
│       ├── csv_loader.py           # Robust parsing of data/*.csv with whitespace stripping
│       ├── emission_engine.py      # Deterministic CO2e math and unit conversions
│       ├── entity_mapper.py        # 5-stage entity resolution pipeline
│       ├── gemini_service.py       # Google GenAI SDK fallback
│       ├── groq_service.py         # Primary Groq (openai/gpt-oss-120b) extractor
│       ├── hf_service.py           # Hugging Face sentence-transformers fallback
│       └── leak_detector.py        # Pareto 80/20 cumulative emission classifier
├── data/
│   ├── emission_factors.csv        # Canonical Scope 1, 2, 3 emission factor table
│   └── circular_interventions.csv  # Verified circular alternatives, CAPEX & base payback
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # View state coordinator (landing | dashboard | auth)
│   │   ├── index.css               # Design system tokens, utilities & theme classes
│   │   ├── components/
│   │   │   ├── Dashboard.jsx       # 4-section audit dashboard (input, leaks, circular, report)
│   │   │   ├── AuthPage.jsx        # Firebase / Supabase authentication portal
│   │   │   ├── Hero.jsx            # Hero banner with primary CTAs
│   │   │   ├── AnimatedBackground.jsx # Canvas mesh and glow effects
│   │   │   └── SimpleCalculator.jsx   # Interactive carbon estimator widget
│   │   └── services/
│   │       ├── api.js              # Fetch client & formatINR / formatCO2e helpers
│   │       ├── firebase.js         # Firebase Auth client
│   │       └── supabase.js         # Supabase client
└── tests/                          # 80 pytest test cases covering all modules
```

---

## ⚙️ 4. Setup, Environment & Execution

### Python Virtual Environment & Tests
Always run commands using `python -m <module>` in Windows environments:

```powershell
# Run the full test suite (all 80 tests must pass)
python -m pytest

# Run a specific test suite
python -m pytest tests/test_emission_engine.py -v
python -m pytest tests/test_circular_engine.py -v
python -m pytest tests/test_entity_mapper.py -v

# Run backend locally
uvicorn backend.main:app --reload --port 8000
```

### Frontend Development & Build
```powershell
# Run frontend dev server
npm run dev --workspace=frontend

# Build frontend production bundle into frontend/dist
npm run build --workspace=frontend
```

### Environment Variables Matrix
Credentials live in `.env` at the project root:
| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Optional* | Primary LLM engine for document & chat ingestion (`openai/gpt-oss-120b`) |
| `GROQ_MODEL` | Optional | Defaults to `openai/gpt-oss-120b` |
| `GEMINI_API_KEY` | Optional | Fallback LLM engine (`gemini-3.6-flash`) |
| `HF_TOKEN` | Optional | Hugging Face token for local sentence embeddings |
| `VITE_FIREBASE_*` | Optional | Firebase Auth Web credentials |
| `VITE_SUPABASE_*` | Optional | Supabase credentials |

*\*Note: If no API keys are provided, structured analysis via `/api/analyze` continues to function with 100% accuracy using the local deterministic engine.*

---

## 🛠️ 5. Step-by-Step Agent Recipes

### Recipe 1: Adding a New Emission Factor
1. Open `data/emission_factors.csv`.
2. Append a new row with canonical key, base unit, factor, and scope:
   ```csv
   bio_diesel	l	0.45	Scope 1
   ```
3. Update `CATALOG` in `backend/services/entity_mapper.py`:
   ```python
   "bio_diesel": (ActivityCategory.FUEL, [
       "biodiesel", "bio-diesel", "b20", "renewable diesel",
   ]),
   ```
4. If the entity requires cross-dimensional conversion (e.g. mass to volume), add its density to `FUEL_PROPERTIES` in `backend/services/emission_engine.py`.
5. Add a test case in `tests/test_entity_mapper.py` and `tests/test_emission_engine.py`.
6. Run `python -m pytest` to confirm.

### Recipe 2: Adding a New Circular Intervention
1. Open `data/circular_interventions.csv` and append:
   ```csv
   virgin_material_key	circular_alternative_key	virgin_co2e_per_kg	recycled_co2e_per_kg	avg_capex_usd	payback_months
   virgin_bio_resin	recycled_bio_resin	1.85	0.40	3200	6
   ```
2. Open `backend/services/circular_engine.py` and register the engineering profile in `MATERIAL_PROFILES`:
   ```python
   "virgin_bio_resin": {
       "alternative_key": "recycled_bio_resin",
       "virgin_ef": 1.85,
       "recycled_ef": 0.40,
       "virgin_price_inr_per_kg": 140.0,
       "recycled_price_inr_per_kg": 105.0,
       "base_capex_inr": 300000.0,
       "base_capacity_kg": 50000.0,
       "max_recommended_sub_pct": 75.0,
       "feasibility": 85,
       "difficulty": "Low",
       "regulatory": "EN 13432 compostability certified",
       "confidence": 0.90,
   },
   ```
3. Run `backend/services/chroma_service.py` (`sync_collection()`) or restart the app to sync the vector store.
4. Add a test in `tests/test_circular_engine.py` verifying substitution limits and payback calculations.

### Recipe 3: Modifying Frontend UI & Styles
- **No Tailwind CSS:** EcoLeak uses custom Vanilla CSS in `frontend/src/index.css`. Do **not** introduce arbitrary Tailwind utility classes.
- **Design Tokens:** Use established CSS variables (`--bg-primary`, `--accent-cyan`, `--accent-emerald`, `--border-glass`, `--font-sans`).
- **Rich Aesthetics:** Ensure all interactive elements have hover animations, glassmorphic blur filters (`backdrop-filter: blur(12px)`), and active state glows.
- **Icons:** Use `lucide-react`. Maintain consistent icon sizing (`className="w-4 h-4"` or `"w-5 h-5"`).

---

## 🧪 6. Testing & Quality Checklist

Before submitting code, an agent must verify:
- [ ] `python -m pytest` passes with **0 failures**.
- [ ] No regression in ChromaDB document retrieval (`tests/test_chroma.py`).
- [ ] Pydantic v2 schemas in `schemas.py` are strictly typed with default values where appropriate.
- [ ] If changing the frontend, `npm run build --workspace=frontend` builds without errors.
- [ ] Any new numerical formula has an explicit comment referencing its physical or economic basis (e.g. Williams' 0.65 capacity-to-cost scaling law).
- [ ] No hardcoded secrets or API keys are committed.
