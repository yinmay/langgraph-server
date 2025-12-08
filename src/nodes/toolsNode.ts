import { MessagesAnnotation } from "@langchain/langgraph";
import { BaseMessage, ToolMessage } from "@langchain/core/messages";
import { toolsByName } from "../tools.js";

export async function toolsNode(state: typeof MessagesAnnotation.State) {
  const messages = state.messages as BaseMessage[];
  const lastMessage = messages[messages.length - 1];
  const toolMessages: ToolMessage[] = [];

  if (lastMessage && "tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls)) {
    // 执行所有工具调用
    for (const toolCall of lastMessage.tool_calls) {
      const tool = toolsByName[toolCall.name];
      if (tool) {
        const result = await tool.invoke(toolCall.args);
        toolMessages.push(
          new ToolMessage({
            content: JSON.stringify(result),
            tool_call_id: toolCall.id,
          })
        );
      }
    }
  }

  return { messages: toolMessages };
}
