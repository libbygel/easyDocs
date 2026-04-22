
# Plan: Fix Notification System - Badge Count, Document Names, and Error Handling

## Problem Analysis

There are 3 distinct issues:

1. **Badge count not syncing correctly**: Line 58 in `AppLayout.tsx` has a bug: `n.case_id || n.case_id` (same value twice, no fallback). When notifications are marked as read on the Notifications page, the AppLayout badge doesn't immediately update because it relies on a separate realtime channel that re-fetches the full count.

2. **Document names missing**: The edge function `send-documents-to-advisor` has the correct code to include document names in the message, BUT it was never redeployed after the fix. The old notifications in the database have messages like `"לתיק: מיחזור 4 מימי"` without any `מסמכים:` line. Need to redeploy the edge function and add a fallback display for old notifications.

3. **Connection error handling**: Needs better logging with specific error details (URL, status code) to diagnose `ERR_NAME_NOT_RESOLVED` issues.

---

## Changes

### 1. `src/components/layout/AppLayout.tsx` - Fix badge count sync

- Fix the `n.case_id || n.case_id` bug to `n.case_id || n.id` (fallback to notification id for null case_id)
- When the Notifications page marks items as read, the realtime channel already triggers a re-fetch -- confirm this works end-to-end

### 2. `supabase/functions/send-documents-to-advisor/index.ts` - Redeploy

- The edge function already has the correct code (line 74 includes document names)
- Redeploy the function so new notifications will contain document names
- Also create **one notification per document** instead of one bulk notification, so each notification clearly identifies which document was uploaded/signed

### 3. `src/pages/Notifications.tsx` - Fix display for old + new notifications

- For old notifications without `מסמכים:` in the message, fall back to showing the original title text instead of an empty expanded view
- Improve error logging with specific connection details
- Ensure `markGroupAsRead` properly triggers the AppLayout badge refresh (it already does via realtime, but verify)

### 4. Edge function notification format change

Change the edge function to insert **individual notifications per document** rather than one grouped notification. Each will have:
- `title`: `הועלה מסמך: ת.ז.` or `נחתם מסמך: חוזה`  
- `message`: `לתיק: ${caseTitle}\nלקוח: ${clientName}`

This way the Notifications page doesn't need complex regex parsing -- each notification is already descriptive.

---

## Technical Details

### File: `src/components/layout/AppLayout.tsx`
- Line 58: Change `n.case_id || n.case_id` to `n.case_id || n.id`

### File: `supabase/functions/send-documents-to-advisor/index.ts`
- Replace the single `notifications.insert()` call with a loop that inserts one notification per document name
- Each notification title: `${clientName} - הועלה מסמך: ${docName}`
- Message: `לתיק: ${caseTitle}\nמסמך: ${docName}`

### File: `src/pages/Notifications.tsx`
- Update the expanded items view: parse `מסמך:` (singular) from message for new format
- Fallback for old notifications: show the original title as-is
- Add detailed error logging: log the full error object including any `cause` or `code` properties

### Redeploy
- Redeploy `send-documents-to-advisor` edge function after changes
