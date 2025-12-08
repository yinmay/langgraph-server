import { StateGraph, Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { TavilySearch } from "@langchain/tavily";


const tavilySearchTool = new TavilySearch({
  maxResults: 3,
  topic: "general",
});

const tools = [tavilySearchTool];

// Create a map of tools by name for easy lookup
const toolsByName: Record<string, typeof tavilySearchTool> = {
  [tavilySearchTool.name]: tavilySearchTool,
};

// 定义 tools 节点，处理工具调用
async function toolsNode(state: typeof MessagesAnnotation.State) {
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


// Define the agent state
const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
});

// Initialize the LLM with DeepSeek
const model = new ChatOpenAI({
  model: "deepseek-chat",
  temperature: 0.7,
  openAIApiKey: process.env.DEEPSEEK_API_KEY,
  configuration: {
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  },
}).bindTools(tools);

// Define the agent node
async function callModel(state: typeof AgentState.State) {
  const { messages } = state;
  const response = await model.invoke(messages);
  return { messages: [response] };
}

// Route function to determine next node
function routeModelOutput(state: typeof AgentState.State): string {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1] as AIMessage;

  // If the last message has tool calls, route to tools node
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  // Otherwise, end the workflow
  return "__end__";
}

// Create the graph
const workflow = new StateGraph(MessagesAnnotation)
  // Define the two nodes we will cycle between
  .addNode("callModel", callModel)
  .addNode("tools", toolsNode)
  // Set the entrypoint as `callModel`
  // This means that this node is the first one called
  .addEdge("__start__", "callModel")
  .addConditionalEdges(
    // First, we define the edges' source node. We use `callModel`.
    // This means these are the edges taken after the `callModel` node is called.
    "callModel",
    // Next, we pass in the function that will determine the sink node(s), which
    // will be called after the source node is called.
    routeModelOutput
  )
  // This means that after `tools` is called, `callModel` node is called next.
  .addEdge("tools", "callModel");

// Compile the graph
export const graph = workflow.compile();
