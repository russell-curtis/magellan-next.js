-- Migration: Add Original Documents Collection stage to St. Kitts workflow
-- This migration updates existing St. Kitts workflow stages to include the new Original Documents Collection stage

-- First, update the stage orders for existing stages that come after the new stage
-- We need to shift Government Submission from stage 4 to 5, Review & Processing from 5 to 6, and Approval & Completion from 6 to 7

UPDATE workflow_stages 
SET stage_order = 7
WHERE template_id IN (
  SELECT id FROM program_workflow_templates 
  WHERE template_name = 'St. Kitts and Nevis Citizenship by Investment - Standard Workflow'
) 
AND stage_order = 6; -- Approval & Completion: 6 -> 7

UPDATE workflow_stages 
SET stage_order = 6
WHERE template_id IN (
  SELECT id FROM program_workflow_templates 
  WHERE template_name = 'St. Kitts and Nevis Citizenship by Investment - Standard Workflow'
) 
AND stage_order = 5; -- Review & Processing: 5 -> 6

UPDATE workflow_stages 
SET stage_order = 5
WHERE template_id IN (
  SELECT id FROM program_workflow_templates 
  WHERE template_name = 'St. Kitts and Nevis Citizenship by Investment - Standard Workflow'
) 
AND stage_order = 4; -- Government Submission: 4 -> 5

-- Now insert the new Original Documents Collection stage
INSERT INTO workflow_stages (
  template_id,
  stage_order,
  stage_name,
  description,
  estimated_days,
  is_required,
  can_skip,
  auto_progress
)
SELECT 
  id as template_id,
  4 as stage_order,
  'Original Documents Collection' as stage_name,
  'Collection and verification of original physical documents required for government submission' as description,
  10 as estimated_days,
  true as is_required,
  false as can_skip,
  true as auto_progress
FROM program_workflow_templates 
WHERE template_name = 'St. Kitts and Nevis Citizenship by Investment - Standard Workflow';

-- Update the total stages count in the template
UPDATE program_workflow_templates 
SET total_stages = 7
WHERE template_name = 'St. Kitts and Nevis Citizenship by Investment - Standard Workflow';

-- Update document requirements stage orders to match the new workflow stages
UPDATE document_requirements 
SET stage_id = (
  SELECT ws.id 
  FROM workflow_stages ws 
  JOIN program_workflow_templates pwt ON ws.template_id = pwt.id
  WHERE pwt.template_name = 'St. Kitts and Nevis Citizenship by Investment - Standard Workflow'
  AND ws.stage_order = 5
)
WHERE stage_id IN (
  SELECT ws.id 
  FROM workflow_stages ws 
  JOIN program_workflow_templates pwt ON ws.template_id = pwt.id
  WHERE pwt.template_name = 'St. Kitts and Nevis Citizenship by Investment - Standard Workflow'
  AND ws.stage_order = 5
);

-- Update stage progress for existing applications to accommodate the new stage
-- This will add the new Original Documents Collection stage to applications that are currently past Investment Processing
INSERT INTO stage_progress (
  application_id,
  stage_id,
  status,
  completion_percentage
)
SELECT 
  a.id as application_id,
  ws.id as stage_id,
  CASE 
    WHEN a.status IN ('ready_for_submission', 'submitted_to_government', 'under_review', 'approved', 'rejected') THEN 'completed'
    WHEN a.status = 'documents_collection' THEN 'pending'
    ELSE 'pending'
  END as status,
  CASE 
    WHEN a.status IN ('ready_for_submission', 'submitted_to_government', 'under_review', 'approved', 'rejected') THEN 100.00
    ELSE 0.00
  END as completion_percentage
FROM applications a
JOIN workflow_stages ws ON ws.template_id = a.workflow_template_id
JOIN program_workflow_templates pwt ON a.workflow_template_id = pwt.id
WHERE pwt.template_name = 'St. Kitts and Nevis Citizenship by Investment - Standard Workflow'
AND ws.stage_order = 4 -- Our new Original Documents Collection stage
AND NOT EXISTS (
  SELECT 1 FROM stage_progress sp 
  WHERE sp.application_id = a.id AND sp.stage_id = ws.id
);