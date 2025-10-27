#!/bin/bash
# Environment configuration for platform-edge
# Copy this file to environment.sh and update the values

# Customer Configuration
export CUSTOMER_ID="default"
export CUSTOMER_IDS="customer1,customer2,customer3"

# AWS Configuration
export AWS_REGION="af-south-1"
export INPUT_BUCKET="sa-api-client-input"
export OUTPUT_BUCKET="sa-api-client-output"

# Redis Configuration
export REDIS_URL="redis://localhost:6379"

# Service Configuration
export LOG_LEVEL="INFO"
export MODEL_UPDATE_SCHEDULE="weekly"  # weekly, daily, manual
export FORECAST_SCHEDULE="2x_daily"    # 2x_daily, manual

# Edge-specific Configuration
export MODELS_DIR="/app/models"
export CACHE_DIR="/app/cache"
export LOGS_DIR="/app/logs"

# Performance Tuning (ARM64)
export TF_CPP_MIN_LOG_LEVEL="2"
export OMP_NUM_THREADS="4"
export MKL_NUM_THREADS="4"

# Optional: AWS Credentials (if not using IAM roles)
# export AWS_ACCESS_KEY_ID="your-access-key"
# export AWS_SECRET_ACCESS_KEY="your-secret-key"