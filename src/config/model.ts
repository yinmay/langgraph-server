import { ChatOpenAI } from "@langchain/openai";
import { tools } from "../tools.js";

export const model = new ChatOpenAI({
  model: "deepseek-chat",
  temperature: 0.7,
  openAIApiKey: process.env.DEEPSEEK_API_KEY,
  configuration: {
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  },
}).bindTools(tools);
