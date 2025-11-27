import { StateGraph, Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

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
});

// Define the agent node
async function callModel(state: typeof AgentState.State) {
  const { messages } = state;
  const response = await model.invoke(messages);
  return { messages: [response] };
}

// Create the graph
const workflow = new StateGraph(AgentState)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent")
  .addEdge("agent", "__end__");

// Compile the graph
export const graph = workflow.compile();
