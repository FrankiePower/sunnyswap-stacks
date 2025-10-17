# Redis JSON Parse Fix

## Problem

The Upstash Redis client returns **objects** instead of **strings** from `hGet` and `hGetAll`, but the code was calling `JSON.parse()` on the results, causing:

```
SyntaxError: "[object Object]" is not valid JSON
```

## Root Cause

When using **local Redis** (node `redis` package):
- `hGet()` returns a **string**
- Need to `JSON.parse()` the string

When using **Upstash Redis** (REST API):
- `hGet()` returns an **already-parsed object**
- Calling `JSON.parse()` on it causes an error

## Solution

Added type checking before parsing in **all** Redis read operations:

```typescript
// Before (fails with Upstash)
const order = JSON.parse(data);

// After (works with both)
const order = typeof data === 'string' ? JSON.parse(data) : data;
```

## Files Fixed

1. ✅ `src/hooks/useOrderHistory.ts` (line 49)
2. ✅ `src/app/api/relayer/orders/[hash]/route.ts` (line 24)
3. ✅ `src/app/api/relayer/orders/[hash]/status/route.ts` (line 24)
4. ✅ `src/app/api/relayer/orders/[hash]/escrow/route.ts` (line 30)

## How to Apply

**Restart your dev server** for the API route changes to take effect:

```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

Hot reload may not catch API route changes, so a full restart is needed.

## Testing

After restart, the errors should be gone:
- ✅ Order history loads without errors
- ✅ Order status endpoint returns 200
- ✅ Order creation and polling works
- ✅ No more JSON parse errors in console

---

**Status**: Fixed and ready to test after server restart
