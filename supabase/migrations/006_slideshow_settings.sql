-- Add slideshow settings to app_settings table
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS slideshow_interval INTEGER DEFAULT 5000,
ADD COLUMN IF NOT EXISTS slideshow_batch_size INTEGER DEFAULT 3;

-- Update existing row with default values if they're NULL
UPDATE app_settings 
SET 
  slideshow_interval = COALESCE(slideshow_interval, 5000),
  slideshow_batch_size = COALESCE(slideshow_batch_size, 3)
WHERE slideshow_interval IS NULL OR slideshow_batch_size IS NULL;
