// Configuration
const width = 700;
const height = 580;
const years = [2009, 2011, 2013, 2015, 2017, 2019, 2021];

// Création du SVG
const svg = d3
  .select("#map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);
const g = svg.append("g");

// Projection centrée sur la France
const projection = d3
  .geoConicConformal()
  .center([2.454071, 46.279229])
  .scale(2800);
const path = d3.geoPath().projection(projection);

// Échelle de couleurs verte
const color = d3.scaleSequential().interpolator(d3.interpolateGreens);

// Tooltip
const tooltip = d3.select("#tooltip");

// Variables globales
let geoData, wasteData;

// URLs
const CSV_URL = "mesDonnes.csv";
const GEOJSON_URL =
  "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson";

// Chargement des données
Promise.all([d3.csv(CSV_URL), d3.json(GEOJSON_URL)])
  .then(([csvData, jsonData]) => {
    // Convertir les virgules en points pour les nombres
    wasteData = csvData.map((d) => ({
      ...d,
      TONNAGE_T: d.TONNAGE_T ? d.TONNAGE_T.replace(",", ".") : d.TONNAGE_T,
    }));
    geoData = jsonData;
    init();
  })
  .catch((error) => {
    console.error("Erreur de chargement:", error);
  });

// Initialisation
function init() {
  // Filtrer les données DEEE uniquement
  const cleanData = wasteData.filter((d) => d.L_TYP_REG_DECHET === "DEEE");

  // Fusionner les données avec le GeoJSON
  geoData.features.forEach((feature) => {
    const deptCode = feature.properties.code;
    const deptData = cleanData.filter((row) => row.C_DEPT === deptCode);

    feature.properties.dataByYear = {};
    deptData.forEach((row) => {
      feature.properties.dataByYear[row.ANNEE] = parseFloat(row.TONNAGE_T);
    });
  });

  // Mettre à jour l'échelle de couleurs
  const values = cleanData.map((d) => parseFloat(d.TONNAGE_T));
  const minValue = d3.min(values);
  const maxValue = d3.max(values);
  color.domain([minValue, maxValue]);

  // Créer la légende avec des plages
  createLegendWithRanges(minValue, maxValue);

  // Dessiner la carte initiale
  drawMap("2009");

  // Listener sur le slider
  d3.select("#slider").on("input", function () {
    drawMap(years[parseInt(this.value)].toString());
  });
}

// Créer la légende avec des plages de valeurs
function createLegendWithRanges(min, max) {
  const legendItems = d3.select("#legend-items");
  legendItems.selectAll("*").remove();

  // Nombre de plages (5 plages)
  const numRanges = 5;
  const rangeSize = (max - min) / numRanges;

  for (let i = 0; i < numRanges; i++) {
    const rangeStart = min + i * rangeSize;
    const rangeEnd = min + (i + 1) * rangeSize;
    const midValue = (rangeStart + rangeEnd) / 2;

    const item = legendItems.append("div").attr("class", "legend-item");

    item
      .append("div")
      .attr("class", "legend-color")
      .style("background-color", color(midValue));

    item
      .append("div")
      .attr("class", "legend-range")
      .text(`${Math.round(rangeStart)} - ${Math.round(rangeEnd)}`);
  }
}

// Dessiner la carte pour une année donnée
function drawMap(year) {
  d3.select("#year").html(year);

  g.selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("d", path)
    .attr("class", "department")
    .transition()
    .duration(500)
    .style("fill", (d) => {
      const value = d.properties.dataByYear[year];
      return value ? color(value) : "#ccc";
    })
    .on("end", function () {
      // Réattacher les événements après la transition
      g.selectAll("path")
        .on("mouseover", function (event, d) {
          const value = d.properties.dataByYear[year];
          tooltip
            .style("opacity", 1)
            .html(
              `<strong>${d.properties.nom}</strong><br/>Année: ${year}<br/>${
                value ? Math.round(value) + " tonnes" : "Pas de données"
              }`
            );
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 20 + "px");
        })
        .on("mouseout", function () {
          tooltip.style("opacity", 0);
        });
    });
}
