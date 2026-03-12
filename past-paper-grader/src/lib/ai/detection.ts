import Exa from "exa-js";
import { getCachedOCR, cacheOCR } from "../cache/client";
import { createHash } from "crypto";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

function resolveUrl(url: string): string {
  if (url.startsWith("http")) {
    return url;
  }
  
  if (url.startsWith("/api/file/")) {
    const key = decodeURIComponent(url.replace("/api/file/", ""));
    return `https://pub-8e3e109443c141c28ee3762d7476813f.r2.dev/${key}`;
  }
  
  return url;
}

async function extractTextFromImage(imageUrl: string): Promise<{ text: string; metadata: any }> {
  const resolvedUrl = resolveUrl(imageUrl);
  
  const prompt = `Extract ALL text from this exam paper image. Include:
- All questions and their numbers
- Any diagrams or tables (describe them)
- Headers, footers, page numbers
- Format mathematical equations in LaTeX where applicable

Return as JSON:
{
  "examBoard": "...",
  "subject": "...",
  "paperName": "...",
  "year": "...",
  "extractedText": "..."
}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://papergrader.app",
    },
    body: JSON.stringify({
        model: "openai/gpt-4o-2024-11-20",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: resolvedUrl } }
          ]
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`AI extraction failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("Empty response from AI");
  }

  try {
    const result = JSON.parse(content);
    return {
      text: result.extractedText || content,
      metadata: {
        examBoard: result.examBoard || "",
        subject: result.subject || "",
        paperName: result.paperName || "",
        year: result.year || ""
      }
    };
  } catch {
    return { text: content, metadata: {} };
  }
}

function isPdfUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  return urlLower.endsWith(".pdf") || urlLower.includes(".pdf?");
}

function extractFileName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const fileName = pathParts[pathParts.length - 1];
    return fileName || "";
  } catch {
    return "";
  }
}

export async function detectAndFetchMarkscheme(paperUrls: string[]): Promise<{ found: boolean; text?: string; metadata?: any }> {
  try {
    if (!paperUrls || paperUrls.length === 0) {
      console.warn("⚠️ No paper URLs provided");
      return { found: false };
    }

    const firstPageUrl = paperUrls[0];
    const fileName = extractFileName(firstPageUrl);
    
    console.log(`📷 Processing: ${fileName}`);

    let paperText = "";
    let metadata: any = {};

    // Use AI to extract text from image directly
    if (!isPdfUrl(firstPageUrl)) {
      console.log("🔍 Using multimodal AI to extract text from image...");
      const result = await extractTextFromImage(firstPageUrl);
      paperText = result.text;
      metadata = result.metadata;
    } else {
      // For PDFs, try to use AI anyway (some models support PDF)
      // For now, return not found for PDFs - user needs to convert to images
      console.warn("⚠️ PDF not supported yet - convert to images");
      return { found: false, metadata: { error: "PDF not supported. Please convert to images." } };
    }

    if (!paperText || paperText.trim().length < 50) {
      console.warn("⚠️ Not enough text extracted");
      return { found: false, metadata };
    }

    console.log(`✅ Extracted ${paperText.length} chars`);
    console.log(`📋 Metadata:`, metadata);

    // Build search query
    let searchQuery = "";
    if (metadata.examBoard || metadata.subject || metadata.paperName || metadata.year) {
      const parts = [metadata.examBoard, metadata.subject, metadata.paperName, metadata.year].filter(Boolean);
      searchQuery = parts.join(" ") + " mark scheme";
    } else if (fileName) {
      searchQuery = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") + " mark scheme";
    }

    if (!searchQuery) {
      return { found: false, metadata };
    }

    console.log(`🔎 Searching: ${searchQuery}`);

    // Use Exa to find mark scheme
    const exa = new Exa(process.env.EXA_API_KEY as string);
    
    const result = await exa.searchAndContents(searchQuery, {
      type: "auto",
      numResults: 5,
      text: true
    });

    if (result.results && result.results.length > 0) {
      for (const r of result.results) {
        if (r.text && r.text.length > 300) {
          console.log(`✅ Found: ${r.title}`);
          return {
            found: true,
            text: r.text,
            metadata
          };
        }
      }
    }

    console.log("❌ No markscheme found");
    return { found: false, metadata };
  } catch (error) {
    console.error("❌ Detect error:", error);
    return { found: false };
  }
}
