export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Reset campaigns that were left in RUNNING state by a previous server instance.
  // This happens when the server restarts mid-campaign (deploy, crash, OOM kill).
  const { prisma } = await import("@/lib/prisma");

  const { count } = await prisma.campaign.updateMany({
    where:  { status: "RUNNING" },
    data:   { status: "FAILED" },
  });

  if (count > 0) {
    console.warn(`[startup] Reset ${count} stuck RUNNING campaign(s) to FAILED`);
  }
}
