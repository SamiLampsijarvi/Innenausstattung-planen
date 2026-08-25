export type FurnitureCatalogItem = { id: string; label: string; group: string; supportsQuantity?: boolean };

export const furnitureCatalog: FurnitureCatalogItem[] = [
  { id: "sofa", label: "Sofa / Couch", group: "Grundmöbel" },
  { id: "coffee-table", label: "Couchtisch", group: "Grundmöbel" },
  { id: "tv-lowboard", label: "TV-Lowboard oder TV-Schrank", group: "Grundmöbel" },
  { id: "rug", label: "Teppich", group: "Grundmöbel" },
  { id: "floor-lamp", label: "Stehlampe", group: "Grundmöbel" },
  { id: "side-table", label: "Beistelltisch", group: "Grundmöbel" },
  { id: "armchair", label: "Sessel", group: "Weitere Sitzplätze" },
  { id: "pouf", label: "Pouf / Hocker", group: "Weitere Sitzplätze" },
  { id: "bench", label: "Kleine Sitzbank", group: "Weitere Sitzplätze" },
  { id: "sideboard", label: "Sideboard", group: "Stauraum" },
  { id: "dresser", label: "Kommode", group: "Stauraum" },
  { id: "shelf", label: "Regal", group: "Stauraum" },
  { id: "bookcase", label: "Bücherregal", group: "Stauraum" },
  { id: "closed-cabinet", label: "Geschlossener Schrank", group: "Stauraum" },
  { id: "large-plant", label: "Große Zimmerpflanze", group: "Pflanzen und Dekoration" },
  { id: "plant-stand", label: "Pflanzenständer", group: "Pflanzen und Dekoration" },
  { id: "wall-mirror", label: "Wandspiegel", group: "Pflanzen und Dekoration" },
  { id: "console", label: "Kleine Dekoablage oder Konsole", group: "Pflanzen und Dekoration" },
  { id: "curtains", label: "Gardinen / Vorhänge", group: "Textilien und Beleuchtung" },
  { id: "cushions", label: "Dekokissen", group: "Textilien und Beleuchtung" },
  { id: "throws", label: "Decken / Plaids", group: "Textilien und Beleuchtung" },
  { id: "table-lamps", label: "Tischlampen", group: "Textilien und Beleuchtung" },
  { id: "dining-table", label: "Esstisch", group: "Wohn- und Essbereich" },
  { id: "dining-chair", label: "Esszimmerstuhl", group: "Wohn- und Essbereich", supportsQuantity: true },
  { id: "pendant-light", label: "Pendelleuchte über dem Esstisch", group: "Wohn- und Essbereich" },
];

export const simulatedFurnitureIds = ["sofa", "coffee-table", "tv-lowboard", "rug", "floor-lamp", "shelf"];
