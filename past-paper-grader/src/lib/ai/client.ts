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

export async function gradePaper(
  paperText: string,
  markschemeText: string
): Promise<GradingResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const prompt = `You are an expert teacher grading a student exam paper. Analyze the following past paper and mark scheme, then provide detailed grading.

STUDENT PAPER:
${paperText}

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
    console.log("🤖 Starting AI grading with Gemini 2.0 Flash...");
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://papergrader.app",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
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
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ OpenRouter API error:", response.status, errorData);
      throw new Error(`AI grading failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("❌ Empty response from OpenRouter API");
      throw new Error("Empty response from AI - check API status");
    }

    console.log("📝 Received response from AI, parsing JSON...");
    
    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                       content.match(/\{[\s\S]*\}/);

    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    
    if (!jsonStr) {
      console.error("❌ Could not extract JSON from response:", content.substring(0, 200));
      throw new Error("Invalid JSON in AI response");
    }

    const result: GradingResult = JSON.parse(jsonStr.trim());
    
    console.log(`✅ AI grading successful: ${result.totalScore}/${result.maxPossibleScore}`);
    return result;
  } catch (error) {
    console.error("❌ Grading error:", error);
    throw new Error(`AI grading failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
