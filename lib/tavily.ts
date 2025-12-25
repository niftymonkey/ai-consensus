export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyApiResponse {
  query: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
    raw_content?: string;
  }>;
  response_time: number;
}

interface TavilySearchOptions {
  maxResults?: number;
  searchDepth?: "basic" | "advanced";
  includeAnswer?: boolean;
}

/**
 * Search the web using Tavily API
 */
export async function searchTavily(
  query: string,
  apiKey: string,
  options: TavilySearchOptions = {}
): Promise<TavilySearchResult[]> {
  const { maxResults = 5, searchDepth = "basic", includeAnswer = false } = options;

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      search_depth: searchDepth,
      include_answer: includeAnswer,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavily API error (${response.status}): ${errorText}`);
  }

  const data: TavilyApiResponse = await response.json();

  return data.results.map((result) => ({
    title: result.title,
    url: result.url,
    content: result.content,
    score: result.score,
  }));
}
