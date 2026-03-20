import { NextRequest, NextResponse } from "next/server";
import { isSuperAdmin } from "@/server/lib/admin";
import { db } from "@/server/lib/db";
import { provisionCompany, updateCompanyAgent, startTestCall } from "@/server/services/provisioning";
import { getAllCompaniesWithStats } from "@/server/lib/admin";

/**
 * POST /api/admin
 * Internal admin API — super admin only.
 * Body: { action: string, ...params }
 */
export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { action } = body;

  try {
    switch (action) {
      case "list_companies": {
        const companies = await getAllCompaniesWithStats();
        return NextResponse.json({ companies });
      }

      case "provision": {
        const { companyId, areaCode, voiceId, language } = body;
        const result = await provisionCompany(companyId, { areaCode, voiceId, language });
        return NextResponse.json(result);
      }

      case "update_agent": {
        const { companyId } = body;
        await updateCompanyAgent(companyId);
        return NextResponse.json({ success: true });
      }

      case "test_call": {
        const { companyId } = body;
        const result = await startTestCall(companyId);
        return NextResponse.json(result);
      }

      case "update_company": {
        const { companyId, data } = body;
        const updated = await db.company.update({
          where: { id: companyId },
          data,
        });
        return NextResponse.json({ company: updated });
      }

      case "get_company": {
        const { companyId } = body;
        const company = await db.company.findUnique({
          where: { id: companyId },
          include: {
            users: true,
            teamMembers: true,
            pricingMatrix: true,
            _count: { select: { calls: true, jobs: true } },
          },
        });
        return NextResponse.json({ company });
      }

      case "manual_set_agent": {
        // For manually pasting agent ID + phone from Retell dashboard
        const { companyId, retellAgentId, phone, twilioSid } = body;
        await db.company.update({
          where: { id: companyId },
          data: {
            ...(retellAgentId && { retellAgentId }),
            ...(phone && { phone }),
            ...(twilioSid && { twilioSid }),
          },
        });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Admin API] ${action} failed:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
