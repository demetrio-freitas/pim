-- Add version column for optimistic locking on workflow_requests
-- This prevents race conditions when multiple users try to review the same request simultaneously

ALTER TABLE workflow_requests
ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- Add comment explaining the purpose
COMMENT ON COLUMN workflow_requests.version IS 'Optimistic locking version to prevent concurrent review race conditions';
