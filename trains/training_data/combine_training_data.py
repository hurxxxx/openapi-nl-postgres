#!/usr/bin/env python3
"""
Combine Training Data

This script combines all training data from different tables into a single file.
"""

import json
import os
from pathlib import Path

# Define the directories containing training data
directories = [
    'trains/training_data/smtp_company_info',
    'trains/training_data/smtp_financial_company',
    'trains/training_data/smtp_financial_data',
    'trains/training_data/rb_master_company',
    'trains/training_data/complex_queries'
]

# Initialize an empty list to store all training data
all_training_data = []

# Loop through each directory and load the training data
for directory in directories:
    training_data_file = os.path.join(directory, 'training_data.json')
    if os.path.exists(training_data_file):
        with open(training_data_file, 'r', encoding='utf-8') as f:
            training_data = json.load(f)
            all_training_data.extend(training_data)
            print(f"Loaded {len(training_data)} items from {training_data_file}")

# Save the combined training data
output_file = 'trains/all_training_data.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(all_training_data, f, indent=2, ensure_ascii=False)

print(f"Saved {len(all_training_data)} items to {output_file}")

# Create a summary file
summary_file = 'trains/training_data_summary.md'
with open(summary_file, 'w', encoding='utf-8') as f:
    f.write("# SQL Training Data Summary\n\n")
    f.write("## Overview\n")
    f.write(f"Total training data items: {len(all_training_data)}\n\n")
    f.write("## Breakdown by Table\n")

    for directory in directories:
        table_name = os.path.basename(directory)
        training_data_file = os.path.join(directory, 'training_data.json')
        if os.path.exists(training_data_file):
            with open(training_data_file, 'r', encoding='utf-8') as tf:
                training_data = json.load(tf)
                f.write(f"- {table_name}: {len(training_data)} items\n")

    f.write("\n## Sample Questions\n")
    for i, item in enumerate(all_training_data[:10]):
        f.write(f"### Sample {i+1}\n")
        f.write(f"Question: {item['question']}\n")
        f.write("```sql\n")
        f.write(f"{item['answer']}\n")
        f.write("```\n\n")

print(f"Created summary file at {summary_file}")
