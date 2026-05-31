# validate-upload

Server-side strict file validation for uploaded storage objects.

This function is additive and does not change existing upload flows until you invoke it.

## What it validates

- Extension allow-list by kind (`document` or `signature`)
- Optional provided `content-type`
- File size limits (non-empty, max 20MB)
- Magic bytes signature compatibility

## Request

`POST /functions/v1/validate-upload`

```json
{
  "bucket": "documents",
  "path": "<caseId>/<docId>/<filename>",
  "fileName": "report.pdf",
  "providedContentType": "application/pdf",
  "kind": "document"
}
```

## Response

```json
{
  "success": true,
  "valid": true,
  "bucket": "documents",
  "path": "...",
  "kind": "document",
  "extension": "pdf",
  "providedContentType": "application/pdf",
  "detectedMagic": "pdf",
  "size": 12345,
  "reasons": []
}
```

When invalid, `valid` is `false` and `reasons` contains the rejection causes.

## Rollout (safe)

1. Keep current upload flow unchanged.
2. Invoke this function only in logs/monitoring mode first.
3. After verification, enforce blocking behavior in upload flows.
