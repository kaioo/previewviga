export type LayerInput = {
  n: number;
  phi: number;
};

export type BeamInputs = {
  b: number;
  h: number;
  cnom: number;
  dmax: number;
  phiSt: number;
  nPernas: 2 | 4 | 6;
  stirrupType: 'simples' | 'travessas';
  topLayers: LayerInput[];
  bottomLayers: LayerInput[];
  skinEnabled: boolean;
  skinBarsPerFace: number;
  skinPhi: number;
  autoRedistribute: boolean;
};

export type BarPoint = {
  x: number;
  y: number;
  phi: number;
  group: 'top' | 'bottom' | 'skin-left' | 'skin-right';
  layer: number;
};

export type Layout = {
  stirrupInner: { x: number; y: number; w: number; h: number };
  innerLegs: number[];
  bars: BarPoint[];
  suggestions: string[];
  notes: string[];
};

export type ValidationMessage = {
  key: string;
  status: 'ok' | 'error' | 'warning';
  message: string;
};
