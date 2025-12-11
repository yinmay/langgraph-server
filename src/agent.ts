import { StateGraph } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import { callModel, AgentState } from "./nodes/callModel.js";
import { toolsNode } from "./nodes/toolsNode.js";
import { processPdf } from "./nodes/processPdf.js";
import { createCheckpointer } from "./config/checkpoint.js";

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
const workflow = new StateGraph(AgentState)
  // Define the nodes
  .addNode("processPdf", processPdf)
  .addNode("callModel", callModel)
  .addNode("tools", toolsNode)
  // Set the entrypoint as `processPdf`
  // This node processes PDF files before calling the model
  .addEdge("__start__", "processPdf")
  // After processing PDF, go to callModel
  .addEdge("processPdf", "callModel")
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

// Initialize PostgreSQL checkpointer and compile the graph
const checkpointer = await createCheckpointer();

// Compile the graph with PostgreSQL checkpointer
// This will store all conversation state and history in PostgreSQL database
export const graph = workflow.compile({ checkpointer });
