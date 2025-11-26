# Contact form backend — No-CLI setup guide  
This guide is for people who want to deploy the project **entirely from the Cloudflare Dashboard**, without installing any tools or using any terminal commands.

If you prefer using the CLI version, see the main `README.md`.

---

# ⭐ Requirements

### You need:
1. A Cloudflare account  
   Create one at: https://dash.cloudflare.com  
2. Free plan is enough  
3. No domain is required  
4. No terminal / CLI required  
5. You only need to upload files and create two KV storages

Cloudflare's free plan limits (important):
- Workers: 100,000 requests/day  
- KV reads/writes: generous but not unlimited  
- KV is eventually-consistent (normal)  
- No cron triggers on free plan  

This backend fits well within these limits.

---

# 📦 What You Get

This backend handles:

- Contact form submissions  
- Message storage in KV  
- Spam protection (honeypot + rate limit)  
- UTC + client timezone timestamps  
- One-time admin panel  
- Clean, Excel-style message listing  
- No database, no server, no hosting  

All you need is Cloudflare.

---

# ⚙️ Step-by-Step Setup (Dashboard Only)

## 1️⃣ Create a new Worker  
Go to:

**Cloudflare Dashboard → Workers & Pages → Create → Worker**

Name it something like:

```
portfolio-backend
```

Choose **"Create Worker"**.

You will see Cloudflare’s default Hello World code.

---

## 2️⃣ Replace the code with this project’s `worker.js`

In the Cloudflare editor:

- Open `worker.js`
- Delete everything
- Paste the full code from `src/worker.js` in this repo

Click **Save & Deploy**.

---

## 3️⃣ Create the KV Namespaces

You need **two KV storages**.

Go to:

**Workers & Pages → Storage → KV**

Create:

1. Namespace: **AUTH**  
2. Namespace: **MSGS**

Cloudflare will show you an **ID** for each.

Keep this tab open — you will need the IDs soon.

---

## 4️⃣ Add KV Bindings to Your Worker

Open:

**Workers → portfolio-backend → Settings → Bindings → KV Namespace Bindings**

Add two items:

| Binding name | KV Namespace |
|--------------|--------------|
| AUTH         | AUTH         |
| MSGS         | MSGS         |

The binding names **must** be exactly:

```
AUTH
MSGS
```

---

## 5️⃣ Add Secrets (Admin Username & Password)

Go to:

**Workers → portfolio-backend → Settings → Variables → Secrets**

Add:

- `ADMIN_USER`
- `ADMIN_PASSWORD`

These are your login credentials for the admin panel.

Example:

```
ADMIN_USER: admin
ADMIN_PASSWORD: supersecret
```

Choose whatever you want.

---

## 6️⃣ Add a Public Variable (optional)

Still under "Variables":

Add:

```
PANEL_TTL_SECONDS = 900
```

This controls how long your one-time admin panel link works (in seconds).  
900 = 15 minutes.

---

## 7️⃣ Upload the Admin Panel HTML

Because Cloudflare Workers cannot store large HTML files directly inside KV, you will host the admin page using the Worker itself.

In the Worker editor:

- Find the function that returns the admin panel HTML
- Replace the HTML template if you customized it

You do **not** upload the HTML separately — it is embedded in `worker.js`.

---

## 8️⃣ Upload Your Contact Form Anywhere

You can host `public/contact.html` on:

- Your portfolio website
- Another Worker
- Cloudflare Pages
- Any static hosting service

Just make sure the form action is:

```
<form action="https://YOUR_WORKER_NAME.workers.dev/api/contact" method="POST">
```

This sends data to your Worker backend.

---

# 🧪 Test It

### 1. Open your contact form  
Fill it out and click send.

### 2. Log in to the admin panel  
Visit your Worker domain:

```
https://YOUR_WORKER_NAME.workers.dev/admin.html
```

Enter the credentials you set earlier.

You will receive a **one-time admin panel link**.

This link:

- works once  
- expires after 15 minutes  
- only works from your IP address  

---

# 🔐 Security Notes

- KV stores messages securely server-side  
- No cookies  
- No sessions  
- No external services  
- Admin panel cannot be guessed  
- Tokens expire automatically  
- Tokens are single-use  
- IP-locked login sessions  

This backend is private and secure by default.

---

# 🧹 Clearing Messages

Inside the admin panel you can:

- Delete individual messages  
- Mark read/unread  
- Delete all messages at once  

All changes sync instantly to KV.

---

# 🆘 Troubleshooting

### ❌ Form returns 404  
Your form `action` is wrong.  
It must point to:

```
https://YOUR_WORKER_NAME.workers.dev/api/contact
```

### ❌ Login always says "Invalid credentials"  
You forgot to set `ADMIN_USER` and `ADMIN_PASSWORD` under **Secrets**.

### ❌ Admin panel token expired  
Reload the login page, sign in again.

### ❌ KV not working  
Your bindings are probably wrong.  
Binding names must be **exactly**:

```
AUTH
MSGS
```

---

# 📄 License  
MIT — free to use, modify, and distribute.

---

# 🙌 Credits  
Original project by **orzear**.

