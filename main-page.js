const countySelect = document.getElementById("county-select");


const countyPaths = document.querySelectorAll("#svg-holder svg path[id]");


const counties = Array.from(countyPaths).map(path => ({
    name: path.id
}));

counties.sort((a, b) => a.name.localeCompare(b.name));

counties.forEach(county => {
    const option = document.createElement("option");

    option.value = county.name;
    option.textContent = county.name;

    countySelect.appendChild(option);
});


const previewSVG = document.getElementById("county-preview-svg");
const countyName = document.getElementById("county-name");

countyPaths.forEach(path => {

    path.addEventListener("mouseenter", () => {


        countyName.textContent = path.id;


        const bounds = path.getBBox();

        const padding = 10;

        
        previewSVG.setAttribute(
            "viewBox",
            `${bounds.x - padding} ${bounds.y - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}`
        );


        previewSVG.innerHTML = "";

        const countyCopy = path.cloneNode(true);

        countyCopy.style.fill = "grey";

        previewSVG.appendChild(countyCopy);
    });

});