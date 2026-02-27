/**
 * ================================================================
 * Robel Real Estate - Database Restoration Script
 * ================================================================
 * This script restores all 222 units extracted from the PDF
 * Generated: 2026-02-17
 * Source: Robel_Price_List_Available_Only_2026-02-16.pdf
 * ================================================================
 */

// ============================================================
// 1. PROJECTS DATA
// ============================================================
const projects = [
  {
    id: "porto-golf-marina",
    name: "Porto Golf Marina",
    name_ar: "بورتو جولف مارينا",
    description: "Premium golf and marina resort on North Coast",
    location: "North Coast, Egypt",
    delivery_date: "2028-12-31"
  },
  {
    id: "porto-said",
    name: "Porto Said",
    name_ar: "بورتو سعيد",
    description: "Luxury coastal development with Champs Elysees views",
    location: "Porto Said, Egypt",
    delivery_date: "2028-12-31"
  }
];

// ============================================================
// 2. BUILDINGS DATA
// ============================================================
const buildings = [
  // Porto Golf Marina Buildings
  {
    id: "B133",
    name: "Building 133",
    project_id: "porto-golf-marina",
    total_floors: 9,
    delivery_date: "2028-12-31",
    status: "Under Construction"
  },
  {
    id: "B136",
    name: "Building 136",
    project_id: "porto-golf-marina",
    total_floors: 9,
    delivery_date: "2028-12-31",
    status: "Under Construction"
  },
  {
    id: "B230",
    name: "Building 230",
    project_id: "porto-golf-marina",
    total_floors: 9,
    delivery_date: "2028-12-31",
    status: "Under Construction"
  },
  {
    id: "B243",
    name: "Building 243",
    project_id: "porto-golf-marina",
    total_floors: 9,
    delivery_date: "2028-12-31",
    status: "Under Construction"
  },
  // Porto Said Buildings
  {
    id: "B15",
    name: "Building 15",
    project_id: "porto-said",
    total_floors: 5,
    delivery_date: "2028-12-31",
    status: "Under Construction"
  },
  {
    id: "B33",
    name: "Building 33",
    project_id: "porto-said",
    total_floors: 4,
    delivery_date: "2028-12-31",
    status: "Under Construction"
  }
];

// ============================================================
// 3. ALL 222 UNITS DATA (EXTRACTED FROM PDF)
// ============================================================
const units = [
  // ==================== B133 (8 units) ====================
  { code: "133212", building_id: "B133", floor: "2nd Floor", view: "vip golf", area: 90, price: 5380000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "133222", building_id: "B133", floor: "2nd Floor", view: "Garden View", area: 60, price: 3750000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "133402", building_id: "B133", floor: "4th Floor", view: "Garden View", area: 90, price: 5495000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "133607", building_id: "B133", floor: "6th Floor", view: "vip golf", area: 82, price: 5232000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "133613", building_id: "B133", floor: "6th Floor", view: "Golf View", area: 60, price: 4050000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "133809", building_id: "B133", floor: "8th Floor", view: "vip golf", area: 60, price: 4150000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "133820", building_id: "B133", floor: "8th Floor", view: "vip golf", area: 82, price: 5343000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "133924", building_id: "B133", floor: "9th Floor", view: "Garden View", area: 60, price: 4150000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },

  // ==================== B136 (5 units) ====================
  { code: "136125", building_id: "B136", floor: "1st Floor", view: "South-facing-garden", area: 90, price: 6365000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "136825", building_id: "B136", floor: "8th Floor", view: "South-facing-garden", area: 90, price: 6935000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "136902", building_id: "B136", floor: "9th Floor", view: "South-facing-garden", area: 90, price: 6605000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "136922", building_id: "B136", floor: "9th Floor", view: "South-facing-garden", area: 60, price: 4405000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "136925", building_id: "B136", floor: "9th Floor", view: "South-facing-garden", area: 90, price: 6605000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },

  // ==================== B230 (39 units) ====================
  { code: "230016", building_id: "B230", floor: "Ground Floor", view: "Villa", area: 60, price: 4440000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230018", building_id: "B230", floor: "Ground Floor", view: "Villa", area: 60, price: 4440000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230021", building_id: "B230", floor: "Ground Floor", view: "Garden", area: 60, price: 4922000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230022", building_id: "B230", floor: "Ground Floor", view: "Garden", area: 60, price: 4722000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230024", building_id: "B230", floor: "Ground Floor", view: "Garden", area: 60, price: 4722000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230026", building_id: "B230", floor: "Ground Floor", view: "Garden", area: 30, price: 2699000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230103", building_id: "B230", floor: "1st Floor", view: "Garden", area: 60, price: 3685000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230106", building_id: "B230", floor: "1st Floor", view: "Garden", area: 60, price: 3685000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230107", building_id: "B230", floor: "1st Floor", view: "Villa", area: 82, price: 4750000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230108", building_id: "B230", floor: "1st Floor", view: "Villa", area: 60, price: 3461850, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230110", building_id: "B230", floor: "1st Floor", view: "Villa", area: 60, price: 3475000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230112", building_id: "B230", floor: "1st Floor", view: "Villa", area: 90, price: 5195000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230302", building_id: "B230", floor: "3rd Floor", view: "Garden", area: 90, price: 5637000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230307", building_id: "B230", floor: "3rd Floor", view: "Villa", area: 82, price: 4830000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230314", building_id: "B230", floor: "3rd Floor", view: "Villa", area: 30, price: 1992000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230407", building_id: "B230", floor: "4th Floor", view: "Villa", area: 82, price: 4878000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230412", building_id: "B230", floor: "4th Floor", view: "Villa", area: 90, price: 5355000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230413", building_id: "B230", floor: "4th Floor", view: "Villa", area: 60, price: 3570000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230420", building_id: "B230", floor: "4th Floor", view: "Villa", area: 82, price: 4878000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230507", building_id: "B230", floor: "5th Floor", view: "Villa", area: 82, price: 4928000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230512", building_id: "B230", floor: "5th Floor", view: "Villa", area: 90, price: 5408000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230514", building_id: "B230", floor: "5th Floor", view: "Villa", area: 30, price: 2035000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230525", building_id: "B230", floor: "5th Floor", view: "Garden", area: 90, price: 5755000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230613", building_id: "B230", floor: "6th Floor", view: "Villa", area: 60, price: 3639000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230620", building_id: "B230", floor: "6th Floor", view: "Villa", area: 82, price: 4978000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230625", building_id: "B230", floor: "6th Floor", view: "Garden", area: 90, price: 5810000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230707", building_id: "B230", floor: "7th Floor", view: "Villa", area: 82, price: 5026000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230812", building_id: "B230", floor: "8th Floor", view: "Villa", area: 90, price: 5570000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230815", building_id: "B230", floor: "8th Floor", view: "Villa", area: 60, price: 3715000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230818", building_id: "B230", floor: "8th Floor", view: "Villa", area: 60, price: 3715000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230820", building_id: "B230", floor: "8th Floor", view: "Villa", area: 82, price: 5075000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230825", building_id: "B230", floor: "8th Floor", view: "Garden", area: 90, price: 5926000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230902", building_id: "B230", floor: "9th Floor", view: "Garden", area: 90, price: 5526000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230907", building_id: "B230", floor: "9th Floor", view: "Villa", area: 82, price: 4750000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230910", building_id: "B230", floor: "9th Floor", view: "Villa", area: 60, price: 3475000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230911", building_id: "B230", floor: "9th Floor", view: "Villa", area: 60, price: 3475000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230912", building_id: "B230", floor: "9th Floor", view: "Villa", area: 90, price: 5195000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230913", building_id: "B230", floor: "9th Floor", view: "Villa", area: 60, price: 3475000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "230925", building_id: "B230", floor: "9th Floor", view: "Garden", area: 90, price: 5526000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },

  // ==================== B243 (93 units) ====================
  { code: "243002", building_id: "B243", floor: "Ground Floor", view: "Swimming pool", area: 90, price: 6685000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243004", building_id: "B243", floor: "Ground Floor", view: "Swimming pool", area: 60, price: 4440000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243005", building_id: "B243", floor: "Ground Floor", view: "Swimming pool", area: 60, price: 4440000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243006", building_id: "B243", floor: "Ground Floor", view: "Swimming pool", area: 60, price: 4440000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243008", building_id: "B243", floor: "Ground Floor", view: "Lazy River", area: 60, price: 4722000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243010", building_id: "B243", floor: "Ground Floor", view: "Lazy River", area: 60, price: 4722000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243011", building_id: "B243", floor: "Ground Floor", view: "Lazy River", area: 60, price: 4722000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243012", building_id: "B243", floor: "Ground Floor", view: "Lazy River", area: 60, price: 4722000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243015", building_id: "B243", floor: "Ground Floor", view: "Lazy River", area: 60, price: 4722000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243016", building_id: "B243", floor: "Ground Floor", view: "Lazy River", area: 60, price: 4722000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243017", building_id: "B243", floor: "Ground Floor", view: "Lazy River", area: 60, price: 4722000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243018", building_id: "B243", floor: "Ground Floor", view: "Lazy River", area: 60, price: 4722000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243021", building_id: "B243", floor: "Ground Floor", view: "Swimming pool", area: 60, price: 4626000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243022", building_id: "B243", floor: "Ground Floor", view: "Swimming pool", area: 60, price: 4440000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243023", building_id: "B243", floor: "Ground Floor", view: "Swimming pool", area: 60, price: 4440000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243024", building_id: "B243", floor: "Ground Floor", view: "Swimming pool", area: 60, price: 4440000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243025", building_id: "B243", floor: "Ground Floor", view: "Swimming pool", area: 90, price: 6690000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243107", building_id: "B243", floor: "1st Floor", view: "Lazy River", area: 82, price: 5035000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243112", building_id: "B243", floor: "1st Floor", view: "Lazy River", area: 90, price: 5523000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243120", building_id: "B243", floor: "1st Floor", view: "Lazy River", area: 82, price: 5035000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243125", building_id: "B243", floor: "1st Floor", view: "Swimming pool", area: 90, price: 5195000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243202", building_id: "B243", floor: "2nd Floor", view: "Swimming pool", area: 90, price: 5249000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243207", building_id: "B243", floor: "2nd Floor", view: "Lazy River", area: 82, price: 5086000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243220", building_id: "B243", floor: "2nd Floor", view: "Lazy River", area: 82, price: 5086000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243224", building_id: "B243", floor: "2nd Floor", view: "Swimming pool", area: 60, price: 3505000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243225", building_id: "B243", floor: "2nd Floor", view: "Swimming pool", area: 90, price: 5249000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243302", building_id: "B243", floor: "3rd Floor", view: "Swimming pool", area: 90, price: 5300000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243312", building_id: "B243", floor: "3rd Floor", view: "Lazy River", area: 90, price: 5637000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243320", building_id: "B243", floor: "3rd Floor", view: "Lazy River", area: 82, price: 5145000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243325", building_id: "B243", floor: "3rd Floor", view: "Swimming pool", area: 90, price: 5300000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243402", building_id: "B243", floor: "4th Floor", view: "Swimming pool", area: 90, price: 5355000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243407", building_id: "B243", floor: "4th Floor", view: "Lazy River", area: 82, price: 5185950, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243420", building_id: "B243", floor: "4th Floor", view: "Lazy River", area: 82, price: 5186000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243424", building_id: "B243", floor: "4th Floor", view: "Swimming pool", area: 60, price: 3570000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243425", building_id: "B243", floor: "4th Floor", view: "Swimming pool", area: 90, price: 5355000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243502", building_id: "B243", floor: "5th Floor", view: "Swimming pool", area: 90, price: 5406000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243503", building_id: "B243", floor: "5th Floor", view: "Swimming pool", area: 60, price: 3605000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243504", building_id: "B243", floor: "5th Floor", view: "Swimming pool", area: 60, price: 3605000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243506", building_id: "B243", floor: "5th Floor", view: "Swimming pool", area: 60, price: 3605000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243507", building_id: "B243", floor: "5th Floor", view: "Lazy River", area: 82, price: 5238450, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243512", building_id: "B243", floor: "5th Floor", view: "Lazy River", area: 90, price: 5755000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243522", building_id: "B243", floor: "5th Floor", view: "Swimming pool", area: 60, price: 3605000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243523", building_id: "B243", floor: "5th Floor", view: "Swimming pool", area: 60, price: 3605000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243524", building_id: "B243", floor: "5th Floor", view: "Swimming pool", area: 60, price: 3605000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243525", building_id: "B243", floor: "5th Floor", view: "Swimming pool", area: 90, price: 5406000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243602", building_id: "B243", floor: "6th Floor", view: "Swimming pool", area: 90, price: 5460000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243603", building_id: "B243", floor: "6th Floor", view: "Swimming pool", area: 60, price: 3642000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243604", building_id: "B243", floor: "6th Floor", view: "Swimming pool", area: 60, price: 3642000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243605", building_id: "B243", floor: "6th Floor", view: "Swimming pool", area: 60, price: 3642000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243606", building_id: "B243", floor: "6th Floor", view: "Swimming pool", area: 60, price: 3642000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243612", building_id: "B243", floor: "6th Floor", view: "Lazy River", area: 90, price: 5810000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243620", building_id: "B243", floor: "6th Floor", view: "Lazy River", area: 82, price: 5292000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243622", building_id: "B243", floor: "6th Floor", view: "Swimming pool", area: 60, price: 3642000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243623", building_id: "B243", floor: "6th Floor", view: "Swimming pool", area: 60, price: 3642000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243624", building_id: "B243", floor: "6th Floor", view: "Swimming pool", area: 60, price: 3642000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243625", building_id: "B243", floor: "6th Floor", view: "Swimming pool", area: 90, price: 5460000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243702", building_id: "B243", floor: "7th Floor", view: "Swimming pool", area: 90, price: 5515000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243703", building_id: "B243", floor: "7th Floor", view: "Swimming pool", area: 60, price: 3680000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243704", building_id: "B243", floor: "7th Floor", view: "Swimming pool", area: 60, price: 3680000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243705", building_id: "B243", floor: "7th Floor", view: "Swimming pool", area: 60, price: 3680000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243706", building_id: "B243", floor: "7th Floor", view: "Swimming pool", area: 60, price: 3680000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243707", building_id: "B243", floor: "7th Floor", view: "Lazy River", area: 82, price: 5343000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243712", building_id: "B243", floor: "7th Floor", view: "Lazy River", area: 90, price: 5865000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243720", building_id: "B243", floor: "7th Floor", view: "Lazy River", area: 82, price: 5343000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243722", building_id: "B243", floor: "7th Floor", view: "Swimming pool", area: 60, price: 3680000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243723", building_id: "B243", floor: "7th Floor", view: "Swimming pool", area: 60, price: 3680000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243724", building_id: "B243", floor: "7th Floor", view: "Swimming pool", area: 60, price: 3680000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243725", building_id: "B243", floor: "7th Floor", view: "Swimming pool", area: 90, price: 5515000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243802", building_id: "B243", floor: "8th Floor", view: "Swimming pool", area: 90, price: 5570000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243803", building_id: "B243", floor: "8th Floor", view: "Swimming pool", area: 60, price: 3715000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243804", building_id: "B243", floor: "8th Floor", view: "Swimming pool", area: 60, price: 3715000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243805", building_id: "B243", floor: "8th Floor", view: "Swimming pool", area: 60, price: 3715000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243806", building_id: "B243", floor: "8th Floor", view: "Swimming pool", area: 60, price: 3715000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243807", building_id: "B243", floor: "8th Floor", view: "Lazy River", area: 82, price: 5396000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243812", building_id: "B243", floor: "8th Floor", view: "Lazy River", area: 90, price: 5926000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243820", building_id: "B243", floor: "8th Floor", view: "Lazy River", area: 82, price: 5394900, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243822", building_id: "B243", floor: "8th Floor", view: "Swimming pool", area: 60, price: 3715000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243823", building_id: "B243", floor: "8th Floor", view: "Swimming pool", area: 60, price: 3715000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243824", building_id: "B243", floor: "8th Floor", view: "Swimming pool", area: 60, price: 3715000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243825", building_id: "B243", floor: "8th Floor", view: "Swimming pool", area: 90, price: 5570000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243902", building_id: "B243", floor: "9th Floor", view: "Swimming pool", area: 90, price: 5195000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243903", building_id: "B243", floor: "9th Floor", view: "Swimming pool", area: 60, price: 3475000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243904", building_id: "B243", floor: "9th Floor", view: "Swimming pool", area: 60, price: 3475000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243905", building_id: "B243", floor: "9th Floor", view: "Swimming pool", area: 60, price: 3475000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243906", building_id: "B243", floor: "9th Floor", view: "Swimming pool", area: 60, price: 3475000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243907", building_id: "B243", floor: "9th Floor", view: "Lazy River", area: 82, price: 5035000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243912", building_id: "B243", floor: "9th Floor", view: "Lazy River", area: 90, price: 5526000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243916", building_id: "B243", floor: "9th Floor", view: "Lazy River", area: 60, price: 3685000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243917", building_id: "B243", floor: "9th Floor", view: "Lazy River", area: 60, price: 3685000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243918", building_id: "B243", floor: "9th Floor", view: "Lazy River", area: 60, price: 3685000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243920", building_id: "B243", floor: "9th Floor", view: "Lazy River", area: 82, price: 5035000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243925", building_id: "B243", floor: "9th Floor", view: "Swimming pool", area: 90, price: 5195000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "243926", building_id: "B243", floor: "9th Floor", view: "Swimming pool", area: 30, price: 1953000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },

  // ==================== B15 (65 units) ====================
  { code: "15001", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 153, price: 9423000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15004", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 61, price: 4363000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15006", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 45, price: 3362000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15008", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 45, price: 3362000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15009", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 67, price: 4267000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15010", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 62, price: 4455000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "150101", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 65, price: 4217000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "150105", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 113, price: 7604000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "150109", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 147, price: 9178000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15013", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 49, price: 3272000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15014", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 45, price: 3362000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15015", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 70, price: 4406000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15021", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 49, price: 3272000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15022", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 45, price: 3362000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15024", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 64, price: 4505000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15026", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 64, price: 4505000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15027", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 50, price: 3298000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15030", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 45, price: 3362000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15032", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 62, price: 4391000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15033", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 47, price: 3221000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15035", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 49, price: 3272000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15037", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 67, price: 4269000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15043", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 67, price: 4267000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15045", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 67, price: 4267000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15046", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 64, price: 4510000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15048", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 66, price: 4561000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15050", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 47, price: 3416000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15052", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 47, price: 3416000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15055", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 49, price: 3272000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15056", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 116, price: 8146000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15059", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 67, price: 4269000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15061", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 118, price: 7731000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15062", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 47, price: 3416000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15063", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 115, price: 7654000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15064", building_id: "B15", floor: "Ground Floor", view: "Sea view club1", area: 47, price: 3416000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15067", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 47, price: 3221000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15069", building_id: "B15", floor: "Ground Floor", view: "champs elysees", area: 47, price: 3221000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15070", building_id: "B15", floor: "Ground Floor", view: "Sea View", area: 48, price: 3444000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15073", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 66, price: 4301000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15074", building_id: "B15", floor: "Ground Floor", view: "Sea View", area: 66, price: 4500000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15075", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 47, price: 3221000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15076", building_id: "B15", floor: "Ground Floor", view: "Sea View", area: 132, price: 8578000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15077", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 47, price: 3221000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15080", building_id: "B15", floor: "Ground Floor", view: "Sea View", area: 65, price: 4471000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15081", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 115, price: 7654000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15082", building_id: "B15", floor: "Ground Floor", view: "Sea View", area: 65, price: 4471000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15083", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 47, price: 3221000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15085", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 65, price: 4215000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15087", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 65, price: 4215000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15088", building_id: "B15", floor: "Ground Floor", view: "Sea View", area: 67, price: 4591000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15089", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 47, price: 3221000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15091", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 47, price: 3221000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15092", building_id: "B15", floor: "Ground Floor", view: "Sea View", area: 48, price: 3444000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15093", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 66, price: 4304000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15094", building_id: "B15", floor: "Ground Floor", view: "Sea View", area: 48, price: 3444000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15095", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 66, price: 4301000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15097", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 47, price: 3221000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15098", building_id: "B15", floor: "Ground Floor", view: "Sea View", area: 117, price: 8173000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15099", building_id: "B15", floor: "Ground Floor", view: "Champs Elysees View", area: 47, price: 3221000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15153", building_id: "B15", floor: "1st Floor", view: "Champs Elysees View", area: 90, price: 4990000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15154", building_id: "B15", floor: "1st Floor", view: "Sea View", area: 90, price: 5616000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15167", building_id: "B15", floor: "1st Floor", view: "Champs Elysees View", area: 90, price: 4990000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15177", building_id: "B15", floor: "1st Floor", view: "Champs Elysees View", area: 165, price: 9137000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15227", building_id: "B15", floor: "2nd Floor", view: "Champs Elysees View", area: 90, price: 4990000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "15451", building_id: "B15", floor: "4th Floor", view: "Champs Elysees View", area: 90, price: 4990000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },

  // ==================== B33 (12 units) ====================
  { code: "33104", building_id: "B33", floor: "1st Floor", view: "Pool", area: 86, price: 4554000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "33105", building_id: "B33", floor: "1st Floor", view: "Main Road", area: 63, price: 3337000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "33204", building_id: "B33", floor: "2nd Floor", view: "Pool", area: 86, price: 4628000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "33205", building_id: "B33", floor: "2nd Floor", view: "Main Road", area: 63, price: 3391000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "33218", building_id: "B33", floor: "2nd Floor", view: "champs elysees", area: 116, price: 5745000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "33302", building_id: "B33", floor: "3rd Floor", view: "Main Road", area: 115, price: 6386000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "33303", building_id: "B33", floor: "3rd Floor", view: "Main Road", area: 76, price: 4220000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "33318", building_id: "B33", floor: "3rd Floor", view: "champs elysees", area: 119, price: 5995000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "33401", building_id: "B33", floor: "4th Floor", view: "Main Road", area: 66, price: 3665000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "33404", building_id: "B33", floor: "4th Floor", view: "Pool", area: 86, price: 4777000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "33405", building_id: "B33", floor: "4th Floor", view: "Main Road", area: 63, price: 3499000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" },
  { code: "33409", building_id: "B33", floor: "4th Floor", view: "Main Road", area: 63, price: 3499000, status: "Available", purpose: "Buy", payment_plan: "Flexible installments available" }
];

// ============================================================
// 4. CLOUDFLARE API CONFIGURATION
// ============================================================
const CLOUDFLARE_API_URL = "https://robel-api.george-gamal139.workers.dev/api";
const AUTH_KEY = "YOUR_AUTH_KEY_HERE"; // ⚠️ REPLACE THIS WITH YOUR ACTUAL AUTH KEY

// ============================================================
// 5. MAIN RESTORATION FUNCTION
// ============================================================
async function restoreDatabase() {
  console.log("🔄 Starting database restoration...\n");

  try {
    // Step 1: Upload Projects
    console.log("📁 Uploading projects...");
    for (const project of projects) {
      const response = await fetch(`${CLOUDFLARE_API_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AUTH_KEY}`
        },
        body: JSON.stringify(project)
      });
      
      if (response.ok) {
        console.log(`✅ Project uploaded: ${project.name}`);
      } else {
        console.error(`❌ Failed to upload project: ${project.name}`);
      }
    }

    // Step 2: Upload Buildings
    console.log("\n🏢 Uploading buildings...");
    for (const building of buildings) {
      const response = await fetch(`${CLOUDFLARE_API_URL}/buildings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AUTH_KEY}`
        },
        body: JSON.stringify(building)
      });
      
      if (response.ok) {
        console.log(`✅ Building uploaded: ${building.name}`);
      } else {
        console.error(`❌ Failed to upload building: ${building.name}`);
      }
    }

    // Step 3: Upload Units (in batches of 50 for performance)
    console.log("\n🏠 Uploading units...");
    const batchSize = 50;
    let uploadedCount = 0;

    for (let i = 0; i < units.length; i += batchSize) {
      const batch = units.slice(i, i + batchSize);
      
      for (const unit of batch) {
        const response = await fetch(`${CLOUDFLARE_API_URL}/units`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AUTH_KEY}`
          },
          body: JSON.stringify(unit)
        });
        
        if (response.ok) {
          uploadedCount++;
          process.stdout.write(`\r✅ Units uploaded: ${uploadedCount}/${units.length}`);
        } else {
          console.error(`\n❌ Failed to upload unit: ${unit.code}`);
        }
      }
      
      // Small delay between batches to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log("\n\n🎉 DATABASE RESTORATION COMPLETE!");
    console.log(`✅ ${projects.length} projects uploaded`);
    console.log(`✅ ${buildings.length} buildings uploaded`);
    console.log(`✅ ${uploadedCount} units uploaded`);
    console.log(`\n🌐 Check your website: https://robel-eg.com`);
    console.log(`🔗 Check API: ${CLOUDFLARE_API_URL}/units`);

  } catch (error) {
    console.error("\n❌ ERROR during restoration:", error.message);
    console.log("\n⚠️ Please check:");
    console.log("1. Your AUTH_KEY is correct");
    console.log("2. The Cloudflare Worker is deployed");
    console.log("3. Your internet connection is stable");
  }
}

// ============================================================
// 6. RUN THE SCRIPT
// ============================================================
console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     ROBEL REAL ESTATE - DATABASE RESTORATION TOOL         ║
║                                                           ║
║     Total Projects: ${projects.length}                                     ║
║     Total Buildings: ${buildings.length}                                    ║
║     Total Units: ${units.length}                                   ║
║                                                           ║
║     Source: PDF exported on 2026-02-16                    ║
║     Status: Ready to restore                              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

// Uncomment the line below when you're ready to run
// restoreDatabase();

console.log("\n⚠️  IMPORTANT: Before running this script:");
console.log("1. Replace YOUR_AUTH_KEY_HERE with your actual Cloudflare auth key");
console.log("2. Verify the CLOUDFLARE_API_URL is correct");
console.log("3. Uncomment the last line: restoreDatabase();");
console.log("4. Run: node restore-database.js\n");
