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
- `LANGGRAPH_POSTGRES_URI` - Required for PostgreSQL chat history storage (format: `postgresql://username:password@host:port/database`)
- `NODE_ENV` - Optional, defaults to "development"

**Important Note on Development Mode:**
- When running `npm run serve` (langgraph dev), chat data is stored in `.langgraph_api` folder (local file storage)
- PostgreSQL checkpointing only works when deployed to LangGraph Server (production mode)
- This is a known limitation of the LangGraph development server

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
- **`src/config/checkpoint.ts`** - PostgreSQL checkpointer configuration for chat history persistence
- **`src/tools.ts`** - Tool definitions and lookup map
- **`src/nodes/callModel.ts`** - Model invocation node (adds system prompt, calls LLM)
- **`src/nodes/toolsNode.ts`** - Tool execution node (processes tool calls)
- **`src/nodes/processPdf.ts`** - PDF processing node (extracts text from PDF files)
- **`src/utils/pdfExtractor.ts`** - PDF text extraction utility
- **`src/index.ts`** - Entry point for testing/development

### Key Architectural Patterns

**State Management:**
- Uses custom `AgentState` annotation extending `MessagesAnnotation`
- State includes: `messages`, `pdfContent` (extracted PDF text), `lastMessageIsPdf` (boolean flag)
- State flows through nodes and is persisted in PostgreSQL via checkpointer
- System prompt is dynamically built in `callModel` node, including PDF content when available

**Tool Integration:**
- Tools are bound to the model via `.bindTools(tools)` in model.ts
- Tool lookup uses a `toolsByName` map for efficient execution
- Tool responses are formatted as `ToolMessage` with `tool_call_id` for tracking

**Routing Logic:**
- `routeModelOutput()` checks if last message (AIMessage) has `tool_calls`
- Returns `"tools"` if tool calls exist, `"__end__"` otherwise
- This enables the cyclic pattern: model → tools → model → ... → end

**Chat History Persistence:**
- Uses PostgreSQL for conversation state storage in production (LangGraph Server deployment)
- Configured via `LANGGRAPH_POSTGRES_URI` environment variable in `langgraph.json`
- Database tables are created automatically by LangGraph Server
- In development mode (`npm run serve`), uses local `.langgraph_api` folder instead
- Enables multi-turn conversations with full context retention

### LangGraph Configuration

The `langgraph.json` file defines:
- Graph export: `"agent": "./src/agent.ts:graph"`
- PostgreSQL store configuration: `store.postgres.uri` points to `LANGGRAPH_POSTGRES_URI` env variable
- Used by `@langchain/langgraph-cli` for deployment and studio

## Deployment

### Development Mode
```bash
npm run serve  # Uses .langgraph_api folder for local storage
```

### Production Deployment to LangGraph Server
To use PostgreSQL checkpointing, deploy to LangGraph Server:
1. Set `LANGGRAPH_POSTGRES_URI` environment variable
2. Deploy using LangGraph Cloud or self-hosted LangGraph Server
3. The server will automatically use PostgreSQL for all state persistence

Note: The checkpointer configuration is managed by LangGraph Server, not in application code.

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
