import dotenv from 'dotenv';
import { HumanMessage } from "@langchain/core/messages";
import { graph } from './agent.js';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`Starting LangGraph Agent Server in ${NODE_ENV} mode...`);

async function main() {
  console.log('Testing the agent...\n');

  // Test the agent with a simple message
  const input = {
    messages: [new HumanMessage("Hello! What is LangGraph?")]
  };

  console.log('User:', input.messages[0].content);

  const result = await graph.invoke(input);

  console.log('Agent:', result.messages[result.messages.length - 1].content);
  console.log('\nAgent is ready! Use langgraph-cli to start the server.');
}

main().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});
