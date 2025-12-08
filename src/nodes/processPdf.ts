import { extractPdfText } from "../utils/pdfExtractor.js";
import { AgentState } from "./callModel.js";

export async function processPdf(state: typeof AgentState.State) {
  const { messages } = state;

  let pdfContentAccumulator = "";

  // Process messages to handle PDF files
  const processedMessages = await Promise.all(
    messages.map(async (message) => {
      const content = message.content;

      // Check if content is an array with file type
      if (Array.isArray(content)) {
        const textParts: any[] = [];
        let hasPdf = false;

        for (const item of content) {
          if (item.type === "file" && item.mimeType === "application/pdf") {
            hasPdf = true;
            const filename = (item.metadata as any)?.filename || "unknown";
            console.log("=== PDF File Detected ===");
            console.log("Filename:", filename);
            console.log("Base64 Data (first 100 chars):", (item.data as any)?.substring?.(0, 100));

            // Extract text from PDF
            const pdfText = await extractPdfText((item.data as any) || "");

            if (pdfText) {
              console.log("PDF Text Extracted:", pdfText.substring(0, 200) + "...");
              console.log("PDF Text Length:", pdfText.length);
              console.log("========================");

              // Accumulate PDF content for system prompt
              pdfContentAccumulator += `\n\n### 文件：${filename}\n\n${pdfText}`;

              // Replace file with text content (simplified version)
              textParts.push({
                type: "text",
                text: `<${filename}>`,
              });
            } else {
              console.log("Failed to extract text from PDF");
              console.log("========================");

              // Replace with filename placeholder
              textParts.push({
                type: "text",
                text: `<${filename}>`,
              });
            }
          } else {
            // Keep other content types as-is
            textParts.push(item);
          }
        }

        // If there were PDF files, return modified message
        if (hasPdf) {
          return {
            ...message,
            content: textParts,
          };
        }
      }

      return message;
    })
  );

  return {
    messages: processedMessages,
    pdfContent: pdfContentAccumulator.trim(),
  };
}
