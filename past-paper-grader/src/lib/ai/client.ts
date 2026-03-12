interface GradingResult {
  totalScore: number;
  maxPossibleScore: number;
  subject: string;
  examBoard: string;
  feedback: string;
  questions: Array<{
    questionNumber: number;
    questionText: string;
    studentAnswer: string;
    markschemeAnswer: string;
    score: number;
    maxScore: number;
    feedback: string;
    improvementSuggestions: string;
  }>;
}

interface ImageGradingInput {
  paperImageUrl: string;
  markschemeText: string;
}

export async function gradePaper(
  paperText: string,
  markschemeText: string
): Promise<GradingResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const prompt = `You are an expert teacher grading a student exam paper. Analyze the following past paper and mark scheme, then provide detailed grading.

MARK SCHEME:
${markschemeText}

Please grade this paper following these instructions:
1. Identify each question and sub-question
2. Compare student answers against the mark scheme
3. Award marks according to the mark scheme criteria
4. Provide specific feedback for each question
5. Suggest improvements for incorrect or incomplete answers

Return your response as a valid JSON object with this exact structure:
{
  "totalScore": number,
  "maxPossibleScore": number,
  "subject": "subject name",
  "examBoard": "exam board name",
  "feedback": "overall feedback summary",
  "questions": [
    {
      "questionNumber": number,
      "questionText": "the question text",
      "studentAnswer": "student's answer",
      "markschemeAnswer": "expected answer from mark scheme",
      "score": number,
      "maxScore": number,
      "feedback": "specific feedback for this question",
      "improvementSuggestions": "how to improve this answer"
    }
  ]
}

Ensure the JSON is valid and parseable. Do not include any markdown formatting or additional text outside the JSON.`;

  try {
    console.log("🤖 Starting AI grading...");
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://papergrader.app",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-2024-11-20",
        messages: [
          {
            role: "system",
            content: "You are a teacher grading a student answer. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ OpenRouter API error:", response.status, errorData);
      throw new Error(`AI grading failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from AI");
    }

    console.log("📝 Received response from AI, parsing JSON...");
    console.log("🔍 Raw AI response (first 500 chars):", content.substring(0, 500));
    
    // Extract JSON from response
    let jsonStr = "";
    const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1];
    } else {
      const jsonObjMatch = content.match(/\{[\s\S]*\}/);
      if (jsonObjMatch) {
        jsonStr = jsonObjMatch[0];
      } else {
        jsonStr = content;
      }
    }
    
    if (!jsonStr || jsonStr.trim().length === 0) {
      throw new Error("Invalid JSON in AI response");
    }

    jsonStr = jsonStr.trim();
    
    let result: GradingResult;
    try {
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      const fixedJson = jsonStr
        .replace(/,\s*}/g, "}")
        .replace(/,\s*\]/g, "]")
        .replace(/\n/g, " ");
      result = JSON.parse(fixedJson);
    }
    
    console.log(`✅ AI grading successful: ${result.totalScore}/${result.maxPossibleScore}`);
    return result;
  } catch (error) {
    console.error("❌ Grading error:", error);
    throw new Error(`AI grading failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Grade directly from images - no OCR needed
export async function gradeFromImages(input: ImageGradingInput): Promise<GradingResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const prompt = `You are an expert teacher grading a student exam paper. 

The student has uploaded an exam paper as an image. I've also provided the mark scheme below.

MARK SCHEME:
${input.markschemeText}

Your task:
1. Look at the exam paper image and identify each question
2. Grade each question based on the mark scheme
3. Award marks appropriately
4. Provide feedback for each question
5. Suggest improvements

Return your response as valid JSON:
{
  "totalScore": number,
  "maxPossibleScore": number,
  "subject": "subject name",
  "examBoard": "exam board name", 
  "feedback": "overall feedback",
  "questions": [
    {
      "questionNumber": number,
      "questionText": "question from paper",
      "studentAnswer": "answer visible in image",
      "markschemeAnswer": "correct answer from scheme",
      "score": number,
      "maxScore": number,
      "feedback": "feedback for this question",
      "improvementSuggestions": "how to improve"
    }
  ]
}`;

  try {
    console.log("🤖 Grading from image...");
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://papergrader.app",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-2024-11-20",
        messages: [
          {
            role: "system",
            content: "You are a teacher grading exams. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: input.paperImageUrl } }
            ]
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`AI grading failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from AI");
    }

    // Extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    
    const result: GradingResult = JSON.parse(jsonStr.trim());
    console.log(`✅ Image grading: ${result.totalScore}/${result.maxPossibleScore}`);
    return result;
  } catch (error) {
    console.error("❌ Image grading error:", error);
    throw new Error(`AI grading failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
