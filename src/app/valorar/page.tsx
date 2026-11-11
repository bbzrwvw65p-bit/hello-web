"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton, ChoiceButton } from "@/components/choice";
import { getCatalog, getItem } from "@/lib/catalog";
import { FAMILY_ICON, FAMILY_LABEL, generationEs, modelTitle, ramLabel, storageLabel } from "@/lib/format";
import { DEFECTS, DEFAULT_STATE, nanoAvailable, parseState, stateQuery, type Defect, type Grade, type MachineState } from "@/lib/market";
import type { CatalogItem, FamilyId } from "@/lib/types";

const catalog = getCatalog();

type Step = "form" | "family" | "size" | "generation" | "cpu" | "ram" | "storage" | "estado";

const portableFamilies: FamilyId[] = ["macbook-air", "macbook-pro", "macbook-neo", "macbook"];
const desktopFamilies: FamilyId[] = ["imac", "mac-mini", "mac-studio", "mac-pro"];

const FAMILY_HINT: Partial<Record<FamilyId, string>> = {
  "macbook-air": "Fino, sin ventilador en los modelos con chip de Apple.",
  "macbook-pro": "Con más puertos; desde 2021, HDMI y lector SD.",
  "macbook-neo": "El de 2026 con chip A18 Pro.",
  macbook: "El de 12″ (2015-2017) o el blanco de policarbonato.",
  imac: "Todo en uno, con la pantalla incluida.",
  "mac-mini": "La caja pequeña que se conecta a un monitor.",
  "mac-studio": "Caja más alta que el mini, con chip Max o Ultra.",
  "mac-pro": "Torre o «papelera» de 2013.",
};

const titles: Record<Step, string> = {
  form: "¿Portátil o de escritorio?",
  family: "¿Qué Mac es?",
  size: "¿De qué tamaño es la pantalla?",
  generation: "¿De qué año es?",
  cpu: "¿Qué procesador tiene?",
  ram: "¿Cuánta memoria tiene?",
  storage: "¿Qué disco tiene?",
  estado: "¿En qué estado está?",
};

export default function ValorarPage() {
  const router = useRouter();
  const [history, setHistory] = useState<Step[]>(["form"]);
  const step = history[history.length - 1];
  const [form, setForm] = useState<CatalogItem["formFactor"] | null>(null);
  const [family, setFamily] = useState<FamilyId | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [generation, setGeneration] = useState<string | null>(null);
  const [cpuId, setCpuId] = useState<string | null>(null);
  const [ram, setRam] = useState<number | null>(null);
  const [storageIndex, setStorageIndex] = useState(0);
  const [state, setState] = useState<MachineState>(DEFAULT_STATE);

  // Desde la ficha («Cambiar el estado») o el catálogo: /valorar?id=…&ram=…&si=…&g=…
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const item = params.get("id") ? getItem(params.get("id") as string) : null;
    if (!item) return;
    setForm(item.formFactor);
    setFamily(item.family);
    setSize(item.sizeLabel);
    setGeneration(`${item.year}-${item.generation}`);
    setCpuId(item.id);
    setRam(Number(params.get("ram")) || item.ramGB);
    setStorageIndex(Math.max(0, Math.min(item.storageOptions.length - 1, Number(params.get("si")) || 0)));
    if (params.get("g")) setState(parseState(params));
    const multiSize = new Set(catalog.filter((entry) => entry.family === item.family).map((entry) => entry.sizeLabel)).size > 1;
    setHistory(["form", "family", ...(multiSize ? (["size"] as Step[]) : []), "generation", "estado"]);
  }, []);

  const pool = useMemo(
    () => catalog.filter((item) => (form ? item.formFactor === form : true) && (family ? item.family === family : true)),
    [form, family],
  );

  const sizes = useMemo(() => {
    const values = [...new Set(pool.map((item) => item.sizeLabel))];
    return values.sort((a, b) => parseFloat(a.replace(",", ".")) - parseFloat(b.replace(",", ".")));
  }, [pool]);

  const sized = useMemo(() => (size ? pool.filter((item) => item.sizeLabel === size) : pool), [pool, size]);

  const generations = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    for (const item of sized) {
      const key = `${item.year}-${item.generation}`;
      const current = map.get(key);
      if (!current || item.month > current.month) map.set(key, item);
    }
    return [...map.entries()].sort((a, b) => b[1].year - a[1].year || b[1].month - a[1].month);
  }, [sized]);

  const generated = generation ? sized.filter((item) => `${item.year}-${item.generation}` === generation) : [];
  const chosen = cpuId ? getItem(cpuId) : null;

  function go(next: Step) {
    setHistory((current) => [...current, next]);
  }

  function back() {
    setHistory((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  /** Tras elegir el modelo exacto, salta las preguntas que solo tienen una respuesta. */
  function afterModel(item: CatalogItem) {
    setCpuId(item.id);
    setRam(item.ramGB);
    setStorageIndex(0);
    const next: Step = item.ramOptions.length > 1 ? "ram" : item.storageOptions.length > 1 ? "storage" : "estado";
    go(next);
  }

  function pickFamily(nextFamily: FamilyId, nextForm: CatalogItem["formFactor"]) {
    const next = catalog.filter((item) => item.formFactor === nextForm && item.family === nextFamily);
    const nextSizes = [...new Set(next.map((item) => item.sizeLabel))];
    setFamily(nextFamily);
    setGeneration(null);
    setCpuId(null);
    if (nextSizes.length === 1) {
      setSize(nextSizes[0]);
      go("generation");
    } else {
      setSize(null);
      go("size");
    }
  }

  function pickGeneration(key: string) {
    setGeneration(key);
    const cpus = sized.filter((entry) => `${entry.year}-${entry.generation}` === key);
    if (cpus.length === 1) afterModel(cpus[0]);
    else {
      setCpuId(null);
      go("cpu");
    }
  }

  function submit() {
    if (!chosen) return;
    const portable = chosen.formFactor === "portable";
    const final: MachineState = {
      ...state,
      batteryHealth: portable ? state.batteryHealth : null,
      cycleCount: portable ? state.cycleCount : null,
      keyboard: portable ? state.keyboard : "na",
      nanoTexture: nanoAvailable(chosen) && state.nanoTexture,
      defects: state.defects.filter((defect) => portable || defect !== "teclado"),
    };
    router.push(`/resultado?id=${chosen.id}&ram=${ram ?? chosen.ramGB}&si=${storageIndex}&${stateQuery(final)}`);
  }

  return (
    <main className="screen">
      <h1 className="question">{titles[step]}</h1>
      {history.length > 1 ? <BackButton onClick={back} /> : null}
      {(step === "family" || step === "generation" || step === "cpu") && (
        <p className="note" style={{ marginBottom: 12 }}>
          ¿No lo sabes? En el Mac: menú Apple  › Acerca de este Mac. Ahí salen el nombre, el año, el chip, la memoria y el disco.
        </p>
      )}
      <div className="choices">
        {step === "form" && (
          <>
            <ChoiceButton image="/hello/macbook-pro.png" title="Portátil" onClick={() => { setForm("portable"); setFamily(null); go("family"); }} />
            <ChoiceButton image="/hello/imac.png" title="De escritorio" onClick={() => { setForm("desktop"); setFamily(null); go("family"); }} />
          </>
        )}

        {step === "family" && form &&
          (form === "portable" ? portableFamilies : desktopFamilies).map((id) => (
            <ChoiceButton key={id} image={FAMILY_ICON[id]} title={FAMILY_LABEL[id]} detail={FAMILY_HINT[id]} onClick={() => pickFamily(id, form)} />
          ))}

        {step === "size" &&
          sizes.map((value) => (
            <ChoiceButton
              key={value}
              title={value === "—" ? "Sin pantalla propia" : value}
              onClick={() => {
                setSize(value);
                setGeneration(null);
                setCpuId(null);
                go("generation");
              }}
            />
          ))}

        {step === "generation" &&
          generations.map(([key, item]) => (
            <ChoiceButton
              key={key}
              title={`${generationEs(item.generation)}`}
              detail={item.year >= 2020 && /^M|A1/.test(item.chip) ? `Chip ${item.chip}` : String(item.year)}
              badge={item.availability === "current" ? "A la venta" : item.availability === "preorder" ? "Preventa" : undefined}
              onClick={() => pickGeneration(key)}
            />
          ))}

        {step === "cpu" &&
          generated.map((item) => (
            <ChoiceButton key={item.id} title={item.cpu} detail={item.gpu ?? undefined} onClick={() => afterModel(item)} />
          ))}

        {step === "ram" && chosen &&
          chosen.ramOptions.map((option) => (
            <ChoiceButton
              key={option.gb}
              title={ramLabel(option.gb)}
              detail={option.gb === chosen.ramGB ? "La de serie" : chosen.upgradable ? "Ampliada" : "Configurada al comprarlo"}
              onClick={() => {
                setRam(option.gb);
                if (chosen.storageOptions.length > 1) go("storage");
                else {
                  setStorageIndex(0);
                  go("estado");
                }
              }}
            />
          ))}

        {step === "storage" && chosen &&
          chosen.storageOptions.map((option, index) => (
            <ChoiceButton
              key={`${option.kind}-${option.gb}-${index}`}
              title={storageLabel(option.gb, option.label)}
              image={option.kind === "hdd" ? "/hello/hdd.png" : "/hello/ssd.png"}
              detail={option.kind === "hdd" ? "Disco duro mecánico" : option.kind === "fusion" ? "Fusion Drive" : index === 0 ? "SSD, el de serie" : "SSD"}
              onClick={() => {
                setStorageIndex(index);
                go("estado");
              }}
            />
          ))}

        {step === "estado" && chosen && (
          <>
            <p className="note" style={{ textAlign: "center" }}>
              {modelTitle(chosen)} · {generationEs(chosen.generation)} · {ramLabel(ram ?? chosen.ramGB)} · {storageLabel(chosen.storageOptions[storageIndex]?.gb ?? null, chosen.storageOptions[storageIndex]?.label ?? "")}
            </p>
            <EstadoForm item={chosen} state={state} setState={setState} onSubmit={submit} />
          </>
        )}
      </div>
    </main>
  );
}

const GRADES: { id: Grade; label: string; detail: string }[] = [
  { id: "como-nuevo", label: "Como nuevo", detail: "Sin una marca, ni de cerca." },
  { id: "muy-bueno", label: "Muy bueno", detail: "Microarañazos que solo ves si lo buscas." },
  { id: "bueno", label: "Bueno", detail: "Arañazos o rozaduras a la vista." },
  { id: "aceptable", label: "Aceptable", detail: "Marcas claras, esquinas tocadas." },
];

function EstadoForm({ item, state, setState, onSubmit }: { item: CatalogItem; state: MachineState; setState: (state: MachineState) => void; onSubmit: () => void }) {
  const portable = item.formFactor === "portable";
  const set = (patch: Partial<MachineState>) => setState({ ...state, ...patch });
  const toggle = (defect: Defect) =>
    set({ defects: state.defects.includes(defect) ? state.defects.filter((entry) => entry !== defect) : [...state.defects, defect] });
  const accessory = portable ? "Cargador original" : item.family === "imac" ? "Teclado y ratón o trackpad originales" : null;
  const battery = state.batteryHealth == null ? "nd" : state.batteryHealth >= 90 ? "95" : state.batteryHealth >= 85 ? "87" : state.batteryHealth >= 80 ? "82" : "75";
  const cycles = state.cycleCount == null ? "" : state.cycleCount > 600 ? "800" : state.cycleCount > 300 ? "450" : "200";
  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <fieldset>
        <legend className="legend">Aspecto</legend>
        <div className="split">
          {GRADES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => set({ grade: option.id })}
              className={state.grade === option.id ? "ios-choice compact on" : "ios-choice compact"}
            >
              <span>
                {option.label}
                <small>{option.detail}</small>
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      {portable && (
        <>
          <label className="field-label">
            Salud de la batería (Ajustes del Sistema › Batería)
            <select className="field" value={battery} onChange={(event) => set({ batteryHealth: event.target.value === "nd" ? null : Number(event.target.value) })}>
              <option value="95">90% o más</option>
              <option value="87">85–89%</option>
              <option value="82">80–84%</option>
              <option value="75">Menos del 80% o «Servicio recomendado»</option>
              <option value="nd">No lo sé</option>
            </select>
          </label>
          <label className="field-label">
            Ciclos de carga, si los sabes
            <select className="field" value={cycles} onChange={(event) => set({ cycleCount: event.target.value === "" ? null : Number(event.target.value) })}>
              <option value="">No lo sé</option>
              <option value="200">Menos de 300</option>
              <option value="450">De 300 a 600</option>
              <option value="800">Más de 600</option>
            </select>
          </label>
          <label className="field-label">
            Teclado
            <select className="field" value={state.keyboard === "other" ? "other" : "es"} onChange={(event) => set({ keyboard: event.target.value as "es" | "other" })}>
              <option value="es">Español, con ñ</option>
              <option value="other">Inglés u otro idioma</option>
            </select>
          </label>
        </>
      )}
      <label className="field-label">
        Garantía de Apple o AppleCare+ que le queda
        <select className="field" value={String(state.appleCareMonths >= 12 ? 18 : state.appleCareMonths > 0 ? 6 : 0)} onChange={(event) => set({ appleCareMonths: Number(event.target.value) })}>
          <option value="0">Ninguna</option>
          <option value="6">Menos de un año</option>
          <option value="18">Más de un año</option>
        </select>
      </label>
      {accessory && (
        <label className="check">
          {accessory}
          <input type="checkbox" checked={state.charger} onChange={(event) => set({ charger: event.target.checked })} />
        </label>
      )}
      <label className="check">
        Caja original
        <input type="checkbox" checked={state.boxAndCharger} onChange={(event) => set({ boxAndCharger: event.target.checked })} />
      </label>
      <label className="check">
        Factura de compra
        <input type="checkbox" checked={state.invoice} onChange={(event) => set({ invoice: event.target.checked })} />
      </label>
      {nanoAvailable(item) && (
        <label className="check">
          Vidrio nanotexturizado
          <input type="checkbox" checked={state.nanoTexture} onChange={(event) => set({ nanoTexture: event.target.checked })} />
        </label>
      )}
      <fieldset>
        <legend className="legend">¿Tiene algún problema? Marca los que haya</legend>
        <div className="chip-row" style={{ justifyContent: "flex-start" }}>
          {DEFECTS.filter((option) => portable || !option.portableOnly).map((option) => (
            <button key={option.id} type="button" onClick={() => toggle(option.id)} className={state.defects.includes(option.id) ? "chip on" : "chip"}>
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="note">El color no cuenta: en Apple el mismo Mac reacondicionado vale lo mismo en todos los acabados.</p>
      <button type="submit" className="ios-choice glow">
        Ver la tasación
      </button>
    </form>
  );
}
