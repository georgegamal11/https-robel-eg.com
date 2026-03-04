/**
 * Check unit specifications in database
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase
const serviceAccount = JSON.parse(
    readFileSync('./real-estate-project-d85d3-firebase-adminsdk-cq19w-55878ced31.json', 'utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSpecs() {
    console.log('🔍 Checking unit specifications in Firestore...\n');

    try {
        // Get B133 units
        const snapshot = await db.collection('units')
            .where('building_id', '==', 'B133')
            .limit(10)
            .get();

        console.log(`Found ${snapshot.size} units in B133\n`);
        console.log('='.repeat(80));

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`\nUnit: ${data.code || doc.id}`);
            console.log(`  Area: ${data.area} m²`);
            console.log(`  bedrooms: ${data.bedrooms}`);
            console.log(`  bathrooms: ${data.bathrooms}`);
            console.log(`  specifications:`, data.specifications);
            console.log('-'.repeat(80));
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

checkSpecs();
