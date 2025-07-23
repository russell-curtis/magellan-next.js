import { uploadImageAssets } from "@/lib/upload-image";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db/drizzle";
import { documents } from "@/db/schema";

export const config = {
  api: { bodyParser: false },
};

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();
    
    // Parse the form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const clientId = formData.get("clientId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ error: "Client ID required" }, { status: 400 });
    }

    // Validate file type - allow common document types
    const allowedMimeTypes = [
      // Images
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml",
      // Documents  
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
      "text/plain",
      "text/csv",
      // Archives
      "application/zip",
      "application/x-rar-compressed",
      "application/x-7z-compressed"
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images, TXT, CSV, ZIP, RAR, 7Z" },
        { status: 400 }
      );
    }

    // Validate file size - limit to 25MB for documents
    const maxSizeInBytes = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSizeInBytes) {
      return NextResponse.json(
        { error: "File too large. Maximum size allowed is 25MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate a unique filename with original extension
    const originalName = file.name;
    const fileExt = originalName.split(".").pop() || "";
    const baseName = originalName.replace(/\.[^/.]+$/, ""); // Remove extension
    const timestamp = Date.now();
    const filename = `doc-${timestamp}-${baseName.replace(/[^a-zA-Z0-9-_]/g, "_")}.${fileExt}`;

    // Upload the file to R2 storage
    const url = await uploadImageAssets(buffer, filename);

    // Get document type - determine from file extension
    const extension = fileExt.toLowerCase();
    const typeMapping: Record<string, string> = {
      'pdf': 'PDF Document',
      'doc': 'Word Document', 
      'docx': 'Word Document',
      'xls': 'Excel Spreadsheet',
      'xlsx': 'Excel Spreadsheet',
      'ppt': 'PowerPoint Presentation',
      'pptx': 'PowerPoint Presentation',
      'jpg': 'Image',
      'jpeg': 'Image',
      'png': 'Image',
      'gif': 'Image',
      'webp': 'Image',
      'svg': 'Image',
      'txt': 'Text Document',
      'csv': 'CSV File',
      'zip': 'Archive',
      'rar': 'Archive',
      '7z': 'Archive'
    };
    
    const docType = typeMapping[extension] || 'Other Document';

    // Save document metadata to database  
    const documentId = crypto.randomUUID();
    await db.insert(documents).values({
      id: documentId,
      clientId: clientId,
      applicationId: null, // Can be set later if needed
      firmId: user.firmId,
      filename: originalName,
      originalFilename: originalName,
      fileUrl: url,
      fileSize: file.size,
      contentType: file.type,
      documentType: docType,
      status: 'uploaded',
      complianceStatus: 'pending_review',
      uploadedById: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ 
      url,
      document: {
        id: documentId,
        filename: originalName,
        fileUrl: url,
        contentType: file.type,
        fileSize: file.size
      },
      success: true 
    });
    
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Failed to process document upload" },
      { status: 500 }
    );
  }
}