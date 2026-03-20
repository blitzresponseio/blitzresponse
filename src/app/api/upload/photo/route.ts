import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/lib/db";

/**
 * POST /api/upload/photo
 * Generates a signed upload URL for Supabase Storage.
 * Body: { callId: string, fileName: string, contentType: string }
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { callId, fileName, contentType } = body;

  if (!callId || !fileName) {
    return NextResponse.json(
      { error: "callId and fileName are required" },
      { status: 400 }
    );
  }

  // Verify user has access to this call
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const call = await db.callLog.findFirst({
    where: { id: callId, companyId: user.companyId },
  });
  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  // Generate storage path
  const ext = fileName.split(".").pop() ?? "jpg";
  const storagePath = `${user.companyId}/${callId}/${Date.now()}.${ext}`;

  // In production: create signed URL via Supabase client
  // const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  // const { data, error } = await supabase.storage
  //   .from("photos")
  //   .createSignedUploadUrl(storagePath, { upsert: false });

  // Stub response for development
  const uploadUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://stub.supabase.co"}/storage/v1/object/photos/${storagePath}`;
  const publicUrl = uploadUrl;

  // Create photo record
  const photo = await db.photo.create({
    data: {
      callId,
      storageUrl: publicUrl,
      originalName: fileName,
      mimeType: contentType ?? "image/jpeg",
    },
  });

  return NextResponse.json({
    uploadUrl,
    publicUrl,
    photoId: photo.id,
    storagePath,
  });
}
