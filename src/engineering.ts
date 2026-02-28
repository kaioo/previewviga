import type { BeamInputs, BarPoint, Layout, ValidationMessage } from './types';

const minClear = (phi: number, dmax: number) => Math.max(20, phi, 1.2 * dmax);

const clampCompartments = (x: number, left: number, right: number) => Math.min(Math.max(x, left), right);

function buildLegs(innerX: number, innerW: number, nPernas: BeamInputs['nPernas']): number[] {
  if (nPernas === 2) return [innerX, innerX + innerW];
  if (nPernas === 4) return [innerX, innerX + innerW / 2, innerX + innerW];
  return [innerX, innerX + innerW / 3, innerX + (2 * innerW) / 3, innerX + innerW];
}

function placeLayerBars(
  nBars: number,
  phi: number,
  y: number,
  compartmentBounds: Array<{ left: number; right: number }>,
  dmax: number,
  layer: number,
  group: 'top' | 'bottom'
): { bars: BarPoint[]; error?: string } {
  if (nBars === 0) return { bars: [] };
  const clear = minClear(phi, dmax);
  const bars: BarPoint[] = [];
  let remaining = nBars;

  for (let ci = 0; ci < compartmentBounds.length && remaining > 0; ci += 1) {
    const c = compartmentBounds[ci];
    const usable = c.right - c.left - phi;
    if (usable < 0) continue;
    const capacity = Math.floor(usable / (phi + clear)) + 1;
    const assign = Math.min(remaining, Math.max(0, capacity));
    if (assign === 0) continue;

    const neededWidth = assign * phi + (assign - 1) * clear;
    const start = c.left + phi / 2 + Math.max(0, (c.right - c.left - neededWidth) / 2);

    for (let i = 0; i < assign; i += 1) {
      bars.push({ x: start + i * (phi + clear), y, phi, group, layer });
    }
    remaining -= assign;
  }

  if (remaining > 0) {
    return {
      bars,
      error: `Excesso de barras na camada ${layer + 1} (${group === 'top' ? 'superior' : 'inferior'}).`
    };
  }

  return { bars };
}

function normalizeLayers(layers: BeamInputs['topLayers']): BeamInputs['topLayers'] {
  return layers.filter((l) => l.n > 0 && l.phi > 0);
}

export function computeLayout(inputs: BeamInputs): Layout {
  const suggestions: string[] = [];
  const notes: string[] = [];
  const bars: BarPoint[] = [];

  const innerX = inputs.cnom + inputs.phiSt / 2;
  const innerY = inputs.cnom + inputs.phiSt / 2;
  const innerW = inputs.b - 2 * (inputs.cnom + inputs.phiSt / 2);
  const innerH = inputs.h - 2 * (inputs.cnom + inputs.phiSt / 2);

  const legXs = buildLegs(innerX, innerW, inputs.nPernas);
  const innerLegs = legXs.slice(1, -1);

  const compartments = legXs.slice(0, -1).map((x, i) => ({
    left: x + (i > 0 ? inputs.phiSt / 2 : 0),
    right: legXs[i + 1] - (i < legXs.length - 2 ? inputs.phiSt / 2 : 0)
  }));

  const topLayers = normalizeLayers(inputs.topLayers);
  const bottomLayers = normalizeLayers(inputs.bottomLayers);

  const autoPack = (layers: BeamInputs['topLayers']) => {
    if (!inputs.autoRedistribute) return layers;
    if (layers.length > 1) return layers;
    const [first] = layers;
    if (!first || first.n <= 2) return layers;
    const firstHalf = Math.ceil(first.n / 2);
    return [
      { ...first, n: firstHalf },
      { ...first, n: first.n - firstHalf }
    ];
  };

  const processZone = (zoneLayers: BeamInputs['topLayers'], zone: 'top' | 'bottom') => {
    const arranged = autoPack(zoneLayers).slice(0, 4);
    if (arranged.length !== zoneLayers.length) {
      suggestions.push(`Redistribuição automática aplicada na zona ${zone === 'top' ? 'superior' : 'inferior'}.`);
    }

    let prevY: number | null = null;
    let prevPhi = 0;
    arranged.forEach((layer, idx) => {
      const clearV = minClear(Math.max(layer.phi, prevPhi), inputs.dmax);
      const baseOffset = inputs.cnom + inputs.phiSt + layer.phi / 2;
      const y =
        zone === 'top'
          ? prevY === null
            ? baseOffset
            : prevY + prevPhi / 2 + clearV + layer.phi / 2
          : prevY === null
            ? inputs.h - baseOffset
            : prevY - (prevPhi / 2 + clearV + layer.phi / 2);

      const preparedCompartments = compartments.map((c, ci) => {
        const leftLeg = ci === 0 ? c.left : c.left + inputs.phiSt / 2 + minClear(layer.phi, inputs.dmax);
        const rightLeg = ci === compartments.length - 1 ? c.right : c.right - (inputs.phiSt / 2 + minClear(layer.phi, inputs.dmax));
        return { left: clampCompartments(leftLeg, c.left, c.right), right: clampCompartments(rightLeg, c.left, c.right) };
      });

      const { bars: layerBars, error } = placeLayerBars(layer.n, layer.phi, y, preparedCompartments, inputs.dmax, idx, zone);
      bars.push(...layerBars);
      if (error) notes.push(error);

      prevY = y;
      prevPhi = layer.phi;
    });
  };

  processZone(topLayers, 'top');
  processZone(bottomLayers, 'bottom');

  if (inputs.skinEnabled && inputs.skinBarsPerFace > 0 && inputs.skinPhi > 0) {
    const clear = minClear(inputs.skinPhi, inputs.dmax);
    const xLeft = inputs.cnom + inputs.phiSt + inputs.skinPhi / 2;
    const xRight = inputs.b - xLeft;
    const yTop = inputs.cnom + inputs.phiSt + inputs.skinPhi / 2;
    const yBottom = inputs.h - yTop;
    const span = yBottom - yTop - inputs.skinPhi;
    const req = inputs.skinBarsPerFace * inputs.skinPhi + (inputs.skinBarsPerFace - 1) * clear;
    if (req > span + inputs.skinPhi) {
      notes.push('Armadura de pele não atende espaçamento vertical mínimo.');
    }
    const step = inputs.skinBarsPerFace > 1 ? Math.max(clear + inputs.skinPhi, span / (inputs.skinBarsPerFace - 1)) : 0;
    for (let i = 0; i < inputs.skinBarsPerFace; i += 1) {
      const y = yTop + i * step;
      bars.push({ x: xLeft, y, phi: inputs.skinPhi, group: 'skin-left', layer: i });
      bars.push({ x: xRight, y, phi: inputs.skinPhi, group: 'skin-right', layer: i });
    }
  }

  if (notes.some((n) => n.includes('Excesso'))) {
    suggestions.push('Considere aumentar b, reduzir bitola ou distribuir em mais camadas.');
  }

  return {
    stirrupInner: { x: innerX, y: innerY, w: innerW, h: innerH },
    innerLegs,
    bars,
    suggestions,
    notes
  };
}

export function validateLayout(inputs: BeamInputs, layout: Layout): ValidationMessage[] {
  const out: ValidationMessage[] = [];
  const stirrup = layout.stirrupInner;

  const coverOk = stirrup.x >= inputs.cnom && stirrup.y >= inputs.cnom;
  out.push({ key: 'cover', status: coverOk ? 'ok' : 'error', message: coverOk ? 'Cobrimento OK.' : 'Violação de cobrimento nominal.' });

  let spacingOk = true;
  for (let i = 0; i < layout.bars.length; i += 1) {
    for (let j = i + 1; j < layout.bars.length; j += 1) {
      const a = layout.bars[i];
      const b = layout.bars[j];
      const dx = Math.abs(a.x - b.x) - (a.phi + b.phi) / 2;
      const dy = Math.abs(a.y - b.y) - (a.phi + b.phi) / 2;
      const needed = minClear(Math.max(a.phi, b.phi), inputs.dmax);
      if ((Math.abs(a.y - b.y) < 1e-3 && dx < needed - 1e-6) || (Math.abs(a.x - b.x) < 1e-3 && dy < needed - 1e-6)) {
        spacingOk = false;
      }
    }
  }
  out.push({ key: 'spacing', status: spacingOk ? 'ok' : 'error', message: spacingOk ? 'Espaçamentos mínimos atendidos.' : 'Espaçamento livre insuficiente entre barras/camadas.' });

  const interference = layout.bars.some((bar) => {
    if (bar.x - bar.phi / 2 < stirrup.x || bar.x + bar.phi / 2 > stirrup.x + stirrup.w) return true;
    if (bar.y - bar.phi / 2 < stirrup.y || bar.y + bar.phi / 2 > stirrup.y + stirrup.h) return true;

    return layout.innerLegs.some((leg) => {
      const clear = Math.abs(bar.x - leg) - bar.phi / 2 - inputs.phiSt / 2;
      return clear < minClear(bar.phi, inputs.dmax);
    });
  });

  out.push({
    key: 'stirrups',
    status: interference ? 'error' : 'ok',
    message: interference ? 'Interferência com ramos do estribo detectada.' : 'Sem interferência com estribos.'
  });

  const skinWarn = inputs.skinEnabled && !layout.bars.some((b) => b.group.startsWith('skin'));
  out.push({
    key: 'skin',
    status: skinWarn ? 'warning' : 'ok',
    message: skinWarn ? 'Armadura de pele ativada, porém não foi posicionada.' : 'Armadura de pele consistente.'
  });

  layout.notes.forEach((note, index) => {
    out.push({ key: `note-${index}`, status: 'error', message: note });
  });

  layout.suggestions.forEach((s, index) => {
    out.push({ key: `sug-${index}`, status: 'warning', message: s });
  });

  return out;
}
