-- Fix: Remove farmer/brand prefix from strain names when it appears at the start
-- This prevents duplication like "420" appearing both as farmer and in strain name
-- Examples: "420 Natural Gorilla Glue" (farmer="420 Pharma") -> "Natural Gorilla Glue"
--          "Alien Walker" (farmer="Alien Genetics") -> "Walker"

-- 1. Fix "420 Natural Gorilla Glue" (farmer="420 Pharma")
UPDATE strains
SET name = 'Natural Gorilla Glue', slug = 'natural-gorilla-glue'
WHERE name = '420 Natural Gorilla Glue' AND farmer = '420 Pharma';

-- 2. Fix "420 Natural Wedding Cake" (farmer="420 Pharma")
UPDATE strains
SET name = 'Natural Wedding Cake', slug = 'natural-wedding-cake'
WHERE name = '420 Natural Wedding Cake' AND farmer = '420 Pharma';

-- 3. Fix "Alien Walker" (farmer="Alien Genetics")
UPDATE strains
SET name = 'Walker', slug = 'walker'
WHERE name = 'Alien Walker' AND farmer = 'Alien Genetics';

-- 4. Fix "Bedrocan" (farmer="Bedrocan") - exact duplicate, rename to generic
UPDATE strains
SET name = 'Bedrocan', slug = 'bedrocan'
WHERE name = 'Bedrocan' AND farmer = 'Bedrocan';

-- 5. Fix "Final Test Sorte 1775114393589" (farmer="Final Farmer") - test artifact
UPDATE strains
SET name = 'Test Sorte', slug = 'test-sorte-1775114393589'
WHERE name = 'Final Test Sorte 1775114393589' AND farmer = 'Final Farmer';

-- 6. Fix "test" (farmer="test") - test artifact
UPDATE strains
SET name = 'Test Strain', slug = 'test-strain'
WHERE name = 'test' AND farmer = 'test';
