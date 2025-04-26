# 🔍 PostgreSQL Natural Language Query API

A powerful OpenAPI-compatible tool server that transforms natural language into SQL queries for PostgreSQL databases, designed for seamless integration with Open WebUI and other LLM platforms.

## 🔌 Open WebUI Integration

This project can be used as a tool server with [Open WebUI](https://docs.openwebui.com/), allowing you to extend your LLM workflows with natural language database querying capabilities. Follow these steps to integrate:

1. **Start this server**:
   ```bash
   git clone https://github.com/hurxxxx/openapi-nl-postgres.git
   cd openapi-nl-postgres
   pip install -r requirements.txt -U
   uvicorn main:app --host 0.0.0.0 --reload
   ```

2. **Connect in Open WebUI**:
   - Open WebUI in your browser
   - Go to ⚙️ **Settings**
   - Click on ➕ **Tools** to add a new tool server
   - Enter the URL where this server is running (e.g., http://localhost:8000)
   - Click "Save"

3. **Use in conversations**:
   - You'll see a tool server indicator in the message input area
   - Ask your LLM to query your PostgreSQL database in natural language
   - The server will convert your questions to SQL and return results

## 🧠 Powered by Vanna.AI

This project is built on [Vanna.AI](https://vanna.ai/) - an open-source RAG (Retrieval-Augmented Generation) framework for SQL generation. Vanna.AI provides the core natural language to SQL conversion capabilities through:

- **Semantic understanding** of database schemas and business context
- **Training with examples** to improve accuracy for your specific use case
- **Automatic SQL generation** from natural language questions
- **Result visualization** with charts and explanations

## �🚀 Quickstart

```bash
git clone https://github.com/hurxxxx/openapi-nl-postgres.git
cd openapi-nl-postgres
pip install -r requirements.txt -U
uvicorn main:app --host 0.0.0.0 --reload
```

Access at:
- **OpenAPI Documentation**: http://localhost:8000/docs
- **Web Interface**: http://localhost:8000/

## 📋 Key Features

- **Natural Language → SQL**: Ask questions in plain English, get SQL queries powered by Vanna.AI
- **Open WebUI Integration**: Use as a tool server with Open WebUI for LLM-powered database interactions
- **Auto-Training**: System learns your database schema automatically using Vanna.AI's RAG framework
- **Custom Training**: Enhance with your own examples and documentation
- **Query Execution & Explanation**: Run queries and understand the results with visualizations

## 🔌 OpenAPI Integration

Built on OpenAPI standards, this service can be easily integrated with:
- **Open WebUI** and other LLM platforms that support OpenAPI tool servers
- Enterprise applications
- Mobile apps
- Web dashboards
- BI tools
- Third-party services

The standardized API endpoints make it compatible with any system that supports REST APIs, with special emphasis on integration with LLM platforms like Open WebUI for natural language database interactions.

## ⚙️ Simple Configuration

**Environment Variables** (.env file):
```
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4
POSTGRES_HOST=localhost
POSTGRES_DB=your_database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
```

**Or via API/Web Interface**:
Configure connections directly through the API or user-friendly web interface.

## 📚 Quick Examples

### API Usage

```json
// 1. Connect to database
POST /connect
{
  "host": "localhost",
  "dbname": "your_database",
  "user": "postgres",
  "password": "your_password"
}

// 2. Ask a question in plain English
POST /query
{
  "question": "What were the total sales for each product category last month?"
}

// Response includes SQL, results, and explanation
```

### Open WebUI Integration Example

When connected as a tool server in Open WebUI, you can have natural conversations with your database:

**User**: "What were the total sales for each product category last month?"

**LLM**: *Uses the tool server to:*
1. Convert the question to SQL
2. Execute the query
3. Return formatted results with visualizations
4. Provide explanations of the data

This creates a seamless natural language interface to your database directly within your LLM conversations.

## 🧠 Smart Training System

The system automatically learns your database structure on first connection and stores this knowledge in ChromaDB for future use.

**Training Options:**
- **Schema**: Auto-learns tables, columns, and relationships
- **Documentation**: Add business context and domain knowledge
- **SQL Examples**: Teach with your common queries
- **Question-SQL Pairs**: Train with examples of questions and answers

```json
// Example: Train with business context
POST /train
{
  "train_type": "documentation",
  "content": "Sales data is stored in the sales table with monthly aggregations."
}
```

## 🖥️ User-Friendly Interface

The intuitive web interface lets you:
- Connect to databases
- Train the system with examples
- Ask questions in natural language
- View and manage training data
- See SQL queries and results

## 🌐 Cross-Platform Compatibility

Thanks to OpenAPI standards, this solution works seamlessly with:
- **Open WebUI** and other LLM platforms as a tool server
- Any SQL client that supports REST
- Data visualization tools
- Custom applications
- Cloud services
- CI/CD pipelines

The OpenAPI compatibility makes this project particularly valuable as a tool server for LLM platforms, creating a bridge between natural language and your database systems.

## 🔗 Learn More

- [API Documentation](http://localhost:8000/docs)
- [Vanna.AI Documentation](https://vanna.ai/docs/)
- [Open WebUI Tool Server Integration](https://docs.openwebui.com/openapi-servers/open-webui)
- [FastAPI](https://fastapi.tiangolo.com/)
- [PostgreSQL](https://www.postgresql.org/)
