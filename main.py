from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os
import uvicorn
from dotenv import load_dotenv

# Import vanna components
from vanna.openai import OpenAI_Chat
from vanna.chromadb import ChromaDB_VectorStore

# Load environment variables
load_dotenv()

# Define the Vanna class that combines ChromaDB for vector storage and OpenAI for chat
class PostgresNL(ChromaDB_VectorStore, OpenAI_Chat):
    def __init__(self, config=None):
        chroma_config = config.copy() if config else {}

        ChromaDB_VectorStore.__init__(self, config=chroma_config)
        OpenAI_Chat.__init__(self, config=config)
        self.is_connected = False
        self.connection_info = None
        self.schema_trained = False

    def has_schema_training(self):
        """
        Check if schema training has already been performed by looking for training data.
        Returns True if schema training data exists, False otherwise.
        """
        try:
            # Get all training data
            training_data = self.get_training_data()

            # Check if training_data is a pandas DataFrame
            import pandas as pd
            if isinstance(training_data, pd.DataFrame):
                # Check if DataFrame is not empty
                if not training_data.empty:
                    print(f"Found training data in ChromaDB (DataFrame with {len(training_data)} rows)")
                    # If we have any training data, assume schema training was done
                    return True
            # Check if it's a list or other iterable
            elif training_data:
                if hasattr(training_data, '__len__'):
                    print(f"Found {len(training_data)} training data items in ChromaDB")
                else:
                    print(f"Found training data in ChromaDB (type: {type(training_data)})")
                return True

            print("No training data found in ChromaDB")
            return False
        except Exception as e:
            print(f"Error checking for schema training: {str(e)}")
            # Print the traceback for debugging
            import traceback
            traceback.print_exc()
            return False

    def perform_schema_training(self):
        """
        Perform schema training using get_training_plan_generic.
        This should only be called once when the server starts if no training exists.
        """
        try:
            if not self.is_connected:
                print("Cannot perform schema training: Not connected to database")
                return False

            print("Performing schema training...")

            # Query database schema
            df_information_schema = self.run_sql("SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = 'public'")

            # Generate training plan
            plan = self.get_training_plan_generic(df_information_schema)

            # Train the model with the plan
            self.train(plan=plan)

            # Also add a marker to ChromaDB to indicate that schema training has been performed
            self.train(documentation="Schema training has been performed. This is a marker to indicate that schema training has been completed.")

            self.schema_trained = True
            print("Schema training completed successfully")
            return True
        except Exception as e:
            print(f"Error during schema training: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def explain_sql(self, sql):
        """
        Provide an explanation for the given SQL query.
        """
        try:
            # Provide a fallback explanation based on the SQL query
            if "table_name" in sql and "information_schema.tables" in sql:
                return "This query retrieves a list of all tables in the database by querying the information_schema.tables table."
            elif "COUNT(*)" in sql:
                return "This query counts the number of rows in the specified table."
            else:
                return f"This query executes the following SQL: {sql}"
        except Exception as e:
            print(f"Error explaining SQL: {str(e)}")
            # Fallback explanation
            return f"This query executes the following SQL: {sql}"

# Initialize FastAPI app
app = FastAPI(
    title="PostgreSQL Natural Language Query API",
    version="1.0.0",
    description="An API that allows querying PostgreSQL databases using natural language through vanna.ai",
)

# Set up static files directory
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

# Add CORS middleware
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set up static files directory
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Initialize the PostgresNL instance
vn = PostgresNL(config={
    'api_key': os.getenv("OPENAI_API_KEY", ""),
    'model': os.getenv("OPENAI_MODEL", "gpt-4"),
    'path': os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")
})

# Function to initialize database connection and perform schema training if needed
def initialize_database_and_training():
    """
    Initialize database connection using environment variables if available
    and perform schema training if it hasn't been done before.
    """
    global vn

    # Check if database connection info is available in environment variables
    host = os.getenv("POSTGRES_HOST")
    dbname = os.getenv("POSTGRES_DB")
    user = os.getenv("POSTGRES_USER")
    password = os.getenv("POSTGRES_PASSWORD")
    port = os.getenv("POSTGRES_PORT", "5432")

    if host and dbname and user and password:
        try:
            print(f"Connecting to database {dbname} on {host} using environment variables...")

            # Check if password is provided
            if not password:
                print("No password provided in environment variables")
                return

            # Connect to the actual database
            vn.connect_to_postgres(
                host=host,
                dbname=dbname,
                user=user,
                password=password,
                port=port
            )

            # Explicitly set the connection flag
            vn.is_connected = True

            # Store connection info
            vn.connection_info = {
                'host': host,
                'dbname': dbname,
                'user': user,
                'port': port
            }

            print(f"Successfully connected to database {dbname} on {host}")

            # Check if schema training has been performed
            if not vn.has_schema_training():
                print("No schema training found. Performing initial schema training...")
                try:
                    # Perform schema training
                    vn.perform_schema_training()
                except Exception as e:
                    print(f"Error during initial schema training: {str(e)}")
            else:
                print("Schema training already exists. No need to train again.")
                vn.schema_trained = True
        except Exception as e:
            print(f"Error connecting to database: {str(e)}")
            print("You can still connect manually through the API or web interface.")
    else:
        print("Database connection information not found in environment variables.")
        print("You can connect manually through the API or web interface.")

# Initialize database and training on server startup
initialize_database_and_training()

# ----- Request/Response Models -----

class ConnectionRequest(BaseModel):
    host: str = Field(..., description="PostgreSQL server host")
    dbname: str = Field(..., description="Database name")
    user: str = Field(..., description="Database user")
    password: str = Field("", description="Database password (leave empty to use password from .env)")
    port: str = Field("5432", description="Database port (default: 5432)")
    api_key: str = Field(..., description="OpenAI API key")
    model: str = Field("gpt-4", description="OpenAI model to use (default: gpt-4)")

class ConnectionResponse(BaseModel):
    message: str = Field(..., description="Connection status message")
    status: bool = Field(..., description="Connection status (true if successful)")

class TrainRequest(BaseModel):
    train_type: str = Field(..., description="Type of training data: 'schema', 'ddl', 'documentation', 'sql', or 'question_sql'")
    content: Optional[str] = Field(None, description="Content to train on (DDL, documentation, or SQL)")
    question: Optional[str] = Field(None, description="Question for question-SQL pair training")

class TrainResponse(BaseModel):
    message: str = Field(..., description="Training status message")
    training_id: Optional[str] = Field(None, description="ID of the training data if applicable")

class QueryRequest(BaseModel):
    question: str = Field(..., description="Natural language question to query the database")

class QueryResponse(BaseModel):
    sql: str = Field(..., description="Generated SQL query")
    results: List[Dict[str, Any]] = Field(..., description="Query results")
    explanation: Optional[str] = Field(None, description="Explanation of the SQL query")

class TrainingDataResponse(BaseModel):
    training_data: List[Dict[str, Any]] = Field(..., description="List of training data entries")

# ----- Endpoints -----

@app.post("/connect", response_model=ConnectionResponse, summary="Connect to PostgreSQL database")
async def connect_to_database(request: ConnectionRequest):
    """
    Connect to a PostgreSQL database and initialize the natural language query engine.
    """
    global vn

    try:
        # Get API key from request or environment variable
        api_key = request.api_key
        if not api_key or api_key == "env":
            api_key = os.getenv("OPENAI_API_KEY", "")
            if not api_key:
                raise HTTPException(
                    status_code=400,
                    detail="No OpenAI API key provided in request or environment variables"
                )

        # Get model from request or environment variable
        model = request.model
        if not model or model == "env":
            model = os.getenv("OPENAI_MODEL", "gpt-4.1")

        # Initialize the PostgresNL instance with OpenAI config
        vn = PostgresNL(config={
            'api_key': api_key,
            'model': model
        })

        # Connect to PostgreSQL database
        print(f"Using API key from {'environment' if api_key == os.getenv('OPENAI_API_KEY') else 'request'}")
        print(f"Using model: {model}")
        print(f"Connecting to PostgreSQL database {request.dbname} on {request.host}...")

        # Get password from request or environment variable
        password = request.password
        if not password or password.strip() == "":
            password = os.getenv("POSTGRES_PASSWORD", "")
            print(f"Using password from environment variable")
            if not password:
                raise HTTPException(
                    status_code=400,
                    detail="No password provided in request or environment variables"
                )

        # Connect to the actual database
        vn.connect_to_postgres(
            host=request.host,
            dbname=request.dbname,
            user=request.user,
            password=password,
            port=request.port
        )

        # Explicitly set the connection flag
        vn.is_connected = True

        # Store connection info
        vn.connection_info = {
            'host': request.host,
            'dbname': request.dbname,
            'user': request.user,
            'port': request.port
        }

        # Check if schema training has been performed
        if not vn.schema_trained and not vn.has_schema_training():
            # Perform schema training automatically
            try:
                print("Automatically performing initial schema training after manual connection...")
                # Perform schema training
                vn.perform_schema_training()
            except Exception as e:
                print(f"Warning: Failed to perform initial schema training: {str(e)}")
                # Continue even if training fails - user can manually train later
        else:
            print("Schema training already exists or was performed during server startup. No need to train again.")

        return ConnectionResponse(
            message=f"Successfully connected to PostgreSQL database {request.dbname} on {request.host}",
            status=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to database: {str(e)}")

@app.post("/train", response_model=TrainResponse, summary="Train the model with database information")
async def train_model(request: TrainRequest):
    """
    Train the model with database schema, DDL statements, documentation, or SQL examples.
    """
    global vn

    if not vn or not vn.is_connected:
        raise HTTPException(status_code=400, detail="Not connected to a database. Please connect first.")

    try:
        if request.train_type == "schema":
            # Check if schema training has already been performed
            if vn.schema_trained or vn.has_schema_training():
                print("Schema training has already been performed. Skipping.")
                return TrainResponse(message="Schema training already exists. No additional training performed.")

            # Perform actual schema training
            print(f"Performing schema training using API key from environment: {os.getenv('OPENAI_API_KEY')[:4]}...{os.getenv('OPENAI_API_KEY')[-4:]}")
            vn.perform_schema_training()

            return TrainResponse(message="Successfully trained on database schema")

        elif request.train_type == "ddl" and request.content:
            # Train on DDL statements
            print(f"Training on DDL statement")
            result = vn.train(ddl=request.content)
            training_id = result.get('id', 'unknown')
            return TrainResponse(
                message="Successfully trained on DDL statement",
                training_id=training_id
            )

        elif request.train_type == "documentation" and request.content:
            # Train on documentation
            print(f"Training on documentation")
            result = vn.train(documentation=request.content)
            training_id = result.get('id', 'unknown')
            return TrainResponse(
                message="Successfully trained on documentation",
                training_id=training_id
            )

        elif request.train_type == "sql" and request.content:
            # Train on SQL examples
            print(f"Training on SQL example")
            result = vn.train(sql=request.content)
            training_id = result.get('id', 'unknown')
            return TrainResponse(
                message="Successfully trained on SQL example",
                training_id=training_id
            )

        elif request.train_type == "question_sql" and request.content and request.question:
            # Train on question-SQL pairs
            print(f"Training on question-SQL pair")
            result = vn.train(question=request.question, sql=request.content)
            training_id = result.get('id', 'unknown')
            return TrainResponse(
                message="Successfully trained on question-SQL pair",
                training_id=training_id
            )

        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid training type or missing content. Valid types are 'schema', 'ddl', 'documentation', 'sql', or 'question_sql'."
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.post("/query", response_model=QueryResponse, summary="Query the database using natural language")
async def query_database(request: QueryRequest):
    """
    Query the PostgreSQL database using natural language.
    """
    global vn

    if not vn or not vn.is_connected:
        raise HTTPException(status_code=400, detail="Not connected to a database. Please connect first.")

    try:
        print(f"Processing question: {request.question}")

        # Generate SQL using OpenAI
        try:
            # Generate SQL from the natural language question
            sql = vn.generate_sql(question=request.question)
            print(f"Generated SQL: {sql}")

            if not sql:
                raise ValueError("Failed to generate SQL query")

            # Execute the SQL query
            results = vn.run_sql(sql)
            print(f"Query results: {results}")

            # Convert results to list of dictionaries if it's a DataFrame
            if hasattr(results, 'to_dict'):
                results = results.to_dict(orient='records')

            # Generate explanation for the SQL query
            explanation = vn.explain_sql(sql)

            return QueryResponse(
                sql=sql,
                results=results,
                explanation=explanation
            )
        except Exception as e:
            print(f"Error generating or executing SQL: {str(e)}")

            # If we can't handle the question, raise the original error
            raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

@app.get("/training_data", response_model=TrainingDataResponse, summary="Get all training data")
async def get_training_data():
    """
    Get all training data that has been added to the model.
    """
    global vn

    if not vn or not vn.is_connected:
        raise HTTPException(status_code=400, detail="Not connected to a database. Please connect first.")

    try:
        # Get training data from vanna
        training_data = vn.get_training_data()

        # Log original data format
        print(f"Training data type: {type(training_data)}")

        # Convert to list if it's a pandas DataFrame
        import pandas as pd
        if isinstance(training_data, pd.DataFrame):
            print(f"Original DataFrame:\n{training_data}")
            training_data = training_data.to_dict(orient='records')
        else:
            print(f"Original training data:\n{training_data}")

        # If it's not a list, convert it to a list
        if not isinstance(training_data, list):
            if training_data is None:
                training_data = []
            else:
                training_data = [training_data]

        # Log processed data
        print(f"Processed training data (first 3 items):")
        for i, item in enumerate(training_data[:3]):
            print(f"Item {i+1}: {item}")
        if len(training_data) > 3:
            print(f"... and {len(training_data) - 3} more items")

        return TrainingDataResponse(training_data=training_data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get training data: {str(e)}")

@app.delete("/training_data/{training_id}", summary="Remove specific training data")
async def remove_training_data(training_id: str):
    """
    Remove specific training data by ID.
    """
    global vn

    if not vn or not vn.is_connected:
        raise HTTPException(status_code=400, detail="Not connected to a database. Please connect first.")

    try:
        # Check if the training data exists before removing
        training_data = vn.get_training_data()

        # Convert to list if it's a pandas DataFrame
        import pandas as pd
        if isinstance(training_data, pd.DataFrame):
            # Check if the ID exists in the DataFrame
            if 'id' in training_data.columns and training_id not in training_data['id'].values:
                raise HTTPException(status_code=404, detail=f"Training data with ID {training_id} not found")
        elif isinstance(training_data, list):
            # Check if the ID exists in the list of dictionaries
            if not any(item.get('id') == training_id for item in training_data):
                raise HTTPException(status_code=404, detail=f"Training data with ID {training_id} not found")

        # Remove the training data
        vn.remove_training_data(id=training_id)
        return JSONResponse(content={"message": f"Successfully removed training data with ID {training_id}"})
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to remove training data: {str(e)}")

@app.get("/connection_status", summary="Get current connection status")
async def get_connection_status():
    """
    Get the current database connection status.
    """
    global vn

    if not vn or not vn.is_connected:
        return JSONResponse(content={"connected": False})

    return JSONResponse(content={
        "connected": True,
        "connection_info": vn.connection_info
    })

@app.get("/api_config", summary="Get API configuration")
async def get_api_config():
    """
    Get API configuration from environment variables.
    """
    # Get API key and model from environment variables
    api_key = os.getenv("OPENAI_API_KEY", "")
    model = os.getenv("OPENAI_MODEL", "gpt-4.1")

    return JSONResponse(content={
        "has_api_key": bool(api_key),
        "api_key": api_key,
        "model": model
    })

@app.get("/db_config", summary="Get database configuration")
async def get_db_config():
    """
    Get database configuration from environment variables.
    """
    # Get database configuration from environment variables
    host = os.getenv("POSTGRES_HOST", "")
    port = os.getenv("POSTGRES_PORT", "")
    dbname = os.getenv("POSTGRES_DB", "")
    user = os.getenv("POSTGRES_USER", "")
    password = os.getenv("POSTGRES_PASSWORD", "")

    return JSONResponse(content={
        "has_db_config": bool(host and dbname and user and password),
        "host": host,
        "port": port,
        "dbname": dbname,
        "user": user,
        "password": password if password else ""
    })

@app.get("/", response_class=HTMLResponse, summary="Web interface")
async def get_web_interface():
    """
    Serve the web interface HTML page.
    """
    html_file = STATIC_DIR / "web_interface_test.html"
    with open(html_file, "r", encoding="utf-8") as f:
        content = f.read()
    return HTMLResponse(content=content)

@app.get("/ui", response_class=FileResponse, summary="Web interface (alternative)")
async def get_web_interface_file():
    """
    Serve the web interface HTML page as a file.
    """
    html_file = STATIC_DIR / "web_interface_test.html"
    return FileResponse(html_file)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
