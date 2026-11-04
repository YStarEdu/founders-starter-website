// Policy test: loads supabase/setup.sql into PGlite (a real Postgres that runs inside Node, no internet needed),
// then acts as a website visitor and checks every rule both ways: what's allowed works, what isn't is refused.
// Run it with: npm test   (or on its own: node tests/policies.mjs)
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const setupSql = readFileSync(new URL("../supabase/setup.sql", import.meta.url), "utf8");

// A small stand-in for what every Supabase project already has: the anon role (visitors who aren't
// signed in), the authenticated role (signed-in users), the auth schema, and the storage tables
// (so the Week 7 photo gallery recipe can be tested too).
const SUPABASE_STUB = `
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on all functions in schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean not null default false);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets, name text not null);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant all on storage.buckets, storage.objects to anon, authenticated;
`;

// Many Supabase projects give anon and authenticated every privilege on new tables, and leave the
// real decisions to Row Level Security. Newer projects may not. We test both setups.
const DEFAULT_GRANTS = `
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`;

const inOneDay = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const validOrder = (changes = {}) => ({
  name: "Ava Martin",
  email: "ava@example.com",
  item: "Sourdough loaf",
  quantity: 2,
  pickup_at: inOneDay(),
  notes: "No paper bag, please.",
  ...changes,
});

let passed = 0;
let failed = 0;

for (const withDefaultGrants of [true, false]) {
  console.log(withDefaultGrants ? "\nA project with Supabase's default grants" : "\nA project without default grants");
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  if (withDefaultGrants) await db.exec(DEFAULT_GRANTS);
  await loadSetupSql(db, "first");
  await loadSetupSql(db, "second"); // running the file again (after a change, say) must work too

  // Runs SQL as a visitor (role anon) or a signed-in user (role authenticated), inside a transaction.
  const as = (role, sql, params = []) =>
    db.transaction(async (tx) => {
      await tx.exec(`set local role ${role}`);
      return tx.query(sql, params);
    });
  const insert = (role, order, extra = "") =>
    as(role, `insert into public.orders (name, email, item, quantity, pickup_at, notes) values ($1, $2, $3, $4, $5, $6) ${extra}`, [
      order.name, order.email, order.item, order.quantity, order.pickup_at, order.notes,
    ]);
  const countOrders = async () => (await db.query("select count(*)::int as n from public.orders")).rows[0].n;

  await allowed("a visitor can place a valid order", () => insert("anon", validOrder()));
  await allowed("a signed-in user can place a valid order", () => insert("authenticated", validOrder({ name: "Ben Li" })));
  await allowed("an order with no notes is fine", () => insert("anon", validOrder({ notes: "" })));
  await allowed("12 items, an 80-character name and 500 characters of notes are fine", () =>
    insert("anon", validOrder({ quantity: 12, name: "N".repeat(80), notes: "x".repeat(500) })));

  await refused("quantity 0", () => insert("anon", validOrder({ quantity: 0 })));
  await refused("quantity 13", () => insert("anon", validOrder({ quantity: 13 })));
  await refused("an empty name", () => insert("anon", validOrder({ name: "" })));
  await refused("an 81-character name", () => insert("anon", validOrder({ name: "N".repeat(81) })));
  await refused("an email without @", () => insert("anon", validOrder({ email: "ava.example.com" })));
  await refused("an email with a space", () => insert("anon", validOrder({ email: "ava martin@example.com" })));
  await refused("an empty item", () => insert("anon", validOrder({ item: "" })));
  await refused("a 61-character item", () => insert("anon", validOrder({ item: "I".repeat(61) })));
  await refused("501 characters of notes", () => insert("anon", validOrder({ notes: "x".repeat(501) })));
  await refused("a pickup time in the past", () => insert("anon", validOrder({ pickup_at: new Date(Date.now() - 60000).toISOString() })));
  await refused("a pickup time 90 days ahead", () =>
    insert("anon", validOrder({ pickup_at: new Date(Date.now() + 90 * 24 * 3600000).toISOString() })));
  await refused("asking for the new order back (insert + select), which is why the site never uses .select()", () =>
    insert("anon", validOrder(), "returning *"));

  const ordersBefore = await countOrders();
  await check("the owner (dashboard) sees all 4 valid orders", async () => expectEqual(ordersBefore, 4));

  for (const role of ["anon", "authenticated"]) {
    const who = role === "anon" ? "a visitor" : "a signed-in user";
    await nothingBack(`${who} can't read any orders`, () => as(role, "select * from public.orders"));
    await nothingBack(`${who} can't read orders by email`, () => as(role, "select name from public.orders where email = 'ava@example.com'"));
    await nothingChanged(`${who} can't change orders`, () => as(role, "update public.orders set notes = 'hacked'"));
    await nothingChanged(`${who} can't delete orders`, () => as(role, "delete from public.orders"));
  }

  await check("no order was changed or deleted", async () => {
    expectEqual(await countOrders(), ordersBefore);
    const hacked = await db.query("select count(*)::int as n from public.orders where notes = 'hacked'");
    expectEqual(hacked.rows[0].n, 0);
  });

  await check("Row Level Security is on for every table", async () => {
    const result = await db.query("select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity");
    expectEqual(result.rows.map((row) => row.relname), []);
  });

  await check("orders has exactly one policy, and it's for insert", async () => {
    const result = await db.query("select cmd from pg_policies where schemaname = 'public' and tablename = 'orders'");
    expectEqual(result.rows.map((row) => row.cmd), ["INSERT"]);
  });

  await db.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

// ---------- helpers ----------

// Runs supabase/setup.sql. If it fails, explains why in one line and stops.
async function loadSetupSql(db, time) {
  try {
    await db.exec(setupSql);
  } catch (error) {
    console.log(`  FAIL  supabase/setup.sql stopped with an error the ${time} time it ran: ${error.message}`);
    if (time === "second") console.log("        Tip: write 'drop policy if exists ...' before 'create policy ...', and 'if not exists' after 'create table'.");
    process.exit(1);
  }
}

// Runs one check and prints ok or FAIL. A check can return a short note to print after its name.
async function check(name, fn) {
  try {
    const note = await fn();
    passed++;
    console.log(`  ok    ${name}${note ? ` (${note})` : ""}`);
  } catch (error) {
    failed++;
    console.log("  FAIL ", name, "-", error.message);
  }
}

// The statement must work.
function allowed(name, fn) {
  return check(name, async () => {
    await fn();
  });
}

// The statement must be refused with an error. The note shows the database's reason.
function refused(name, fn) {
  return check(`refused: ${name}`, async () => {
    try {
      await fn();
    } catch (error) {
      return error.message.replace(/^new row (for relation "\w+" )?/, "").slice(0, 70);
    }
    throw new Error("expected the database to refuse this, but it was allowed");
  });
}

// The statement must either be refused or return no rows: both mean the visitor got nothing.
function nothingBack(name, fn) {
  return check(name, async () => {
    let result;
    try {
      result = await fn();
    } catch (error) {
      return error.message.slice(0, 70);
    }
    if (result.rows.length > 0) throw new Error(`expected nothing, but got ${result.rows.length} rows`);
    return "0 rows";
  });
}

// An update or delete must either be refused or change 0 rows.
function nothingChanged(name, fn) {
  return check(name, async () => {
    let result;
    try {
      result = await fn();
    } catch (error) {
      return error.message.slice(0, 70);
    }
    if (result.affectedRows > 0) throw new Error(`expected 0 rows changed, but ${result.affectedRows} were`);
    return "0 rows changed";
  });
}

function expectEqual(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}
