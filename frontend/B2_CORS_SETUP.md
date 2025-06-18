# Backblaze B2 CORS Configuration for Direct Upload

## Problem
The "Failed to fetch" error occurs because Backblaze B2 bucket doesn't allow cross-origin requests from your frontend domain by default.

## Solution: Configure CORS on B2 Bucket

### Option 1: Using B2 CLI (Recommended)

1. **Install B2 CLI**:
   ```bash
   pip install b2
   ```

2. **Authorize with your account**:
   ```bash
   b2 authorize-account <applicationKeyId> <applicationKey>
   ```

3. **Set CORS rules for your bucket**:
   ```bash
   b2 update-bucket --cors-rules '[
     {
       "corsRuleName": "allowUploads",
       "allowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
       "allowedHeaders": ["*"],
       "allowedOperations": ["b2_upload_file", "b2_upload_part"],
       "maxAgeSeconds": 3600
     }
   ]' gittldr allPrivate
   ```

### Option 2: Using B2 Web Interface

1. Go to [Backblaze B2 Console](https://secure.backblaze.com/b2_buckets.htm)
2. Select your bucket (`gittldr`)
3. Go to "Bucket Settings" → "CORS Rules"
4. Add this CORS configuration:

```json
[
  {
    "corsRuleName": "allowUploads",
    "allowedOrigins": [
      "http://localhost:3000",
      "https://yourdomain.com"
    ],
    "allowedHeaders": ["*"],
    "allowedOperations": [
      "b2_upload_file",
      "b2_upload_part"
    ],
    "maxAgeSeconds": 3600
  }
]
```

### Option 3: Using B2 API

```bash
curl -X POST https://api.backblazeb2.com/b2api/v3/b2_update_bucket \
  -H "Authorization: <authToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "<accountId>",
    "bucketId": "<bucketId>",
    "corsRules": [
      {
        "corsRuleName": "allowUploads",
        "allowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
        "allowedHeaders": ["*"],
        "allowedOperations": ["b2_upload_file", "b2_upload_part"],
        "maxAgeSeconds": 3600
      }
    ]
  }'
```

## Important Notes

1. **Replace domains**: Update `"http://localhost:3000"` and `"https://yourdomain.com"` with your actual domains
2. **Wildcard origins**: For development, you can use `["*"]` but this is not recommended for production
3. **Headers**: The `"allowedHeaders": ["*"]` allows all headers which is needed for B2 upload headers
4. **Operations**: `b2_upload_file` and `b2_upload_part` are required for file uploads

## Testing CORS Configuration

After configuring CORS, test with:

```javascript
// Open browser console on your site and run:
fetch('https://api003.backblazeb2.com/b2api/v3/b2_get_upload_url', {
  method: 'OPTIONS'
}).then(response => console.log('CORS test:', response.status))
```

## Fallback Solution

If you can't configure CORS immediately, the system will fall back to server-side upload through your Next.js API.
