import Exa from "exa-js";
import { extractTextFromFile, extractTextFromPDF } from "../ocr/client";

function toProxyUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const keyParam = urlObj.searchParams.get("X-Amz-Key");
    if (keyParam) {
      return `/api/file/${encodeURIComponent(keyParam)}`;
    }
    const pathParts = urlObj.pathname.split("/");
    const key = pathParts[pathParts.length - 1];
    if (key) {
      return `/api/file/${encodeURIComponent(decodeURIComponent(key))}`;
    }
  } catch (e) {
    console.error("Failed to parse URL:", e);
  }
  return url;
}

export async function detectAndFetchMarkscheme(paperUrls: string[]): Promise<{ found: boolean; text?: string; metadata?: any }> {
  try {
    if (!paperUrls || paperUrls.length === 0) {
      console.warn("⚠️ No paper URLs provided for markscheme detection");
      return { found: false };
    }

    // 1. Extract text from the first page/file of the paper to identify it
    const firstPageUrl = paperUrls[0];
    const proxyUrl = toProxyUrl(firstPageUrl);
    let paperText = "";
    
    console.log(`📖 Extracting text from first page for identification...`);
    if (firstPageUrl.endsWith(".txt")) {
      const response = await fetch(firstPageUrl);
      paperText = await response.text();
    } else if (firstPageUrl.endsWith(".pdf")) {
      paperText = await extractTextFromPDF(proxyUrl);
    } else {
      paperText = await extractTextFromFile(proxyUrl);
    }

    // Limit text to avoid huge prompts if the first page is somehow huge
    const textSnippet = paperText.slice(0, 4000);

    // 2. Identify the paper using OpenRouter
    const extractPrompt = `
    Analyze the following text from the first page of an exam paper and extract the following information:
    - Exam board (e.g., AQA, Edexcel, OCR, CIE)
    - Subject (e.g., Computer Science, Mathematics)
    - Paper name or code (e.g., Paper 1, 8520/1)
    - Year or session (e.g., June 2023, 2021)
    
    Return ONLY a JSON object with keys: examBoard, subject, paperName, year. If you can't find a piece of info, leave it as an empty string.
    
    Text:
    ${textSnippet}
    `;

    let metadata = { examBoard: "", subject: "", paperName: "", year: "" };
    try {
      console.log("🔍 Identifying exam paper metadata...");
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://papergrader.app",
        },
        body: JSON.stringify({
          model: "mistralai/mistral-7b-instruct", // Fast and cheap for extraction
          messages: [{ role: "user", content: extractPrompt }],
          response_format: { type: "json_object" }
        })
      });
      
      const data = await response.json();
      const content = data.choices[0].message.content;
      metadata = JSON.parse(content);
      console.log("✅ Extracted metadata:", metadata);
    } catch (e) {
      console.error("⚠️ Failed to extract metadata:", e);
      // Fallback metadata if extraction fails completely
      metadata = {
        examBoard: "GCSE/A-Level",
        subject: "Exam",
        paperName: "Paper",
        year: ""
      };
    }

    // If we don't have enough info, we can't reliably search
    if (!metadata.subject && !metadata.paperName) {
      console.warn("⚠️ Not enough metadata to search for markscheme");
      return { found: false, metadata };
    }

    const searchQuery = `${metadata.examBoard} ${metadata.subject} ${metadata.paperName} ${metadata.year} mark scheme`;
    console.log(`🔎 Searching for: ${searchQuery}`);
    
    // 3. Search using Perplexity Sonar via OpenRouter
    try {
      console.log(`🌐 Searching via Perplexity Sonar...`);
      const sonarResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://papergrader.app",
        },
        body: JSON.stringify({
          model: "perplexity/sonar-small-online", 
          messages: [{ role: "user", content: `Find the official mark scheme for the following exam: ${searchQuery}. Provide the full text of the mark scheme if you can find it. If you cannot find the actual mark scheme content, reply with "MARK_SCHEME_NOT_FOUND".` }]
        })
      });
      
      const sonarData = await sonarResponse.json();
      const sonarContent = sonarData.choices?.[0]?.message?.content || "";
      
      if (sonarContent && !sonarContent.includes("MARK_SCHEME_NOT_FOUND") && sonarContent.length > 200) {
        console.log(`✅ Found markscheme via Sonar (${sonarContent.length} chars)`);
        return {
          found: true,
          text: sonarContent,
          metadata
        };
      }
      console.warn("⚠️ Sonar didn't find markscheme content");
    } catch (sonarErr) {
      console.error("⚠️ Sonar search failed:", sonarErr);
    }

    // 4. Fallback to Exa API
    try {
      console.log(`📚 Fallback: Searching with Exa API...`);
      const exa = new Exa(process.env.EXA_API_KEY as string);
      
      const result = await exa.searchAndContents(`${searchQuery} filetype:pdf`, {
        type: "auto",
        numResults: 1,
        text: true
      });

      if (result.results && result.results.length > 0 && result.results[0].text) {
        console.log(`✅ Found markscheme via Exa (${result.results[0].text.length} chars)`);
        return {
          found: true,
          text: result.results[0].text,
          metadata
        };
      }
      console.warn("⚠️ Exa API didn't find markscheme");
    } catch (exaErr) {
      console.error("⚠️ Exa search error:", exaErr);
    }

    console.log("❌ Could not auto-detect markscheme via any method");
    return { found: false, metadata };
  } catch (error) {
    console.error("❌ Detect and fetch error:", error);
    return { found: false };
  }
}
