# RIASEC Quiz Error Debugging Guide

## Error: "RIASEC capture failed"

### Possible Causes:

1. **Session Expired or Not Found** (Most Common)
   - Sessions are stored in memory
   - If the backend restarts, all sessions are lost
   - Solution: Restart the quiz from the beginning

2. **Backend Not Running**
   - Check if FastAPI server is running on port 8000
   - Solution: Start the backend server

3. **Session ID Mismatch**
   - Session ID in localStorage doesn't match backend
   - Solution: Clear localStorage and restart quiz

4. **Invalid Question ID or Value**
   - Question ID not found in QID_TO_SCALE mapping
   - Value outside valid range (1-5)
   - Solution: Should be handled automatically, but restart if persists

### How to Debug:

1. **Check Browser Console (F12)**
   - Look for detailed error messages
   - Check Network tab for failed API calls
   - Note the exact error message and status code

2. **Check Backend Logs**
   - Look for error messages in the terminal running the backend
   - Check for "Session not found" errors
   - Check for traceback information

3. **Check Session Status**
   - Open browser DevTools → Application → Local Storage
   - Check `riasecQuizState` for session ID
   - Verify session ID matches what's being sent to backend

### Quick Fixes:

1. **Clear LocalStorage and Restart**
   ```javascript
   // In browser console:
   localStorage.removeItem('riasecQuizState');
   localStorage.removeItem('riasecResult');
   // Then refresh the page and restart quiz
   ```

2. **Restart Backend Server**
   - Stop the backend server
   - Start it again: `cd backend && python app.py`

3. **Check Backend is Running**
   - Visit: http://localhost:8000/health
   - Should return: `{"ok": true, "message": "API up"}`

### Recent Improvements:

- Enhanced error messages now show backend details
- Session expiration detection with helpful messages
- Better error handling to preserve question state
- Auto-reset of submitting state on errors

### Next Steps if Error Persists:

1. Share the exact error message from browser console
2. Share backend logs showing the error
3. Share the session ID (first 20 chars) from localStorage
4. Confirm backend is running on port 8000

