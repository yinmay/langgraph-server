import dotenv from "dotenv";
import { TavilySearch } from "@langchain/tavily";

// Load environment variables before initializing tools
dotenv.config();

const tavilySearchTool = new TavilySearch({
  maxResults: 3,
  topic: "general",
});

export const tools = [tavilySearchTool];

// Create a map of tools by name for easy lookup
export const toolsByName: Record<string, typeof tavilySearchTool> = {
  [tavilySearchTool.name]: tavilySearchTool,
};
