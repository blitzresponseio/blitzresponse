import { PrismaClient } from "@prisma/client";
import type { PricingMatrixData } from "../src/types/pricing";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding BlitzResponse database...\n");

  // ── Clean slate ───────────────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.job.deleteMany();
  await prisma.callLog.deleteMany();
  await prisma.smsTemplate.deleteMany();
  await prisma.knowledgeEntry.deleteMany();
  await prisma.pricingMatrix.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  console.log("  ✓ Cleaned existing data");

  // ═══════════════════════════════════════════════════════════
  // 1. Company
  // ═══════════════════════════════════════════════════════════

  const company = await prisma.company.create({
    data: {
      name: "Rapid Restore Pro",
      slug: "rapid-restore-pro",
      clerkOrgId: "org_demo_rapid_restore",
      phone: "+15551234567",
      timezone: "America/Denver",
      defaultLanguage: "en",
      subscriptionStatus: "ACTIVE",
      onboardingComplete: true,
      settings: {
        greeting:
          "Thank you for calling Rapid Restore Pro. I'm an AI assistant and I can help you right away — 24 hours a day, 7 days a week.",
        greetingEs:
          "Gracias por llamar a Rapid Restore Pro. Soy un asistente de inteligencia artificial y puedo ayudarle de inmediato — las 24 horas del día, los 7 días de la semana.",
        afterHoursMessage:
          "Our office is closed but I can still help you. I'll book the next available appointment and dispatch an emergency tech if needed.",
        maxCallDuration: 600,
        autoDispatch: true,
        requireDisclaimerAck: true,
        onboarding: {
          profile: true,
          pricing: true,
          phone: true,
          calendar: true,
          team: true,
          voice: true,
        },
      },
    },
  });
  console.log(`  ✓ Company: ${company.name}`);

  // ═══════════════════════════════════════════════════════════
  // 2. Users
  // ═══════════════════════════════════════════════════════════

  const owner = await prisma.user.create({
    data: {
      clerkUserId: "user_demo_owner",
      email: "mike@rapidrestorepro.com",
      name: "Mike Henderson",
      role: "OWNER",
      companyId: company.id,
    },
  });

  await prisma.user.create({
    data: {
      clerkUserId: "user_demo_admin",
      email: "sarah@rapidrestorepro.com",
      name: "Sarah Chen",
      role: "ADMIN",
      companyId: company.id,
    },
  });
  console.log("  ✓ Users: 2 created (owner + admin)");

  // ═══════════════════════════════════════════════════════════
  // 3. Team Members (on-call techs)
  // ═══════════════════════════════════════════════════════════

  const teamMembers = await Promise.all([
    prisma.teamMember.create({
      data: {
        companyId: company.id,
        name: "Jake Morrison",
        phone: "+15559001001",
        email: "jake@rapidrestorepro.com",
        role: "Lead Water Tech",
        specialties: ["water", "storm"],
        isOnCall: true,
        isActive: true,
        onCallDays: [1, 2, 3, 4, 5], // Mon–Fri
        onCallStart: "07:00",
        onCallEnd: "19:00",
        dispatchPriority: 1,
      },
    }),
    prisma.teamMember.create({
      data: {
        companyId: company.id,
        name: "Maria Santos",
        phone: "+15559001002",
        email: "maria@rapidrestorepro.com",
        role: "Mold Specialist",
        specialties: ["mold", "water"],
        isOnCall: true,
        isActive: true,
        onCallDays: [1, 2, 3, 4, 5],
        onCallStart: "08:00",
        onCallEnd: "18:00",
        dispatchPriority: 2,
      },
    }),
    prisma.teamMember.create({
      data: {
        companyId: company.id,
        name: "Derrick Okafor",
        phone: "+15559001003",
        email: "derrick@rapidrestorepro.com",
        role: "Fire/Smoke Tech",
        specialties: ["fire"],
        isOnCall: true,
        isActive: true,
        onCallDays: [1, 2, 3, 4, 5],
        onCallStart: "07:00",
        onCallEnd: "19:00",
        dispatchPriority: 3,
      },
    }),
    prisma.teamMember.create({
      data: {
        companyId: company.id,
        name: "Tom Nguyen",
        phone: "+15559001004",
        email: "tom@rapidrestorepro.com",
        role: "Weekend Tech",
        specialties: ["water", "fire", "mold"],
        isOnCall: true,
        isActive: true,
        onCallDays: [0, 6], // Sat, Sun
        onCallStart: "08:00",
        onCallEnd: "20:00",
        dispatchPriority: 1,
      },
    }),
    prisma.teamMember.create({
      data: {
        companyId: company.id,
        name: "Lisa Park",
        phone: "+15559001005",
        email: "lisa@rapidrestorepro.com",
        role: "Estimator / PM",
        specialties: ["general"],
        isOnCall: false,
        isActive: true,
        onCallDays: [],
        dispatchPriority: 10,
      },
    }),
  ]);
  console.log(`  ✓ Team members: ${teamMembers.length} created`);

  // ═══════════════════════════════════════════════════════════
  // 4. Pricing Matrix
  // ═══════════════════════════════════════════════════════════

  const pricingData: PricingMatrixData = {
    version: 1,
    currency: "USD",
    taxRate: 0.07,
    categories: [
      {
        id: "cat-water-extraction",
        name: "Water Extraction",
        emergencyType: "WATER_DAMAGE",
        sortOrder: 0,
        lineItems: [
          {
            id: "li-water-extract",
            name: "Water extraction",
            unit: "SQ_FT",
            unitPrice: 3.75,
            minimumCharge: 500,
            multipliers: { cat1: 1.0, cat2: 1.3, cat3: 1.8, cat4: 2.2 },
            emergencyMultiplier: 1.5,
            isActive: true,
            sortOrder: 0,
          },
          {
            id: "li-carpet-removal",
            name: "Carpet removal & disposal",
            unit: "SQ_FT",
            unitPrice: 2.25,
            minimumCharge: 200,
            multipliers: { cat1: 1.0, cat2: 1.0, cat3: 1.2, cat4: 1.5 },
            emergencyMultiplier: 1.25,
            isActive: true,
            sortOrder: 1,
          },
        ],
      },
      {
        id: "cat-structural-drying",
        name: "Structural Drying",
        emergencyType: "WATER_DAMAGE",
        sortOrder: 1,
        lineItems: [
          {
            id: "li-dehumidifier",
            name: "Dehumidifier rental",
            unit: "DAY",
            unitPrice: 75,
            minimumCharge: 225,
            multipliers: { cat1: 1.0, cat2: 1.0, cat3: 1.0, cat4: 1.0 },
            emergencyMultiplier: 1.0,
            isActive: true,
            sortOrder: 0,
          },
          {
            id: "li-air-mover",
            name: "Air mover rental",
            unit: "DAY",
            unitPrice: 45,
            minimumCharge: 135,
            multipliers: { cat1: 1.0, cat2: 1.0, cat3: 1.0, cat4: 1.0 },
            emergencyMultiplier: 1.0,
            isActive: true,
            sortOrder: 1,
          },
          {
            id: "li-moisture-monitor",
            name: "Moisture monitoring",
            unit: "EACH",
            unitPrice: 150,
            minimumCharge: 150,
            multipliers: { cat1: 1.0, cat2: 1.0, cat3: 1.0, cat4: 1.0 },
            emergencyMultiplier: 1.0,
            isActive: true,
            sortOrder: 2,
          },
        ],
      },
      {
        id: "cat-fire-smoke",
        name: "Fire & Smoke Cleanup",
        emergencyType: "FIRE_SMOKE",
        sortOrder: 2,
        lineItems: [
          {
            id: "li-soot-cleanup",
            name: "Soot & smoke residue cleaning",
            unit: "SQ_FT",
            unitPrice: 6.50,
            minimumCharge: 1000,
            multipliers: { cat1: 1.0, cat2: 1.3, cat3: 1.6, cat4: 2.0 },
            emergencyMultiplier: 1.5,
            isActive: true,
            sortOrder: 0,
          },
          {
            id: "li-ozone-treatment",
            name: "Ozone / thermal fog treatment",
            unit: "EACH",
            unitPrice: 500,
            minimumCharge: 500,
            multipliers: { cat1: 1.0, cat2: 1.0, cat3: 1.5, cat4: 2.0 },
            emergencyMultiplier: 1.25,
            isActive: true,
            sortOrder: 1,
          },
          {
            id: "li-content-cleaning",
            name: "Content pack-out & cleaning",
            unit: "HOUR",
            unitPrice: 65,
            minimumCharge: 325,
            multipliers: { cat1: 1.0, cat2: 1.0, cat3: 1.0, cat4: 1.0 },
            emergencyMultiplier: 1.0,
            isActive: true,
            sortOrder: 2,
          },
        ],
      },
      {
        id: "cat-mold",
        name: "Mold Remediation",
        emergencyType: "MOLD",
        sortOrder: 3,
        lineItems: [
          {
            id: "li-mold-remediation",
            name: "Mold remediation (containment + removal)",
            unit: "SQ_FT",
            unitPrice: 12.00,
            minimumCharge: 1500,
            multipliers: { cat1: 1.0, cat2: 1.3, cat3: 1.6, cat4: 2.0 },
            emergencyMultiplier: 1.35,
            isActive: true,
            sortOrder: 0,
          },
          {
            id: "li-mold-testing",
            name: "Air quality / mold testing",
            unit: "EACH",
            unitPrice: 350,
            minimumCharge: 350,
            multipliers: { cat1: 1.0, cat2: 1.0, cat3: 1.0, cat4: 1.0 },
            emergencyMultiplier: 1.0,
            isActive: true,
            sortOrder: 1,
          },
        ],
      },
      {
        id: "cat-general",
        name: "General / Overhead",
        emergencyType: "GENERAL",
        sortOrder: 4,
        lineItems: [
          {
            id: "li-emergency-callout",
            name: "Emergency callout / mobilization fee",
            unit: "FLAT",
            unitPrice: 250,
            minimumCharge: 250,
            multipliers: { cat1: 1.0, cat2: 1.0, cat3: 1.0, cat4: 1.0 },
            emergencyMultiplier: 1.5,
            isActive: true,
            sortOrder: 0,
          },
          {
            id: "li-technician-labor",
            name: "Technician labor",
            unit: "HOUR",
            unitPrice: 85,
            minimumCharge: 170,
            multipliers: { cat1: 1.0, cat2: 1.15, cat3: 1.3, cat4: 1.5 },
            emergencyMultiplier: 1.5,
            isActive: true,
            sortOrder: 1,
          },
        ],
      },
    ],
  };

  await prisma.pricingMatrix.create({
    data: {
      companyId: company.id,
      version: 1,
      data: pricingData as any,
    },
  });
  console.log("  ✓ Pricing matrix: 5 categories, 12 line items");

  // ═══════════════════════════════════════════════════════════
  // 5. Sample Call Logs (5 diverse scenarios)
  // ═══════════════════════════════════════════════════════════

  const now = new Date();
  const daysAgo = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    return date;
  };
  const hoursAgo = (h: number) => {
    const date = new Date(now);
    date.setHours(date.getHours() - h);
    return date;
  };

  // Call 1: Water — burst pipe (completed, converted to job)
  const call1 = await prisma.callLog.create({
    data: {
      companyId: company.id,
      channel: "PHONE",
      direction: "INBOUND",
      callerPhone: "+17205551001",
      callerName: "Jennifer Walsh",
      callerEmail: "jennifer.walsh@email.com",
      status: "COMPLETED",
      duration: 247,
      language: "en",
      emergencyType: "WATER_DAMAGE",
      damageCategory: 1,
      damageClass: 2,
      squareFootage: 200,
      isEmergency: true,
      safetyIssues: ["standing_water", "electrical_risk"],
      propertyType: "RESIDENTIAL",
      insuranceInfo: {
        hasInsurance: true,
        carrier: "State Farm",
        claimNumber: null,
        policyNumber: "SF-882910",
      },
      damageOnset: hoursAgo(3),
      quoteRangeLow: 1800,
      quoteRangeHigh: 3200,
      usedFallback: false,
      disclaimerAcknowledged: true,
      disclaimerAcknowledgedAt: hoursAgo(2),
      disclaimerMethod: "BOTH",
      appointmentTime: hoursAgo(-1), // 1 hour from now
      dispatchedAt: hoursAgo(2),
      dispatchedTo: [teamMembers[0].id],
      isTestCall: false,
      summary:
        "Homeowner Jennifer Walsh called about a burst pipe under her kitchen sink. Approximately 200 sq ft of standing water affecting kitchen and adjacent hallway. Water near an electrical outlet (safety concern noted). Category 1 clean water, Class 2 damage. Has State Farm insurance. Quote provided: $1,800–$3,200. Tech Jake Morrison dispatched. Appointment confirmed for today.",
      transcript: [
        { role: "agent", content: "Thank you for calling Rapid Restore Pro. I'm an AI assistant and I can help you right away. Are you calling about an emergency?", timestamp: 0 },
        { role: "caller", content: "Yes, I've got a burst pipe and there's water all over my kitchen floor.", timestamp: 5 },
        { role: "agent", content: "I'm sorry to hear that. Let me help you right away. First, is anyone injured or in immediate danger?", timestamp: 10 },
        { role: "caller", content: "No, everyone's fine. But the water is getting close to an electrical outlet.", timestamp: 16 },
        { role: "agent", content: "That's an important safety concern. If possible, please turn off the circuit breaker for that area. Do not touch the outlet if it's wet. Can you tell me roughly how many square feet are affected?", timestamp: 22 },
        { role: "caller", content: "Maybe 200 square feet? It's the whole kitchen and going into the hallway.", timestamp: 35 },
        { role: "agent", content: "Got it. Based on what you've described — clean water from a supply line, approximately 200 square feet affected — a typical water extraction and drying job of this size usually runs between $1,800 and $3,200. This is a preliminary estimate and the final price will be confirmed on-site. Do you have homeowner's insurance?", timestamp: 42 },
        { role: "caller", content: "Yes, State Farm.", timestamp: 68 },
        { role: "agent", content: "Great. I can get a technician out to you. I have availability today at 3 PM, tomorrow at 9 AM, or tomorrow at 2 PM. Which works best?", timestamp: 72 },
        { role: "caller", content: "Today at 3 would be perfect.", timestamp: 85 },
        { role: "agent", content: "Done. Jake Morrison, our lead water tech, will be there at 3 PM today. You'll receive a confirmation text shortly with his contact info and some tips for your insurance claim. Is there anything else I can help with?", timestamp: 90 },
        { role: "caller", content: "No, that's great. Thank you so much.", timestamp: 110 },
      ],
      createdAt: hoursAgo(2),
    },
  });

  // Photo for call 1
  await prisma.photo.create({
    data: {
      callId: call1.id,
      storageUrl: "https://placeholder.supabase.co/photos/demo/water-kitchen-1.jpg",
      thumbnailUrl: "https://placeholder.supabase.co/photos/demo/water-kitchen-1-thumb.jpg",
      originalName: "kitchen-flood.jpg",
      mimeType: "image/jpeg",
      fileSize: 2400000,
      severityScore: 6,
      severityNotes: "Moderate standing water visible across kitchen floor. Water appears clean (Category 1). No visible mold. Proximity to electrical outlet is a concern.",
      analysisJson: {
        damageType: "water_damage",
        extent: "moderate",
        estimatedSqFt: 180,
        materials: ["tile", "hardwood_transition", "drywall_baseboard"],
        recommendations: ["immediate_extraction", "dehumidification", "baseboard_inspection"],
      },
    },
  });

  // Job for call 1
  await prisma.job.create({
    data: {
      companyId: company.id,
      callId: call1.id,
      status: "SCHEDULED",
      estimatedValue: 2500,
      scheduledDate: hoursAgo(-1),
      assignedTo: teamMembers[0].id,
    },
  });

  // Call 2: Fire/Smoke (completed, converted to job, completed job)
  const call2 = await prisma.callLog.create({
    data: {
      companyId: company.id,
      channel: "PHONE",
      direction: "INBOUND",
      callerPhone: "+17205552002",
      callerName: "Robert Kim",
      status: "COMPLETED",
      duration: 312,
      language: "en",
      emergencyType: "FIRE_SMOKE",
      damageCategory: 4,
      damageClass: 3,
      squareFootage: 400,
      isEmergency: false,
      safetyIssues: [],
      propertyType: "RESIDENTIAL",
      insuranceInfo: { hasInsurance: true, carrier: "Allstate" },
      damageOnset: daysAgo(8),
      quoteRangeLow: 4200,
      quoteRangeHigh: 7800,
      usedFallback: false,
      disclaimerAcknowledged: true,
      disclaimerAcknowledgedAt: daysAgo(6),
      disclaimerMethod: "BOTH",
      appointmentTime: daysAgo(5),
      dispatchedAt: daysAgo(6),
      dispatchedTo: [teamMembers[2].id],
      isTestCall: false,
      summary:
        "Robert Kim called about fire/smoke damage from a kitchen fire 2 days prior. Fire department extinguished. Smoke damage across ~400 sq ft (kitchen + living room). No active safety hazards. Category 4, Class 3. Has Allstate insurance. Quote: $4,200–$7,800. Derrick Okafor dispatched.",
      transcript: [],
      createdAt: daysAgo(7),
    },
  });

  await prisma.job.create({
    data: {
      companyId: company.id,
      callId: call2.id,
      status: "COMPLETED",
      estimatedValue: 6000,
      actualValue: 5850,
      scheduledDate: daysAgo(5),
      completedDate: daysAgo(1),
      assignedTo: teamMembers[2].id,
      notes: "Soot cleanup completed. Ozone treatment done. Client satisfied.",
    },
  });

  // Call 3: Mold (completed, job in progress)
  const call3 = await prisma.callLog.create({
    data: {
      companyId: company.id,
      channel: "SMS",
      direction: "INBOUND",
      callerPhone: "+17205553003",
      callerName: "Angela Ruiz",
      status: "COMPLETED",
      duration: 0,
      language: "es",
      emergencyType: "MOLD",
      damageCategory: 2,
      damageClass: 1,
      squareFootage: 100,
      isEmergency: false,
      safetyIssues: ["mold_visible"],
      propertyType: "RESIDENTIAL",
      insuranceInfo: { hasInsurance: false },
      damageOnset: daysAgo(30),
      quoteRangeLow: 1800,
      quoteRangeHigh: 3500,
      usedFallback: false,
      disclaimerAcknowledged: true,
      disclaimerAcknowledgedAt: daysAgo(4),
      disclaimerMethod: "SMS",
      appointmentTime: daysAgo(3),
      dispatchedAt: daysAgo(4),
      dispatchedTo: [teamMembers[1].id],
      isTestCall: false,
      summary:
        "Angela Ruiz texted in Spanish about mold behind basement drywall. ~100 sq ft, black and fuzzy mold. Long-standing moisture issue. Category 2, Class 1. No insurance. Quote: $1,800–$3,500. Maria Santos dispatched (Spanish-speaking specialist).",
      createdAt: daysAgo(5),
    },
  });

  await prisma.photo.create({
    data: {
      callId: call3.id,
      storageUrl: "https://placeholder.supabase.co/photos/demo/mold-basement-1.jpg",
      thumbnailUrl: "https://placeholder.supabase.co/photos/demo/mold-basement-1-thumb.jpg",
      originalName: "moho-sotano.jpg",
      mimeType: "image/jpeg",
      fileSize: 1800000,
      severityScore: 7,
      severityNotes: "Significant black mold colony visible on drywall. Appears to be Stachybotrys (black mold). Moisture staining extends beyond visible growth area. Professional remediation with containment recommended.",
    },
  });

  await prisma.job.create({
    data: {
      companyId: company.id,
      callId: call3.id,
      status: "IN_PROGRESS",
      estimatedValue: 2800,
      scheduledDate: daysAgo(3),
      assignedTo: teamMembers[1].id,
      notes: "Containment set up. Mold testing sent to lab. Removal in progress.",
    },
  });

  // Call 4: Sewage backup (missed call — demonstrates the problem we solve)
  const call4 = await prisma.callLog.create({
    data: {
      companyId: company.id,
      channel: "PHONE",
      direction: "INBOUND",
      callerPhone: "+17205554004",
      callerName: null,
      status: "MISSED",
      duration: 0,
      language: "en",
      emergencyType: null,
      isEmergency: false,
      safetyIssues: [],
      propertyType: "RESIDENTIAL",
      isTestCall: false,
      summary: "Missed call — no voicemail left. Callback attempted, no answer.",
      createdAt: daysAgo(12),
    },
  });

  // Call 5: Storm damage (completed, lead stage)
  const call5 = await prisma.callLog.create({
    data: {
      companyId: company.id,
      channel: "PHONE",
      direction: "INBOUND",
      callerPhone: "+17205555005",
      callerName: "David & Linda Patel",
      status: "COMPLETED",
      duration: 198,
      language: "en",
      emergencyType: "STORM",
      damageCategory: 1,
      damageClass: 2,
      squareFootage: 250,
      isEmergency: true,
      safetyIssues: ["standing_water", "structural_damage"],
      propertyType: "RESIDENTIAL",
      insuranceInfo: { hasInsurance: true, carrier: "USAA" },
      damageOnset: hoursAgo(6),
      quoteRangeLow: 2200,
      quoteRangeHigh: 4500,
      usedFallback: false,
      disclaimerAcknowledged: true,
      disclaimerAcknowledgedAt: daysAgo(2),
      disclaimerMethod: "VERBAL",
      appointmentTime: daysAgo(1),
      dispatchedAt: daysAgo(2),
      dispatchedTo: [teamMembers[0].id, teamMembers[3].id],
      isTestCall: false,
      summary:
        "David and Linda Patel called about storm damage — tree branch through roof, water pouring through ceiling in two bedrooms. ~250 sq ft affected. Structural concern noted. Category 1, Class 2. USAA insurance. Quote: $2,200–$4,500. Jake Morrison and Tom Nguyen dispatched.",
      createdAt: daysAgo(2),
    },
  });

  await prisma.photo.create({
    data: {
      callId: call5.id,
      storageUrl: "https://placeholder.supabase.co/photos/demo/storm-roof-1.jpg",
      thumbnailUrl: "https://placeholder.supabase.co/photos/demo/storm-roof-1-thumb.jpg",
      originalName: "roof-damage.jpg",
      mimeType: "image/jpeg",
      fileSize: 3200000,
      severityScore: 8,
      severityNotes: "Large tree branch penetrating roof sheathing. Active water intrusion visible. Ceiling drywall saturated and sagging. Immediate tarping and extraction required.",
    },
  });

  await prisma.job.create({
    data: {
      companyId: company.id,
      callId: call5.id,
      status: "LEAD",
      estimatedValue: 3500,
      scheduledDate: daysAgo(1),
      assignedTo: teamMembers[0].id,
    },
  });

  console.log("  ✓ Call logs: 5 created (water, fire, mold, missed, storm)");
  console.log("  ✓ Photos: 3 with analysis scores");
  console.log("  ✓ Jobs: 4 created (scheduled, completed, in-progress, lead)");

  // ═══════════════════════════════════════════════════════════
  // 6. SMS Templates
  // ═══════════════════════════════════════════════════════════

  await prisma.smsTemplate.createMany({
    data: [
      {
        companyId: company.id,
        trigger: "POST_CALL_IMMEDIATE",
        delayMinutes: 0,
        body: "Hi {{callerName}}, thanks for calling Rapid Restore Pro! Your estimated quote is {{quoteRange}}. Your tech {{techName}} is scheduled for {{appointmentTime}}. Reply STOP to opt out.",
        bodyEs: "Hola {{callerName}}, gracias por llamar a Rapid Restore Pro. Su presupuesto estimado es {{quoteRange}}. Su técnico {{techName}} está programado para {{appointmentTime}}. Responda STOP para cancelar.",
        isActive: true,
      },
      {
        companyId: company.id,
        trigger: "QUOTE_DISCLAIMER",
        delayMinutes: 1,
        body: "IMPORTANT: Your quote of {{quoteRange}} is a preliminary estimate based on the information provided. Actual costs may vary after on-site inspection. This is not a binding contract. Reply YES to acknowledge.",
        bodyEs: "IMPORTANTE: Su presupuesto de {{quoteRange}} es una estimación preliminar. Los costos reales pueden variar después de la inspección en el sitio. Esto no es un contrato vinculante. Responda SÍ para confirmar.",
        isActive: true,
      },
      {
        companyId: company.id,
        trigger: "INSURANCE_TIPS",
        delayMinutes: 30,
        body: "Insurance tip from Rapid Restore Pro: 1) Document damage with photos/video before cleanup. 2) Don't throw away damaged items until adjuster visits. 3) File your claim within 24hrs. 4) We can work directly with your adjuster. Questions? Call us anytime.",
        bodyEs: "Consejo de seguro de Rapid Restore Pro: 1) Documente los daños con fotos/video antes de la limpieza. 2) No tire los artículos dañados hasta que el ajustador los vea. 3) Presente su reclamo dentro de 24 horas. 4) Podemos trabajar directamente con su ajustador.",
        isActive: true,
      },
      {
        companyId: company.id,
        trigger: "PRE_APPOINTMENT",
        delayMinutes: 60,
        body: "Rapid Restore Pro: Your technician {{techName}} is on the way and should arrive by {{appointmentTime}}. Please ensure access to the affected area. If you need to reschedule, call us at {{companyPhone}}.",
        bodyEs: "Rapid Restore Pro: Su técnico {{techName}} está en camino y debe llegar a las {{appointmentTime}}. Por favor asegure el acceso al área afectada.",
        isActive: true,
      },
      {
        companyId: company.id,
        trigger: "POST_SERVICE_REVIEW",
        delayMinutes: 1440,
        body: "Hi {{callerName}}, thank you for choosing Rapid Restore Pro! We hope everything went well. Would you mind leaving us a quick review? It means a lot to our team: {{reviewLink}}",
        isActive: true,
      },
    ],
  });
  console.log("  ✓ SMS templates: 5 created (with Spanish variants)");

  // ═══════════════════════════════════════════════════════════
  // 7. Knowledge Base
  // ═══════════════════════════════════════════════════════════

  await prisma.knowledgeEntry.createMany({
    data: [
      {
        companyId: company.id,
        title: "Insurance claim process",
        content:
          "For insurance claims: 1) Document all damage with photos and video before any cleanup. 2) Contact your insurance carrier as soon as possible to file a claim. 3) Do not discard any damaged materials or belongings until the insurance adjuster has inspected them. 4) Keep all receipts for emergency expenses (hotel, food, etc). 5) We work directly with all major insurance carriers and can coordinate with your adjuster. 6) Your policy likely covers emergency mitigation even before the adjuster arrives.",
        category: "insurance_faq",
        language: "en",
      },
      {
        companyId: company.id,
        title: "Proceso de reclamo de seguro",
        content:
          "Para reclamos de seguro: 1) Documente todos los daños con fotos y video antes de cualquier limpieza. 2) Comuníquese con su compañía de seguros lo antes posible para presentar un reclamo. 3) No descarte ningún material o pertenencia dañada hasta que el ajustador haya inspeccionado. 4) Guarde todos los recibos de gastos de emergencia. 5) Trabajamos directamente con todas las compañías de seguros principales.",
        category: "insurance_faq",
        language: "es",
      },
      {
        companyId: company.id,
        title: "Company services",
        content:
          "Rapid Restore Pro provides 24/7 emergency restoration services including: Water damage extraction and structural drying, fire and smoke damage cleanup, mold testing and remediation, storm damage repair and tarping, sewage cleanup and sanitization, content pack-out and cleaning. We are IICRC certified and work with all major insurance carriers. Serving the greater Denver metro area.",
        category: "services",
        language: "en",
      },
      {
        companyId: company.id,
        title: "Emergency water damage tips",
        content:
          "While waiting for our team: 1) Turn off the water source if possible. 2) Turn off electrical breakers for affected areas if water is near outlets. 3) Move valuable items to dry areas. 4) Do not use a regular vacuum on standing water. 5) Open windows for ventilation if safe to do so. 6) Take photos of all damage before any cleanup.",
        category: "safety",
        language: "en",
      },
    ],
  });
  console.log("  ✓ Knowledge base: 4 entries (incl. Spanish)");

  // ═══════════════════════════════════════════════════════════

  console.log("\n✅ Seed complete!");
  console.log(`   Company: ${company.name} (${company.slug})`);
  console.log(`   Users: 2 | Team: 5 | Calls: 5 | Jobs: 4`);
  console.log(`   Pricing: 5 categories, 12 line items`);
  console.log(`   SMS templates: 5 | Knowledge base: 4\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
