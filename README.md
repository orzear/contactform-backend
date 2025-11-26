<p align="center">
  <img src="https://img.shields.io/badge/Serverless-Cloudflare%20Workers-f38020?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Storage-Cloudflare%20KV-0f72e5?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Security-Admin%20Panel%20With%20One–Time%20Links-00ffc3?style=for-the-badge" />
</p>

# Contact form Backend (Cloudflare workers)
<p align="center">
  <a href="#">
    <img src="https://img.shields.io/badge/version-v1.0.0-blue?style=flat-square" />
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  </a>
  <a href="https://dash.cloudflare.com">
    <img src="https://img.shields.io/badge/Cloudflare-Workers%20%2B%20KV-f38020?style=flat-square" />
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/status-production--ready-00ffc3?style=flat-square" />
  </a>
</p>


A lightweight, privacy-focused backend for handling contact form submissions using **Cloudflare Workers** + **KV Storage**.  
Includes:

- Contact form endpoint  
- Message storage  
- Timezone + timestamp collection  
- Anti-spam honeypot  
- One-time admin panel  
- Excel-style message table  
- No database, no servers, no cookies  

This project is designed to be fully serverless, easy to deploy, and easy to customize.

---

## 🚀 Features

- ⚡ Instant Worker execution
- 📦 Serverless data storage in KV
- 🎭 Honeypot anti-bot filter
- 🌐 UTC + client timezone tracking
- 🔒 Rate-limited contact endpoint
- 🕵️ Hidden one-time-use admin panel
- 🧹 Admin actions (delete / mark read)
- 📁 Clean, dependency-free code

---

## 📂 Project Structure

```
/
├── src/
│   ├── worker.js          # main backend logic
│   └── admin.html         # admin UI (one-time panel)
│
├── public/
│   └── contact.html       # demo contact form
│
├── wrangler.example.toml  # configuration template (copy → wrangler.toml)
├── LICENSE                # MIT license
└── README.md              # this file
```

---

# 🔧 Setup & Deployment

## 1️⃣ Clone the repo

```sh
git clone https://github.com/yourname/portfolio-backend
cd portfolio-backend
```

---

## 2️⃣ Copy the config file

```sh
cp wrangler.example.toml wrangler.toml
```

Then open `wrangler.toml` and:

- paste your KV IDs  
- confirm the paths  
- (optional) adjust TTL  

---

## 3️⃣ Create KV namespaces

In Cloudflare Dashboard:

> Workers → KV → Create Namespace

Create TWO:

1. **AUTH**  
2. **MSGS**

Copy their IDs into `wrangler.toml`.

---

## 4️⃣ Add secrets

Run:

```sh
wrangler secret put ADMIN_USER
wrangler secret put ADMIN_PASSWORD
```

Or if using the Dashboard:

> Workers → Your Worker → Settings → Variables → Add Secret

---

## 5️⃣ Deploy

```sh
wrangler deploy
```

---

# 🛠 API Endpoints

### **POST /api/contact**
Handles form submissions.  
Accepts:

- fullname  
- email  
- message  
- client_tz  
- client_time  
- website (honeypot)

All messages are saved in KV.

---

### **POST /api/login**
Used by admin login form.

---

### **GET /panel/:token**
One-time admin panel access.

---

### **POST /api/admin/action**
Delete / mark read / clear all.

---

# 🧪 Testing the Contact Form

Use the included demo:

```
public/contact.html
```

Or send a manual POST:

```sh
curl -X POST https://your-worker.workers.dev/api/contact \
  -F fullname="Test User" \
  -F email="test@example.com" \
  -F message="Hello!" \
  -F client_tz="Asia/Kolkata" \
  -F client_time="..." \
  -F website=""
```

---

# 🛡 Security Notes

- The admin panel link expires automatically  
- Each access is one-time-use  
- IP-checking prevents token leakage  
- No cookies or sessions  
- All credentials stay in Cloudflare Secrets  
- KV read/write isolation  

---

# 📄 License

MIT — see `LICENSE`.

---

# 🙌 Contributions

PRs welcome.  
Open issues for bugs or feature requests.

---

# ⭐ If you use this project…

Consider starring the repo to support it!

---

# ☕ Credits

Built by **orzear**.
