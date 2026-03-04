/**
 * Unit Templates Registry
 * Definitions for unit layouts based on area size (m²).
 * Used to auto-populate details when adding/displaying units.
 */

window.UNIT_TEMPLATES = {
    "90": {
        bedrooms: 2,
        bathrooms: 2,
        livingRoom: 1,
        kitchen: 1,
        floorPlanImage: "assets/images/templates/90m.webp",
        description: "Standard 90m² Layout with optimized space utilization."
    },
    // 82m² Template
    "82": {
        bedrooms: 1, // Corrected to 1 per comparison chart
        bathrooms: 2,
        livingRoom: 1,
        diningRoom: 1, // New field
        kitchen: 1,
        floorPlanImage: "assets/images/templates/82m.webp",
        description: "Efficient 82m² unit with 1 bedroom and separate dining area."
    },
    // Future templates can be added here
    "60": {
        bedrooms: 1,
        bathrooms: 2, // Updated to 2 as requested
        livingRoom: 1,
        kitchen: 1,
        floorPlanImage: "assets/images/templates/60m.webp",
        description: "Cozy 60m² Chalet with 2 bathrooms, perfect for vacations."
    },
    "120": {
        bedrooms: 3,
        bathrooms: 2,
        livingRoom: 2,
        kitchen: 1,
        floorPlanImage: "assets/images/templates/120m.webp",
        description: "Spacious 120m² Family Unit."
    }
};

/**
 * Helper to get template for a specific area.
 * Returns null if no template matches.
 */
window.getUnitTemplate = function (area) {
    if (!area) return null;
    // Direct match (string or number)
    return window.UNIT_TEMPLATES[area.toString()] || null;
};
