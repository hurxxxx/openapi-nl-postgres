"""
Utility functions for the application.
"""
import pandas as pd
from typing import List, Dict, Any, Union


def convert_to_records(data: Union[pd.DataFrame, List, Dict, Any]) -> List[Dict[str, Any]]:
    """
    Convert various data types to a list of dictionaries.
    
    Args:
        data: Data to convert (DataFrame, list, dict, or other)
        
    Returns:
        List of dictionaries
    """
    # Convert to list if it's a pandas DataFrame
    if isinstance(data, pd.DataFrame):
        return data.to_dict(orient='records')
    
    # If it's already a list, return it
    if isinstance(data, list):
        return data
    
    # If it's a dict, wrap it in a list
    if isinstance(data, dict):
        return [data]
    
    # If it's None, return an empty list
    if data is None:
        return []
    
    # For any other type, wrap it in a list
    return [data]
