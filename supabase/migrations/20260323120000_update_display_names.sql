-- Update display_name for fabian.gebert
UPDATE profiles 
SET display_name = 'Fabian' 
WHERE username = 'fabian.gebert';

-- Also update for lars.fieber if needed
UPDATE profiles 
SET display_name = 'Lars' 
WHERE username = 'lars.fieber';
