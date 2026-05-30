import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email    = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("[seed] ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where:  { email },
    update: { password: hashed },
    create: { email, password: hashed, name: "Admin", role: Role.ADMIN },
  });

  console.log(`[seed] Admin user ready: ${user.email} (${user.id})`);
}

main()
  .catch((e) => { console.error("[seed] Failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
