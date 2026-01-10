import type { ModelSelection, ConsensusEvaluation } from "./types";
import type { TavilySearchResult } from "./tavily";

/**
 * Build prompt with search context injected
 */
export function buildPromptWithSearchContext(
  originalPrompt: string,
  searchResults: TavilySearchResult[]
): string {
  const searchContext = searchResults
    .map((result, i) => `[${i + 1}] ${result.title}\n${result.content}\nSource: ${result.url}`)
    .join('\n\n');

  return `${originalPrompt}

## Recent Web Search Results
The following information was retrieved from the web to help answer this question:

${searchContext}

Please incorporate relevant information from these sources in your response, citing sources where appropriate.`;
}

/**
 * Build refinement prompt for a model to refine its response based on other models' responses.
 * Optionally includes evaluation insights (key differences and areas of agreement) for targeted refinement.
 */
export function buildRefinementPrompt(
  originalPrompt: string,
  modelId: string,
  modelLabel: string,
  allResponses: Map<string, string>,
  selectedModels: ModelSelection[],
  round: number,
  previousEvaluation?: ConsensusEvaluation | null
): string {
  // Extract own response from the map (was redundant parameter before)
  const ownPreviousResponse = allResponses.get(modelId) || "";

  // Build "other models" section - exclude the current model
  const otherModelsText = selectedModels
    .filter((m) => m.id !== modelId)
    .map((m) => {
      const response = allResponses.get(m.id) || "";
      return `${m.label.toUpperCase()}:\n${response}`;
    })
    .join("\n\n");

  // Build evaluation insights section if available
  const evaluationInsights = previousEvaluation
    ? `## Evaluator Insights

Note: You are ${modelLabel}. Look for references to your model name in the feedback below.

**Key differences to resolve:**
${previousEvaluation.keyDifferences.map((d) => `- ${d}`).join("\n")}

**Areas of agreement to build on:**
${previousEvaluation.areasOfAgreement.map((a) => `- ${a}`).join("\n")}

`
    : "";

  // Build instructions based on whether we have evaluation
  const instructions = previousEvaluation
    ? `1. Focus on resolving the key differences identified above
2. Build on the areas of agreement
3. Incorporate valid points from other models
4. Clarify any ambiguities
5. Move toward consensus while maintaining accuracy`
    : `1. Address any divergences or disagreements
2. Incorporate valid points from other models
3. Clarify any ambiguities
4. Move toward consensus while maintaining accuracy`;

  return `Original Question: ${originalPrompt}

Round ${round} - Refinement Phase

${evaluationInsights}## Your Previous Response (${modelLabel})

${ownPreviousResponse}

## Other Models' Responses

${otherModelsText}

---

Please refine your answer considering these other perspectives:
${instructions}`;
}

/**
 * Build synthesis prompt to create unified consensus response
 */
export function buildSynthesisPrompt(
  originalPrompt: string,
  finalResponses: Map<string, string>,
  selectedModels: ModelSelection[],
  evaluationHistory: Array<{ score: number; reasoning: string }>
): string {
  const responsesText = selectedModels
    .map((m) => {
      return `${m.label}:\n${finalResponses.get(m.id)}`;
    })
    .join("\n\n---\n\n");

  // Build evaluation history summary if available
  let evaluationSummary = "";
  if (evaluationHistory.length > 0) {
    evaluationSummary = `\n\nConsensus Evolution:`;
    evaluationHistory.forEach((evaluation, index) => {
      evaluationSummary += `\nRound ${index + 1}: Score ${evaluation.score}/100 - ${evaluation.reasoning}`;
    });
  }

  return `You are synthesizing a consensus response from ${selectedModels.length} AI models.

Original Question: ${originalPrompt}

Final Responses:
---
${responsesText}
${evaluationSummary}

Create a single, unified response that:
1. Incorporates the key insights from all models
2. Presents a balanced, consensus view
3. Acknowledges any remaining differences if they exist
4. Provides a clear, coherent answer

Generate the consensus response:`;
}

/**
 * Build evaluation system prompt with consensus threshold
 */
export function buildEvaluationSystemPrompt(
  consensusThreshold: number,
  searchEnabled: boolean = false
): string {
  const searchGuidance = searchEnabled ? `

SEARCH AWARENESS:
If any model explicitly states they need more current information, lack specific data, or are uncertain due to knowledge cutoff limitations, set needsMoreInfo: true and provide a suggestedSearchQuery that would help find the needed information.

Example:
- Model says "I don't have current data on..." → needsMoreInfo: true, suggestedSearchQuery: "current data on X 2025"
- Model says "This requires recent statistics..." → needsMoreInfo: true, suggestedSearchQuery: "recent statistics X"
` : '';

  return `You are a fun, engaging consensus evaluator who makes AI disagreements entertaining!

YOUR PERSONALITY:
- Conversational and friendly (not academic or formal)
- Celebrate agreement and make disagreements dramatic
- Use casual language like "the models totally disagree here!" or "they're vibing on this one"
- Give models personality with colorful analogies
- Be objective but entertaining

EVALUATION PROCESS:

1. SCORE (0-100):
   - 90-100: Models are basically saying the same thing (near-perfect match)
   - 75-89: Strong agreement, minor differences in detail/emphasis
   - 50-74: Agree on basics but diverge on approach or specifics
   - 30-49: Significant disagreements, competing ideas
   - 0-29: Fundamental contradictions, totally different answers

2. PICK YOUR VIBE:
   - celebration (90-100): 🎉 Models are in sync!
   - agreement (75-89): 👍 Pretty aligned
   - mixed (50-74): 🤔 Some agreement, some divergence
   - disagreement (30-49): ⚠️ Models are split
   - clash (0-29): 💥 Total disagreement!

3. PICK YOUR EMOJI (match the score):
   - 90-100: 🎉
   - 75-89: 👍
   - 50-74: 🤔
   - 30-49: ⚠️
   - 0-29: 💥

4. FIND AGREEMENT FIRST (3-5 things):
   Even if the score is low, find things they DO agree on (be creative!):
   - "They all think this question is important"
   - "Everyone agrees X is a factor"
   - "Nobody mentioned Y, so probably not relevant"
   - "All models started with the same basic premise"
   - "They all acknowledge Z as a key consideration"

   CELEBRATE COMMONALITY BEFORE DIFFERENCES!

5. HIGHLIGHT DIFFERENCES (3-5 items, with drama and personality):
   Make differences punchy and clear with colorful analogies:

   Examples of great difference descriptions:
   ✅ "Claude wants to start with X, but GPT jumps straight to Y!"
   ✅ "Claude seems to be coding up a minivan but GPT is feeling like a principal developer today"
   ✅ "Gemini cut straight to the point while Claude is taking the scenic route"
   ✅ "GPT thinks we should go left, but Claude is absolutely sure it's right"
   ✅ "These models are NOT on the same page about the root cause"

   Avoid academic language:
   ❌ "Model A employs a different methodological framework"
   ❌ "Responses exhibit divergent epistemological approaches"

   Use dramatic language for big gaps:
   - "Totally opposite conclusions here!"
   - "Big divergence on..."
   - "Complete disagreement about..."

6. WRITE A SUMMARY (1-2 sentences, conversational):
   Punchy overview that captures the vibe:
   - "The models mostly agree but differ on the details."
   - "Big disagreement here - they're suggesting opposite approaches!"
   - "Near-perfect consensus! Just minor wording differences."
   - "They're aligned on the what, but split on the how."

7. REASONING (2-3 paragraphs, casual tone):
   Explain your score in friendly, conversational language. No bullet lists, just flowing paragraphs.
   Focus on WHY the score is what it is. Tell a story about what the models did.

   Example tone:
   "Looking at these responses, the models are pretty much on the same wavelength here. They all identify the core issue and suggest similar solutions. Claude goes into a bit more detail about the implementation, while GPT keeps it concise, but they're fundamentally saying the same thing. The main difference is just how thorough they're being - Claude is being the careful one while GPT is keeping it snappy."

SCORING RULES:
- Be honest about differences (don't inflate scores)
- Look for CONTENT alignment, not just similar structure
- Agreement = same core ideas, reasoning, and conclusions
- Differences = contradictions, different approaches, missing key points
- If one model is verbose/complex and another is efficient/simple, call it out with personality!

Consensus threshold: ${consensusThreshold}%
Set isGoodEnough = true if score >= ${consensusThreshold}${searchGuidance}

OUTPUT FORMAT:
Return ONLY raw JSON - no markdown, no code fences, no \`\`\`json wrapper. Just the JSON object:
{
  "score": <number 0-100>,
  "summary": "<1-2 conversational sentences>",
  "emoji": "<single emoji: 🎉/👍/🤔/⚠️/💥>",
  "vibe": "<celebration|agreement|mixed|disagreement|clash>",
  "areasOfAgreement": ["<what they agree on>", "<another agreement>", "..."],
  "keyDifferences": ["<dramatic difference with personality>", "<another difference>", "..."],
  "reasoning": "<2-3 casual paragraphs explaining the score>",
  "isGoodEnough": <boolean>${searchEnabled ? `,
  "needsMoreInfo": <optional boolean>,
  "suggestedSearchQuery": "<optional string if needsMoreInfo is true>"` : ''}
}`;
}

/**
 * Build evaluation prompt for analyzing model responses
 */
export function buildEvaluationPrompt(
  responses: Map<string, string>,
  selectedModels: ModelSelection[],
  round: number
): string {
  const responseText = selectedModels
    .map((model) => {
      return `--- ${model.label.toUpperCase()} ---
${responses.get(model.id)}`;
    })
    .join("\n\n");

  return `Round ${round} - Evaluate how aligned these responses are!

${responseText}

YOUR TASK:
1. Score the consensus (0-100) - how well do these models align?
2. Find what they AGREE on first (3-5 things, be creative!)
3. Call out differences with personality and drama (3-5 differences)
4. Write a fun 1-2 sentence summary
5. Explain your score in 2-3 conversational paragraphs
6. Pick the right emoji and vibe based on the score

Remember:
- Celebrate agreement before highlighting differences
- Use colorful analogies for differences (like "coding up a minivan" vs "principal developer")
- Give models personality in your descriptions
- Keep it fun and engaging!`;
}
