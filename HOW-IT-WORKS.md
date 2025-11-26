---

## How it works (High-level flow)

This backend processes every contact message through a secure, serverless flow:

```
User → Contact Form → Cloudflare Worker → Validation → KV Storage → Admin Panel (One-Time Link)
```

**Step-by-step:**

1. **User submits the form**  
   The form includes:
   - Name  
   - Email  
   - Message  
   - User timezone  
   - Client-side timestamp  
   - Invisible honeypot field  

2. **Worker receives POST request**  
   - Validates fields  
   - Rate-limits per IP  
   - Checks honeypot (anti-bot)  
   - Generates UTC timestamp  
   - Adds IST timestamp (optional)  

3. **Data saved to Cloudflare KV**  
   Stored as structured JSON under a unique ID.

4. **Admin logs into /api/login**  
   - Credentials stored in CF Secrets  
   - No cookies, no sessions  
   - IP-locked login attempts  
   - Rate-limited brute force protection  

5. **One-time admin link generated**  
   - Expires after TTL (default 900s)  
   - Invalidated on first use  
   - IP-locked  

6. **Admin panel loads messages**  
   - Displays sortable Excel-style table  
   - Supports mark read/unread  
   - Delete single/all messages  


```
               ┌────────────────────────────────┐
               │          Contact Form          │
               │ (HTML or your own UI design)   │
               └───────────────┬────────────────┘
                               |
                               ▼
                 ┌────────────────────────┐
                 │   Cloudflare Worker    │
                 │   /api/contact (POST)  │
                 └───────────────┬────────┘
                                 |
               ┌─────────────────┴─────────────────┐
               ▼                                   ▼
      Validation / Anti-Bot                 UTC + Timezone Capture
      Rate Limiting (IP)                    Unique Message ID
      Sanitization                          IST Timestamp (optional)

               ┌──────────────────────────────────┐
               │     Cloudflare KV (MSGS)         │
               │   Stores all messages as JSON    │
               └──────────────────┬───────────────┘
                                  |
                                  ▼
                     ┌────────────────────────┐
                     │      Admin Login       │
                     │   /api/login (POST)    │
                     └────────────┬───────────┘
                                  |
                       One-Time Use Token
                                  |
                                  ▼
                     ┌────────────────────────┐
                     │  Admin Panel (HTML)    │
                     │  /panel/:token (GET)   │
                     └────────────────────────┘
```
