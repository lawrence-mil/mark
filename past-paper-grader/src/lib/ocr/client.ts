import { Mistral } from "@mistralai/mistralai";
import { getCachedOCR, cacheOCR } from "../cache/client";
import { createHash } from "crypto";

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY || "" });

function resolveUrl(url: string): string {
  if (url.startsWith("/api/file/")) {
    let baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL || "https://markit-production-490c.up.railway.app";
    if (!baseUrl.startsWith("http")) {
      baseUrl = "https://" + baseUrl;
    }
    return `${baseUrl}${url}`;
  }
  return url;
}

export async function extractTextFromFile(fileUrl: string): Promise<string> {
  const fileHash = createHash("sha256").update(fileUrl).digest("hex");

  const cached = await getCachedOCR(fileHash);
  if (cached) {
    console.log("✅ Returning cached OCR result");
    return cached;
  }

  const resolvedUrl = resolveUrl(fileUrl);
  console.log("📸 OCR processing image from:", resolvedUrl);

  try {
    const response = await mistral.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "image_url",
        imageUrl: resolvedUrl,
      },
    });

    const extractedText = response.pages?.map((page: any) => page.markdown || "").join("\n\n") || "";
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("OCR returned empty text - check if file is readable");
    }

    console.log(`✅ OCR successful, extracted ${extractedText.length} characters`);
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
  if (cached) {
    console.log("✅ Returning cached PDF OCR result");
    return cached;
  }

  const resolvedUrl = resolveUrl(fileUrl);
  console.log("📄 OCR processing PDF from:", resolvedUrl);

  try {
    const response = await mistral.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: resolvedUrl,
      },
    });

    const extractedText = response.pages?.map((page: any) => page.markdown || "").join("\n\n") || "";
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("OCR returned empty text - check if PDF is readable");
    }

    console.log(`✅ PDF OCR successful, extracted ${extractedText.length} characters from ${response.pages?.length || 0} pages`);
    await cacheOCR(fileHash, extractedText);
    return extractedText;
  } catch (error) {
    console.error("❌ PDF OCR failed:", error);
    throw new Error(`PDF OCR failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
