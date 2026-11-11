export type FormulaId =
  | "macbook-pro"
  | "macbook-air"
  | "macbook-a"
  | "macbook-b"
  | "mac-mini"
  | "imac-21"
  | "imac-27"
  | "identity";

export type FamilyId =
  | "macbook-air"
  | "macbook-pro"
  | "macbook"
  | "macbook-neo"
  | "mac-mini"
  | "imac"
  | "mac-studio"
  | "mac-pro";

export type StorageKind = "ssd" | "hdd" | "fusion";

export type RamOption = { gb: number; priceEUR: number };

export type StorageOption = {
  gb: number | null;
  kind: StorageKind;
  label: string;
  priceEUR: number;
};

export type CatalogItem = {
  id: string;
  family: FamilyId;
  formFactor: "portable" | "desktop";
  name: string;
  sizeLabel: string;
  screenInches: number;
  generation: string;
  year: number;
  month: number;
  cpu: string;
  chip: string;
  gpu: string | null;
  identifier: string | null;
  modelNumber: string | null;
  ramGB: number;
  ramOptions: RamOption[];
  storageKind: StorageKind;
  storageGB: number | null;
  storageLabel: string;
  storageOptions: StorageOption[];
  launchPriceEUR: number | null;
  basePriceEUR: number | null;
  priceBasis: "launch" | "used-snapshot";
  priceConfidence: "alta" | "media" | "dataset";
  priceSource: string;
  extraRamFinal: boolean;
  extraStorageFinal: boolean;
  formula: FormulaId;
  upgradable: boolean;
  ports: "few" | "many";
  usbC: boolean;
  builtInUhd: boolean;
  drivesUhd: boolean;
  weight: "light" | "standard" | "heavy";
  availability: "current" | "preorder" | "discontinued";
  colors: string[];
  capMode: "legacy" | "configured";
};

export type CatalogFile = {
  name: string;
  currency: "EUR";
  region: "ES";
  asOf: string;
  note: string;
  items: CatalogItem[];
};

export type Valuation = {
  low: number;
  high: number;
  point: number;
  floored: boolean;
  factor: number;
  capEUR: number;
  ageYears: number;
};

export type RecommendAnswers = {
  formFactor: "portable" | "desktop";
  mobility: "light" | "power" | "unsure";
  desktopUse: "aio" | "external";
  bigScreen: "yes" | "no" | "unsure";
  uhd: "yes" | "no" | "unsure";
  manyPorts: "yes" | "no";
  usbC: "yes" | "no" | "unsure";
  /** "any": nuevo o reacondicionado, lo que salga mejor. */
  condition: "new" | "used" | "any";
  /** "extreme": vídeo 4K/8K a diario, 3D, IA en local. */
  profile: "personal" | "pro" | "extreme";
  budget: number;
};
