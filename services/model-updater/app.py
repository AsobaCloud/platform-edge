#!/usr/bin/env python3
"""
Model Updater Service for Edge Devices
Automatically downloads and updates ML models from the main platform repository
"""

import json
import os
import logging
import time
import schedule
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import boto3
import redis
import requests
from flask import Flask

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
    OUTPUT_BUCKET = os.environ.get('OUTPUT_BUCKET', 'sa-api-client-output')
    
    # Redis Configuration
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
    
    # Update Configuration
    UPDATE_SCHEDULE = os.environ.get('UPDATE_SCHEDULE', '0 6 * * 1')  # Weekly on Monday at 6 AM
    CUSTOMER_IDS = os.environ.get('CUSTOMER_IDS', 'default').split(',')
    
    # Local paths
    MODELS_DIR = os.environ.get('MODELS_DIR', '/app/models')
    LOGS_DIR = os.environ.get('LOGS_DIR', '/app/logs')

app.config.from_object(Config)

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

def ensure_directories():
    """Ensure required directories exist"""
    os.makedirs(Config.MODELS_DIR, exist_ok=True)
    os.makedirs(Config.LOGS_DIR, exist_ok=True)
    logger.info(f"Directories ensured: {Config.MODELS_DIR}, {Config.LOGS_DIR}")

def get_model_registry(customer_id: str) -> Optional[Dict]:
    """Get model registry for a customer"""
    if not s3:
        logger.error("AWS S3 client not available")
        return None
    
    try:
        registry_key = f'customer_tailored/{customer_id}/latest_model.json'
        registry_obj = s3.get_object(Bucket=Config.OUTPUT_BUCKET, Key=registry_key)
        registry = json.loads(registry_obj['Body'].read())
        logger.info(f"Retrieved model registry for {customer_id}")
        return registry
    except Exception as e:
        logger.error(f"Failed to get model registry for {customer_id}: {e}")
        return None

def download_model_file(s3_path: str, local_path: str) -> bool:
    """Download a model file from S3"""
    if not s3:
        logger.error("AWS S3 client not available")
        return False
    
    try:
        # Convert S3 path to bucket and key
        if s3_path.startswith(f's3://{Config.OUTPUT_BUCKET}/'):
            key = s3_path.replace(f's3://{Config.OUTPUT_BUCKET}/', '')
        else:
            key = s3_path
        
        # Download file
        s3.download_file(Config.OUTPUT_BUCKET, key, local_path)
        logger.info(f"Downloaded {s3_path} to {local_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to download {s3_path}: {e}")
        return False

def update_customer_model(customer_id: str) -> bool:
    """Update model for a specific customer"""
    logger.info(f"Updating model for customer: {customer_id}")
    
    # Get model registry
    registry = get_model_registry(customer_id)
    if not registry:
        return False
    
    # Create customer directory
    customer_dir = os.path.join(Config.MODELS_DIR, customer_id)
    os.makedirs(customer_dir, exist_ok=True)
    
    success = True
    
    # Download model file
    model_path = registry.get('model_path')
    if model_path:
        local_model_path = os.path.join(customer_dir, 'model.h5')
        if not download_model_file(model_path, local_model_path):
            success = False
    
    # Download encoders file
    encoders_path = registry.get('encoders_path')
    if encoders_path:
        local_encoders_path = os.path.join(customer_dir, 'encoders.pkl')
        if not download_model_file(encoders_path, local_encoders_path):
            success = False
    
    # Download config file if available
    config_path = registry.get('config_path')
    if config_path:
        local_config_path = os.path.join(customer_dir, 'config.json')
        if not download_model_file(config_path, local_config_path):
            # Config is optional, don't fail if it's missing
            logger.warning(f"Failed to download config for {customer_id}, continuing...")
    
    # Update Redis cache
    if redis_client and success:
        try:
            cache_key = f"edge:model:{customer_id}"
            cache_data = {
                'model_path': os.path.join(customer_dir, 'model.h5'),
                'encoders_path': os.path.join(customer_dir, 'encoders.pkl'),
                'config_path': os.path.join(customer_dir, 'config.json'),
                'updated_at': datetime.now().isoformat(),
                'registry': registry
            }
            redis_client.setex(cache_key, 3600, json.dumps(cache_data, default=str))
            logger.info(f"Updated Redis cache for {customer_id}")
        except Exception as e:
            logger.warning(f"Failed to update Redis cache for {customer_id}: {e}")
    
    if success:
        logger.info(f"Successfully updated model for {customer_id}")
    else:
        logger.error(f"Failed to update model for {customer_id}")
    
    return success

def update_all_models() -> Dict[str, bool]:
    """Update models for all customers"""
    logger.info("Starting model update for all customers")
    
    results = {}
    for customer_id in Config.CUSTOMER_IDS:
        customer_id = customer_id.strip()
        if customer_id:
            results[customer_id] = update_customer_model(customer_id)
    
    # Log summary
    successful = sum(1 for success in results.values() if success)
    total = len(results)
    logger.info(f"Model update completed: {successful}/{total} successful")
    
    return results

def check_model_freshness(customer_id: str) -> Dict:
    """Check if model needs updating"""
    if not redis_client:
        return {'needs_update': True, 'reason': 'Redis not available'}
    
    try:
        cache_key = f"edge:model:{customer_id}"
        cached_data = redis_client.get(cache_key)
        
        if not cached_data:
            return {'needs_update': True, 'reason': 'No cached model'}
        
        data = json.loads(cached_data)
        updated_at = datetime.fromisoformat(data['updated_at'])
        
        # Check if model is older than 7 days
        if datetime.now() - updated_at > timedelta(days=7):
            return {'needs_update': True, 'reason': 'Model older than 7 days'}
        
        return {'needs_update': False, 'reason': 'Model is fresh', 'updated_at': updated_at}
        
    except Exception as e:
        logger.error(f"Error checking model freshness for {customer_id}: {e}")
        return {'needs_update': True, 'reason': f'Error: {e}'}

def scheduled_update():
    """Scheduled model update function"""
    logger.info("Running scheduled model update")
    results = update_all_models()
    
    # Log results
    for customer_id, success in results.items():
        if success:
            logger.info(f"✓ {customer_id}: Updated successfully")
        else:
            logger.error(f"✗ {customer_id}: Update failed")
    
    return results

# Flask Routes

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        redis_status = "connected" if redis_client and redis_client.ping() else "disconnected"
        aws_status = "connected" if s3 else "disconnected"
        
        return {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'services': {
                'redis': redis_status,
                'aws': aws_status
            },
            'config': {
                'customer_ids': Config.CUSTOMER_IDS,
                'update_schedule': Config.UPDATE_SCHEDULE,
                'models_dir': Config.MODELS_DIR
            }
        }, 200
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {'status': 'unhealthy', 'error': str(e)}, 500

@app.route('/update', methods=['POST'])
def manual_update():
    """Manual model update endpoint"""
    try:
        results = update_all_models()
        return {
            'status': 'completed',
            'timestamp': datetime.now().isoformat(),
            'results': results
        }, 200
        
    except Exception as e:
        logger.error(f"Manual update failed: {e}")
        return {'error': str(e)}, 500

@app.route('/status', methods=['GET'])
def status():
    """Status endpoint showing model freshness"""
    try:
        status_data = {}
        for customer_id in Config.CUSTOMER_IDS:
            customer_id = customer_id.strip()
            if customer_id:
                status_data[customer_id] = check_model_freshness(customer_id)
        
        return {
            'timestamp': datetime.now().isoformat(),
            'models': status_data
        }, 200
        
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {'error': str(e)}, 500

def run_scheduler():
    """Run the scheduler in a separate thread"""
    import threading
    
    def scheduler_loop():
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
    scheduler_thread.start()
    logger.info("Scheduler started")

if __name__ == '__main__':
    logger.info("Starting Model Updater Service...")
    logger.info(f"Customer IDs: {Config.CUSTOMER_IDS}")
    logger.info(f"Update Schedule: {Config.UPDATE_SCHEDULE}")
    logger.info(f"Models Directory: {Config.MODELS_DIR}")
    
    # Ensure directories exist
    ensure_directories()
    
    # Set up scheduled updates
    if Config.UPDATE_SCHEDULE == 'manual':
        logger.info("Manual update mode - no scheduling")
    else:
        # Parse cron-like schedule (simplified)
        schedule.every().monday.at("06:00").do(scheduled_update)
        run_scheduler()
        logger.info("Scheduled updates configured")
    
    # Run Flask app
    app.run(
        host='0.0.0.0',
        port=8081,
        debug=False,
        threaded=True
    )