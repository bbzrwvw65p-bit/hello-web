"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton, ChoiceButton } from "@/components/choice";
import { getCatalog } from "@/lib/catalog";
import { FAMILY_LABEL, generationEs, ramLabel, storageLabel } from "@/lib/format";
import { nanoAvailable, stateQuery, type Defect, type Grade, type MachineState } from "@/lib/market";
import type { CatalogItem, FamilyId } from "@/lib/types";

const catalog = getCatalog();

type Step = "form" | "family" | "size" | "generation" | "cpu" | "ram" | "storage" | "estado";

const portableFamilies: FamilyId[] = ["macbook-air", "macbook-pro", "macbook-neo", "macbook"];
const desktopFamilies: FamilyId[] = ["imac", "mac-mini", "mac-studio", "mac-pro"];

export default function ValorarPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<CatalogItem["formFactor"] | null>(null);
  const [family, setFamily] = useState<FamilyId | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [generation, setGeneration] = useState<string | null>(null);
  const [cpuId, setCpuId] = useState<string | null>(null);
  const [ram, setRam] = useState<number | null>(null);
  const [storageIndex, setStorageIndex] = useState(0);
  const [grade, setGrade] = useState<Grade>("muy-bueno");
  const [battery, setBattery] = useState("92");
  const [cycles, setCycles] = useState("");
  const [care, setCare] = useState("0");
  const [box, setBox] = useState(true);
  const [keyboard, setKeyboard] = useState<"es" | "other">("es");
  const [nano, setNano] = useState(false);
  const [defects, setDefects] = useState<Defect[]>([]);

  const pool = useMemo(() => {
    return catalog.filter((item) => (form ? item.formFactor === form : true) && (family ? item.family === family : true));
  }, [form, family]);

  const sizes = useMemo(() => {
    const values = [...new Set(pool.map((item) => item.sizeLabel))];
    return values.sort((a, b) => a.localeCompare(b, "es"));
  }, [pool]);

  const sized = size ? pool.filter((item) => item.sizeLabel === size) : pool;

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
  const chosen = generated.find((item) => item.id === cpuId) ?? null;

  function goSize(nextFamily: FamilyId, nextForm: CatalogItem["formFactor"]) {
    const next = catalog.filter((item) => item.formFactor === nextForm && item.family === nextFamily);
    const nextSizes = [...new Set(next.map((item) => item.sizeLabel))];
    setFamily(nextFamily);
    setSize(nextSizes.length === 1 ? nextSizes[0] : null);
    setGeneration(null);
    setCpuId(null);
    setStep(nextSizes.length === 1 ? "generation" : "size");
  }

  const titles: Record<Step, string> = {
    form: "¿Portátil o de escritorio?",
    family: "¿Qué Mac es?",
    size: "¿De qué tamaño?",
    generation: "¿De qué año?",
    cpu: "¿Qué procesador tiene?",
    ram: "¿Cuánta memoria tiene?",
    storage: "¿Qué disco tiene?",
    estado: "¿En qué estado está?",
  };

  const order: Step[] = ["form", "family", "size", "generation", "cpu", "ram", "storage", "estado"];
  function back() {
    const index = order.indexOf(step);
    if (index <= 0) return;
    let previous = order[index - 1];
    if (previous === "size" && sizes.length <= 1) previous = "family";
    setStep(previous);
  }

  const familyIcon: Record<string, string> = {
    "macbook-air": "/hello/macbook-air.png",
    "macbook-pro": "/hello/macbook-pro.png",
    "macbook-neo": "/hello/macbook.png",
    macbook: "/hello/macbook.png",
    imac: "/hello/imac.png",
    "mac-mini": "/hello/mac-mini.png",
    "mac-studio": "/hello/mac-mini.png",
    "mac-pro": "/hello/mac-pro.png",
  };

  return (
    <main className="screen">
      <h1 className="question">{titles[step]}</h1>
      {step !== "form" ? <BackButton onClick={back} /> : null}
      <div className="choices">
        {step === "form" && (
          <>
            <ChoiceButton image="/hello/macbook-pro.png" title="Portátil" onClick={() => { setForm("portable"); setFamily(null); setStep("family"); }} />
            <ChoiceButton image="/hello/imac.png" title="De escritorio" onClick={() => { setForm("desktop"); setFamily(null); setStep("family"); }} />
          </>
        )}

        {step === "family" && form &&
          (form === "portable" ? portableFamilies : desktopFamilies).map((id) => (
            <ChoiceButton key={id} image={familyIcon[id]} title={FAMILY_LABEL[id]} onClick={() => goSize(id, form)} />
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
                setStep("generation");
              }}
            />
          ))}

        {step === "generation" &&
          generations.map(([key, item]) => (
            <ChoiceButton
              key={key}
              title={generationEs(item.generation)}
              detail={String(item.year)}
              badge={item.availability === "current" ? "Actual" : item.availability === "preorder" ? "Preventa" : undefined}
              onClick={() => {
                setGeneration(key);
                const cpus = sized.filter((entry) => `${entry.year}-${entry.generation}` === key);
                if (cpus.length === 1) {
                  setCpuId(cpus[0].id);
                  setRam(cpus[0].ramGB);
                  setStep(cpus[0].ramOptions.length > 1 ? "ram" : "storage");
                } else {
                  setCpuId(null);
                  setStep("cpu");
                }
              }}
            />
          ))}

        {step === "cpu" &&
          generated.map((item) => (
            <ChoiceButton
              key={item.id}
              title={item.cpu}
              detail={item.gpu ?? undefined}
              onClick={() => {
                setCpuId(item.id);
                setRam(item.ramGB);
                setStep("ram");
              }}
            />
          ))}

        {step === "ram" && chosen &&
          chosen.ramOptions.map((option) => (
            <ChoiceButton
              key={option.gb}
              title={ramLabel(option.gb)}
              detail={option.gb === chosen.ramGB ? "La que traía de serie" : "El mercado paga esta ampliación, no el precio de Apple"}
              onClick={() => {
                setRam(option.gb);
                if (chosen.storageOptions.length === 1) {
                  setStorageIndex(0);
                  setStep("estado");
                } else {
                  setStep("storage");
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
              detail={option.kind === "hdd" ? "Disco duro" : option.kind === "fusion" ? "Fusion Drive" : option.gb === chosen.storageGB ? "El de serie" : "Más capacidad"}
              onClick={() => {
                setStorageIndex(index);
                setStep("estado");
              }}
            />
          ))}

        {step === "estado" && chosen && (
          <EstadoForm
            portable={chosen.formFactor === "portable"}
            nanoOk={nanoAvailable(chosen)}
            grade={grade}
            setGrade={setGrade}
            battery={battery}
            setBattery={setBattery}
            cycles={cycles}
            setCycles={setCycles}
            care={care}
            setCare={setCare}
            box={box}
            setBox={setBox}
            keyboard={keyboard}
            setKeyboard={setKeyboard}
            nano={nano}
            setNano={setNano}
            defects={defects}
            toggleDefect={(defect) =>
              setDefects((current) => (current.includes(defect) ? current.filter((item) => item !== defect) : [...current, defect]))
            }
            onSubmit={() => {
              const state: MachineState = {
                grade,
                batteryHealth: chosen.formFactor === "portable" ? Number(battery) : null,
                cycleCount: cycles === "" ? null : Number(cycles),
                appleCareMonths: Number(care),
                boxAndCharger: box,
                keyboard: chosen.formFactor === "portable" ? keyboard : "na",
                nanoTexture: nano,
                defects,
              };
              router.push(`/resultado?id=${chosen.id}&ram=${ram ?? chosen.ramGB}&si=${storageIndex}&${stateQuery(state)}`);
            }}
          />
        )}
      </div>
    </main>
  );
}

function EstadoForm(props: {
  portable: boolean;
  nanoOk: boolean;
  grade: Grade;
  setGrade: (grade: Grade) => void;
  battery: string;
  setBattery: (value: string) => void;
  cycles: string;
  setCycles: (value: string) => void;
  care: string;
  setCare: (value: string) => void;
  box: boolean;
  setBox: (value: boolean) => void;
  keyboard: "es" | "other";
  setKeyboard: (value: "es" | "other") => void;
  nano: boolean;
  setNano: (value: boolean) => void;
  defects: Defect[];
  toggleDefect: (defect: Defect) => void;
  onSubmit: () => void;
}) {
  const grades: { id: Grade; label: string }[] = [
    { id: "como-nuevo", label: "Como nuevo" },
    { id: "muy-bueno", label: "Muy bueno" },
    { id: "bueno", label: "Bueno" },
    { id: "aceptable", label: "Aceptable" },
  ];
  const defectOptions: { id: Defect; label: string }[] = [
    { id: "golpes", label: "Golpes" },
    { id: "pantalla", label: "Pantalla" },
    { id: "teclado", label: "Teclado" },
    { id: "liquido", label: "Líquidos" },
    { id: "placa", label: "Placa" },
  ];
  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      <fieldset>
        <legend className="legend">Estado general</legend>
        <div className="split">
          {grades.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => props.setGrade(option.id)}
              className={props.grade === option.id ? "ios-choice compact on" : "ios-choice compact"}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      {props.portable && (
        <>
          <label className="field-label">
            Salud de la batería
            <select className="field" value={props.battery} onChange={(event) => props.setBattery(event.target.value)}>
              <option value="98">95% o más</option>
              <option value="92">85–94%</option>
              <option value="82">80–84%</option>
              <option value="74">Menos del 80%</option>
            </select>
          </label>
          <label className="field-label">
            Ciclos, si los sabes
            <select className="field" value={props.cycles} onChange={(event) => props.setCycles(event.target.value)}>
              <option value="">No lo sé</option>
              <option value="200">Menos de 300</option>
              <option value="450">300–600</option>
              <option value="800">Más de 600</option>
            </select>
          </label>
          <label className="field-label">
            Teclado
            <select className="field" value={props.keyboard} onChange={(event) => props.setKeyboard(event.target.value as "es" | "other")}>
              <option value="es">Español</option>
              <option value="other">Otro idioma</option>
            </select>
          </label>
        </>
      )}
      <label className="field-label">
        AppleCare
        <select className="field" value={props.care} onChange={(event) => props.setCare(event.target.value)}>
          <option value="0">No</option>
          <option value="6">Queda menos de un año</option>
          <option value="18">Queda más de un año</option>
        </select>
      </label>
      <label className="check">
        Caja y cargador
        <input type="checkbox" checked={props.box} onChange={(event) => props.setBox(event.target.checked)} />
      </label>
      {props.nanoOk && (
        <label className="check">
          Vidrio nanotexturizado
          <input type="checkbox" checked={props.nano} onChange={(event) => props.setNano(event.target.checked)} />
        </label>
      )}
      <fieldset>
        <legend className="legend">Defectos, si los hay</legend>
        <div className="chip-row" style={{ justifyContent: "flex-start" }}>
          {defectOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => props.toggleDefect(option.id)}
              className={props.defects.includes(option.id) ? "chip on" : "chip"}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="note">El color no entra en la cifra: en Apple el mismo Mac reacondicionado vale igual en todos los acabados.</p>
      <button type="submit" className="ios-choice glow">
        Ver la tasación
      </button>
    </form>
  );
}
