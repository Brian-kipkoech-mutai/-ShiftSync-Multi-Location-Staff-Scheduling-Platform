import { prisma } from "./prisma";

export async function notify(
  userId: string,
  type: string,
  title: string,
  body: string,
  metadata?: Record<string, unknown>
) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, metadata: metadata as object | undefined },
  });

  const pref = await prisma.notificationPreference.findUnique({ where: { userId } });
  const emailEnabled = pref?.emailSimulation ?? true;

  if (emailEnabled) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (user) {
      await prisma.simulatedEmail.create({
        data: {
          userId,
          subject: title,
          body: `Hi ${user.name},\n\n${body}\n\n— ShiftSync`,
        },
      });
      console.log(`[EMAIL] To: ${user.email} | Subject: ${title}`);
    }
  }

  return notification;
}

export async function notifyMany(
  userIds: string[],
  type: string,
  title: string,
  body: string,
  metadata?: Record<string, unknown>
) {
  for (const userId of userIds) {
    await notify(userId, type, title, body, metadata);
  }
}
