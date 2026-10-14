#!/usr/bin/env node
/**
 * Quick script to list users from the Supabase auth.users table
 * and insert a Pro subscription for a specific user.
 *
 * Usage: node scripts/set-pro.mjs
 * Requires SUPABASE_SERVICE_ROLE_KEY env var.
 */

const SUPABASE_URL = "https://bbytwflsulxuctkpuvzs.supabase.co";

// We'll use the service role key from env
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error("ERROR: Set SUPABASE_SERVICE_ROLE_KEY env var first.");
  console.error(
    "Find it at: https://supabase.com/dashboard/project/bbytwflsulxuctkpuvzs/settings/api",
  );
  process.exit(1);
}

async function main() {
  // List users via Supabase Auth Admin API
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=20`, {
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
  });

  if (!res.ok) {
    console.error("Failed to list users:", res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const users = data.users || data;

  console.log("\n=== USERS ===");
  for (const u of users) {
    console.log(`  ${u.id}  ${u.email}  (created: ${u.created_at})`);
  }

  // If --set flag passed with email, insert subscription
  const setEmail = process.argv.find((a) => a.startsWith("--set="));
  if (setEmail) {
    const email = setEmail.split("=")[1];
    const target = users.find((u) => u.email === email);
    if (!target) {
      console.error(`\nUser with email "${email}" not found.`);
      process.exit(1);
    }

    console.log(`\nSetting Pro for: ${target.email} (${target.id})`);

    // Insert subscription via PostgREST
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: target.id,
        stripe_customer_id: "cus_dev_manual",
        stripe_subscription_id: `sub_dev_${Date.now()}`,
        plan: "pro",
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 86400000).toISOString(),
      }),
    });

    if (!insertRes.ok) {
      console.error("Failed to insert subscription:", insertRes.status, await insertRes.text());
      process.exit(1);
    }

    const result = await insertRes.json();
    console.log("✅ Pro subscription created:", JSON.stringify(result, null, 2));
  } else {
    console.log("\nTo set Pro, re-run with: --set=your@email.com");
  }
}

main().catch(console.error);
