import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db/drizzle";
import { documents } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await params;
    const clientId = resolvedParams.id;

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    // Fetch client documents
    const clientDocuments = await db
      .select({
        id: documents.id,
        filename: documents.filename,
        originalFilename: documents.originalFilename,
        fileUrl: documents.fileUrl,
        fileSize: documents.fileSize,
        contentType: documents.contentType,
        documentType: documents.documentType,
        category: documents.category,
        description: documents.description,
        status: documents.status,
        complianceStatus: documents.complianceStatus,
        uploadedAt: documents.createdAt,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt
      })
      .from(documents)
      .where(
        and(
          eq(documents.clientId, clientId),
          eq(documents.firmId, user.firmId)
        )
      )
      .orderBy(desc(documents.createdAt));

    return NextResponse.json({
      documents: clientDocuments,
      count: clientDocuments.length
    });

  } catch (error) {
    console.error("Error fetching client documents:", error);
    
    if (error instanceof Error && error.message.includes('User setup required')) {
      return NextResponse.json(
        { error: "User setup required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch client documents" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await params;
    const clientId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!clientId || !documentId) {
      return NextResponse.json(
        { error: "Client ID and Document ID are required" },
        { status: 400 }
      );
    }

    // Delete document (soft delete by updating status)
    await db
      .update(documents)
      .set({
        status: 'deleted',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.clientId, clientId),
          eq(documents.firmId, user.firmId)
        )
      );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}