document.getElementById('fileInput').addEventListener('change', handleFile);

function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        processExcelData(jsonData);
    };
    reader.readAsArrayBuffer(file);
}

function processExcelData(data) {
    let errors = [];
    let invalidNUTS = [];
    let emailDuplicates = {};
    let websiteDuplicates = {};
    let nutsSet = new Set(); // Simulating NUTS3 validation

    data.forEach(row => {
        // Check for duplicate emails
        if (row["Official Email"]) {
            emailDuplicates[row["Official Email"]] = (emailDuplicates[row["Official Email"]] || 0) + 1;
        }

        // Check for duplicate websites
        if (row["Website"]) {
            websiteDuplicates[row["Website"]] = (websiteDuplicates[row["Website"]] || 0) + 1;
        }

        // Validate NUTS values
        if (row["NUTs"] && !nutsSet.has(row["NUTs"])) {
            invalidNUTS.push(row["NUTs"]);
        }
    });

    displayResults(errors, emailDuplicates, websiteDuplicates, invalidNUTS);
}

function displayResults(errors, emailDuplicates, websiteDuplicates, invalidNUTS) {
    document.getElementById("errors").innerText = errors.length ? errors.join("\n") : "No errors found.";
    document.getElementById("duplicates").innerText = `Duplicate Emails: ${Object.keys(emailDuplicates).length}`;
    document.getElementById("invalidNUTS").innerText = invalidNUTS.length ? `Invalid NUTS values: ${invalidNUTS.join(", ")}` : "No invalid NUTS found.";

    // Show download button for GeoJSON (mockup)
    document.getElementById("downloadGeoJSON").style.display = "block";
    document.getElementById("downloadGeoJSON").addEventListener("click", function() {
        const geojsonData = JSON.stringify({ type: "FeatureCollection", features: [] }, null, 2);
        const blob = new Blob([geojsonData], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "processed.geojson";
        link.click();
    });
}
