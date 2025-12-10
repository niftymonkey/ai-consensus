import { sql } from "@vercel/postgres";

export interface ConsensusConversation {
  id: number;
  userId: number;
  prompt: string;
  maxRounds: number;
  consensusThreshold: number;
  finalConsensusText: string | null;
  finalConsensusScore: number | null;
  roundsCompleted: number | null;
  createdAt: Date;
}

export interface ConsensusRound {
  id: number;
  conversationId: number;
  roundNumber: number;
  modelResponses: Record<string, string>; // { "model-1": "response", "model-2": "response" }
  evaluationReasoning: string | null;
  evaluationKeyDifferences: string[] | null;
  consensusScore: number | null;
  refinementPrompts: Record<string, string> | null; // { "model-1": "prompt", "model-2": "prompt" }
  createdAt: Date;
}

/**
 * Create a new consensus conversation
 */
export async function createConsensusConversation(
  userId: string,
  prompt: string,
  maxRounds: number,
  consensusThreshold: number
): Promise<number> {
  const result = await sql<{ id: number }>`
    INSERT INTO consensus_conversations (user_id, prompt, max_rounds, consensus_threshold)
    VALUES (${userId}, ${prompt}, ${maxRounds}, ${consensusThreshold})
    RETURNING id
  `;

  return result.rows[0].id;
}

/**
 * Save a consensus round with all meta-conversation data
 */
export async function saveConsensusRound(
  conversationId: number,
  roundData: {
    roundNumber: number;
    modelResponses: Record<string, string>;
    evaluation: {
      reasoning: string;
      keyDifferences: string[];
      score: number;
    };
    refinementPrompts?: Record<string, string>;
  }
): Promise<void> {
  await sql`
    INSERT INTO consensus_rounds (
      conversation_id,
      round_number,
      model_responses,
      evaluation_reasoning,
      evaluation_key_differences,
      consensus_score,
      refinement_prompts
    )
    VALUES (
      ${conversationId},
      ${roundData.roundNumber},
      ${JSON.stringify(roundData.modelResponses)},
      ${roundData.evaluation.reasoning},
      ${JSON.stringify(roundData.evaluation.keyDifferences)},
      ${roundData.evaluation.score},
      ${roundData.refinementPrompts ? JSON.stringify(roundData.refinementPrompts) : null}
    )
    ON CONFLICT (conversation_id, round_number)
    DO UPDATE SET
      model_responses = ${JSON.stringify(roundData.modelResponses)},
      evaluation_reasoning = ${roundData.evaluation.reasoning},
      evaluation_key_differences = ${JSON.stringify(roundData.evaluation.keyDifferences)},
      consensus_score = ${roundData.evaluation.score},
      refinement_prompts = ${roundData.refinementPrompts ? JSON.stringify(roundData.refinementPrompts) : null}
  `;
}

/**
 * Update conversation with final result
 */
export async function updateConversationResult(
  conversationId: number,
  finalConsensusText: string,
  finalConsensusScore: number,
  roundsCompleted: number
): Promise<void> {
  await sql`
    UPDATE consensus_conversations
    SET
      final_consensus_text = ${finalConsensusText},
      final_consensus_score = ${finalConsensusScore},
      rounds_completed = ${roundsCompleted}
    WHERE id = ${conversationId}
  `;
}

/**
 * Get conversation history for a user
 */
export async function getConversationHistory(
  userId: string,
  limit: number = 20
): Promise<ConsensusConversation[]> {
  const result = await sql<{
    id: number;
    user_id: number;
    prompt: string;
    max_rounds: number;
    consensus_threshold: number;
    final_consensus_text: string | null;
    final_consensus_score: number | null;
    rounds_completed: number | null;
    created_at: Date;
  }>`
    SELECT *
    FROM consensus_conversations
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    prompt: row.prompt,
    maxRounds: row.max_rounds,
    consensusThreshold: row.consensus_threshold,
    finalConsensusText: row.final_consensus_text,
    finalConsensusScore: row.final_consensus_score,
    roundsCompleted: row.rounds_completed,
    createdAt: row.created_at,
  }));
}

/**
 * Get full conversation with all rounds
 */
export async function getConversationWithRounds(
  conversationId: number,
  userId: string
): Promise<{
  conversation: ConsensusConversation;
  rounds: ConsensusRound[];
} | null> {
  // Get conversation
  const convResult = await sql<{
    id: number;
    user_id: number;
    prompt: string;
    max_rounds: number;
    consensus_threshold: number;
    final_consensus_text: string | null;
    final_consensus_score: number | null;
    rounds_completed: number | null;
    created_at: Date;
  }>`
    SELECT *
    FROM consensus_conversations
    WHERE id = ${conversationId} AND user_id = ${userId}
  `;

  if (convResult.rows.length === 0) {
    return null;
  }

  const conversation: ConsensusConversation = {
    id: convResult.rows[0].id,
    userId: convResult.rows[0].user_id,
    prompt: convResult.rows[0].prompt,
    maxRounds: convResult.rows[0].max_rounds,
    consensusThreshold: convResult.rows[0].consensus_threshold,
    finalConsensusText: convResult.rows[0].final_consensus_text,
    finalConsensusScore: convResult.rows[0].final_consensus_score,
    roundsCompleted: convResult.rows[0].rounds_completed,
    createdAt: convResult.rows[0].created_at,
  };

  // Get rounds
  const roundsResult = await sql<{
    id: number;
    conversation_id: number;
    round_number: number;
    model_responses: string;
    evaluation_reasoning: string | null;
    evaluation_key_differences: string | null;
    consensus_score: number | null;
    refinement_prompts: string | null;
    created_at: Date;
  }>`
    SELECT *
    FROM consensus_rounds
    WHERE conversation_id = ${conversationId}
    ORDER BY round_number ASC
  `;

  const rounds: ConsensusRound[] = roundsResult.rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    roundNumber: row.round_number,
    modelResponses: JSON.parse(row.model_responses),
    evaluationReasoning: row.evaluation_reasoning,
    evaluationKeyDifferences: row.evaluation_key_differences
      ? JSON.parse(row.evaluation_key_differences)
      : null,
    consensusScore: row.consensus_score,
    refinementPrompts: row.refinement_prompts
      ? JSON.parse(row.refinement_prompts)
      : null,
    createdAt: row.created_at,
  }));

  return { conversation, rounds };
}

/**
 * Get user's consensus preferences
 */
export async function getUserConsensusPreferences(
  userId: string
): Promise<{
  maxRounds: number;
  consensusThreshold: number;
  evaluatorModel: string;
}> {
  const result = await sql<{
    consensus_max_rounds: number;
    consensus_threshold: number;
    consensus_evaluator_model: string;
  }>`
    SELECT consensus_max_rounds, consensus_threshold, consensus_evaluator_model
    FROM users
    WHERE id = ${userId}
  `;

  if (result.rows.length === 0) {
    // Return defaults if user not found
    return {
      maxRounds: 3,
      consensusThreshold: 80,
      evaluatorModel: "claude-3-7-sonnet-20250219",
    };
  }

  return {
    maxRounds: result.rows[0].consensus_max_rounds,
    consensusThreshold: result.rows[0].consensus_threshold,
    evaluatorModel: result.rows[0].consensus_evaluator_model,
  };
}

/**
 * Update user's consensus preferences
 */
export async function updateUserConsensusPreferences(
  userId: string,
  preferences: {
    maxRounds?: number;
    consensusThreshold?: number;
    evaluatorModel?: string;
  }
): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (preferences.maxRounds !== undefined) {
    updates.push("consensus_max_rounds = $" + (values.length + 1));
    values.push(preferences.maxRounds);
  }

  if (preferences.consensusThreshold !== undefined) {
    updates.push("consensus_threshold = $" + (values.length + 1));
    values.push(preferences.consensusThreshold);
  }

  if (preferences.evaluatorModel !== undefined) {
    updates.push("consensus_evaluator_model = $" + (values.length + 1));
    values.push(preferences.evaluatorModel);
  }

  if (updates.length === 0) {
    return;
  }

  // Using raw SQL for dynamic updates
  const query = `
    UPDATE users
    SET ${updates.join(", ")}
    WHERE id = $${values.length + 1}
  `;

  await sql.query(query, [...values, userId]);
}
