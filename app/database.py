"""
Database connection and PostgresNL class implementation.
"""
import os
import traceback
import pandas as pd
from typing import Dict, Any, Optional, List, Union

# Import vanna components
from vanna.openai import OpenAI_Chat
from vanna.chromadb import ChromaDB_VectorStore

from app import config


class PostgresNL(ChromaDB_VectorStore, OpenAI_Chat):
    """
    PostgresNL class that combines ChromaDB for vector storage and OpenAI for chat.
    """
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the PostgresNL instance.
        
        Args:
            config: Configuration dictionary for OpenAI and ChromaDB
        """
        chroma_config = config.copy() if config else {}

        ChromaDB_VectorStore.__init__(self, config=chroma_config)
        OpenAI_Chat.__init__(self, config=config)
        self.is_connected = False
        self.connection_info = None
        self.schema_trained = False

    def has_schema_training(self) -> bool:
        """
        Check if schema training has already been performed by looking for training data.
        
        Returns:
            bool: True if schema training data exists, False otherwise.
        """
        try:
            # Get all training data
            training_data = self.get_training_data()

            # Check if training_data is a pandas DataFrame
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
            traceback.print_exc()
            return False

    def perform_schema_training(self) -> bool:
        """
        Perform schema training using get_training_plan_generic.
        This should only be called once when the server starts if no training exists.
        
        Returns:
            bool: True if training was successful, False otherwise.
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
            traceback.print_exc()
            return False

    def explain_sql(self, sql: str) -> str:
        """
        Provide an explanation for the given SQL query.
        
        Args:
            sql: SQL query to explain
            
        Returns:
            str: Explanation of the SQL query
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


# Global instance of PostgresNL
vn = PostgresNL(config={
    'api_key': config.OPENAI_API_KEY,
    'model': config.OPENAI_MODEL,
    'path': config.CHROMA_PERSIST_DIRECTORY
})


def initialize_database_and_training() -> None:
    """
    Initialize database connection using environment variables if available
    and perform schema training if it hasn't been done before.
    """
    global vn

    # Check if database connection info is available in environment variables
    host = config.POSTGRES_HOST
    dbname = config.POSTGRES_DB
    user = config.POSTGRES_USER
    password = config.POSTGRES_PASSWORD
    port = config.POSTGRES_PORT

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
