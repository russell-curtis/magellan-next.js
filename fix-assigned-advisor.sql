-- Fix existing applications that have null assignedAdvisorId
-- This will assign them to the firm owner/admin

UPDATE applications 
SET assigned_advisor_id = (
  SELECT u.id 
  FROM users u 
  WHERE u.firm_id = applications.firm_id 
  AND (u.role = 'admin' OR u.role = 'firm_owner')
  LIMIT 1
)
WHERE assigned_advisor_id IS NULL;