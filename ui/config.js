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

// Crossmint API Key for Treasury App
window.CROSSMINT_API_KEY = window.CROSSMINT_API_KEY || 'sk_production_AGSbyLs6uaQJ5BN5iUy3cumWtc2VPPSQQSWw8fL4x8atNnZyK6DWKKboxh4mujEeh3YThuq1f89fgYuL7NZCpyiXfFMLrC2F9atMiMq3V4H4gY6xQmAymfw2weCBdgBa71uGWqRccXX2bxxa2f4pPNDKDxe9JM9dx73EYZSgVmsXvpAuH6Et3B2vQAJjUmNr4KhjV5y4QM8GVBw6E5nfFx73';
