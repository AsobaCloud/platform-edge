/**
 * Platform Configuration
 * Update these values after deploying the user management infrastructure
 */

// User Management API Endpoint
// This should be set to the API Gateway endpoint URL from the CloudFormation stack output
// Format: https://{api-id}.execute-api.{region}.amazonaws.com/{stage}
// To find this value, run:
//   aws cloudformation describe-stacks --stack-name "ona-user-management-prod" --region us-east-1 --query 'Stacks[0].Outputs[?OutputKey==`UserManagementApi`].OutputValue' --output text
// Or check SSM:
//   aws ssm get-parameter --name "/ona-platform/prod/user-management/api-endpoint" --query 'Parameter.Value' --output text
window.AUTH_API_ENDPOINT = window.AUTH_API_ENDPOINT || 'https://w0lovgppb9.execute-api.af-south-1.amazonaws.com/prod';

// Data Admin API Endpoint (Asoba Internal Ops)
// This should be set to the API Gateway endpoint URL from the CloudFormation stack output
// To find this value, run:
//   aws cloudformation describe-stacks --stack-name "ona-data-admin-prod" --region af-south-1 --query 'Stacks[0].Outputs[?OutputKey==`DataAdminApi`].OutputValue' --output text
// Or check SSM:
//   aws ssm get-parameter --name "/ona-platform/prod/data-admin/api-endpoint" --query 'Parameter.Value' --output text
window.DATA_ADMIN_API_ENDPOINT = window.DATA_ADMIN_API_ENDPOINT || 'https://pj1ud6q3uf.execute-api.af-south-1.amazonaws.com/prod';

// Global Training Service API Token
// This is a service-to-service authentication token for the training/metrics/comparison APIs
// To find this value, run:
//   aws ssm get-parameter --name "/ona-platform/prod/global-training-api-token" --with-decryption --region af-south-1 --query 'Parameter.Value' --output text
window.GLOBAL_TRAINING_API_TOKEN = window.GLOBAL_TRAINING_API_TOKEN || '';

// Zorora Deep Research API Endpoint
// This is the Flask API server for the Zorora deep research engine
// Default: local development server. Update for production deployment.
window.ZORORA_API_ENDPOINT = window.ZORORA_API_ENDPOINT || 'https://zorora.asoba.co';

// EnergyAnalyst RAG API Endpoint (Nehanda/EnergyAnalyst service)
// Production: Railway. Development: localhost:8000
window.ENERGY_ANALYST_API_ENDPOINT = window.ENERGY_ANALYST_API_ENDPOINT || 'https://energyanalystragservice-production.up.railway.app';

// EnergyAnalyst RAG API Token
// Service-to-service auth token for the EnergyAnalyst RAG service (POST /query, POST /upload_pdfs, DELETE /threads)
window.ENERGY_ANALYST_API_TOKEN = window.ENERGY_ANALYST_API_TOKEN || '';

// Crossmint API Key for Treasury App
// To find this value, run:
//   aws ssm get-parameter --name "/ona-platform/prod/crossmint-api-key" --with-decryption --region af-south-1 --query 'Parameter.Value' --output text
window.CROSSMINT_API_KEY = window.CROSSMINT_API_KEY || '';
