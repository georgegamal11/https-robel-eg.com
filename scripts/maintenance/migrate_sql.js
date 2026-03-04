
const AUTH_KEY = "ROBEL_SECURE_SYNC_2025";
const sql = `
DROP TRIGGER IF EXISTS set_auto_specs_insert;
DROP TRIGGER IF EXISTS set_auto_specs_update;

CREATE TRIGGER set_auto_specs_insert
AFTER INSERT ON units
FOR EACH ROW
BEGIN
  UPDATE units SET auto_specs = CASE 
    WHEN NEW.project_id = 'porto-golf-marina' THEN
      CASE 
        WHEN CAST(NEW.area AS INT) = 30 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":false,"dining_area":false,"type":"Studio"}'
        WHEN CAST(NEW.area AS INT) = 60 THEN 
          CASE WHEN NEW.floor LIKE 'Ground%' OR NEW.floor = '0' OR NEW.floor LIKE 'Ardi%' 
            THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"garden":true,"garden_desc":"Private Garden","type":"Apartment"}'
            ELSE '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"garden":false,"type":"Apartment"}'
          END
        WHEN CAST(NEW.area AS INT) = 82 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true,"type":"Apartment"}'
        WHEN CAST(NEW.area AS INT) = 90 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Apartment"}'
        ELSE NULL
      END
    WHEN NEW.project_id = 'porto-said' THEN
      CASE 
        WHEN NEW.area BETWEEN 30 AND 59 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
        WHEN NEW.area BETWEEN 60 AND 85 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom"}'
        WHEN NEW.area BETWEEN 86 AND 115 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
        WHEN NEW.area >= 116 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"3 Bedroom/Family"}'
        ELSE NULL
      END
    ELSE NULL
  END WHERE unit_id = NEW.unit_id;
END;
`;

async function migrate() {
    try {
        const resp = await fetch("https://robel-api.george-gamal139.workers.dev/api", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
            body: JSON.stringify({
                action: 'SQL', // Custom shot in the dark
                table: 'system',
                data: { query: sql }
            })
        });
        console.log(await resp.json());
    } catch (e) { console.error(e); }
}
migrate();
