import DocumentIntelligence, { getLongRunningPoller, isUnexpected } from "@azure-rest/ai-document-intelligence";
import { getCachedOCR, cacheOCR } from "../cache/client";
import { createHash } from "crypto";

const AZURE_ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || "https://pastpaperr.cognitiveservices.azure.com";
const AZURE_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY || "";

let client: any = null;

function getClient() {
  if (!client) {
    client = DocumentIntelligence(AZURE_ENDPOINT, { key: AZURE_KEY });
  }
  return client;
}

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

async function extractWithAzure(url: string): Promise<string> {
  console.log(`🔍 Azure extracting from: ${url.substring(0, 50)}...`);
  
  const client = getClient();
  
  try {
    const initialResponse = await client
      .path("/documentModels/{modelId}:analyze", "prebuilt-layout")
      .post({
        contentType: "application/json",
        body: {
          urlSource: url,
        },
      });

    if (isUnexpected(initialResponse)) {
      const errorBody = initialResponse.body;
      throw new Error(`Azure error: ${JSON.stringify(errorBody)}`);
    }

    const poller = getLongRunningPoller(client, initialResponse);
    const analyzeResult = (await poller.pollUntilDone()).body.analyzeResult;

    const pages = analyzeResult?.pages || [];
    const extractedText = pages.map((page: any) => {
      return page.lines?.map((line: any) => line.content).join("\n") || "";
    }).join("\n\n");

    return extractedText;
  } catch (error) {
    console.error("Azure extraction error:", error);
    throw error;
  }
}

export async function extractTextFromFile(fileUrl: string): Promise<string> {
  const fileHash = createHash("sha256").update(fileUrl).digest("hex");

  const cached = await getCachedOCR(fileHash);
  if (cached) return cached;

  const resolvedUrl = resolveUrl(fileUrl);
  console.log("📸 Azure OCR processing image");

  try {
    const extractedText = await extractWithAzure(resolvedUrl);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("OCR returned empty text");
    }

    console.log(`✅ OCR: ${extractedText.length} chars`);
    await cacheOCR(fileHash, extractedText);
    return extractedText;
  } catch (error) {
    console.error("❌ OCR failed:", error);
    throw new Error(`OCR failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function extractTextFromPDF(fileUrl: string): Promise<string> {
  const fileHash = createHash("sha256").update(fileUrl).digest("hex");

  const cached = await getCachedOCR(fileHash);
  if (cached) return cached;

  const resolvedUrl = resolveUrl(fileUrl);
  console.log("📄 Azure OCR processing PDF");

  try {
    const extractedText = await extractWithAzure(resolvedUrl);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("OCR returned empty text");
    }

    console.log(`✅ PDF OCR: ${extractedText.length} chars`);
    await cacheOCR(fileHash, extractedText);
    return extractedText;
  } catch (error) {
    console.error("❌ PDF OCR failed:", error);
    throw new Error(`PDF OCR failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
