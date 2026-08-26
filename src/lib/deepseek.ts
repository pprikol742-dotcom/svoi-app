const DEEPSEEK_API_KEY = "sk-77f7b19d4a994bf5ac0da531047fa856";
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
      model: "deepseek-v4-flash",
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

export interface ItemAnalysis {
  title_guess: string;
  category_guess: string;
  price_min: number;
  price_max: number;
  description: string;
  search_keywords: string;
}

export interface DeepSeekVisionResult {
  analysis: ItemAnalysis | null;
  rawText: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

// Анализ фото товара через экспериментальную vision-модель DeepSeek.
// Изображение передаётся как base64 data URL, ответ запрашивается строго в JSON.
export async function analyzeItemPhoto(imageBase64DataUrl: string): Promise<DeepSeekVisionResult> {
  const systemPrompt = `Ты — помощник для доски объявлений в Луганске. Пользователь присылает фото товара, который хочет продать.
Определи, что это за товар, и верни ТОЛЬКО валидный JSON без markdown-разметки, строго в таком формате:
{
  "title_guess": "короткое название товара для объявления",
  "category_guess": "категория (например: Электроника, Транспорт, Дом и сад и т.д.)",
  "price_min": число (примерная минимальная рыночная цена в рублях),
  "price_max": число (примерная максимальная рыночная цена в рублях),
  "description": "краткое описание состояния и особенностей товара по фото, 1-2 предложения",
  "search_keywords": "2-3 ключевых слова для поиска похожих объявлений"
}
Если на фото не удаётся распознать товар — верни title_guess: "Не удалось распознать" и остальные поля пустыми/нулевыми.
Цены указывай ориентировочно по общим рыночным знаниям, честно предупреждая через description, если товар сложно оценить по одному фото.`;

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash-vision-exp",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Определи товар на фото, оцени примерную цену и опиши его для объявления." },
            { type: "image_url", image_url: { url: imageBase64DataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      stream: false,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`DeepSeek Vision API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const rawText: string = data?.choices?.[0]?.message?.content ?? "";
  const usage = {
    promptTokens: data?.usage?.prompt_tokens ?? 0,
    completionTokens: data?.usage?.completion_tokens ?? 0,
    totalTokens: data?.usage?.total_tokens ?? 0,
  };

  let analysis: ItemAnalysis | null = null;
  try {
    analysis = JSON.parse(rawText);
  } catch {
    analysis = null;
  }

  return { analysis, rawText, usage };
}
