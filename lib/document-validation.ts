// lib/document-validation.ts
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'

export interface DocumentQualityResult {
  isValid: boolean
  quality: 'excellent' | 'good' | 'fair' | 'poor'
  issues: DocumentQualityIssue[]
  recommendations: string[]
  metadata: DocumentMetadata
}

export interface DocumentQualityIssue {
  type: 'resolution' | 'clarity' | 'format' | 'size' | 'completeness' | 'readability'
  severity: 'critical' | 'warning' | 'info'
  message: string
  suggestion: string
}

export interface DocumentMetadata {
  fileSize: number
  format: string
  dimensions?: { width: number; height: number }
  pageCount?: number
  resolution?: number
  colorSpace?: string
}

/**
 * Validates document quality for citizenship/residence applications
 */
export class DocumentQualityValidator {
  private static readonly MIN_RESOLUTION = 300 // DPI
  private static readonly MIN_WIDTH = 1000 // pixels
  private static readonly MIN_HEIGHT = 1000 // pixels
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private static readonly PREFERRED_FORMATS = ['pdf', 'jpg', 'jpeg', 'png']

  /**
   * Analyze document quality and provide validation results
   */
  static async validateDocument(
    fileBuffer: Buffer, 
    fileName: string,
    documentType: string
  ): Promise<DocumentQualityResult> {
    const issues: DocumentQualityIssue[] = []
    const recommendations: string[] = []
    
    try {
      const fileExtension = fileName.split('.').pop()?.toLowerCase()
      const fileSize = fileBuffer.length

      // Basic file validation
      await this.validateFileBasics(fileSize, fileExtension, issues, recommendations)

      let metadata: DocumentMetadata
      
      if (fileExtension === 'pdf') {
        metadata = await this.validatePDF(fileBuffer, issues, recommendations)
      } else if (['jpg', 'jpeg', 'png'].includes(fileExtension || '')) {
        metadata = await this.validateImage(fileBuffer, issues, recommendations)
      } else {
        metadata = {
          fileSize,
          format: fileExtension || 'unknown'
        }
        issues.push({
          type: 'format',
          severity: 'critical',
          message: `Unsupported file format: ${fileExtension}`,
          suggestion: 'Please upload a PDF, JPG, or PNG file'
        })
      }

      // Document type specific validation
      this.validateDocumentType(documentType, metadata, issues, recommendations)

      // Determine overall quality
      const quality = this.calculateQuality(issues)
      const isValid = !issues.some(issue => issue.severity === 'critical')

      return {
        isValid,
        quality,
        issues,
        recommendations,
        metadata
      }

    } catch (error) {
      console.error('Document validation error:', error)
      return {
        isValid: false,
        quality: 'poor',
        issues: [{
          type: 'readability',
          severity: 'critical',
          message: 'Unable to process document',
          suggestion: 'Please ensure the file is not corrupted and try again'
        }],
        recommendations: ['Upload a new, uncorrupted file'],
        metadata: {
          fileSize: fileBuffer.length,
          format: fileName.split('.').pop()?.toLowerCase() || 'unknown'
        }
      }
    }
  }

  /**
   * Validate basic file properties
   */
  private static async validateFileBasics(
    fileSize: number,
    fileExtension: string | undefined,
    issues: DocumentQualityIssue[],
    recommendations: string[]
  ): Promise<void> {
    // File size validation
    if (fileSize > this.MAX_FILE_SIZE) {
      issues.push({
        type: 'size',
        severity: 'critical',
        message: `File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds maximum allowed (${this.MAX_FILE_SIZE / 1024 / 1024}MB)`,
        suggestion: 'Compress the file or scan at a lower resolution'
      })
    } else if (fileSize < 50000) { // Less than 50KB
      issues.push({
        type: 'size',
        severity: 'warning',
        message: 'File size is very small, which may indicate poor quality',
        suggestion: 'Ensure document is scanned at adequate resolution (minimum 300 DPI)'
      })
    }

    // Format validation
    if (!fileExtension || !this.PREFERRED_FORMATS.includes(fileExtension)) {
      issues.push({
        type: 'format',
        severity: 'critical',
        message: `File format ${fileExtension} is not supported`,
        suggestion: `Please use one of these formats: ${this.PREFERRED_FORMATS.join(', ')}`
      })
    }
  }

  /**
   * Validate PDF document
   */
  private static async validatePDF(
    fileBuffer: Buffer,
    issues: DocumentQualityIssue[],
    recommendations: string[]
  ): Promise<DocumentMetadata> {
    try {
      const pdfDoc = await PDFDocument.load(fileBuffer)
      const pageCount = pdfDoc.getPageCount()

      if (pageCount === 0) {
        issues.push({
          type: 'completeness',
          severity: 'critical',
          message: 'PDF contains no pages',
          suggestion: 'Ensure the PDF file is properly created and contains content'
        })
      }

      // Check for password protection
      if (pdfDoc.isEncrypted) {
        issues.push({
          type: 'readability',
          severity: 'critical',
          message: 'PDF is password protected',
          suggestion: 'Remove password protection before uploading'
        })
      }

      return {
        fileSize: fileBuffer.length,
        format: 'pdf',
        pageCount,
        colorSpace: 'unknown'
      }

    } catch (error) {
      issues.push({
        type: 'readability',
        severity: 'critical',
        message: 'Unable to read PDF file',
        suggestion: 'Ensure the PDF is not corrupted and try again'
      })
      
      return {
        fileSize: fileBuffer.length,
        format: 'pdf'
      }
    }
  }

  /**
   * Validate image document
   */
  private static async validateImage(
    fileBuffer: Buffer,
    issues: DocumentQualityIssue[],
    recommendations: string[]
  ): Promise<DocumentMetadata> {
    try {
      const image = sharp(fileBuffer)
      const metadata = await image.metadata()
      
      const { width = 0, height = 0, density, format, space } = metadata

      // Resolution validation
      if (width < this.MIN_WIDTH || height < this.MIN_HEIGHT) {
        issues.push({
          type: 'resolution',
          severity: 'warning',
          message: `Image resolution (${width}x${height}) is below recommended minimum (${this.MIN_WIDTH}x${this.MIN_HEIGHT})`,
          suggestion: 'Scan or photograph at higher resolution for better clarity'
        })
      }

      // DPI validation (if available)
      if (density && density < this.MIN_RESOLUTION) {
        issues.push({
          type: 'resolution',
          severity: 'warning',
          message: `Image DPI (${density}) is below recommended minimum (${this.MIN_RESOLUTION})`,
          suggestion: 'Scan at 300 DPI or higher for optimal quality'
        })
      }

      // Color space validation
      if (space === 'cmyk') {
        issues.push({
          type: 'format',
          severity: 'info',
          message: 'Image uses CMYK color space',
          suggestion: 'RGB color space is preferred for digital documents'
        })
      }

      return {
        fileSize: fileBuffer.length,
        format: format || 'unknown',
        dimensions: { width, height },
        resolution: density,
        colorSpace: space
      }

    } catch (error) {
      issues.push({
        type: 'readability',
        severity: 'critical',
        message: 'Unable to read image file',
        suggestion: 'Ensure the image is not corrupted and in a supported format'
      })
      
      return {
        fileSize: fileBuffer.length,
        format: 'unknown'
      }
    }
  }

  /**
   * Validate document based on its type and requirements
   */
  private static validateDocumentType(
    documentType: string,
    metadata: DocumentMetadata,
    issues: DocumentQualityIssue[],
    recommendations: string[]
  ): void {
    const type = documentType.toLowerCase()

    // Passport specific validation
    if (type.includes('passport')) {
      if (metadata.pageCount && metadata.pageCount < 2) {
        issues.push({
          type: 'completeness',
          severity: 'warning',
          message: 'Passport document should include all relevant pages',
          suggestion: 'Include the photo page and any pages with visas or stamps'
        })
      }
      
      recommendations.push('Ensure passport photo page is clearly visible')
      recommendations.push('Include any pages with relevant visas or entry stamps')
    }

    // Birth certificate validation
    if (type.includes('birth')) {
      if (metadata.format !== 'pdf') {
        recommendations.push('PDF format is preferred for official certificates')
      }
      
      recommendations.push('Ensure all text is clearly readable')
      recommendations.push('Include any apostille or certification stamps')
    }

    // Financial document validation
    if (type.includes('bank') || type.includes('financial') || type.includes('statement')) {
      if (metadata.pageCount && metadata.pageCount > 50) {
        issues.push({
          type: 'completeness',
          severity: 'info',
          message: 'Large number of pages detected',
          suggestion: 'Consider providing a summary or relevant pages only'
        })
      }
      
      recommendations.push('Ensure account numbers and balances are visible')
      recommendations.push('Include bank letterhead and official stamps')
    }
  }

  /**
   * Calculate overall document quality based on issues
   */
  private static calculateQuality(issues: DocumentQualityIssue[]): 'excellent' | 'good' | 'fair' | 'poor' {
    const criticalIssues = issues.filter(issue => issue.severity === 'critical').length
    const warningIssues = issues.filter(issue => issue.severity === 'warning').length
    
    if (criticalIssues > 0) return 'poor'
    if (warningIssues > 2) return 'fair'
    if (warningIssues > 0) return 'good'
    return 'excellent'
  }
}

/**
 * Get document quality guidelines for specific document types
 */
export function getDocumentGuidelines(documentType: string): {
  title: string
  requirements: string[]
  tips: string[]
  examples: string[]
} {
  const type = documentType.toLowerCase()

  if (type.includes('passport')) {
    return {
      title: 'Passport Document Guidelines',
      requirements: [
        'High-resolution scan or photo (minimum 300 DPI)',
        'All text must be clearly readable',
        'Include the main photo page',
        'Include any pages with relevant visas or stamps',
        'Ensure passport is valid for at least 6 months'
      ],
      tips: [
        'Use good lighting when photographing',
        'Keep the document flat against a contrasting background',
        'Avoid shadows and glare',
        'Capture the entire page without cropping'
      ],
      examples: [
        'passport-photo-page-good.jpg',
        'passport-with-visa-good.jpg'
      ]
    }
  }

  if (type.includes('birth')) {
    return {
      title: 'Birth Certificate Guidelines',
      requirements: [
        'Official government-issued certificate',
        'Must include apostille (if required)',
        'All text clearly visible and readable',
        'Complete document without any sections cut off',
        'Recent issue (check expiration requirements)'
      ],
      tips: [
        'Scan in color to show official seals',
        'Ensure high contrast between text and background',
        'Include any attached apostille pages',
        'Save as PDF for best quality preservation'
      ],
      examples: [
        'birth-certificate-apostilled.pdf',
        'birth-certificate-official-seal.pdf'
      ]
    }
  }

  if (type.includes('bank') || type.includes('financial')) {
    return {
      title: 'Financial Document Guidelines',
      requirements: [
        'Recent statements (last 6 months)',
        'Official bank letterhead visible',
        'Account holder name clearly shown',
        'Account numbers and balances visible',
        'Bank stamps or seals included'
      ],
      tips: [
        'Combine multiple pages into a single PDF',
        'Ensure all pages are included in sequence',
        'Redact sensitive information if required',
        'Maintain high resolution for small text'
      ],
      examples: [
        'bank-statement-6months.pdf',
        'source-of-funds-letter.pdf'
      ]
    }
  }

  // Default guidelines for any document
  return {
    title: 'Document Upload Guidelines',
    requirements: [
      'High-quality scan or photo',
      'All text clearly readable',
      'Complete document without cropping',
      'Appropriate file format (PDF, JPG, PNG)',
      'File size under 10MB'
    ],
    tips: [
      'Use adequate lighting',
      'Keep document flat and straight',
      'Avoid shadows and reflections',
      'Use highest quality settings when scanning'
    ],
    examples: []
  }
}