# 🔍 PostgreSQL Natural Language Query Server

A FastAPI-based server that allows querying PostgreSQL databases using natural language through the vanna.ai library.

## 🚀 Quickstart

```bash
git clone https://github.com/hurxxxx/openapi-nl-postgres.git
cd openapi-nl-postgres
pip install -r requirements.txt -U
uvicorn main:app --host 0.0.0.0 --reload
```

Access at:
- **API Documentation**: http://localhost:8000/docs
- **Web Interface**: http://localhost:8000/ or http://localhost:8000/ui

## 📋 Features

- **Natural Language to SQL**: Convert natural language questions into SQL queries
- **Database Schema Training**: Automatically train on your database schema
- **Custom Training**: Add DDL statements, documentation, and SQL examples
- **Query Execution**: Execute generated SQL and return results
- **Query Explanation**: Get explanations for generated SQL queries

## 🔧 API Endpoints

- **POST /connect** - Connect to PostgreSQL database
- **POST /train** - Train the model with schema/documentation/examples
- **POST /query** - Query database using natural language
- **GET /training_data** - Get all training data
- **DELETE /training_data/{training_id}** - Remove specific training data
- **GET /connection_status** - Check database connection status
- **GET /api_config** - Get OpenAI API configuration from environment
- **GET /db_config** - Get database configuration from environment

## 🔐 Configuration

You can configure the server using:

1. **Environment Variables** (.env file):
```
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4
POSTGRES_HOST=localhost
POSTGRES_DB=your_database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_PORT=5432
CHROMA_PERSIST_DIRECTORY=./chroma_db
```

2. **API Requests**:
```json
POST /connect
{
  "host": "localhost", 
  "dbname": "your_database",
  "user": "postgres",
  "password": "your_password", 
  "port": "5432",
  "api_key": "your_openai_api_key",
  "model": "gpt-4"
}
```

3. **Web Interface**: Enter details in the Connect tab

## 📚 Example Usage

1. Connect to database:
```json
POST /connect
{
  "host": "localhost",
  "dbname": "your_database",
  "user": "postgres",
  "password": "your_password",
  "port": "5432",
  "api_key": "your_openai_api_key"
}
```

2. Train and query:
```json
POST /train
{
  "train_type": "schema"
}

POST /query
{
  "question": "What were the total sales for each product category last month?"
}
```

## 🔄 Managing Training Data

Training data persists in ChromaDB between server restarts. On first startup with valid database credentials, the server automatically performs schema training if no existing training data is found.

### Training Types:
- **Schema** (basic database structure)
- **DDL** (CREATE TABLE statements)
- **Documentation** (text explaining database concepts)
- **SQL** (example queries)
- **Question-SQL** (pairs of natural language questions with corresponding SQL)

Examples:
```json
POST /train
{
  "train_type": "documentation",
  "content": "Sales data is stored in the sales table."
}

POST /train
{
  "train_type": "sql",
  "content": "SELECT * FROM users WHERE active = true"
}

POST /train
{
  "train_type": "question_sql",
  "question": "How many customers do we have in each country?",
  "content": "SELECT country, COUNT(*) as customer_count FROM customers GROUP BY country ORDER BY customer_count DESC"
}
```

## 🖥️ Web Interface

The web interface provides a user-friendly way to interact with the API. Features include:

- **Connection Status**: Check if you're connected to a database
- **Database Connection**: Connect to your PostgreSQL database
- **Training Interface**: Multiple training options with examples
  - Schema training
  - DDL statements
  - Documentation
  - SQL examples
  - Question-SQL pairs
- **Training Data Management**: View and delete training data items
- **Query Interface**: Ask natural language questions and see results

## 🔄 Automatic Schema Training

The server automatically performs these steps on startup:
1. Checks for database credentials in environment variables
2. Connects to the database if credentials are provided
3. Checks if schema training data already exists in ChromaDB
4. Performs schema training automatically if no training data exists

This process only runs once when the server first starts, as training data persists in ChromaDB between restarts.

## 🔗 Resources

- [vanna.ai Documentation](https://vanna.ai/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
