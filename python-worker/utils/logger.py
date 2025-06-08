"""
Logging utilities for GitTLDR Python Worker.
"""
import logging
import sys
from typing import Any, Dict
import structlog
from rich.logging import RichHandler

from config.settings import get_settings


def setup_logging() -> None:
    """Setup structured logging with rich formatting."""
    settings = get_settings()
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.ConsoleRenderer() if settings.log_format == "console" else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.log_level.upper())
        ),
        logger_factory=structlog.WriteLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper()),
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(rich_tracebacks=True)]
    )


def get_logger(name: str) -> structlog.BoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name)


class TaskLogger:
    """Context manager for task-specific logging."""
    
    def __init__(self, task_id: str, task_type: str):
        self.task_id = task_id
        self.task_type = task_type
        self.logger = get_logger("worker.task")
        
    def __enter__(self) -> structlog.BoundLogger:
        self.bound_logger = self.logger.bind(
            task_id=self.task_id,
            task_type=self.task_type
        )
        self.bound_logger.info("Task started")
        return self.bound_logger
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.bound_logger.error(
                "Task failed",
                error=str(exc_val),
                error_type=exc_type.__name__
            )
        else:
            self.bound_logger.info("Task completed")
