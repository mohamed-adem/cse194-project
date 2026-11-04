const countySelect = document.getElementById("county-select");

const regionNames = new Intl.DisplayNames(["en"], {
    type: "region"
});

const counties = [];

for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
        const code = String.fromCharCode(i, j);

        const name = regionNames.of(code);

        if (name && name !== code) {
            counties.push({
                code: code,
                name: name
            });
        }
    }
}
counties.sort((a, b) => a.name.localeCompare(b.name));

counties.forEach(county => {
    const option = document.createElement("option");

    option.value = county.code;
    option.textContent = county.name;

    countySelect.appendChild(option);
});