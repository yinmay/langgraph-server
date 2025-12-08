import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { SystemMessage } from "@langchain/core/messages";
import { model } from "../config/model.js";
import { SYSTEM_PROMPT } from "../config/prompt.js";
import { extractPdfText } from "../utils/pdfExtractor.js";

// Define the agent state
export const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
});

export async function callModel(state: typeof AgentState.State) {
  const { messages } = state;

  let hasPdfWithoutText = false;

  // Process messages to handle file content
  const processedMessages = await Promise.all(
    messages.map(async (message) => {
      const content = message.content;

      // Check if content is an array with file type
      if (Array.isArray(content)) {
        let hasFile = false;
        const textParts: string[] = [];

        for (const item of content) {
          if (item.type === "file" && item.mimeType === "application/pdf") {
            hasFile = true;
            const filename = (item.metadata as any)?.filename || "unknown";
            console.log("=== PDF File Detected ===");
            console.log("Filename:", filename);
            console.log("Base64 Data (first 100 chars):", (item.data as any)?.substring?.(0, 100));

            // Extract text from PDF
            const pdfText = await extractPdfText((item.data as any) || "");

            if (pdfText) {
              console.log("PDF Text Extracted:", pdfText.substring(0, 200) + "...");
              console.log("========================");
              textParts.push(`PDF 文件内容 (${filename}):\n${pdfText}`);
            } else {
              console.log("Failed to extract text from PDF");
              console.log("========================");
              textParts.push(`[PDF File: ${filename}]`);
            }
          } else if (item.type === "text") {
            textParts.push(String(item.text));
          }
        }

        // If there were files, check if there's any text content
        if (hasFile) {
          const hasTextContent = textParts.some(
            (part) => part.trim() && !part.startsWith("[PDF File:")
          );

          if (!hasTextContent) {
            hasPdfWithoutText = true;
          }

          return {
            ...message,
            content: textParts.join("\n"),
          };
        }
      }

      return message;
    })
  );

  // Prepare system prompt
  let systemPrompt = SYSTEM_PROMPT;

  // If PDF was uploaded without text content, add instruction to system prompt
  if (hasPdfWithoutText) {
    systemPrompt = `${SYSTEM_PROMPT}

重要提示：用户上传的 PDF 文件解析失败。请友好地告知用户：
"您上传的 PDF 文件解析失败，请直接把 PDF 内容复制粘贴到 AI 输入框，并发送给 AI。"`;
  }

  // Add system prompt if it's the first message
  const messagesWithSystem = processedMessages.length > 0 && !(processedMessages[0] instanceof SystemMessage)
    ? [new SystemMessage(systemPrompt), ...processedMessages]
    : processedMessages;

  const response = await model.invoke(messagesWithSystem);
  return { messages: [response] };
}
