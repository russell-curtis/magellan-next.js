-- Add document quality validation fields to application_documents table

ALTER TABLE application_documents 
ADD COLUMN quality_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN quality_score VARCHAR(20),
ADD COLUMN quality_issues JSONB,
ADD COLUMN quality_metadata JSONB;

-- Create index for quality queries
CREATE INDEX idx_application_documents_quality_score ON application_documents(quality_score);
CREATE INDEX idx_application_documents_quality_validated ON application_documents(quality_validated);

-- Add comment for documentation
COMMENT ON COLUMN application_documents.quality_validated IS 'Whether document has been validated for quality';
COMMENT ON COLUMN application_documents.quality_score IS 'Overall quality score: excellent, good, fair, poor';
COMMENT ON COLUMN application_documents.quality_issues IS 'JSON array of quality issues found during validation';
COMMENT ON COLUMN application_documents.quality_metadata IS 'Technical metadata like resolution, format, dimensions, etc.';