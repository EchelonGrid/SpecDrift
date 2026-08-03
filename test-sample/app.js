// Sample JavaScript File
const userId = 42;

// 1. Documented Endpoint
fetch(`/api/v1/users/${userId}`);

// 2. Secret / Undocumented Endpoint (Shadow API!)
axios.get('/api/v1/secret-admin-debug');