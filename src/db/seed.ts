import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { and, eq, type InferInsertModel } from "drizzle-orm";
import { config } from "../../config";
import { accounts, plans, subscriptions } from "@/models";
import { logger } from "@/logger";
import { password as passwordUtil } from "@/modules/auth/utils/bcrypt";

const DEMO_USERNAME = "premium_demo";
const DEMO_EMAIL = "premium_demo@sprinkle.local";
const DEMO_PASSWORD = "premium123";

type NewPlan = InferInsertModel<typeof plans>;
type PlanName = "basic" | "pro" | "premium";

const PLAN_SEEDS: Array<{
  name: PlanName;
  price: string;
  durationInDays: PlanName;
}> = [
  { name: "basic", price: "0.00", durationInDays: "basic" },
  { name: "pro", price: "49000.00", durationInDays: "pro" },
  { name: "premium", price: "99000.00", durationInDays: "premium" },
];

export async function seed(): Promise<void> {
  const url = config.dbUrl;
  if (!url) throw new Error("DATABASE_URL is not defined");

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  try {
    logger.info("Seeding reference data...\n");

    const planIdByName: Record<string, number> = {};
    for (const plan of PLAN_SEEDS) {
      const [existing] = await db
        .select()
        .from(plans)
        .where(eq(plans.name, plan.name))
        .limit(1);

      if (existing) {
        planIdByName[plan.name] = existing.id;
        logger.info(`• plan "${plan.name}" exists (id=${existing.id})`);
        continue;
      }

      const [inserted] = await db
        .insert(plans)
        .values({
          name: plan.name,
          price: plan.price,

          durationInDays:
            plan.durationInDays as unknown as NewPlan["durationInDays"],
          isActive: 1,
        })
        .returning();
      planIdByName[plan.name] = inserted.id;
      logger.info(`• seeded plan "${plan.name}" (id=${inserted.id})`);
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
      logger.info(`• premium demo account exists (id=${demo.id})`);
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
      logger.info(`• seeded premium demo account (id=${demo.id})`);
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
      logger.info(
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
      logger.info(
        `• seeded ACTIVE premium subscription (id=${sub.id}, planId=${premiumPlanId})`,
      );
    }

    logger.info("\nSeed complete.");
    logger.info(
      `Premium demo login → email: ${DEMO_EMAIL}  password: ${DEMO_PASSWORD}`,
    );
  } finally {
    await pool.end();
  }
}

if (import.meta.main) {
  seed().catch((err) => {
    logger.error(
      "\nSeed failed. Is the database migrated (`bun run migrate`) and reachable?",
    );
    logger.error(String(err));
    process.exit(1);
  });
}