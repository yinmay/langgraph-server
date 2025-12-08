---
alwaysApply: true
---

This is an AI Agent service built with LangChain.js and LangGraph

Runtime: Node.js, Package Manager: npm, Language: TypeScript

LangChain.js Documentation: https://docs.langchain.com/oss/javascript/langchain/overview

LangGraph Documentation: https://docs.langchain.com/oss/javascript/langgraph/overview

Use langgraph-cli to start and run the project: https://docs.langchain.com/langsmith/cli

Frontend uses LangChain's open-source agent-chat-ui project: https://github.com/langchain-ai/agent-chat-ui

**Default LLM**: deepseek-chat (unless user specifies otherwise)

**Default Language**: Chinese (unless user specifies otherwise)

## Development Commands

### Local Development
```bash
npm run dev              # Start development server with hot reload (nodemon + ts-node)
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled JavaScript from dist/
npm run serve            # Start LangGraph Studio dev server
```

### Environment Setup
Copy `.env.example` to `.env` and configure:
- `DEEPSEEK_API_KEY` - Required for DeepSeek LLM
- `DEEPSEEK_BASE_URL` - Optional, defaults to "https://api.deepseek.com"
- `TAVILY_API_KEY` - Required for Tavily search tool
- `NODE_ENV` - Optional, defaults to "development"

## Architecture

### LangGraph Workflow Structure

The agent follows a **cyclic graph pattern** with conditional routing:

```
__start__ → callModel → [conditional] → tools → callModel → ...
                      ↘ __end__
```

**Flow:**
1. User message enters at `callModel` node
2. Model decides to call tools or end
3. If tool calls exist → route to `tools` node → back to `callModel`
4. If no tool calls → route to `__end__`

### Code Organization (Open-Closed Principle)

The codebase follows separation of concerns:

- **`src/agent.ts`** - Workflow definition only (graph structure, routing logic)
- **`src/config/model.ts`** - LLM configuration (DeepSeek ChatOpenAI with tool bindings)
- **`src/config/prompt.ts`** - System prompt configuration
- **`src/tools.ts`** - Tool definitions and lookup map
- **`src/nodes/callModel.ts`** - Model invocation node (adds system prompt, calls LLM)
- **`src/nodes/toolsNode.ts`** - Tool execution node (processes tool calls)
- **`src/index.ts`** - Entry point for testing/development

### Key Architectural Patterns

**State Management:**
- Uses `MessagesAnnotation` from LangGraph for message-based state
- State flows through nodes as `{ messages: BaseMessage[] }`
- System prompt is automatically prepended in `callModel` node if not present

**Tool Integration:**
- Tools are bound to the model via `.bindTools(tools)` in model.ts
- Tool lookup uses a `toolsByName` map for efficient execution
- Tool responses are formatted as `ToolMessage` with `tool_call_id` for tracking

**Routing Logic:**
- `routeModelOutput()` checks if last message (AIMessage) has `tool_calls`
- Returns `"tools"` if tool calls exist, `"__end__"` otherwise
- This enables the cyclic pattern: model → tools → model → ... → end

### LangGraph Configuration

The `langgraph.json` file defines:
- Graph export: `"agent": "./src/agent.ts:graph"`
- Used by `@langchain/langgraph-cli` for deployment and studio

### TypeScript Configuration

- ES Modules only (`"type": "module"` in package.json)
- Use `.js` extensions in import statements (e.g., `import { graph } from './agent.js'`)
- Target: ES2020
- Module resolution: node

## Adding New Tools

1. Define tool in `src/tools.ts`
2. Add to `tools` array export
3. Add to `toolsByName` map
4. Tool will automatically be bound to model and available for execution

## Modifying the Workflow

To add new nodes or change routing:
1. Create node function with signature: `(state: typeof MessagesAnnotation.State) => Promise<{ messages: BaseMessage[] }>`
2. Add node to workflow in `src/agent.ts` using `.addNode(name, function)`
3. Define edges using `.addEdge()` or `.addConditionalEdges()`
4. Update `routeModelOutput()` if routing logic changes
