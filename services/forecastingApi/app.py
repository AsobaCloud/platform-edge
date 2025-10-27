#!/usr/bin/env python3
"""
Edge-optimized Forecasting API Service
Adapted from the main platform forecastingApi for ARM64 edge devices
"""

import json
import os
import io
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any

import boto3
import pandas as pd
import numpy as np
import redis
from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
import joblib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Configuration
class Config:
    # AWS Configuration
    AWS_REGION = os.environ.get('AWS_REGION', 'af-south-1')
    INPUT_BUCKET = os.environ.get('INPUT_BUCKET', 'sa-api-client-input')
    OUTPUT_BUCKET = os.environ.get('OUTPUT_BUCKET', 'sa-api-client-output')
    
    # Redis Configuration
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
    
    # Model Configuration
    MODEL_UPDATE_SCHEDULE = os.environ.get('MODEL_UPDATE_SCHEDULE', 'weekly')
    FORECAST_SCHEDULE = os.environ.get('FORECAST_SCHEDULE', '2x_daily')
    
    # Edge-specific settings
    CUSTOMER_ID = os.environ.get('CUSTOMER_ID', 'default')
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    # ARM64 optimizations
    TF_CPP_MIN_LOG_LEVEL = '2'  # Reduce TensorFlow logging
    OMP_NUM_THREADS = '4'       # Limit OpenMP threads
    MKL_NUM_THREADS = '4'       # Limit MKL threads

app.config.from_object(Config)

# Set TensorFlow environment variables for ARM64 optimization
os.environ['TF_CPP_MIN_LOG_LEVEL'] = Config.TF_CPP_MIN_LOG_LEVEL
os.environ['OMP_NUM_THREADS'] = Config.OMP_NUM_THREADS
os.environ['MKL_NUM_THREADS'] = Config.MKL_NUM_THREADS

# Initialize AWS clients
try:
    s3 = boto3.client('s3', region_name=Config.AWS_REGION)
    logger.info(f"AWS S3 client initialized for region: {Config.AWS_REGION}")
except Exception as e:
    logger.error(f"Failed to initialize AWS S3 client: {e}")
    s3 = None

# Initialize Redis client
try:
    redis_client = redis.from_url(Config.REDIS_URL, decode_responses=True)
    redis_client.ping()  # Test connection
    logger.info(f"Redis client connected to: {Config.REDIS_URL}")
except Exception as e:
    logger.error(f"Failed to connect to Redis: {e}")
    redis_client = None

# Model cache for edge optimization
model_cache = {}
encoders_cache = {}
config_cache = {}

# Cache TTL (1 hour for models, 30 minutes for data)
MODEL_CACHE_TTL = 3600
DATA_CACHE_TTL = 1800

def get_cache_key(prefix: str, customer_id: str, suffix: str = "") -> str:
    """Generate cache key for Redis"""
    return f"edge:{prefix}:{customer_id}:{suffix}"

def load_customer_model(customer_id: str) -> Tuple[Any, Any, Optional[Dict]]:
    """
    Load model from S3 registry with Redis caching for edge optimization.
    """
    cache_key = get_cache_key("model", customer_id)
    
    # Try Redis cache first
    if redis_client:
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                logger.info(f"Loading model from Redis cache for {customer_id}")
                data = json.loads(cached_data)
                return data['model'], data['encoders'], data.get('config')
        except Exception as e:
            logger.warning(f"Failed to load from Redis cache: {e}")
    
    # Fallback to memory cache
    if customer_id in model_cache:
        logger.info(f"Loading model from memory cache for {customer_id}")
        return model_cache[customer_id], encoders_cache[customer_id], config_cache.get(customer_id)
    
    logger.info(f"Loading model from S3 for customer: {customer_id}")
    
    if not s3:
        raise Exception("AWS S3 client not available")
    
    try:
        # Read latest_model.json
        registry_key = f'customer_tailored/{customer_id}/latest_model.json'
        registry_obj = s3.get_object(Bucket=Config.OUTPUT_BUCKET, Key=registry_key)
        registry = json.loads(registry_obj['Body'].read())
        
        logger.info(f"Model registry: {registry}")
        
        # Download model
        model_path = registry['model_path'].replace(f's3://{Config.OUTPUT_BUCKET}/', '')
        local_model_path = f'/tmp/model_{customer_id}.h5'
        s3.download_file(Config.OUTPUT_BUCKET, model_path, local_model_path)
        model = load_model(local_model_path)
        
        logger.info(f"Model loaded: {model_path}")
        
        # Download encoders
        encoders_path = registry['encoders_path'].replace(f's3://{Config.OUTPUT_BUCKET}/', '')
        local_encoders_path = f'/tmp/encoders_{customer_id}.pkl'
        s3.download_file(Config.OUTPUT_BUCKET, encoders_path, local_encoders_path)
        encoders = joblib.load(local_encoders_path)
        
        logger.info(f"Encoders loaded: {encoders_path}")
        
        # Load config if available
        config = None
        if 'config_path' in registry:
            config_path = registry['config_path'].replace(f's3://{Config.OUTPUT_BUCKET}/', '')
            config_obj = s3.get_object(Bucket=Config.OUTPUT_BUCKET, Key=config_path)
            config = json.loads(config_obj['Body'].read())
        
        # Cache in memory
        model_cache[customer_id] = model
        encoders_cache[customer_id] = encoders
        config_cache[customer_id] = config
        
        # Cache in Redis
        if redis_client:
            try:
                cache_data = {
                    'model': model,
                    'encoders': encoders,
                    'config': config
                }
                redis_client.setex(cache_key, MODEL_CACHE_TTL, json.dumps(cache_data, default=str))
                logger.info(f"Model cached in Redis for {customer_id}")
            except Exception as e:
                logger.warning(f"Failed to cache model in Redis: {e}")
        
        # Clean up temp files
        for temp_file in [local_model_path, local_encoders_path]:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        return model, encoders, config
        
    except Exception as e:
        logger.error(f"Error loading model for {customer_id}: {e}")
        raise

def get_recent_customer_data(customer_id: str, hours: int = 168) -> pd.DataFrame:
    """
    Get recent data for forecast context with Redis caching.
    """
    cache_key = get_cache_key("data", customer_id, f"recent_{hours}h")
    
    # Try Redis cache first
    if redis_client:
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                logger.info(f"Loading recent data from Redis cache for {customer_id}")
                return pd.read_json(io.StringIO(cached_data))
        except Exception as e:
            logger.warning(f"Failed to load data from Redis cache: {e}")
    
    logger.info(f"Fetching recent {hours}h of data for customer: {customer_id}")
    
    if not s3:
        raise Exception("AWS S3 client not available")
    
    try:
        # List objects to find customer's total_load.csv
        prefix = 'total/'
        response = s3.list_objects_v2(Bucket=Config.INPUT_BUCKET, Prefix=prefix)
        
        if 'Contents' not in response:
            raise ValueError(f"No data found for customer {customer_id}")
        
        # Find customer's data file
        customer_file = None
        for obj in response['Contents']:
            if obj['Key'].endswith('total_load.csv') and f'/{customer_id}/' in obj['Key']:
                customer_file = obj['Key']
                break
        
        if not customer_file:
            raise ValueError(f"No total_load.csv found for customer {customer_id}")
        
        logger.info(f"Loading data from: {customer_file}")
        
        # Download and read customer data
        s3_response = s3.get_object(Bucket=Config.INPUT_BUCKET, Key=customer_file)
        df = pd.read_csv(io.StringIO(s3_response['Body'].read().decode('utf-8')))
        
        # Convert timestamp
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Sort by timestamp
        df = df.sort_values('timestamp')
        
        # Get recent data (last N hours)
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_df = df[df['timestamp'] >= cutoff_time].copy()
        
        if len(recent_df) == 0:
            # If no recent data, get last N records
            recent_df = df.tail(hours).copy()
        
        logger.info(f"Retrieved {len(recent_df)} recent records")
        logger.info(f"Date range: {recent_df['timestamp'].min()} to {recent_df['timestamp'].max()}")
        
        # Cache in Redis
        if redis_client:
            try:
                redis_client.setex(cache_key, DATA_CACHE_TTL, recent_df.to_json())
                logger.info(f"Data cached in Redis for {customer_id}")
            except Exception as e:
                logger.warning(f"Failed to cache data in Redis: {e}")
        
        return recent_df
        
    except Exception as e:
        logger.error(f"Error fetching recent data for {customer_id}: {e}")
        raise

def prepare_features_for_inference(data_df: pd.DataFrame, customer_id: str, encoders: Dict) -> pd.DataFrame:
    """
    Apply same feature engineering as training.
    Uses pre-fitted encoders from training.
    """
    logger.info("Preparing features for inference...")
    
    df = data_df.copy()
    
    # Add metadata columns (needed for encoding)
    if 'customer_id' not in df.columns:
        df['customer_id'] = customer_id
    
    # Categorical encoding using pre-fitted encoders
    try:
        df['customer_encoded'] = encoders['customer_encoder'].transform(df['customer_id'].astype(str))
    except Exception:
        # If customer not seen during training, use a default value
        df['customer_encoded'] = 0
    
    # For manufacturer and region, try to extract from data or use defaults
    if 'manufacturer' in df.columns:
        try:
            df['manufacturer_encoded'] = encoders['manufacturer_encoder'].transform(df['manufacturer'].astype(str))
        except Exception:
            df['manufacturer_encoded'] = 0
    else:
        df['manufacturer_encoded'] = 0
    
    if 'region' in df.columns:
        try:
            df['region_encoded'] = encoders['region_encoder'].transform(df['region'].astype(str))
        except Exception:
            df['region_encoded'] = 0
    else:
        df['region_encoded'] = 0
    
    # Time-based features
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['month'] = df['timestamp'].dt.month
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    
    # Customer-level statistical features
    if 'kWh' in df.columns:
        df['customer_kwh_mean'] = df['kWh'].mean()
        df['customer_kwh_std'] = df['kWh'].std()
        df['customer_kwh_min'] = df['kWh'].min()
        df['customer_kwh_max'] = df['kWh'].max()
        
        # Manufacturer and regional features (use customer stats as proxy)
        df['mfg_kwh_mean'] = df['customer_kwh_mean']
        df['mfg_kwh_std'] = df['customer_kwh_std']
        df['mfg_kwh_min'] = df['customer_kwh_min']
        df['mfg_kwh_max'] = df['customer_kwh_max']
        
        df['regional_hourly_kwh_mean'] = df.groupby('hour')['kWh'].transform('mean')
        
        # Cross-manufacturer features
        df['kwh_vs_customer_mean'] = df['kWh'] / (df['customer_kwh_mean'] + 1e-8)
        df['kwh_vs_mfg_mean'] = df['kWh'] / (df['mfg_kwh_mean'] + 1e-8)
        
        # Lag features
        df = df.sort_values('timestamp')
        df['kwh_lag_1h'] = df['kWh'].shift(1)
        
        if len(df) > 24:
            df['kwh_lag_24h'] = df['kWh'].shift(24)
        else:
            df['kwh_lag_24h'] = df['kWh'].mean()
        
        # Rolling features
        df['kwh_rolling_mean_6h'] = df['kWh'].rolling(window=6, min_periods=1).mean()
        df['kwh_rolling_std_6h'] = df['kWh'].rolling(window=6, min_periods=1).std()
    
    # Fill NaN values
    df = df.fillna(method='ffill').fillna(method='bfill').fillna(0)
    
    logger.info(f"Features prepared. Shape: {df.shape}")
    
    return df

def create_sequences_for_inference(data_df: pd.DataFrame, feature_cols: List[str], seq_length: int = 24) -> np.ndarray:
    """
    Create LSTM sequences for inference.
    Returns only the most recent sequence(s).
    """
    logger.info(f"Creating inference sequences (length={seq_length})...")
    
    df = data_df.sort_values('timestamp')
    
    if len(df) < seq_length:
        raise ValueError(f"Insufficient data for sequence creation: {len(df)} < {seq_length}")
    
    # Create sequences
    sequences = []
    
    # We can create multiple overlapping sequences from recent data
    for i in range(seq_length, len(df) + 1):
        seq_data = df.iloc[i-seq_length:i]
        
        try:
            seq_features = seq_data[feature_cols].values
            
            if not np.isnan(seq_features).any():
                sequences.append(seq_features)
        except Exception as e:
            logger.warning(f"Warning: Error creating sequence {i}: {e}")
            continue
    
    if not sequences:
        raise ValueError("No valid sequences created")
    
    sequences = np.array(sequences)
    
    logger.info(f"Created {len(sequences)} inference sequences")
    logger.info(f"Sequence shape: {sequences.shape}")
    
    return sequences

# Flask Routes

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check Redis connection
        redis_status = "connected" if redis_client and redis_client.ping() else "disconnected"
        
        # Check AWS connection
        aws_status = "connected" if s3 else "disconnected"
        
        # Check model cache
        model_count = len(model_cache)
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'services': {
                'redis': redis_status,
                'aws': aws_status
            },
            'cache': {
                'models_cached': model_count
            },
            'config': {
                'customer_id': Config.CUSTOMER_ID,
                'aws_region': Config.AWS_REGION
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/status', methods=['GET'])
def status():
    """Detailed status endpoint"""
    try:
        return jsonify({
            'service': 'forecasting-api-edge',
            'version': '1.0.0',
            'timestamp': datetime.now().isoformat(),
            'uptime': time.time() - start_time,
            'config': {
                'customer_id': Config.CUSTOMER_ID,
                'aws_region': Config.AWS_REGION,
                'redis_url': Config.REDIS_URL,
                'model_update_schedule': Config.MODEL_UPDATE_SCHEDULE,
                'forecast_schedule': Config.FORECAST_SCHEDULE
            },
            'cache_status': {
                'models_cached': len(model_cache),
                'redis_connected': redis_client and redis_client.ping()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/forecast', methods=['POST'])
def generate_forecast():
    """
    Generate forecast endpoint.
    
    Request body:
    {
        "customer_id": "Sibaya",
        "forecast_hours": 24,
        "start_time": "2025-01-15T08:00:00Z"  # optional
    }
    """
    try:
        # Parse request
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        customer_id = data.get('customer_id', Config.CUSTOMER_ID)
        forecast_hours = data.get('forecast_hours', 24)
        
        logger.info(f"Generating {forecast_hours}h forecast for customer: {customer_id}")
        
        # Step 1: Load model (with caching)
        logger.info("Loading model...")
        if customer_id not in model_cache:
            model, encoders, config = load_customer_model(customer_id)
            model_cache[customer_id] = model
            encoders_cache[customer_id] = encoders
            config_cache[customer_id] = config
        else:
            logger.info(f"Using cached model for {customer_id}")
            model = model_cache[customer_id]
            encoders = encoders_cache[customer_id]
            config = config_cache.get(customer_id)
        
        # Step 2: Get recent data for context
        logger.info("Getting recent data...")
        recent_data = get_recent_customer_data(customer_id, hours=168)
        
        # Step 3: Prepare features
        logger.info("Preparing features...")
        featured_data = prepare_features_for_inference(recent_data, customer_id, encoders)
        
        # Step 4: Determine feature columns
        exclude_cols = ['timestamp', 'customer_id', 'manufacturer', 'region', 'location', 'client_id', 'serial_number', 'datetime']
        target_cols = ['kWh', 'kVArh', 'kVA', 'PF']
        available_targets = [col for col in target_cols if col in featured_data.columns]
        
        feature_cols = [col for col in featured_data.columns if col not in exclude_cols and col not in target_cols]
        
        logger.info(f"Using {len(feature_cols)} features for inference")
        logger.info(f"Target columns: {available_targets}")
        
        # Step 5: Create sequences
        logger.info("Creating sequences...")
        X = create_sequences_for_inference(featured_data, feature_cols, seq_length=24)
        
        # Step 6: Generate predictions
        logger.info("Generating predictions...")
        predictions = model.predict(X, verbose=0)
        
        logger.info(f"Generated {len(predictions)} predictions")
        logger.info(f"Predictions shape: {predictions.shape}")
        
        # Step 7: Format response
        logger.info("Formatting response...")
        
        # Use the most recent prediction (last sequence)
        latest_prediction = predictions[-1]
        
        # Get the last timestamp from data
        last_timestamp = featured_data['timestamp'].max()
        
        # Generate forecasts for requested hours
        forecasts = []
        for i in range(min(forecast_hours, len(predictions))):
            pred = predictions[-(len(predictions)-i)] if i < len(predictions) else latest_prediction
            
            forecast_time = last_timestamp + timedelta(hours=i+1)
            
            forecast_entry = {
                'timestamp': forecast_time.isoformat(),
                'hour_ahead': i + 1
            }
            
            # Add predictions for each target
            for j, target in enumerate(available_targets):
                if j < pred.shape[0]:
                    forecast_entry[f'{target}_forecast'] = float(pred[j])
            
            forecasts.append(forecast_entry)
        
        # Add model metadata
        model_info = {
            'model_type': 'customer_validation_lstm',
            'optimization_strategy': 'stratified_validation'
        }
        
        if config:
            model_info['model_timestamp'] = config.get('timestamp')
            if 'training_optimization_results' in config:
                model_info['customer_validation_loss'] = config['training_optimization_results'].get('final_customer_validation_loss')
        
        logger.info(f"Generated {len(forecasts)} forecast points")
        
        return jsonify({
            'customer_id': customer_id,
            'forecast_hours': len(forecasts),
            'forecasts': forecasts,
            'model_info': model_info,
            'generated_at': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error in forecast generation: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/forecast/<customer_id>', methods=['GET'])
def get_forecast(customer_id: str):
    """
    Simple GET endpoint for forecast generation.
    Query parameters: forecast_hours (default: 24)
    """
    try:
        forecast_hours = int(request.args.get('forecast_hours', 24))
        
        # Use the POST endpoint logic
        data = {
            'customer_id': customer_id,
            'forecast_hours': forecast_hours
        }
        
        # Create a mock request object
        from flask import g
        g.forecast_data = data
        
        return generate_forecast()
        
    except Exception as e:
        logger.error(f"Error in GET forecast: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Initialize start time for uptime calculation
start_time = time.time()

if __name__ == '__main__':
    logger.info("Starting Edge Forecasting API Service...")
    logger.info(f"Customer ID: {Config.CUSTOMER_ID}")
    logger.info(f"AWS Region: {Config.AWS_REGION}")
    logger.info(f"Redis URL: {Config.REDIS_URL}")
    
    # Run Flask app
    app.run(
        host='0.0.0.0',
        port=8080,
        debug=Config.LOG_LEVEL == 'DEBUG',
        threaded=True
    )