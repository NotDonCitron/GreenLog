-- Assign placeholder-hybrid.jpg to remaining hybrid strains without images
UPDATE strains
SET image_url = '/media/strains/placeholder-hybrid.jpg',
    canonical_image_path = 'strains/placeholder-hybrid.jpg'
WHERE canonical_image_path IS NULL
  AND (type ILIKE '%hybrid%' OR type IS NULL OR type = '');
