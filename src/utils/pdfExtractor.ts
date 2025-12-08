import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse");

// PDFParse is a class that needs to be instantiated
const PDFParseClass = pdfParseModule.PDFParse;

/**
 * Extract text content from PDF base64 data
 * @param base64Data - Base64 encoded PDF data
 * @returns Extracted text content
 */
export async function extractPdfText(base64Data: string): Promise<string> {
  try {
    // Remove data URL prefix if present (e.g., "data:application/pdf;base64,")
    const base64Content = base64Data.includes(",")
      ? base64Data.split(",")[1]
      : base64Data;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Content, "base64");

    // Create instance of PDFParse with buffer data
    const parser = new PDFParseClass({ data: buffer });

    // Get text from PDF
    const result = await parser.getText();

    // Return extracted text
    return result.text.trim();
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    return "";
  }
}
