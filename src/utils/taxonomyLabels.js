const labels = {
  cause: {
    "Design and Construction": {
      it: "Progettazione e costruzione",
    },
    Earthquake: {
      it: "Sisma",
    },
    "Fire and Explosion": {
      it: "Incendio ed esplosione",
    },
    Hydraulic: {
      it: "Idraulica",
    },
    Impact: {
      it: "Impatto",
    },
    Landslide: {
      it: "Frana",
    },
    Material: {
      it: "Materiali",
    },
    Overload: {
      it: "Sovraccarico",
    },
  },
  material: {
    Masonry: {
      it: "Muratura",
    },
    "Prestressed concrete": {
      it: "Calcestruzzo precompresso",
    },
    "Reinforced concrete": {
      it: "Calcestruzzo armato",
    },
    Steel: {
      it: "Acciaio",
    },
    Timber: {
      it: "Legno",
    },
  },
  structuralType: {
    "Arch bridge": {
      it: "Ponte ad arco",
    },
    "Beam bridge": {
      it: "Ponte a travata",
    },
    "Cable-stayed": {
      it: "Ponte strallato",
    },
    Frame: {
      it: "Telaio",
    },
    Overpass: {
      it: "Sovrappasso",
    },
    Suspension: {
      it: "Ponte sospeso",
    },
    Truss: {
      it: "Reticolare",
    },
    Viaduct: {
      it: "Viadotto",
    },
  },
  use: {
    "Cycle-pedestrian": {
      it: "Ciclopedonale",
    },
    Motorway: {
      it: "Autostradale",
    },
    Municipal: {
      it: "Comunale",
    },
    National: {
      it: "Nazionale",
    },
    "Provincial/Regional": {
      it: "Provinciale/Regionale",
    },
    Railway: {
      it: "Ferroviario",
    },
  },
};

export default function taxonomyLabel(
  group,
  value,
  language
) {
  if (!value || language === "en") {
    return value;
  }

  return labels[group]?.[value]?.[language] || value;
}
