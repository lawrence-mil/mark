import { Mistral } from "@mistralai/mistralai";
import { getCachedOCR, cacheOCR } from "../cache/client";
import { createHash } from "crypto";

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY || "" });

export async function extractTextFromFile(fileUrl: string): Promise<string> {
  // Generate hash for caching
  const fileHash = createHash("sha256").update(fileUrl).digest("hex");

  // Check cache
  const cached = await getCachedOCR(fileHash);
  if (cached) {
    return cached;
  }

  // Call Mistral OCR API
  const response = await mistral.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "image_url",
      imageUrl: fileUrl,
    },
  });

  const extractedText = response.pages?.map((page: any) => page.markdown || "").join("\n\n") || "";

  // Cache result
  await cacheOCR(fileHash, extractedText);

  return extractedText;
}

export async function extractTextFromPDF(fileUrl: string): Promise<string> {
  const fileHash = createHash("sha256").update(fileUrl).digest("hex");

  const cached = await getCachedOCR(fileHash);
  if (cached) {
    return cached;
  }

  const response = await mistral.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "document_url",
      documentUrl: fileUrl,
    },
  });

  const extractedText = response.pages?.map((page: any) => page.markdown || "").join("\n\n") || "";

  await cacheOCR(fileHash, extractedText);

  return extractedText;
}
