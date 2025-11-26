/**
 * Cloudflare Worker — Contact form Backend
 *
 * Secrets used at runtime (defined in wrangler.toml):
 * - ENV.ADMIN_USER
 * - ENV.ADMIN_PASSWORD
 * - ENV.PANEL_TTL_SECONDS
 *
 * KV Bindings required:
 * - AUTH (session storage + rate limits)
 * - MSGS (stored contact messages)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CONTACT FORM ENDPOINT
    if (path === "/api/contact" && request.method === "POST") {
      return saveContact(request, env);
    }

    // LOGIN ENDPOINT
    if (path === "/api/login" && request.method === "POST") {
      return handleLogin(request, env);
    }

    // ONE-TIME ADMIN PANEL (GET-only)
    if (path.startsWith("/panel/") && request.method === "GET") {
      return serveAdminPanel(request, env);
    }

    // ADMIN ACTIONS (delete, mark read/unread, delete all)
    if (path === "/api/admin/action" && request.method === "POST") {
      return adminAction(request, env);
    }

    return new Response("Not found", { status: 404 });
  }
};

/* ----------------------- UTILS ----------------------- */

function randomHex(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map(b => b.toString(16).padStart(2, "0")).join("");
}

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ----------------------- LOGIN HANDLER ----------------------- */

async function handleLogin(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";
  const failKey = `login:fail:${ip}`;
  const fails = parseInt(await env.AUTH.get(failKey) || "0", 10);

  if (fails >= 6) {
    return new Response("Too many attempts. Try again later.", { status: 429 });
  }

  const form = await request.formData();
  const user = form.get("email");
  const pass = form.get("password");

  // Compare against environment secrets (safe to open-source)
  if (user !== env.ADMIN_USER || pass !== env.ADMIN_PASSWORD) {
    await env.AUTH.put(failKey, String(fails + 1), { expirationTtl: 900 });
    return new Response("Invalid credentials", { status: 401 });
  }

  await env.AUTH.delete(failKey);

  const ttl = parseInt(env.PANEL_TTL_SECONDS || "900", 10);
  const pageToken = randomHex(32);
  const apiToken = randomHex(32);

  await env.AUTH.put(
    `session_page:${pageToken}`,
    JSON.stringify({ apiToken, ip }),
    { expirationTtl: ttl }
  );

  await env.AUTH.put(
    `session_api:${apiToken}`,
    JSON.stringify({ ip }),
    { expirationTtl: ttl }
  );

  const base = new URL(request.url).origin;
  return Response.redirect(`${base}/panel/${pageToken}`, 302);
}

/* ----------------------- ADMIN PANEL ----------------------- */

async function serveAdminPanel(request, env) {
  const url = new URL(request.url);
  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";
  const pageToken = url.pathname.split("/panel/")[1];

  if (!pageToken) return new Response("Forbidden", { status: 403 });

  const sessionRaw = await env.AUTH.get(`session_page:${pageToken}`);
  if (!sessionRaw) return new Response("Expired / invalid link", { status: 403 });

  // One-time use
  await env.AUTH.delete(`session_page:${pageToken}`);

  let session;
  try { session = JSON.parse(sessionRaw); }
  catch { return new Response("Session corrupted", { status: 500 }); }

  if (session.ip && session.ip !== ip) {
    return new Response("IP mismatch", { status: 403 });
  }

  const apiToken = session.apiToken;

  // Fetch messages
  const list = await env.MSGS.list();
  const msgs = [];
  for (const k of list.keys) {
    const v = await env.MSGS.get(k.name, { type: "json" });
    if (v) msgs.push({ id: k.name, ...v });
  }

  // Sort by timestamp (desc)
  msgs.sort((a, b) => (b.utc_time || "").localeCompare(a.utc_time || ""));

  return new Response(renderAdminHTML(msgs, apiToken), {
    headers: { "content-type": "text/html" }
  });
}

/* ----------------------- ADMIN PANEL HTML ----------------------- */

function renderAdminHTML(msgs, apiToken) {
  // NOTE: Nothing sensitive is embedded.
  // apiToken is required for admin actions; this is intended.
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Messages</title>

<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
<style>
body {
  background: #111;
  color: #fff;
  font-family: 'Space Grotesk', sans-serif;
  margin: 0;
  padding: 40px;
  display: flex;
  justify-content: center;
}

/* Main container */
.table-container {
  width: 95%;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #333;
  background: #1b1b1b;
}

.table-title {
  padding: 14px 18px;
  font-size: 1.4rem;
  font-weight: 400;
  font-family: "Stack Sans Notch", sans-serif;
  background: #0f0f0f;
  border-bottom: 2px solid #333;
  letter-spacing: 0.5px;
}


/* Table */
table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  color: #000;
}

th {
  background: #e7e7e7;
  padding: 10px;
  border-bottom: 1px solid #ccc;
  border-right: 1px solid #ccc;
  text-align: left;
  font-weight: 600;
}

td {
  padding: 10px;
  border-bottom: 1px solid #ddd;
  border-right: 1px solid #ccc;
  vertical-align: top;
}

tr:nth-child(even) {
  background: #f6f6f6;
}

/* Collapsible message */
.msg-short { white-space: pre-wrap; }
.msg-full {
  display: none;
  margin-top: 6px;
  white-space: pre-wrap;
}

.msg-toggle {
  margin-top: 6px;
  background: #f0f0f0;
  border: 1px solid #aaa;
  padding: 3px 6px;
  cursor: pointer;
  font-size: 12px;
  border-radius: 3px;
}

/* Mobile responsive */
@media (max-width: 800px) {
  table, thead, tbody, th, td, tr { display: block; }
  thead { display: none; }

  tr {
    margin-bottom: 18px;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #ccc;
  }

  td {
    border: none !important;
    border-bottom: 1px solid #eee !important;
    padding: 12px;
    display: flex;
    justify-content: space-between;
    gap: 20px;
  }

  td:last-child { border-bottom: none !important; }

  td::before {
    content: attr(data-label);
    font-weight: 600;
    color: #444;
  }

  td[data-label="Message"] {
    flex-direction: column;
    align-items: start;
  }
}
</style>
</head>

<body>
<div class="table-container">
  <div class="table-title">Messages</div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Email</th>
        <th>IP</th>
        <th>Message</th>
        <th>Timestamp (UTC)</th>
      </tr>
    </thead>
    <tbody>
      ${msgs.map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHTML(m.name || "")}</td>
        <td>${escapeHTML(m.email || "")}</td>
        <td>${
          m.ip
            ? `<a href="https://ip.me/${escapeHTML(m.ip)}" target="_blank">${escapeHTML(m.ip)}</a>`
            : ""
        }</td>
        <td>
          <div class="msg-short">${escapeHTML((m.message || "").slice(0, 120))}</div>
          <div class="msg-full" style="display:none">${escapeHTML(m.message || "")}</div>
          ${(m.message || "").length > 120 ? `<button class="msg-toggle">Show more</button>` : ""}
        </td>
        <td>${escapeHTML(m.utc_time || "")}</td>
      </tr>
      `).join("")}
    </tbody>
  </table>
</div>

<script>
// show/hide logic preserved
document.querySelectorAll('.msg-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const box = btn.parentElement;
    const full = box.querySelector('.msg-full');
    const short = box.querySelector('.msg-short');
    const expanded = full.style.display === "block";
    full.style.display = expanded ? "none" : "block";
    short.style.display = expanded ? "block" : "none";
    btn.textContent = expanded ? "Show more" : "Show less";
  });
});
</script>

</body>
</html>`;
}

/* ----------------------- ADMIN ACTIONS ----------------------- */

async function adminAction(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";
  let body;
  try { body = await request.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  const { apiToken, type, ids } = body || {};
  if (!apiToken || !type) return new Response("Missing token", { status: 400 });

  const sessionRaw = await env.AUTH.get(`session_api:${apiToken}`);
  if (!sessionRaw) return new Response("Forbidden", { status: 403 });

  let session;
  try { session = JSON.parse(sessionRaw); }
  catch { return new Response("Session corrupted", { status: 500 }); }

  if (session.ip && session.ip !== ip) return new Response("IP mismatch", { status: 403 });

  if (type === "delete_all") {
    const list = await env.MSGS.list();
    for (const k of list.keys) await env.MSGS.delete(k.name);
    return new Response("OK");
  }

  if (!Array.isArray(ids)) return new Response("Missing ids", { status: 400 });

  for (const id of ids) {
    const msg = await env.MSGS.get(id, { type: "json" });
    if (!msg) continue;

    if (type === "read") msg.read = true;
    else if (type === "unread") msg.read = false;
    else if (type === "delete") {
      await env.MSGS.delete(id);
      continue;
    }

    await env.MSGS.put(id, JSON.stringify(msg));
  }

  return new Response("OK");
}

/* ----------------------- CONTACT FORM HANDLER ----------------------- */

async function saveContact(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";

  // Simple rate limit
  const rlKey = `contact:ip:${ip}`;
  const count = parseInt(await env.AUTH.get(rlKey) || "0", 10);
  if (count >= 5) return new Response("Too many requests", { status: 429 });

  await env.AUTH.put(rlKey, String(count + 1), { expirationTtl: 60 });

  const form = await request.formData();

  const msg = {
    name: form.get("fullname") || "",
    email: form.get("email") || "",
    message: form.get("message") || "",

    utc_time: new Date().toISOString().replace("T", " ").replace("Z", " UTC").replace(/\.\d+/, ""),

    ist_time: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),

    client_tz: form.get("client_tz") || "Unknown",
    client_time: form.get("client_time") || "Unknown",

    ip,
    read: false
  };

  await env.MSGS.put(crypto.randomUUID(), JSON.stringify(msg));


  // USE YOUR THANKYOU PAGE REDIRECT URL HERE

  const thankYouURL = "/thank-you"; // placeholder for thankyou page link
  return Response.redirect(thankYouURL, 302);
}
