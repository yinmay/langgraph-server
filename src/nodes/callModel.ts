import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { tools } from "../tools.js";
import { SYSTEM_PROMPT } from "../config/prompt.js";

// Normal model with tools
const normalModel = new ChatOpenAI({
  model: "deepseek-chat",
  temperature: 0.7,
  openAIApiKey: process.env.DEEPSEEK_API_KEY,
  configuration: {
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  },
}).bindTools(tools);

// DeepSeek Reasoner model for complex tasks (like resume analysis)
// Note: Reasoner model does NOT support tool calling, so we don't bind tools
const reasonerModel = new ChatOpenAI({
  model: "deepseek-reasoner",
  temperature: 1.0,
  openAIApiKey: process.env.DEEPSEEK_API_KEY,
  configuration: {
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  },
});

// Define the agent state with pdfContent and lastMessageIsPdf fields
export const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  pdfContent: Annotation<string>({
    reducer: (current, update) => update ?? current,
    default: () => "",
  }),
  lastMessageIsPdf: Annotation<boolean>({
    reducer: (current, update) => update ?? current,
    default: () => false,
  }),
});

export async function callModel(state: typeof AgentState.State) {
  const { messages, pdfContent, lastMessageIsPdf } = state;

  // Select model based on whether last message contains PDF
  const model = lastMessageIsPdf ? reasonerModel : normalModel;

  console.log(`Using model: ${lastMessageIsPdf ? 'deepseek-reasoner' : 'deepseek-chat'}`);

  // Check if user uploaded a PDF file (even if extraction failed)
  const hasPdfFile = messages.some((msg) => {
    const content = msg.content;
    if (Array.isArray(content)) {
      return content.some((item: any) =>
        item.type === "text" && item.text && item.text.match(/<[^>]+\.pdf>/i)
      );
    }
    return false;
  });

  // Filter out file type items from messages (keep original messages unchanged)
  const newMessages = messages.map((message) => {
    const content = message.content;

    // Check if content is an array with file type
    if (Array.isArray(content)) {
      const filteredContent = content.filter((item: any) => item.type !== "file");

      // If content was filtered, return new message with filtered content
      if (filteredContent.length !== content.length) {
        return {
          ...message,
          content: filteredContent,
        };
      }
    }

    return message;
  });

  // Build system prompt
  let systemPrompt = SYSTEM_PROMPT;

  // If PDF content exists, add it to system prompt with instructions
  if (pdfContent && pdfContent.trim()) {
    systemPrompt = `${SYSTEM_PROMPT}

## PDF 简历内容

用户已上传以下 PDF 简历，请基于这些内容提供专业的评审和建议：

${pdfContent}

---

**重要提示**：
1. 首先向用户确认你已成功提取 PDF 内容，并简要总结简历的关键信息（如姓名、职位、工作经验年限等）
2. 然后根据用户的具体需求（优化简历、模拟面试等）提供相应的服务
3. 在分析简历时，要具体、专业，指出优点和可改进之处`;
  } else if (hasPdfFile) {
    // PDF file was uploaded but extraction failed
    systemPrompt = `${SYSTEM_PROMPT}

## PDF 提取失败

用户上传了 PDF 简历，但文件内容提取失败。

**请友好地告知用户**：
"您上传的 PDF 文件解析失败，可以直接把 PDF 内容复制粘贴到 AI 输入框，我将为您提供专业的简历优化建议。"`;
  }

  // Add system prompt if it's the first message (use filtered newMessages)
  const messagesWithSystem = newMessages.length > 0 && !(newMessages[0] instanceof SystemMessage)
    ? [new SystemMessage(systemPrompt), ...newMessages]
    : newMessages;

  const response = await model.invoke(messagesWithSystem);
  return { messages: [response] };
}
