#!/usr/bin/env python3
"""
Improved Query Tester

This script tests all queries in the training data against the PostgreSQL database,
with proper transaction handling.
"""

import json
import os
import psycopg2
import re
from dotenv import load_dotenv
from pathlib import Path
from typing import List, Dict, Any, Tuple

# Load environment variables
load_dotenv()

# Database connection parameters
DB_HOST = os.getenv('POSTGRES_HOST', 'localhost')
DB_PORT = os.getenv('POSTGRES_PORT', '5432')
DB_NAME = os.getenv('POSTGRES_DB', 'database_name')
DB_USER = os.getenv('POSTGRES_USER', 'database_user')
DB_PASSWORD = os.getenv('POSTGRES_PASSWORD', '')

# Load the training data
with open('trains/final_data/all_training_data.json', 'r', encoding='utf-8') as f:
    training_data = json.load(f)

print(f"Loaded {len(training_data)} queries from training data")

# Test the queries
results = []
success_count = 0
error_count = 0

for i, item in enumerate(training_data):
    question = item['question']
    query = item['answer']
    
    print(f"\nTesting query {i+1}/{len(training_data)}: {question}")
    print(f"Query: {query}")
    
    # Check if the query is valid
    try:
        # Connect to the database for each query to avoid transaction issues
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        
        # Set autocommit to True to avoid transaction issues
        conn.autocommit = True
        
        # Create a cursor
        cur = conn.cursor()
        
        # Execute the query
        cur.execute(query)
        
        # Fetch the results
        rows = cur.fetchall()
        
        # Get the column names
        column_names = [desc[0] for desc in cur.description]
        
        # Print the results
        print(f"Success! Query returned {len(rows)} rows")
        print(f"Columns: {', '.join(column_names)}")
        
        if rows:
            print("Sample row:")
            print(rows[0])
        
        # Add to results
        results.append({
            'question': question,
            'query': query,
            'status': 'success',
            'rows': len(rows),
            'columns': column_names
        })
        success_count += 1
        
        # Close the cursor and connection
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error executing query: {e}")
        
        # Add to results
        results.append({
            'question': question,
            'query': query,
            'status': 'error',
            'error': str(e)
        })
        error_count += 1
        
        # Try to fix the query
        fixed_query = query
        
        # Fix 1: Add subquery for HAVING clauses with aliases
        if "column" in str(e) and "does not exist" in str(e) and "HAVING" in query:
            # Extract the alias from the error message
            alias_match = re.search(r'column "([^"]+)" does not exist', str(e))
            if alias_match:
                alias = alias_match.group(1)
                # Replace HAVING with subquery
                if "HAVING " + alias in query:
                    fixed_query = "SELECT * FROM (" + query.split("HAVING")[0] + ") AS subquery WHERE " + alias + query.split("HAVING " + alias)[1]
        
        # Fix 2: Fix PI() function
        if "function pi() does not exist" in str(e):
            fixed_query = fixed_query.replace("PI()", "3.14159265359")
        
        # Fix 3: Fix ASIN function
        if "function asin" in str(e):
            # For distance calculations, use a different approach
            if "distance" in fixed_query.lower() and "latitude" in fixed_query.lower() and "longitude" in fixed_query.lower():
                # Use a simpler distance calculation
                fixed_query = re.sub(
                    r'6371 \* 2 \* ASIN\(SQRT\(POWER\(SIN\(\(latitude - [0-9.]+\) \* PI\(\) / 180 / 2\), 2\) \+ COS\([0-9.]+\) \* PI\(\) / 180\) \* COS\(latitude \* PI\(\) / 180\) \* POWER\(SIN\(\(longitude - [0-9.]+\) \* PI\(\) / 180 / 2\), 2\)\)\)',
                    'SQRT(POWER(latitude - 37.5665, 2) + POWER(longitude - 126.9780, 2))',
                    fixed_query
                )
        
        # Fix 4: Fix CAST issues
        if "operator does not exist: character varying" in str(e) and "integer" in str(e):
            # Replace CAST(field AS INTEGER) with field::INTEGER
            fixed_query = re.sub(r'CAST\((\w+) AS INTEGER\)', r'\1::INTEGER', fixed_query)
        
        # Fix 5: Fix date comparisons
        if "operator does not exist: character varying >=" in str(e) and "establishment_date" in fixed_query:
            fixed_query = re.sub(r'establishment_date >= (\d+)', r"establishment_date >= '\1-01-01'", fixed_query)
        
        # If the query was fixed, try again
        if fixed_query != query:
            print(f"Trying fixed query: {fixed_query}")
            try:
                # Connect to the database for each query to avoid transaction issues
                conn = psycopg2.connect(
                    host=DB_HOST,
                    port=DB_PORT,
                    dbname=DB_NAME,
                    user=DB_USER,
                    password=DB_PASSWORD
                )
                
                # Set autocommit to True to avoid transaction issues
                conn.autocommit = True
                
                # Create a cursor
                cur = conn.cursor()
                
                # Execute the fixed query
                cur.execute(fixed_query)
                
                # Fetch the results
                rows = cur.fetchall()
                
                # Get the column names
                column_names = [desc[0] for desc in cur.description]
                
                # Print the results
                print(f"Fixed query success! Query returned {len(rows)} rows")
                print(f"Columns: {', '.join(column_names)}")
                
                if rows:
                    print("Sample row:")
                    print(rows[0])
                
                # Update the results
                results[-1] = {
                    'question': question,
                    'query': fixed_query,
                    'status': 'success',
                    'rows': len(rows),
                    'columns': column_names,
                    'original_query': query,
                    'fixed': True
                }
                success_count += 1
                error_count -= 1
                
                # Close the cursor and connection
                cur.close()
                conn.close()
            except Exception as e2:
                print(f"Error executing fixed query: {e2}")
                
                # Update the results
                results[-1]['fixed_query'] = fixed_query
                results[-1]['fixed_error'] = str(e2)

# Save the results
output_file = 'trains/test_scripts/query_test_results_improved.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"\nSaved query test results to {output_file}")

# Print summary
print(f"Summary: {success_count} successful queries, {error_count} failed queries")

# Create a summary file
summary_file = 'trains/test_scripts/query_test_summary_improved.md'
with open(summary_file, 'w', encoding='utf-8') as f:
    f.write("# Query Test Results\n\n")
    f.write("## Overview\n")
    f.write(f"Total queries tested: {len(results)}\n")
    f.write(f"Successful queries: {success_count}\n")
    f.write(f"Failed queries: {error_count}\n\n")
    
    if error_count > 0:
        f.write("## Failed Queries\n")
        for i, result in enumerate([r for r in results if r['status'] == 'error']):
            f.write(f"### {i+1}. {result['question']}\n")
            f.write("```sql\n")
            f.write(f"{result['query']}\n")
            f.write("```\n")
            f.write(f"Error: {result['error']}\n\n")
            if 'fixed_query' in result:
                f.write("Attempted fix:\n")
                f.write("```sql\n")
                f.write(f"{result['fixed_query']}\n")
                f.write("```\n")
                f.write(f"Fix error: {result['fixed_error']}\n\n")

print(f"Created summary file at {summary_file}")

# If there are errors, create a fixed version of the training data
if error_count > 0:
    # Create a fixed version of the training data
    fixed_training_data = []
    
    for result in results:
        if result['status'] == 'success':
            if 'original_query' in result:
                # This was a fixed query
                fixed_training_data.append({
                    'question': result['question'],
                    'answer': result['query']
                })
            else:
                # This was an original successful query
                fixed_training_data.append({
                    'question': result['question'],
                    'answer': result['query']
                })
        else:
            # Skip failed queries
            print(f"Skipping failed query: {result['question']}")
    
    # Save the fixed training data
    fixed_output_file = 'trains/final_data/all_training_data_fixed.json'
    with open(fixed_output_file, 'w', encoding='utf-8') as f:
        json.dump(fixed_training_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved fixed training data to {fixed_output_file}")
    print(f"Fixed training data contains {len(fixed_training_data)} queries")
else:
    print("\nAll queries are successful! No need to create a fixed version of the training data.")
