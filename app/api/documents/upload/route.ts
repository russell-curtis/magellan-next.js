import { uploadToR2 } from "@/lib/r2-storage";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db/drizzle";
import { documents } from "@/db/schema";
import { 
  documentUploadSchema, 
  ALLOWED_FILE_TYPES, 
  MAX_FILE_SIZE
} from "@/lib/validations/documents";

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
    
    // Extract and validate metadata
    const uploadData = documentUploadSchema.parse({
      clientId: formData.get("clientId") || null,
      applicationId: formData.get("applicationId") || null,
      documentType: formData.get("documentType") || 'other',
      category: formData.get("category") || null,
      description: formData.get("description") || null
    });

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) {
      return NextResponse.json(
        { error: "Invalid file type. Supported types: PDF, DOC, DOCX, XLS, XLSX, images, TXT, CSV" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
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
    const uploadResult = await uploadToR2(buffer, filename, file.type, 'general')
    const url = uploadResult.url;


    // Save document metadata to database  
    const documentId = crypto.randomUUID();
    await db.insert(documents).values({
      id: documentId,
      clientId: uploadData.clientId,
      applicationId: uploadData.applicationId,
      firmId: user.firmId,
      filename: filename,
      originalFilename: originalName,
      fileUrl: url,
      fileSize: file.size,
      contentType: file.type,
      documentType: uploadData.documentType,
      category: uploadData.category,
      description: uploadData.description,
      status: 'uploaded',
      complianceStatus: 'pending_review',
      uploadedById: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Create the document response object
    const newDocument = {
      id: documentId,
      filename: filename,
      fileUrl: url,
      contentType: file.type,
      fileSize: file.size
    };

    return NextResponse.json({ 
      document: newDocument,
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