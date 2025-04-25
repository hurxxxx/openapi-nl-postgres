"""
API routes for the application.
"""
import os
import json
import traceback
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse

from app import config
from app.models import (
    ConnectionRequest, ConnectionResponse,
    TrainRequest, TrainResponse,
    QueryRequest, QueryResponse,
    TrainingDataResponse, TrainJsonResponse
)
from app.database import vn
from app.utils import convert_to_records

# Create router
router = APIRouter()


@router.post("/connect", response_model=ConnectionResponse, summary="Connect to PostgreSQL database")
async def connect_to_database(request: ConnectionRequest):
    """
    Connect to a PostgreSQL database and initialize the natural language query engine.
    """
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

        # Update the PostgresNL instance with OpenAI config
        vn.api_key = api_key
        vn.model = model

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


@router.post("/train", response_model=TrainResponse, summary="Train the model with database information")
async def train_model(request: TrainRequest):
    """
    Train the model with database schema, DDL statements, documentation, or SQL examples.
    """
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
            vn.train(ddl=request.content)
            
            return TrainResponse(
                message="Successfully trained on DDL statement",
                training_id="unknown"
            )

        elif request.train_type == "documentation" and request.content:
            # Train on documentation
            print(f"Training on documentation")
            vn.train(documentation=request.content)
            
            return TrainResponse(
                message="Successfully trained on documentation",
                training_id="unknown"
            )

        elif request.train_type == "sql" and request.content:
            # Train on SQL examples
            print(f"Training on SQL example")
            vn.train(sql=request.content)
            
            return TrainResponse(
                message="Successfully trained on SQL example",
                training_id="unknown"
            )

        elif request.train_type == "question_sql" and request.content and request.question:
            # Train on question-SQL pairs
            print(f"Training on question-SQL pair")
            vn.train(question=request.question, sql=request.content)
            
            return TrainResponse(
                message="Successfully trained on question-SQL pair",
                training_id="unknown"
            )

        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid training type or missing content. Valid types are 'schema', 'ddl', 'documentation', 'sql', or 'question_sql'."
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.post("/query", response_model=QueryResponse, summary="Query the database using natural language")
async def query_database(request: QueryRequest):
    """
    Query the PostgreSQL database using natural language.
    """
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

            # Convert results to list of dictionaries using utility function
            results = convert_to_records(results)

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


@router.get("/training_data", response_model=TrainingDataResponse, summary="Get all training data")
async def get_training_data():
    """
    Get all training data that has been added to the model.
    """
    if not vn or not vn.is_connected:
        raise HTTPException(status_code=400, detail="Not connected to a database. Please connect first.")

    try:
        # Get training data from vanna
        training_data = vn.get_training_data()

        # Log original data format
        print(f"Training data type: {type(training_data)}")

        # Convert training data to a list of records using utility function
        training_data = convert_to_records(training_data)

        # Log processed data
        print(f"Processed training data (first 3 items):")
        for i, item in enumerate(training_data[:3]):
            print(f"Item {i+1}: {item}")
        if len(training_data) > 3:
            print(f"... and {len(training_data) - 3} more items")

        return TrainingDataResponse(training_data=training_data)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get training data: {str(e)}")


@router.delete("/training_data/{training_id}", summary="Remove specific training data")
async def remove_training_data(training_id: str):
    """
    Remove specific training data by ID.
    """
    if not vn or not vn.is_connected:
        raise HTTPException(status_code=400, detail="Not connected to a database. Please connect first.")

    try:
        # Check if the training data exists before removing
        training_data = vn.get_training_data()

        # Convert to list of records using utility function
        training_data = convert_to_records(training_data)

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
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to remove training data: {str(e)}")


@router.get("/connection_status", summary="Get current connection status")
async def get_connection_status():
    """
    Get the current database connection status.
    """
    if not vn or not vn.is_connected:
        return JSONResponse(content={"connected": False})

    return JSONResponse(content={
        "connected": True,
        "connection_info": vn.connection_info
    })


@router.get("/api_config", summary="Get API configuration")
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


@router.get("/db_config", summary="Get database configuration")
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


@router.get("/", response_class=HTMLResponse, summary="Web interface")
async def get_web_interface():
    """
    Serve the web interface HTML page.
    """
    html_file = config.STATIC_DIR / "web_interface_test.html"
    with open(html_file, "r", encoding="utf-8") as f:
        content = f.read()
    return HTMLResponse(content=content)


@router.get("/ui", response_class=FileResponse, summary="Web interface (alternative)")
async def get_web_interface_file():
    """
    Serve the web interface HTML page as a file.
    """
    html_file = config.STATIC_DIR / "web_interface_test.html"
    return FileResponse(html_file)


@router.post("/train/json", response_model=TrainJsonResponse, summary="Train model with JSON file")
async def train_with_json_file(file: UploadFile = File(...), train_type: str = "ddl"):
    """
    Train the model with a JSON file containing training data.

    The JSON file format depends on the training type:

    - question_sql: Array of objects with 'question' and 'sql' fields
      [
          {
              "question": "What are the top 10 companies by revenue?",
              "sql": "SELECT company_name, revenue FROM companies ORDER BY revenue DESC LIMIT 10"
          },
          {
              "question": "How many employees work in each department?",
              "sql": "SELECT department, COUNT(*) as employee_count FROM employees GROUP BY department ORDER BY employee_count DESC"
          },
          ...
      ]

    - ddl: Array of strings containing DDL statements
      [
          "CREATE TABLE my_table (id INT, name TEXT)",
          ...
      ]

    - documentation: Array of strings containing documentation
      [
          "Our business defines XYZ as ABC",
          ...
      ]

    - sql: Array of strings containing SQL statements
      [
          "SELECT col1, col2, col3 FROM my_table",
          ...
      ]
    """
    if not vn or not vn.is_connected:
        raise HTTPException(status_code=400, detail="Not connected to a database. Please connect first.")

    # Check file extension
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Only JSON files are allowed")

    # Validate train_type
    valid_train_types = ["question_sql", "ddl", "documentation", "sql"]
    if train_type not in valid_train_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid train_type. Must be one of: {', '.join(valid_train_types)}"
        )

    try:
        # Read the file content
        content = await file.read()
        
        # 디버깅을 위한 로그 추가
        print(f"Received training file: {file.filename}, size: {len(content)} bytes, train_type: {train_type}")

        # Parse JSON
        try:
            training_data = json.loads(content.decode('utf-8'))
            print(f"Successfully parsed JSON with {len(training_data)} items")
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"JSON syntax error: {str(e)}")

        # Validate the structure based on train_type
        if train_type == "question_sql":
            # For question_sql, we expect an array of objects with question and sql fields
            if not isinstance(training_data, list):
                raise HTTPException(status_code=400, detail="JSON file must contain an array of objects")
            
            # 추가 검증 - 각 항목이 필요한 필드를 가지고 있는지 확인
            for i, item in enumerate(training_data):
                if not isinstance(item, dict):
                    raise HTTPException(status_code=400, detail=f"Item at index {i} must be an object with 'question' and 'sql' fields")
                
                # question 필드 체크
                if 'question' not in item:
                    raise HTTPException(status_code=400, detail=f"Item at index {i} requires a 'question' field")
                
                # sql 필드 체크
                if 'sql' not in item:
                    raise HTTPException(status_code=400, detail=f"Item at index {i} requires a 'sql' field")
                
                # 타입 체크
                if not isinstance(item['question'], str):
                    raise HTTPException(status_code=400, detail=f"'question' field at index {i} must be a string")
                
                # sql 필드의 타입 체크
                if not isinstance(item['sql'], str):
                    raise HTTPException(status_code=400, detail=f"'sql' field at index {i} must be a string")
        elif train_type in ["ddl", "documentation", "sql"]:
            # For other types, we expect an array of strings or a single string
            if isinstance(training_data, str):
                # 문자열 하나인 경우 배열로 변환
                training_data = [training_data]
            elif not isinstance(training_data, list):
                raise HTTPException(status_code=400, detail="JSON file must contain a string or an array of strings")
            
            # 추가 검증 - 각 항목이 문자열인지 확인
            for i, item in enumerate(training_data):
                if not isinstance(item, str):
                    raise HTTPException(status_code=400, detail=f"Item at index {i} must be a string")

        # Process each training example
        success_count = 0
        error_count = 0
        errors = []

        for i, example in enumerate(training_data):
            try:
                if train_type == "question_sql":
                    # Train on the example
                    question = example['question']
                    sql = example['sql']

                    print(f"Training on question-SQL pair {i+1}/{len(training_data)}: {question}")
                    print(f"SQL: {sql}")
                    try:
                        # 요청 정보 로깅
                        print(f"Calling vn.train with question='{question}', sql='{sql}'")
                        vn.train(question=question, sql=sql)
                    except Exception as e:
                        error_count += 1
                        print(f"Exception during training: {str(e)}")
                        # 트레이스백 출력
                        traceback.print_exc()
                        errors.append({
                            'index': i,
                            'error': f"Training error: {str(e)}",
                            'example': example
                        })
                        continue

                elif train_type == "ddl":
                    # Train on the example
                    print(f"Training on DDL statement {i+1}/{len(training_data)}")
                    try:
                        vn.train(ddl=example)
                    except Exception as e:
                        error_count += 1
                        errors.append({
                            'index': i,
                            'error': f"Training failed: {str(e)}",
                            'example': example
                        })
                        continue

                elif train_type == "documentation":
                    # Train on the example
                    print(f"Training on documentation {i+1}/{len(training_data)}")
                    try:
                        vn.train(documentation=example)
                    except Exception as e:
                        error_count += 1
                        errors.append({
                            'index': i,
                            'error': f"Training failed: {str(e)}",
                            'example': example
                        })
                        continue

                elif train_type == "sql":
                    # Train on the example
                    print(f"Training on SQL statement {i+1}/{len(training_data)}")
                    try:
                        vn.train(sql=example)
                    except Exception as e:
                        error_count += 1
                        errors.append({
                            'index': i,
                            'error': f"Training failed: {str(e)}",
                            'example': example
                        })
                        continue

                # Check if training was successful
                success_count += 1
                print(f"Training success for item {i}")
            except Exception as e:
                error_count += 1
                errors.append({
                    'index': i,
                    'error': str(e),
                    'example': example
                })

        # Return the results
        result_message = f"Training completed with {success_count} successes and {error_count} errors"
        print(result_message)
        if error_count > 0:
            print(f"Training errors: {errors}")
            
        return TrainJsonResponse(
            message=result_message,
            success_count=success_count,
            error_count=error_count,
            errors=errors
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")
