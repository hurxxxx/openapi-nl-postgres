"""
Main entry point for the application.
"""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import config
from app.routes import router
from app.database import initialize_database_and_training

# Initialize FastAPI app
app = FastAPI(
    title="PostgreSQL Natural Language Query API",
    version="1.0.0",
    description="An API that allows querying PostgreSQL databases using natural language through vanna.ai",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory=config.STATIC_DIR), name="static")

# Include router
app.include_router(router)

# Initialize database and training on server startup
initialize_database_and_training()

if __name__ == "__main__":
    uvicorn.run(app, host=config.SERVER_HOST, port=config.SERVER_PORT)
