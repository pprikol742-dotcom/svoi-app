const DEEPSEEK_API_KEY = "sk-d1fd2d3298a24bde8a96649151fb7184";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export async function askDeepSeek(messages: DeepSeekMessage[]): Promise<DeepSeekResult> {
  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      stream: false,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`DeepSeek API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return {
    content: data?.choices?.[0]?.message?.content ?? "",
    usage: {
      promptTokens: data?.usage?.prompt_tokens ?? 0,
      completionTokens: data?.usage?.completion_tokens ?? 0,
      totalTokens: data?.usage?.total_tokens ?? 0,
    },
  };
}
