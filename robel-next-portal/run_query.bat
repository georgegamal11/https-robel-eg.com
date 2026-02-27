npx wrangler d1 execute robel --command="SELECT COUNT(unit_id) FROM units WHERE typeof(unit_id) = 'text' AND unit_id GLOB '[0-9]*'" --remote --json
