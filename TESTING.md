# Consensus Workflow Testing Guide

## Step 1: Update Database Schema

Run the migration script to add the consensus tables to your database:

```bash
pnpm migrate
```

This will:
- Add `consensus_max_rounds`, `consensus_threshold`, and `consensus_evaluator_model` columns to the `users` table
- Create `consensus_conversations` table
- Create `consensus_rounds` table
- Create necessary indexes

**Expected Output:**
```
🔄 Starting database migration...
📝 Found X SQL statements to execute
[1/X] Executing: ALTER TABLE users...
✅ Success
...
✅ Migration completed successfully!
```

**If Migration Fails:**
- Check that your `.env.local` has valid Vercel Postgres connection strings
- Ensure your database is accessible
- You can also manually run the SQL from `migrations/001_add_consensus_tables.sql` in your Vercel Postgres dashboard

---

## Step 2: Verify API Keys

Start the development server:

```bash
pnpm dev
```

1. Visit http://localhost:3000
2. Sign in with your account
3. Go to Settings (click your avatar in top right)
4. Ensure you have at least 2 API keys configured:
   - For testing same provider: Add OpenAI key (to compare GPT-4o vs O1 Preview)
   - For testing different providers: Add Anthropic + OpenAI + Google keys

**Note:** You need at least one of Anthropic or OpenAI for the evaluator (thinking model).

---

## Step 3: Test Full Consensus Workflow

### Basic Test (2 Models)

1. Visit http://localhost:3000/consensus
2. Configure models:
   - Click "Add Model" twice
   - Select 2 different models (e.g., GPT-4o and Claude 3.7 Sonnet)
3. Configure settings:
   - Max Rounds: 3
   - Consensus Threshold: 80%
4. Enter a test prompt:
   ```
   What are the trade-offs between using TypeScript vs JavaScript for a large-scale web application?
   ```
5. Click submit and watch:
   - **Round 1:** Both models stream their initial responses in parallel
   - **Evaluation:** Consensus score appears (likely 60-70% on first round)
   - **Round 2:** Models see each other's responses and refine
   - **Evaluation:** Consensus score improves (likely 75-85%)
   - **Round 3 (if needed):** Further refinement
   - **Final Synthesis:** Unified consensus response appears
   - **Individual Responses:** Tabs show each model's final response

### Advanced Test (3 Models, Same Provider)

1. Visit http://localhost:3000/consensus
2. Configure 3 OpenAI models:
   - Model 1: GPT-4o
   - Model 2: O1 Preview
   - Model 3: GPT-4o Mini
3. Settings:
   - Max Rounds: 5
   - Consensus Threshold: 85%
4. Test prompt:
   ```
   Explain quantum entanglement to a high school student
   ```
5. Observe how different models from the same provider converge

---

## Step 4: Test Edge Cases

### Test 1: High Threshold (Early Termination Unlikely)
- Settings: Max Rounds: 3, Threshold: 95%
- Expected: Runs all 3 rounds because 95% is very hard to achieve
- Check: Meta-conversation shows improvement across rounds

### Test 2: Low Threshold (Early Termination Likely)
- Settings: Max Rounds: 5, Threshold: 70%
- Expected: Stops at round 2-3 when threshold reached
- Check: Final round shows "Good Enough" badge in meta-conversation

### Test 3: Controversial Question
- Prompt: "Is functional programming better than object-oriented programming?"
- Expected: Lower consensus scores, more refinement rounds
- Check: Key differences section highlights divergent views

### Test 4: Factual Question
- Prompt: "How many planets are in our solar system?"
- Expected: High consensus score (90%+) on first round
- Check: Workflow terminates early with unified answer

### Test 5: UI Adaptation (2 vs 3 Models)
- Test with 2 models: Grid should show 2 columns
- Test with 3 models: Grid should show 3 columns
- Check: Meta-conversation tabs adapt correctly

---

## What to Look For

### ✅ Should Work:

**UI Components:**
- Model selector allows adding/removing 2-3 models
- Provider dropdowns only show providers with API keys
- Settings sliders work correctly
- Round indicator shows progress accurately

**Streaming:**
- Model responses stream in real-time
- Evaluation scores update as they're calculated
- Final synthesis streams character by character
- No hanging or stuck states

**Meta-Conversation:**
- Accordion expands/collapses correctly
- Each round shows:
  - Consensus score with badge
  - Evaluation reasoning
  - Key differences (if any)
  - Model responses in tabs
  - Refinement prompts (except final round)

**Final Results:**
- Unified consensus appears in left panel (markdown rendered)
- Individual responses appear in right panel tabs
- All 2-3 models have final responses

**Database:**
- Check Vercel Postgres: `consensus_conversations` table has new row
- Check: `consensus_rounds` table has one row per round
- Verify: JSONB columns contain correct model data

### ⚠️ Common Issues:

**Migration Errors:**
- "column already exists" - Safe to ignore, means you already have the column
- "table already exists" - Safe to ignore, migration is idempotent
- Connection errors - Check `.env.local` database credentials

**API Errors:**
- "Missing API key for X" - Add the key in Settings
- "Need at least one API key (Anthropic or OpenAI) for evaluation" - Add evaluator key
- Rate limits - Use smaller models or wait between tests

**UI Issues:**
- Stuck on "Generating consensus..." - Check browser console for errors
- No responses streaming - Check Network tab for API errors
- Meta-conversation not showing - Ensure rounds completed successfully

---

## Debugging Tips

### Check Browser Console
```javascript
// Open browser console and check for errors
// Look for failed fetch requests to /api/consensus
```

### Check Server Logs
```bash
# In your terminal running pnpm dev, watch for:
# - Database query errors
# - AI SDK streaming errors
# - Evaluation failures
```

### Test API Directly
```bash
curl -X POST http://localhost:3000/api/consensus \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test question",
    "models": [
      {"id": "model-1", "provider": "openai", "modelId": "gpt-4o", "label": "GPT-4o"},
      {"id": "model-2", "provider": "anthropic", "modelId": "claude-3-7-sonnet-20250219", "label": "Claude 3.7 Sonnet"}
    ],
    "maxRounds": 2,
    "consensusThreshold": 80
  }'
```

### Check Database
```sql
-- In Vercel Postgres dashboard:
SELECT * FROM consensus_conversations ORDER BY created_at DESC LIMIT 5;
SELECT * FROM consensus_rounds WHERE conversation_id = <id>;
```

---

## Success Criteria

After testing, you should have verified:

- ✅ Database migration completed successfully
- ✅ Can select 2-3 models from any provider combination
- ✅ Models stream responses in parallel during each round
- ✅ Evaluator analyzes responses and assigns consensus score
- ✅ Models refine based on each other's responses in subsequent rounds
- ✅ Workflow terminates early when threshold reached OR max rounds hit
- ✅ Meta-conversation shows all rounds, evaluations, and prompts
- ✅ Final view shows both unified consensus and individual responses
- ✅ All data persists correctly to database

---

## Next Steps

Once basic testing is complete:

1. Test with real questions relevant to your use case
2. Experiment with different threshold values
3. Try different model combinations
4. Check conversation history persistence
5. Test error handling (invalid API keys, rate limits, etc.)

Happy testing! 🚀
