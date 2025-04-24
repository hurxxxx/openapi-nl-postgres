# 🔍 PostgreSQL Natural Language Query Server

A FastAPI-based server that allows querying PostgreSQL databases using natural language through the vanna.ai library.

## 🚀 Quickstart

Clone the repo and start the server:

```bash
git clone https://github.com/hurxxxx/openapi-nl-postgres.git
cd openapi-nl-postgres
pip install -r requirements.txt -U
```

### Using Startup Scripts

```bash
uvicorn main:app --host 0.0.0.0 --reload
```

📡 When the server starts, you can access it at the following URLs:

- **API Documentation**: http://localhost:8000/docs
- **Web Interface**: http://localhost:8000/
- **Alternative Web Interface**: http://localhost:8000/ui

## 📋 Features

- **Natural Language to SQL**: Convert natural language questions into SQL queries
- **Database Schema Training**: Automatically train on your database schema
- **Custom Training**: Add DDL statements, documentation, and SQL examples to improve results
- **Query Execution**: Execute generated SQL and return results
- **Query Explanation**: Get explanations for generated SQL queries

## 🔧 API Endpoints

### Connect to Database

```
POST /connect
```

Connect to a PostgreSQL database and initialize the natural language query engine.

### Train the Model

```
POST /train
```

Train the model with database schema, DDL statements, documentation, or SQL examples.

### Query the Database

```
POST /query
```

Query the PostgreSQL database using natural language.

### Get Training Data

```
GET /training_data
```

Get all training data that has been added to the model.

### Remove Training Data

```
DELETE /training_data/{training_id}
```

Remove specific training data by ID.

### Get Connection Status

```
GET /connection_status
```

Get the current database connection status.

## 🔐 Environment Variables

You can use a `.env` file to store your OpenAI API key and database connection information:

```
# OpenAI API Settings
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4

# PostgreSQL Database Connection Info
POSTGRES_HOST=localhost
POSTGRES_DB=your_database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_PORT=5432
```

The server will automatically connect to the database and perform schema training using these environment variables when it starts.

## 📚 Example Usage

1. Connect to your PostgreSQL database:

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

2. Train on your database schema:

```json
POST /train
{
  "train_type": "schema"
}
```

3. Add custom documentation:

```json
POST /train
{
  "train_type": "documentation",
  "content": "Sales are recorded in the orders table with customer information in the customers table."
}
```

4. Query your database in natural language:

```json
POST /query
{
  "question": "What were the total sales for each product category last month?"
}
```

## 🧪 Testing Methods

### Using the Web Interface

After starting the server, you can test all server functionality through the web interface at `http://localhost:8000/`:

1. In the **Connect** tab, enter your PostgreSQL database information and OpenAI API key to connect.
2. In the **Train** tab, train the model with database schema or additional information.
3. In the **Query** tab, enter natural language questions to query your database.
4. In the **Training Data** tab, you can view the training data currently added to the model.

## 🔧 Configuration Methods

### 1. Using Environment Variables

You can pass configuration through a `.env` file:

```
# Example .env file
OPENAI_API_KEY=sk-your-api-key
POSTGRES_HOST=localhost
POSTGRES_DB=your_database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_PORT=5432
```

### 2. Configuration via API Requests

You can pass configuration through API requests:

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

### 3. Configuration via Web Interface

You can enter all configuration in the **Connect** tab of the web interface.

## 🔄 Managing Training Data

Training only needs to be performed once. Training data is stored in ChromaDB, so it persists even when the server is restarted.

### Automatic Schema Training

When the server starts, the following automatic training process occurs:

1. The server checks for database connection information in environment variables (`POSTGRES_HOST`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`).
2. If connection information is available, it automatically connects to the database.
3. It checks if there is schema training data in ChromaDB.
4. If no training data exists, it automatically performs schema training.
5. If training data already exists, it does not perform additional training.

This automatic training feature runs only once when the server is first started, and does not run again since the training data is already in ChromaDB.

### Adding Training Data

1. **Schema Training** (basic):
   ```json
   POST /train
   {
     "train_type": "schema"
   }
   ```

2. **Additional Training** (optional):
   - Training with DDL statements:
   ```json
   POST /train
   {
     "train_type": "ddl",
     "content": "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100))"
   }
   ```

   - Training with documentation:
   ```json
   POST /train
   {
     "train_type": "documentation",
     "content": "Sales data is stored in the sales table."
   }
   ```

   - Training with SQL examples:
   ```json
   POST /train
   {
     "train_type": "sql",
     "content": "SELECT * FROM users WHERE active = true"
   }
   ```

### Viewing and Deleting Training Data

- View training data:
  ```
  GET /training_data
  ```

- Delete training data:
  ```
  DELETE /training_data/{training_id}
  ```

## 🔗 Resources

- [vanna.ai Documentation](https://vanna.ai/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
