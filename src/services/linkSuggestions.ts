/**
 * Link Suggestions Service
 *
 * Provides AI-powered paragraph linking suggestions using semantic similarity.
 */
import { supabase } from '../lib/supabase';

export interface LinkSuggestion {
  sourceParagraphId: string;
  targetParagraphId: string;
  similarity: number;
  reason: string;
}

/**
 * Get paragraph link suggestions for a document using cached ML results
 */
export const getLinkSuggestions = async (
  documentId: string,
  userId: string
): Promise<LinkSuggestion[]> => {
  try {
    // Fetch paragraphs
    const { data: paragraphs, error } = await supabase
      .from('paragraphs')
      .select('id, content')
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .order('position');

    if (error) throw error;
    if (!paragraphs || paragraphs.length < 2) return [];

    // Check ML cache for existing embeddings
    const suggestions: LinkSuggestion[] = [];

    // For now, return simple content-based suggestions
    // TODO: Implement actual semantic similarity using ML models
    for (let i = 0; i < paragraphs.length; i++) {
      for (let j = i + 1; j < paragraphs.length; j++) {
        const similarity = calculateSimpleSimilarity(
          paragraphs[i].content,
          paragraphs[j].content
        );

        if (similarity > 0.3) {
          suggestions.push({
            sourceParagraphId: paragraphs[i].id,
            targetParagraphId: paragraphs[j].id,
            similarity,
            reason: 'Similar content detected',
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
  } catch (error) {
    console.error('Error generating link suggestions:', error);
    return [];
  }
};

/**
 * Simple word-based similarity calculation
 * TODO: Replace with actual semantic embeddings
 */
const calculateSimpleSimilarity = (text1: string, text2: string): number => {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
};

/**
 * Input data for ML inference - typically text embeddings or features
 */
export type MLInputData = string | number[] | Record<string, unknown>;

/**
 * Output data from ML inference - predictions, embeddings, or classifications
 */
export type MLOutputData = number | number[] | Record<string, unknown>;

/**
 * Cache ML inference results for reuse
 * @param modelName - Name/identifier of the ML model
 * @param modelVersion - Version of the model
 * @param inputType - Type classification of the input (e.g., "text", "embedding")
 * @param inputData - The input data that was processed
 * @param outputData - The output/result from the model
 * @param processingTimeMs - Processing time in milliseconds
 */
export const cacheMLResult = async (
  modelName: string,
  modelVersion: string,
  inputType: string,
  inputData: MLInputData,
  outputData: MLOutputData,
  processingTimeMs: number
) => {
  const inputHash = await hashInput(JSON.stringify(inputData));

  await supabase.from('ml_cache').upsert(
    {
      model_name: modelName,
      model_version: modelVersion,
      input_type: inputType,
      input_hash: inputHash,
      input_data: inputData,
      output_data: outputData,
      processing_time_ms: processingTimeMs,
      accessed_at: new Date().toISOString(),
      access_count: 1,
    },
    {
      onConflict: 'model_name,model_version,input_hash',
    }
  );
};

/**
 * Get cached ML result from previous inference
 * @param modelName - Name/identifier of the ML model
 * @param modelVersion - Version of the model
 * @param inputData - The input data to look up in cache
 * @returns The cached output data, or null if not found
 */
export const getCachedMLResult = async (
  modelName: string,
  modelVersion: string,
  inputData: MLInputData
): Promise<MLOutputData | null> => {
  const inputHash = await hashInput(JSON.stringify(inputData));

  const { data, error } = await supabase
    .from('ml_cache')
    .select('output_data, id')
    .eq('model_name', modelName)
    .eq('model_version', modelVersion)
    .eq('input_hash', inputHash)
    .single();

  if (error || !data) return null;

  // Update access count
  await supabase
    .from('ml_cache')
    .update({
      accessed_at: new Date().toISOString(),
      access_count: supabase.rpc('increment', { row_id: data.id }),
    })
    .eq('id', data.id);

  return data.output_data;
};

/**
 * Hash input data for caching
 */
const hashInput = async (input: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};
