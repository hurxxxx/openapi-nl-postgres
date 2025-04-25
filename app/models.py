"""
Pydantic models for request and response validation.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import UploadFile, File


class ConnectionRequest(BaseModel):
    """Request model for database connection."""
    host: str = Field(..., description="PostgreSQL server host")
    dbname: str = Field(..., description="Database name")
    user: str = Field(..., description="Database user")
    password: str = Field("", description="Database password (leave empty to use password from .env)")
    port: str = Field("5432", description="Database port (default: 5432)")
    api_key: str = Field(..., description="OpenAI API key")
    model: str = Field("gpt-4", description="OpenAI model to use (default: gpt-4)")


class ConnectionResponse(BaseModel):
    """Response model for database connection."""
    message: str = Field(..., description="Connection status message")
    status: bool = Field(..., description="Connection status (true if successful)")


class TrainRequest(BaseModel):
    """Request model for model training."""
    train_type: str = Field(..., description="Type of training data: 'schema', 'ddl', 'documentation', 'sql', or 'question_sql'")
    content: Optional[str] = Field(None, description="Content to train on (DDL, documentation, or SQL)")
    question: Optional[str] = Field(None, description="Question for question-SQL pair training")


class TrainResponse(BaseModel):
    """Response model for model training."""
    message: str = Field(..., description="Training status message")
    training_id: Optional[str] = Field(None, description="ID of the training data if applicable")


class QueryRequest(BaseModel):
    """Request model for database query."""
    question: str = Field(..., description="Natural language question to query the database")


class QueryResponse(BaseModel):
    """Response model for database query."""
    sql: str = Field(..., description="Generated SQL query")
    results: List[Dict[str, Any]] = Field(..., description="Query results")
    explanation: Optional[str] = Field(None, description="Explanation of the SQL query")


class TrainingDataResponse(BaseModel):
    """Response model for training data."""
    training_data: List[Dict[str, Any]] = Field(..., description="List of training data entries")


class TrainJsonResponse(BaseModel):
    """Response model for JSON file training."""
    message: str = Field(..., description="Training status message")
    success_count: int = Field(..., description="Number of successfully trained examples")
    error_count: int = Field(0, description="Number of examples that failed to train")
    errors: List[Dict[str, Any]] = Field([], description="List of errors encountered during training")
