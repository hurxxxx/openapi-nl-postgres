# 🔍 PostgreSQL Natural Language Query API

A modern API service that transforms natural language into SQL queries for PostgreSQL databases, built with FastAPI and OpenAPI standards for maximum compatibility and integration.

## 🚀 Quickstart

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

- **Natural Language → SQL**: Ask questions in plain English, get SQL queries
- **Auto-Training**: System learns your database schema automatically
- **Custom Training**: Enhance with your own examples and documentation
- **Query Execution & Explanation**: Run queries and understand the results

## 🔌 OpenAPI Integration

Built on OpenAPI standards, this service can be easily integrated with:
- Enterprise applications
- Mobile apps
- Web dashboards
- BI tools
- Third-party services

The standardized API endpoints make it compatible with any system that supports REST APIs.

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

## 📚 Quick Example

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
- Any SQL client that supports REST
- Data visualization tools
- Custom applications
- Cloud services
- CI/CD pipelines

## 🔗 Learn More

- [API Documentation](http://localhost:8000/docs)
- [FastAPI](https://fastapi.tiangolo.com/)
- [PostgreSQL](https://www.postgresql.org/)
