-- Remove primary_color column from display_settings
-- The header bar should always use the corporate yellow (#FEDD2C) and not be customizable
ALTER TABLE display_settings DROP COLUMN IF EXISTS primary_color;
