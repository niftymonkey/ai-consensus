import type { ModelSelection } from "./types";

/**
 * Build refinement prompt for a model to refine its response based on other models' responses
 */
export function buildRefinementPrompt(
  originalPrompt: string,
  modelId: string,
  modelLabel: string,
  ownPreviousResponse: string,
  allResponses: Map<string, string>,
  selectedModels: ModelSelection[],
  round: number
): string {
  // Build "other models" section - exclude the current model
  const otherModelsText = selectedModels
    .filter((m) => m.id !== modelId)
    .map((m) => {
      const response = allResponses.get(m.id) || "";
      return `${m.label.toUpperCase()}:\n${response}`;
    })
    .join("\n\n");

  return `Original Question: ${originalPrompt}

Round ${round} - Refinement Phase

Your previous response (${modelLabel}):
${ownPreviousResponse}

Other models' responses:
${otherModelsText}

Please refine your answer considering these other perspectives:
1. Address any divergences or disagreements
2. Incorporate valid points from other models
3. Clarify any ambiguities
4. Move toward consensus while maintaining accuracy

Provide your refined response:`;
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
export function buildEvaluationSystemPrompt(consensusThreshold: number): string {
  return `You are a rigorous consensus evaluator analyzing AI model responses.

Your task: Determine how well aligned the responses are using a two-stage process.

STAGE 1: SYSTEMATIC ANALYSIS

First, identify the question type:
- FACTUAL: Objective questions with verifiable answers (What/When/Who/Where, definitions, facts)
- ANALYTICAL: Questions requiring reasoning (Why/How/Explain, causation, mechanisms)
- OPINION: Subjective questions (Should/Recommend/Think, preferences, advice)

Then catalog ALL differences in four categories:

A. FACTUAL DIFFERENCES (highest weight)
   - Direct contradictions (Model says X, another says NOT X)
   - Missing key facts (critical information present in some, absent in others)
   - Numerical discrepancies
   - Verifiable errors

B. APPROACH DIFFERENCES (high weight)
   - Different reasoning chains or causal explanations
   - Different methodologies or frameworks
   - Different problem-solving strategies
   - Competing theories or models applied

C. COVERAGE DIFFERENCES (medium weight)
   - Key topics/aspects addressed by some but not all
   - Significant depth variations
   - Missing perspectives or considerations
   - Scope differences (comprehensive vs narrow)

D. SUPERFICIAL DIFFERENCES (low weight)
   - Tone variations (formal vs casual, optimistic vs neutral)
   - Structural presentation (lists vs paragraphs, order)
   - Length differences (concise vs detailed when content is same)
   - Different but equivalent examples

STAGE 2: WEIGHTED SCORING

Apply severity-based penalties according to question type:

FACTUAL Questions - Demand near-perfect factual alignment:
  • Factual contradiction: -40 points each
  • Missing key fact: -30 points each
  • Coverage gap (missing important aspect): -20 points
  • Different approach (if facts agree): -10 points
  • Superficial differences: -0 to -5 points

ANALYTICAL Questions - Require same reasoning chain:
  • Fundamental reasoning contradiction: -35 points
  • Missing key causal factor: -25 points
  • Different but valid approach: -10 points
  • Coverage gap: -20 points
  • Supporting evidence contradiction: -30 points
  • Superficial differences: -5 points

OPINION Questions - Accept more variance in reasoning:
  • Opposite conclusions: -40 points
  • Contradictory reasoning: -25 points
  • Missing major perspective: -15 points
  • Different compatible viewpoints: -10 points
  • Coverage gap: -15 points
  • Superficial differences: -5 points

SCORING CALIBRATION:

90-100% = Near-identical responses
• Only wording/structural differences
• All key content identical
• Example: "Paris is France's capital" vs "The capital of France is Paris"

75-89% = Strong agreement
• Same core answer and reasoning
• Minor coverage differences (one adds context/detail)
• No contradictions, just varying depth
• Example: Both explain concept correctly, one adds historical background

50-74% = Moderate alignment
• Same general direction, meaningful differences
• Some missing key points or different emphasis
• Compatible but not unified
• Example: Both recommend diet change, suggest different specific approaches

30-49% = Significant disagreement
• Multiple contradictions or major gaps
• Different conclusions or competing frameworks
• Incompatible reasoning
• Example: Disagree on root cause, suggest opposite solutions

0-29% = Fundamental contradiction
• Opposite conclusions (safe vs dangerous, true vs false)
• Mutually exclusive answers
• Contradictory facts throughout

CRITICAL INSTRUCTIONS:
1. Be skeptical - look actively for disagreements, don't overlook them
2. Structural similarity (lists, tone) should NOT inflate scores
3. Focus on CONTENT alignment, not presentation similarity
4. 90%+ consensus means responses are essentially interchangeable
5. Penalize missing information heavily if one model covers key points others miss
6. When in doubt between two score ranges, choose the lower (more rigorous)

Consensus threshold: ${consensusThreshold}%
Set isGoodEnough = true only if score >= ${consensusThreshold}

IMPORTANT OUTPUT FORMAT:
Your response must be valid JSON matching this exact structure:
{
  "score": <number 0-100>,
  "reasoning": "<multi-line string with question type, penalties, justification>",
  "keyDifferences": ["<difference 1>", "<difference 2>", "<difference 3>"],
  "isGoodEnough": <true or false>
}

The keyDifferences field MUST be a JSON array of strings, not a numbered list.

Provide your structured evaluation.`;
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

  return `Round ${round}

Question Type Detection:
Analyze the responses and classify the original question as FACTUAL, ANALYTICAL, or OPINION.
This determines the scoring standards you will apply.

Responses to evaluate (${selectedModels.length} models):

${responseText}

EVALUATION PROCESS:

STAGE 1 - IDENTIFY ALL DIFFERENCES:

1. Factual Differences:
   List every factual contradiction, missing key fact, numerical discrepancy, or error.
   Be thorough - catching disagreements is more important than finding agreement.

2. Approach Differences:
   List differences in reasoning chains, methodologies, frameworks, or problem-solving strategies.

3. Coverage Differences:
   List topics/aspects some models addressed that others did not.
   Identify depth variations or missing perspectives.

4. Superficial Differences:
   List tone, structure, length, or presentation differences.

STAGE 2 - CALCULATE WEIGHTED SCORE:

Start at 100 points. Apply penalties based on question type and difference severity.
Show your math: "100 - (penalty 1) - (penalty 2) - ... = final score"

OUTPUT (must match exact schema):

1. score: number (0-100) - Your calculated score after applying all penalties
2. reasoning: string - Multi-line text containing:
   - Question type identified and why
   - Summary of penalties applied with calculations
   - Justification for final score using calibration rubric
3. keyDifferences: array of strings - Each item is one significant difference (3-7 items)
   IMPORTANT: This must be a JSON array, NOT a numbered list string
   Example: ["Model A says X, Model B says Y", "Model C omits key point Z"]
4. isGoodEnough: boolean - true if score >= threshold, false otherwise

Remember: 90%+ means near-identical. Be rigorous.`;
}
