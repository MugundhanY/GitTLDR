"""
Base tool interface for GitHub integration.
Implements abstract base class for all tools used in function calling.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from utils.logger import get_logger

logger = get_logger(__name__)


class ToolParameter(BaseModel):
    """Tool parameter definition for Gemini function calling."""
    name: str = Field(..., description="Parameter name")
    type: str = Field(..., description="Parameter type (STRING, INTEGER, BOOLEAN, ARRAY, OBJECT)")
    description: str = Field(..., description="Parameter description for AI")
    required: bool = Field(default=False, description="Whether parameter is required")
    enum: Optional[List[str]] = Field(default=None, description="Allowed values")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "author",
                "type": "STRING",
                "description": "Author name to filter commits",
                "required": True
            }
        }


class ToolResponse(BaseModel):
    """Standardized tool response format."""
    success: bool = Field(..., description="Whether tool execution succeeded")
    data: Any = Field(default=None, description="Tool execution result data")
    error: Optional[str] = Field(default=None, description="Error message if failed")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": [{"sha": "abc123", "message": "Fix bug"}],
                "error": None,
                "metadata": {"total_commits": 1}
            }
        }


class BaseTool(ABC):
    """
    Abstract base class for all GitHub tools.
    Implements Template Method Pattern for consistent tool behavior.
    
    Each tool must implement:
    - name: Unique tool identifier
    - description: What the tool does (shown to AI)
    - parameters: List of ToolParameter objects
    - execute(): Async method that performs the tool's action
    """
    
    def __init__(self):
        self.name: str = ""
        self.description: str = ""
        self.parameters: List[ToolParameter] = []
        self.cache_ttl: int = 1800  # 30 minutes default cache
        
    @abstractmethod
    async def execute(self, **kwargs) -> ToolResponse:
        """
        Execute the tool with given parameters.
        
        Args:
            **kwargs: Tool-specific parameters
            
        Returns:
            ToolResponse with success status and data
        """
        pass
    
    def to_gemini_declaration(self) -> Dict:
        """
        Convert tool to Gemini function declaration format.
        
        Returns:
            Dict in format expected by google.generativeai.types.FunctionDeclaration
        """
        properties = {}
        required_params = []
        
        for param in self.parameters:
            param_def = {
                "type": param.type.lower(),
                "description": param.description
            }
            
            # Add enum if specified
            if param.enum:
                param_def["enum"] = param.enum
            
            properties[param.name] = param_def
            
            if param.required:
                required_params.append(param.name)
        
        declaration = {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": properties
            }
        }
        
        if required_params:
            declaration["parameters"]["required"] = required_params
        
        return declaration
    
    def validate_parameters(self, **kwargs) -> tuple[bool, Optional[str]]:
        """
        Validate that all required parameters are present and valid.
        
        Args:
            **kwargs: Parameters to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check required parameters
        required = [p.name for p in self.parameters if p.required]
        missing = [param for param in required if param not in kwargs]
        
        if missing:
            return False, f"Missing required parameters: {', '.join(missing)}"
        
        # Validate enum values
        for param in self.parameters:
            if param.name in kwargs and param.enum:
                value = kwargs[param.name]
                if value not in param.enum:
                    return False, f"Invalid value for {param.name}. Must be one of: {', '.join(param.enum)}"
        
        return True, None
    
    def get_cache_key(self, **kwargs) -> str:
        """
        Generate cache key for this tool execution.
        
        Args:
            **kwargs: Tool parameters
            
        Returns:
            Cache key string
        """
        import hashlib
        import json
        
        # Sort kwargs for consistent cache keys
        sorted_kwargs = json.dumps(kwargs, sort_keys=True)
        key_str = f"{self.name}:{sorted_kwargs}"
        
        return hashlib.md5(key_str.encode()).hexdigest()
    
    async def execute_with_validation(self, **kwargs) -> ToolResponse:
        """
        Execute tool with parameter validation.
        Wrapper around execute() that adds validation.
        
        Args:
            **kwargs: Tool parameters
            
        Returns:
            ToolResponse
        """
        # Validate parameters
        is_valid, error_msg = self.validate_parameters(**kwargs)
        if not is_valid:
            logger.warning(f"Tool {self.name} validation failed: {error_msg}")
            return ToolResponse(
                success=False,
                data=None,
                error=error_msg
            )
        
        try:
            # Execute the tool
            result = await self.execute(**kwargs)
            logger.info(f"Tool {self.name} executed successfully", extra={
                "tool_name": self.name,
                "params": kwargs,
                "success": result.success
            })
            return result
            
        except Exception as e:
            logger.error(f"Tool {self.name} execution error: {str(e)}", extra={
                "tool_name": self.name,
                "params": kwargs,
                "error": str(e)
            })
            return ToolResponse(
                success=False,
                data=None,
                error=f"Tool execution failed: {str(e)}"
            )
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}: {self.name}>"
