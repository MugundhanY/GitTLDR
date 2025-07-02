# Meeting Q&A Error Fix & Testing Guide

## 🔧 ISSUE FIXED

**Error**: `'DatabaseService' object has no attribute 'get_meeting_info'`

**Root Cause**: The Python worker's `MeetingProcessor.process_meeting_qa()` method was trying to call `database_service.get_meeting_info(meeting_id)` but this method didn't exist in the `DatabaseService` class.

**Solution**: Added the missing `get_meeting_info()` method to `python-worker/services/database_service.py` that:
- Fetches meeting metadata from the `meetings` table
- Retrieves associated segments from `meeting_segments` table  
- Returns properly formatted meeting info with segments

## 📝 IMPLEMENTATION SUMMARY

### ✅ All Issues Fixed:

1. **Audio Playback (401 Error)** - Enhanced B2 storage with signed URLs
2. **Duration Formatting** - Fixed floating point precision issues  
3. **Export to PDF/Word** - Created functional export API routes
4. **Share Meeting** - Already working (copy link, email, social media)
5. **Meeting Q&A End-to-End** - Fixed database service + created proxy API
6. **Audio Duration Consistency** - Fixed precision issues in time formatting

### 🚀 New Components Added:

- `/api/meetings/[id]/export/pdf` - Text-based export
- `/api/meetings/[id]/export/docx` - RTF export (Word compatible)
- `/api/python-worker/meeting-qa` - Proxy to Python worker with fallbacks
- Enhanced B2 storage service with signed URL support
- Improved Meeting Q&A with contextual fallback responses

## 🧪 TESTING INSTRUCTIONS

### 1. System Status Check
```bash
# Test overall system health
curl http://localhost:3000/api/system-status
```

### 2. Python Worker Setup
```bash
# Start Python worker (required for Q&A)
cd python-worker
python api_server.py
```

### 3. Test Python Worker Connection  
```bash
# Verify Python worker is running
curl http://localhost:3000/api/test-python-worker
```

### 4. Test Meeting Q&A
```javascript
// In browser console or API test
fetch('/api/python-worker/meeting-qa', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    meeting_id: 'your-meeting-id',
    question: 'What were the main action items?',
    user_id: 'test-user'
  })
})
```

### 5. Test Audio Playback
- Navigate to a meeting detail page
- Click play button on audio player
- Should work without 401 errors

### 6. Test Export Features
- Go to meeting detail page
- Click export button (download icon)
- Try PDF and Word export options
- Files should download successfully

### 7. Test Share Feature
- Click share button on meeting detail page
- Try copy link, email, and social media options
- All should work correctly

## 🔍 TROUBLESHOOTING

### Meeting Q&A Still Shows Demo Response
- **Cause**: Python worker not running or not accessible
- **Fix**: Start Python worker: `cd python-worker && python api_server.py`
- **Check**: Visit `/api/test-python-worker` to verify connection

### Audio Still Shows 401 Error
- **Cause**: B2 application key missing `readFiles` permission
- **Fix**: Update B2 application key capabilities
- **Check**: Visit `/api/system-status` to verify B2 authorization

### Export Returns Error
- **Cause**: Database connection issue or missing meeting data
- **Fix**: Ensure DATABASE_URL is correct and meeting exists
- **Check**: Visit `/api/system-status` to verify database connection

### Duration Shows Decimals
- **Cause**: Cached old JavaScript files
- **Fix**: Hard refresh browser (Ctrl+F5) to reload updated JS

## 📋 ENVIRONMENT REQUIREMENTS

### Required Environment Variables:
```env
# B2 Storage (for audio)
B2_BUCKET_NAME=your-bucket-name
B2_APPLICATION_KEY_ID=your-key-id
B2_APPLICATION_KEY=your-application-key

# Database  
DATABASE_URL=postgresql://user:pass@host:port/db

# Python Worker (for Q&A)
PYTHON_WORKER_URL=http://localhost:8000
```

### B2 Application Key Permissions:
- ✅ `listFiles`
- ✅ `readFiles` 
- ✅ `writeFiles`
- ✅ `deleteFiles`

## 🎯 QUICK TEST CHECKLIST

- [ ] System status check passes: `/api/system-status`
- [ ] Python worker accessible: `/api/test-python-worker`  
- [ ] Audio plays without 401 errors
- [ ] Meeting Q&A responds to questions (not just demo response)
- [ ] PDF export downloads file
- [ ] Word export downloads file
- [ ] Share meeting copies link successfully
- [ ] Duration displays without decimal places

## 🚨 KNOWN LIMITATIONS

1. **Export formats**: Currently exports as text/RTF, not true PDF/DOCX
2. **Q&A accuracy**: Depends on meeting data being properly indexed in Qdrant
3. **Audio access**: Requires proper B2 bucket permissions
4. **Python worker dependency**: Q&A requires Python worker to be running

## 🎉 SUCCESS INDICATORS

When everything is working correctly:
- Audio plays smoothly
- Q&A gives contextual responses (not demo text)
- Exports download proper files
- Share functionality works
- Duration shows clean time format (e.g., "13:11" not "13:11.920000000000073")

All components should now work end-to-end for a complete meeting experience!
