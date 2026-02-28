import { useMemo, useState } from 'react';
import { computeLayout, validateLayout } from './engineering';
import type { BeamInputs, LayerInput } from './types';
import './styles.css';

const presets: Record<string, BeamInputs> = {
  '20x50': {
    b: 200,
    h: 500,
    cnom: 30,
    dmax: 19,
    phiSt: 6.3,
    nPernas: 2,
    stirrupType: 'simples',
    topLayers: [{ n: 2, phi: 12.5 }],
    bottomLayers: [{ n: 3, phi: 16 }],
    skinEnabled: false,
    skinBarsPerFace: 0,
    skinPhi: 8,
    autoRedistribute: true
  },
  '25x60': {
    b: 250,
    h: 600,
    cnom: 30,
    dmax: 19,
    phiSt: 8,
    nPernas: 4,
    stirrupType: 'travessas',
    topLayers: [{ n: 3, phi: 16 }],
    bottomLayers: [{ n: 4, phi: 20 }],
    skinEnabled: true,
    skinBarsPerFace: 3,
    skinPhi: 10,
    autoRedistribute: true
  }
};

const layerDefaults = (): LayerInput[] => [{ n: 0, phi: 12.5 }, { n: 0, phi: 12.5 }, { n: 0, phi: 12.5 }, { n: 0, phi: 12.5 }];

const initial: BeamInputs = {
  ...presets['20x50'],
  topLayers: [...presets['20x50'].topLayers, ...layerDefaults().slice(1)],
  bottomLayers: [...presets['20x50'].bottomLayers, ...layerDefaults().slice(1)]
};

function App() {
  const [inputs, setInputs] = useState<BeamInputs>(initial);

  const layout = useMemo(() => computeLayout(inputs), [inputs]);
  const validations = useMemo(() => validateLayout(inputs, layout), [inputs, layout]);

  const targetW = 860;
  const targetH = 520;
  const margin = 28;
  const dimGap = 34;
  const scale = Math.min(
    (targetW - 2 * margin - dimGap) / inputs.b,
    (targetH - 2 * margin - dimGap) / inputs.h
  );
  const drawW = inputs.b * scale;
  const drawH = inputs.h * scale;
  const viewW = margin * 2 + drawW + dimGap + 44;
  const viewH = margin * 2 + drawH + dimGap + 20;
  const sx = (x: number) => margin + x * scale;
  const sy = (y: number) => margin + y * scale;

  const updateNumber = (key: keyof BeamInputs, value: number) => setInputs((prev) => ({ ...prev, [key]: value }));

  const updateLayer = (zone: 'topLayers' | 'bottomLayers', idx: number, key: keyof LayerInput, value: number) => {
    setInputs((prev) => {
      const copy = [...prev[zone]];
      copy[idx] = { ...copy[idx], [key]: value };
      return { ...prev, [zone]: copy };
    });
  };

  const exportJSON = () => {
    const data = {
      inputs,
      coordinates: layout.bars
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'armadura-viga.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPNG = async () => {
    const svg = document.getElementById('beam-svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'secao-viga.png';
      a.click();
      URL.revokeObjectURL(url);
    };
    image.src = url;
  };

  const loadPreset = (name: string) => {
    const preset = presets[name];
    setInputs({
      ...preset,
      topLayers: [...preset.topLayers, ...layerDefaults()].slice(0, 4),
      bottomLayers: [...preset.bottomLayers, ...layerDefaults()].slice(0, 4)
    });
  };

  return (
    <div className="app">
      <h1>Detalhamento preliminar — viga em concreto armado (NBR 6118)</h1>
      <div className="grid">
        <section className="panel">
          <h2>Entradas</h2>
          <label>Preset
            <select onChange={(e) => loadPreset(e.target.value)} defaultValue="20x50">
              {Object.keys(presets).map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <div className="two-col">
            <label>b (mm)<input type="number" value={inputs.b} onChange={(e) => updateNumber('b', Number(e.target.value))} /></label>
            <label>h (mm)<input type="number" value={inputs.h} onChange={(e) => updateNumber('h', Number(e.target.value))} /></label>
            <label>cnom (mm)<input type="number" value={inputs.cnom} onChange={(e) => updateNumber('cnom', Number(e.target.value))} /></label>
            <label>dmax (mm)<input type="number" value={inputs.dmax} onChange={(e) => updateNumber('dmax', Number(e.target.value))} /></label>
            <label>ϕst (mm)<input type="number" value={inputs.phiSt} onChange={(e) => updateNumber('phiSt', Number(e.target.value))} /></label>
            <label>nº pernas
              <select value={inputs.nPernas} onChange={(e) => setInputs((p) => ({ ...p, nPernas: Number(e.target.value) as 2 | 4 | 6 }))}>
                <option value={2}>2</option><option value={4}>4</option><option value={6}>6</option>
              </select>
            </label>
            <label>tipo de estribo
              <select value={inputs.stirrupType} onChange={(e) => setInputs((p) => ({ ...p, stirrupType: e.target.value as BeamInputs['stirrupType'] }))}>
                <option value="simples">simples</option>
                <option value="travessas">com travessas internas</option>
              </select>
            </label>
            <label>Auto redistribuição<input type="checkbox" checked={inputs.autoRedistribute} onChange={(e) => setInputs((p) => ({ ...p, autoRedistribute: e.target.checked }))} /></label>
          </div>

          <h3>Armadura superior</h3>
          {inputs.topLayers.map((layer, idx) => (
            <div className="row" key={`t-${idx}`}>
              <span>Camada {idx + 1}</span>
              <input type="number" value={layer.n} min={0} max={20} onChange={(e) => updateLayer('topLayers', idx, 'n', Number(e.target.value))} />
              <input type="number" value={layer.phi} min={5} onChange={(e) => updateLayer('topLayers', idx, 'phi', Number(e.target.value))} />
            </div>
          ))}

          <h3>Armadura inferior</h3>
          {inputs.bottomLayers.map((layer, idx) => (
            <div className="row" key={`b-${idx}`}>
              <span>Camada {idx + 1}</span>
              <input type="number" value={layer.n} min={0} max={20} onChange={(e) => updateLayer('bottomLayers', idx, 'n', Number(e.target.value))} />
              <input type="number" value={layer.phi} min={5} onChange={(e) => updateLayer('bottomLayers', idx, 'phi', Number(e.target.value))} />
            </div>
          ))}

          <h3>Armadura de pele</h3>
          <label><input type="checkbox" checked={inputs.skinEnabled} onChange={(e) => setInputs((p) => ({ ...p, skinEnabled: e.target.checked }))} /> ativar</label>
          <div className="two-col">
            <label>npele<input type="number" value={inputs.skinBarsPerFace} onChange={(e) => updateNumber('skinBarsPerFace', Number(e.target.value))} /></label>
            <label>ϕpele<input type="number" value={inputs.skinPhi} onChange={(e) => updateNumber('skinPhi', Number(e.target.value))} /></label>
          </div>

          <div className="actions">
            <button onClick={exportPNG}>Exportar imagem PNG</button>
            <button onClick={exportJSON}>Exportar dados JSON</button>
          </div>
        </section>

        <section className="panel">
          <h2>Seção 2D</h2>
          <div className="drawing-wrap">
          <svg id="beam-svg" viewBox={`0 0 ${viewW} ${viewH}`} preserveAspectRatio="xMinYMin meet">
            <rect x={sx(0)} y={sy(0)} width={drawW} height={drawH} className="concrete" />
            <rect x={sx(layout.stirrupInner.x)} y={sy(layout.stirrupInner.y)} width={layout.stirrupInner.w * scale} height={layout.stirrupInner.h * scale} className="stirrup" />
            {layout.innerLegs.map((x, i) => (
              <line key={i} x1={sx(x)} y1={sy(layout.stirrupInner.y)} x2={sx(x)} y2={sy(layout.stirrupInner.y + layout.stirrupInner.h)} className="inner-leg" />
            ))}
            {layout.bars.map((bar, i) => (
              <circle key={i} cx={sx(bar.x)} cy={sy(bar.y)} r={(bar.phi / 2) * scale} className={`bar ${bar.group}`} />
            ))}
            <line x1={sx(0)} y1={sy(inputs.h) + dimGap / 2} x2={sx(inputs.b)} y2={sy(inputs.h) + dimGap / 2} className="dim" />
            <text x={sx(inputs.b / 2)} y={sy(inputs.h) + dimGap} textAnchor="middle">b = {inputs.b} mm</text>
            <line x1={sx(inputs.b) + dimGap / 2} y1={sy(0)} x2={sx(inputs.b) + dimGap / 2} y2={sy(inputs.h)} className="dim" />
            <text x={sx(inputs.b) + dimGap / 2 + 8} y={sy(inputs.h / 2)}>{`h = ${inputs.h} mm`}</text>
          </svg>
          </div>

          <h3>Legenda</h3>
          <ul>
            <li>Estribo: ϕ {inputs.phiSt} mm, {inputs.nPernas} pernas ({inputs.stirrupType})</li>
            <li>Topo: {inputs.topLayers.filter((l) => l.n > 0).map((l) => `${l.n}Ø${l.phi}`).join(' + ') || '—'}</li>
            <li>Fundo: {inputs.bottomLayers.filter((l) => l.n > 0).map((l) => `${l.n}Ø${l.phi}`).join(' + ') || '—'}</li>
            <li>Pele: {inputs.skinEnabled ? `${inputs.skinBarsPerFace}Ø${inputs.skinPhi}/face` : 'desativada'}</li>
          </ul>

          <h3>Painel de validação</h3>
          <ul>
            {validations.map((v) => (
              <li key={v.key} className={`status ${v.status}`}>{v.status.toUpperCase()}: {v.message}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default App;
