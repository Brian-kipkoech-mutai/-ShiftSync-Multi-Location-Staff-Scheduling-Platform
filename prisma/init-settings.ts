import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.systemSettings.createMany({
    data: [
      { key: "edit_cutoff_hours", value: "48" },
      { key: "premium_start_hour", value: "17" },
      { key: "premium_end_hour", value: "24" },
    ],
    skipDuplicates: true,
  });
  console.log("System settings inserted");
}

main().finally(() => prisma.$disconnect());
