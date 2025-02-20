// Pre-load NUTS validation data and GeoJSON template
let nuts3List = [];
let geoJsonTemplate = {};

// Load validation files on page load
window.addEventListener('DOMContentLoaded', async () => {
    // Load NUTS3 values
    const nutsResponse = await fetch('assets/SsuEpasSchoolsFile.xlsx');
    const nutsBuffer = await nutsResponse.arrayBuffer();
    const nutsWorkbook = XLSX.read(nutsBuffer);
    nuts3List = XLSX.utils.sheet_to_json(nutsWorkbook.Sheets[nutsWorkbook.SheetNames[0]], { header: 1 }).flat();

    // Load GeoJSON template
    const geoResponse = await fetch('assets/NUTS_LB_2021_4326.geojson');
    geoJsonTemplate = await geoResponse.json();
});

// File Upload Handler
document.getElementById('file-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById('status');
    statusDiv.textContent = 'Processing...';

    try {
        // Read Excel file
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const schoolsData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        // Validate Data
        const { invalidNuts, emailDupes, websiteDupes } = validateData(schoolsData);

        // Show Results
        displayDuplicates(emailDupes, websiteDupes);
        if (invalidNuts.length > 0) {
            statusDiv.innerHTML = `Invalid NUTS values: ${invalidNuts.join(', ')}`;
            return;
        }

        // Generate GeoJSON
        const geoJson = generateGeoJson(schoolsData);
        setupGeoJsonDownload(geoJson);
        statusDiv.textContent = 'Success!';
        
    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
    }
});

// Validation Logic
function validateData(data) {
    const invalidNuts = [];
    const emails = new Map();
    const websites = new Map();

    data.forEach((row, index) => {
        // Validate NUTS
        if (!nuts3List.includes(row.NUTs)) invalidNuts.push(row.NUTs);

        // Check duplicates
        if (row['Official Email']) {
            if (emails.has(row['Official Email'])) emails.get(row['Official Email']).push(index);
            else emails.set(row['Official Email'], [index]);
        }

        if (row.Website) {
            if (websites.has(row.Website)) websites.get(row.Website).push(index);
            else websites.set(row.Website, [index]);
        }
    });

    return {
        invalidNuts: [...new Set(invalidNuts)],
        emailDupes: [...emails.values()].filter(indices => indices.length > 1),
        websiteDupes: [...websites.values()].filter(indices => indices.length > 1)
    };
}

// GeoJSON Generation
function generateGeoJson(schoolsData) {
    const features = schoolsData.map(school => {
        const nutsFeature = geoJsonTemplate.features.find(f => f.properties.NUTS_ID === school.NUTs);
        return {
            type: "Feature",
            properties: {
                name: school['Name of School'],
                web: school.Website,
                email: school['Official Email']
            },
            geometry: nutsFeature?.geometry || { type: "Point", coordinates: [0, 0] }
        };
    });

    return {
        type: "FeatureCollection",
        features
    };
}

// Download Handling
function setupGeoJsonDownload(geoJson) {
    const blob = new Blob([JSON.stringify(geoJson)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pinsEPAS.geojson';
        a.click();
        URL.revokeObjectURL(url);
    };
    
    document.getElementById('download-output').style.display = 'block';
}

// Template Downloads (pre-bundled files)
document.getElementById('download-schools').addEventListener('click', () => {
    window.location.href = 'assets/Nuts3ValuesLocation.xlsx';
});

document.getElementById('download-geojson').addEventListener('click', () => {
    window.location.href = 'assets/NUTS_LB_2021_4326.geojson';
});