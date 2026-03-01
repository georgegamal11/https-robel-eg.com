const fs = require('fs');
let content = fs.readFileSync('public/pages/home.js', 'utf8');

// The line were identifying is:
// 6312:    if (typeof getSortedBuildingsList === 'function') projectsToRender = getSortedBuildingsList(projectsToRender);

const targetLine = "if (typeof getSortedBuildingsList === 'function') projectsToRender = getSortedBuildingsList(projectsToRender);";
const injection = `
    // ?? FIX: Ensure B133, B136, B230, B243 mapping issues in Porto Golf are resolved
    const portoGolfBuildings = ['B133', 'B136', 'B230', 'B243', 'B121', 'B224', 'B78'];
    portoGolfBuildings.forEach(bId => {
        if (!projectMetadata[bId]) {
             projectMetadata[bId] = { projectArea: "Porto Golf Marina", delivery: "12/2026", status: "buy", constStatus: "Under Construction" };
        }
        if (!projectNames.includes(bId)) {
             projectNames.push(bId);
        }
    });`;

if (content.indexOf(targetLine) !== -1) {
    content = content.replace(targetLine, targetLine + injection);
    fs.writeFileSync('public/pages/home.js', content);
    console.log('? Successfully applied portoGolfBuildings fix to home.js');
} else {
    console.log('? Could not find target line in home.js');
}
