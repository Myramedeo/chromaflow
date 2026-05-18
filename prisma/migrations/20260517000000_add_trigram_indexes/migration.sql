-- Enable trigram extension and add GIN trigram indexes to speed up ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Task title and description (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_task_title_trgm ON "Task" USING gin ((lower(title)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_task_description_trgm ON "Task" USING gin ((lower(coalesce(description, ''))) gin_trgm_ops);

-- Project name and description (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_project_name_trgm ON "Project" USING gin ((lower(name)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_project_description_trgm ON "Project" USING gin ((lower(coalesce(description, ''))) gin_trgm_ops);
