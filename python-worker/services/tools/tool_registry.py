"""
Tool Registry for managing GitHub integration tools.
Implements Factory Pattern for tool instantiation and management.
"""

from typing import Dict, List, Optional
from .base_tool import BaseTool
from utils.logger import get_logger

logger = get_logger(__name__)


class ToolRegistry:
    """
    Central registry for all available tools.
    Manages tool lifecycle and provides access to tool declarations.
    
    Features:
    - Tool registration and retrieval
    - Gemini function declaration generation
    - Tool validation
    - Organized tool categories
    """
    
    def __init__(self):
        self.tools: Dict[str, BaseTool] = {}
        self.categories: Dict[str, List[str]] = {
            "commit": [],
            "pull_request": [],
            "issue": [],
            "code": [],
            "search": [],
            "repository": []
        }
        
    def register_tool(self, tool: BaseTool, category: Optional[str] = None) -> None:
        """
        Register a tool in the registry.
        
        Args:
            tool: BaseTool instance to register
            category: Optional category for organization
        """
        if not isinstance(tool, BaseTool):
            raise TypeError(f"Tool must be an instance of BaseTool, got {type(tool)}")
        
        if not tool.name:
            raise ValueError("Tool must have a name")
        
        if tool.name in self.tools:
            logger.warning(f"Overwriting existing tool: {tool.name}")
        
        self.tools[tool.name] = tool
        
        # Add to category if specified
        if category and category in self.categories:
            if tool.name not in self.categories[category]:
                self.categories[category].append(tool.name)
        
        logger.info(f"Registered tool: {tool.name}", extra={
            "tool_name": tool.name,
            "category": category,
            "total_tools": len(self.tools)
        })
    
    def unregister_tool(self, tool_name: str) -> bool:
        """
        Remove a tool from the registry.
        
        Args:
            tool_name: Name of tool to remove
            
        Returns:
            True if tool was removed, False if not found
        """
        if tool_name in self.tools:
            del self.tools[tool_name]
            
            # Remove from categories
            for category_tools in self.categories.values():
                if tool_name in category_tools:
                    category_tools.remove(tool_name)
            
            logger.info(f"Unregistered tool: {tool_name}")
            return True
        
        return False
    
    def get_tool(self, name: str) -> Optional[BaseTool]:
        """
        Get a tool by name.
        
        Args:
            name: Tool name
            
        Returns:
            BaseTool instance or None if not found
        """
        return self.tools.get(name)
    
    def get_all_tools(self) -> List[BaseTool]:
        """
        Get all registered tools.
        
        Returns:
            List of all BaseTool instances
        """
        return list(self.tools.values())
    
    def get_tools_by_category(self, category: str) -> List[BaseTool]:
        """
        Get tools in a specific category.
        
        Args:
            category: Category name
            
        Returns:
            List of tools in that category
        """
        if category not in self.categories:
            return []
        
        tool_names = self.categories[category]
        return [self.tools[name] for name in tool_names if name in self.tools]
    
    def get_tool_declarations(self, category: Optional[str] = None) -> List[Dict]:
        """
        Get Gemini function declarations for tools.
        
        Args:
            category: Optional category to filter by
            
        Returns:
            List of function declaration dicts for Gemini
        """
        if category:
            tools = self.get_tools_by_category(category)
        else:
            tools = self.get_all_tools()
        
        declarations = [tool.to_gemini_declaration() for tool in tools]
        
        logger.debug(f"Generated {len(declarations)} function declarations", extra={
            "category": category,
            "tool_count": len(declarations)
        })
        
        return declarations
    
    def list_tool_names(self) -> List[str]:
        """
        Get list of all registered tool names.
        
        Returns:
            List of tool names
        """
        return list(self.tools.keys())
    
    def get_tool_count(self) -> int:
        """
        Get total number of registered tools.
        
        Returns:
            Number of tools
        """
        return len(self.tools)
    
    def clear(self) -> None:
        """Clear all registered tools."""
        self.tools.clear()
        for category in self.categories.values():
            category.clear()
        logger.info("Cleared all tools from registry")
    
    def __repr__(self) -> str:
        return f"<ToolRegistry: {len(self.tools)} tools registered>"
    
    def __str__(self) -> str:
        lines = [f"ToolRegistry ({len(self.tools)} tools):"]
        for category, tool_names in self.categories.items():
            if tool_names:
                lines.append(f"  {category}: {', '.join(tool_names)}")
        return "\n".join(lines)
