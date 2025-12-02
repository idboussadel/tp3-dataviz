// Section JavaScript pour CodePen
// N'oubliez pas d'ajouter D3.js v7 dans les Settings > JS > Add External Scripts/Pens
// URL: https://d3js.org/d3.v7.min.js

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

// Échelle de couleurs
const color = d3.scaleSequential().interpolator(d3.interpolateYlOrRd);

// Tooltip
const tooltip = d3.select("#tooltip");

// Variables globales
let geoData;
let wasteData;

// IMPORTANT: Remplacez cette URL par l'URL de votre fichier CSV hébergé
// Par exemple sur GitHub Gist, GitHub Pages, ou un autre service
const CSV_URL = "VOTRE_URL_CSV_ICI"; // À REMPLACER !

// URL du GeoJSON des départements français
const GEOJSON_URL =
  "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson";

// Chargement des données
Promise.all([d3.csv(CSV_URL), d3.json(GEOJSON_URL)])
  .then(([csvData, jsonData]) => {
    wasteData = csvData;
    geoData = jsonData;
    init();
  })
  .catch((error) => {
    console.error("Erreur de chargement des données:", error);
    // Si le CSV n'est pas disponible, utiliser des données simulées
    console.log("Utilisation de données simulées...");
    wasteData = generateSimulatedData();
    d3.json(GEOJSON_URL).then((jsonData) => {
      geoData = jsonData;
      init();
    });
  });

// Fonction pour générer des données simulées (à supprimer quand vous avez le vrai CSV)
function generateSimulatedData() {
  const data = [];
  const departments = [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "29",
    "2A",
    "2B",
    "30",
    "31",
    "32",
    "33",
    "34",
    "35",
    "36",
    "37",
    "38",
    "39",
    "40",
    "41",
    "42",
    "43",
    "44",
    "45",
    "46",
    "47",
    "48",
    "49",
    "50",
    "51",
    "52",
    "53",
    "54",
    "55",
    "56",
    "57",
    "58",
    "59",
    "60",
    "61",
    "62",
    "63",
    "64",
    "65",
    "66",
    "67",
    "68",
    "69",
    "70",
    "71",
    "72",
    "73",
    "74",
    "75",
    "76",
    "77",
    "78",
    "79",
    "80",
    "81",
    "82",
    "83",
    "84",
    "85",
    "86",
    "87",
    "88",
    "89",
    "90",
    "91",
    "92",
    "93",
    "94",
    "95",
  ];

  years.forEach((year) => {
    departments.forEach((dep) => {
      data.push({
        ANNEE: year.toString(),
        CODE_DEP: dep,
        L_TYP_REG_DECHET: "DEEE",
        TONNAGE_T: (Math.random() * 8000 + 500).toFixed(2),
      });
    });
  });

  return data;
}

// Initialisation
function init() {
  // Filtrer les données DEEE uniquement
  const cleanData = wasteData.filter((d) => d.L_TYP_REG_DECHET === "DEEE");

  // Fusionner les données avec le GeoJSON
  geoData.features.forEach((feature) => {
    const departmentCode = feature.properties.code;

    // Récupérer toutes les années pour ce département avec filter
    const departmentData = cleanData.filter(
      (row) => row.CODE_DEP === departmentCode
    );

    // Créer un objet avec les données par année
    feature.properties.dataByYear = {};
    departmentData.forEach((row) => {
      feature.properties.dataByYear[row.ANNEE] = parseFloat(row.TONNAGE_T);
    });
  });

  // Calculer le domaine de l'échelle de couleurs avec d3.min et d3.max
  updateColorScale(cleanData);

  // Créer la légende
  createLegend();

  // Dessiner la carte initiale pour 2009
  drawMap("2009");

  // Ajouter le listener sur le slider
  d3.select("#slider").on("input", function () {
    const yearIndex = parseInt(this.value);
    const selectedYear = years[yearIndex].toString();
    drawMap(selectedYear);
  });
}

// Mettre à jour l'échelle de couleurs en fonction des données
function updateColorScale(data) {
  const values = data.map((d) => parseFloat(d.TONNAGE_T));
  const minValue = d3.min(values);
  const maxValue = d3.max(values);

  color.domain([minValue, maxValue]);

  d3.select("#legend-min").text(Math.round(minValue));
  d3.select("#legend-max").text(Math.round(maxValue));
}

// Créer la légende avec un dégradé de couleurs
function createLegend() {
  const legendScale = d3.select("#legend-scale");
  const steps = 20;

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const value =
      color.domain()[0] + (color.domain()[1] - color.domain()[0]) * t;

    legendScale
      .append("div")
      .style("flex", "1")
      .style("background-color", color(value));
  }
}

// Fonction pour dessiner la carte pour une année donnée
function drawMap(currentYear) {
  // Mettre à jour l'affichage de l'année sous le slider
  d3.select("#year").html(currentYear);

  // Sélection et binding des données
  const paths = g.selectAll("path").data(geoData.features);

  // Enter + Update avec join
  paths
    .join("path")
    .attr("d", path)
    .attr("class", "department")
    .transition()
    .duration(500)
    .style("fill", (d) => {
      const value = d.properties.dataByYear[currentYear];
      return value ? color(value) : "#ccc";
    });

  // Événements pour le tooltip
  g.selectAll("path")
    .on("mouseover", function (event, d) {
      const value = d.properties.dataByYear[currentYear];
      tooltip.style("opacity", 1).html(`
          <strong>${d.properties.nom}</strong><br/>
          Année: ${currentYear}<br/>
          ${value ? Math.round(value) + " tonnes" : "Pas de données"}
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
    });
}
