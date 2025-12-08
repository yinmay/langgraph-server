import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { SystemMessage } from "@langchain/core/messages";
import { model } from "../config/model.js";
import { SYSTEM_PROMPT } from "../config/prompt.js";

// Define the agent state with pdfContent field
export const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  pdfContent: Annotation<string>({
    reducer: (current, update) => update ?? current,
    default: () => "",
  }),
});

export async function callModel(state: typeof AgentState.State) {
  const { messages, pdfContent } = state;

  // Build system prompt
  let systemPrompt = SYSTEM_PROMPT;

  // If PDF content exists, add it to system prompt with instructions
  if (pdfContent && pdfContent.trim()) {
    systemPrompt = `${SYSTEM_PROMPT}

## PDF 文档内容

用户已上传以下 PDF 文档，请基于这些内容回答用户的问题：

${pdfContent}

---

请根据上述 PDF 文档内容，结合用户的问题进行准确、详细的回答。如果问题与 PDF 内容相关，请引用相关部分；如果问题超出 PDF 范围，请如实说明。`;
  }

  // Add system prompt if it's the first message
  const messagesWithSystem = messages.length > 0 && !(messages[0] instanceof SystemMessage)
    ? [new SystemMessage(systemPrompt), ...messages]
    : messages;

  const response = await model.invoke(messagesWithSystem);
  return { messages: [response] };
}
