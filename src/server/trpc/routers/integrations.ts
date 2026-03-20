import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/trpc/trpc";

export const integrationsRouter = createTRPCRouter({
  /**
   * Get current integration statuses.
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const company = await ctx.db.company.findUnique({
      where: { id: ctx.companyId },
      select: {
        phone: true,
        twilioSid: true,
        retellAgentId: true,
        googleCalId: true,
        googleTokens: true,
        stripeCustomerId: true,
      },
    });

    return {
      twilio: {
        connected: !!company?.phone && !!company?.twilioSid,
        phoneNumber: company?.phone ?? null,
      },
      retell: {
        connected: !!company?.retellAgentId,
        agentId: company?.retellAgentId ?? null,
      },
      googleCalendar: {
        connected: !!company?.googleCalId && !!company?.googleTokens,
        calendarId: company?.googleCalId ?? null,
      },
      stripe: {
        connected: !!company?.stripeCustomerId,
      },
    };
  }),

  /**
   * Start Google Calendar OAuth flow — returns auth URL.
   */
  connectGoogleCal: adminProcedure.mutation(async ({ ctx }) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return { url: null, error: "Google Calendar credentials not configured." };
    }

    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
      state: ctx.companyId, // Used to route callback to correct company
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      error: null,
    };
  }),

  /**
   * Disconnect Google Calendar.
   */
  disconnectGoogleCal: adminProcedure.mutation(async ({ ctx }) => {
    await ctx.db.company.update({
      where: { id: ctx.companyId },
      data: {
        googleCalId: null,
        googleTokens: null,
      },
    });

    await ctx.db.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.user.id,
        action: "integration.google_calendar.disconnected",
      },
    });

    return { success: true };
  }),

  /**
   * Provision a Twilio phone number for the company.
   * In production: calls Twilio API to buy a number.
   */
  provisionPhone: adminProcedure
    .input(
      z.object({
        areaCode: z.string().length(3).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Phase 3 — actual Twilio number purchase
      // const available = await twilioClient.availablePhoneNumbers('US')
      //   .local.list({ areaCode: input.areaCode, limit: 1 });
      // const purchased = await twilioClient.incomingPhoneNumbers.create({
      //   phoneNumber: available[0].phoneNumber,
      //   voiceUrl: `${APP_URL}/api/webhooks/twilio/voice`,
      //   smsUrl: `${APP_URL}/api/webhooks/twilio/sms`,
      // });

      // Stub response
      const stubNumber = `+1${input.areaCode ?? "555"}${Math.floor(1000000 + Math.random() * 9000000)}`;

      await ctx.db.company.update({
        where: { id: ctx.companyId },
        data: {
          phone: stubNumber,
          twilioSid: `PN_stub_${Date.now()}`,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          companyId: ctx.companyId,
          userId: ctx.user.id,
          action: "integration.twilio.provisioned",
          metadata: { phone: stubNumber },
        },
      });

      return {
        phone: stubNumber,
        message: "Phone number provisioned (stub — Phase 3 for real Twilio).",
      };
    }),
});
