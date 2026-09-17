// src/db/seed.ts
//
// Idempotent development seed. Creates the reference `plans` rows and a premium
// demo account holding an ACTIVE subscription, so premium-only endpoints
// (e.g. GET /showcase/premium) can be exercised end-to-end without going through
// Midtrans. Safe to run repeatedly — every step checks before it inserts.
//
// Run:  bun run seed      (after `bun run migrate`)
//
// Demo login — mirrored in cli/commands/smoke.ts, keep the two in sync:
//   email:    premium_demo@sprinkle.local
//   password: premium123

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { and, eq, type InferInsertModel } from "drizzle-orm";
import { config } from "../../config";
import { accounts } from "@/modules/auth/db/schema";
import { password as passwordUtil } from "@/modules/auth/utils/bcrypt";
import { plans, subscriptions } from "@/modules/payment-gateway/db/schema";

// Fixed, well-known demo login. The CLI smoke runner logs in with these exact
// values to reach the 200 premium-showcase path.
const DEMO_USERNAME = "premium_demo";
const DEMO_EMAIL = "premium_demo@sprinkle.local";
const DEMO_PASSWORD = "premium123";

type NewPlan = InferInsertModel<typeof plans>;
type PlanName = "basic" | "pro" | "premium";

// SCHEMA DRIFT: the migrated DB enum `duration_enums` is
// ('basic','pro','premium') — see drizzle/0001_bent_retro_girl.sql and the 0002
// snapshot — while schema.ts types the column as ('30','90','365'). The DB is
// the runtime source of truth, so seed tier-matched labels it accepts and
// bridge the stale TS type with the cast at the insert below.
const PLAN_SEEDS: Array<{
  name: PlanName;
  price: string;
  durationInDays: PlanName;
}> = [
  { name: "basic", price: "0.00", durationInDays: "basic" },
  { name: "pro", price: "49000.00", durationInDays: "pro" },
  { name: "premium", price: "99000.00", durationInDays: "premium" },
];

async function seed(): Promise<void> {
  const url = config.dbUrl;
  if (!url) throw new Error("DATABASE_URL is not defined");

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  try {
    console.log("Seeding reference data...\n");

    // 1. Plans — `name` has no DB unique constraint, so look one up first to
    //    stay idempotent instead of inserting duplicates on every run.
    const planIdByName: Record<string, number> = {};
    for (const plan of PLAN_SEEDS) {
      const [existing] = await db
        .select()
        .from(plans)
        .where(eq(plans.name, plan.name))
        .limit(1);

      if (existing) {
        planIdByName[plan.name] = existing.id;
        console.log(`• plan "${plan.name}" exists (id=${existing.id})`);
        continue;
      }

      const [inserted] = await db
        .insert(plans)
        .values({
          name: plan.name,
          price: plan.price,
          // See SCHEMA DRIFT note above: the DB enum accepts tier labels, not
          // the "30"|"90"|"365" the stale TS type claims.
          durationInDays:
            plan.durationInDays as unknown as NewPlan["durationInDays"],
          isActive: 1,
        })
        .returning();
      planIdByName[plan.name] = inserted.id;
      console.log(`• seeded plan "${plan.name}" (id=${inserted.id})`);
    }

    const premiumPlanId = planIdByName["premium"];
    if (premiumPlanId == null) {
      throw new Error("premium plan missing after seeding — cannot continue");
    }

    let [demo] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, DEMO_EMAIL))
      .limit(1);

    if (demo) {
      console.log(`• premium demo account exists (id=${demo.id})`);
    } else {
      const hashed = await passwordUtil.hash(DEMO_PASSWORD);
      [demo] = await db
        .insert(accounts)
        .values({
          username: DEMO_USERNAME,
          email: DEMO_EMAIL,
          password: hashed,
          role: "builder",
          isVerified: "verified",
        })
        .returning();
      console.log(`• seeded premium demo account (id=${demo.id})`);
    }

    // 3. Active subscription on the premium plan — this is what flips
    //    hasActiveSubscription() (and therefore GET /showcase/premium) to 200.
    const [activeSub] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, demo.id),
          eq(subscriptions.status, "active"),
        ),
      )
      .limit(1);

    if (activeSub) {
      console.log(
        `• premium demo already has an active subscription (id=${activeSub.id})`,
      );
    } else {
      const [sub] = await db
        .insert(subscriptions)
        .values({
          userId: demo.id,
          planId: premiumPlanId,
          status: "active",
        })
        .returning();
      console.log(
        `• seeded ACTIVE premium subscription (id=${sub.id}, planId=${premiumPlanId})`,
      );
    }

    console.log("\nSeed complete.");
    console.log(
      `Premium demo login → email: ${DEMO_EMAIL}  password: ${DEMO_PASSWORD}`,
    );
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(
    "\nSeed failed. Is the database migrated (`bun run migrate`) and reachable?",
  );
  console.error(err);
  process.exit(1);
});
