"use client";

import { useEffect, useMemo, useState } from "react";
import { AdviceView } from "@/components/advice-view";
import { Explain } from "@/components/ui";
import { advise, DEFAULT_ANSWERS, type Answers, type Mode, type Port, type Source } from "@/lib/advisor";
import { eur } from "@/lib/format";
import type { TermId, Use } from "@/lib/glossary";
import type { Tier } from "@/lib/specs";

type Step =
  | "modo" | "usos" | "basico" | "prog" | "media" | "audio" | "ia" | "juegos" | "fan"
  | "forma" | "movilidad" | "sobremesa" | "pantalla" | "puertos" | "anos" | "presupuesto" | "origen" | "experto" | "result";

type Opt<T> = { value: T; title: string; detail?: string };

const USES_NORMAL: Opt<Use>[] = [
  { value: "basico", title: "Lo básico", detail: "Web, correo, series, estudiar" },
  { value: "oficina", title: "Oficina a tope", detail: "Mil pestañas, Excel pesado, videollamadas" },
  { value: "programar", title: "Programar", detail: "Web, apps, Docker, Xcode" },
  { value: "foto", title: "Foto y vídeo", detail: "Lightroom, Final Cut, DaVinci" },
  { value: "audio", title: "Música y audio", detail: "Pistas, plugins, directo" },
  { value: "ia", title: "IA en local", detail: "Modelos en tu Mac, sin nube" },
  { value: "juegos", title: "Jugar", detail: "Te diré la verdad sobre el Mac" },
  { value: "entusiasta", title: "Me gusta el hardware", detail: "Diseño, potencia, coleccionar" },
];

const USES_NOVATO: Opt<Use>[] = [
  { value: "basico", title: "Internet y series", detail: "Correo, estudiar, redes, Netflix" },
  { value: "oficina", title: "Trabajar con documentos", detail: "Excel, muchas pestañas, videollamadas" },
  { value: "foto", title: "Fotos o vídeos", detail: "Editar lo que grabas" },
  { value: "audio", title: "Hacer música", detail: "Grabar o producir" },
  { value: "programar", title: "Programar", detail: "Crear webs o apps" },
  { value: "ia", title: "IA en mi ordenador", detail: "Sin depender de internet" },
  { value: "juegos", title: "Jugar", detail: "Te diré la verdad" },
  { value: "entusiasta", title: "Me encantan los cacharros", detail: "Quiero algo especial" },
];

const USE_TERM: Partial<Record<Use, TermId>> = { programar: "ram", ia: "ram", foto: "ssd", juegos: "gpu", basico: "ram", oficina: "ram", audio: "ram", entusiasta: "chip" };

function stepsFor(a: Answers): Step[] {
  const steps: Step[] = ["modo"];
  if (a.mode === "experto") {
    steps.push("experto", "usos", "presupuesto", "origen", "result");
    return steps;
  }
  steps.push("usos");
  if (a.uses.includes("basico") || a.uses.includes("oficina")) steps.push("basico");
  if (a.uses.includes("programar")) steps.push("prog");
  if (a.uses.includes("foto")) steps.push("media");
  if (a.uses.includes("audio")) steps.push("audio");
  if (a.uses.includes("ia")) steps.push("ia");
  if (a.uses.includes("juegos")) steps.push("juegos");
  if (a.uses.includes("entusiasta")) steps.push("fan");
  steps.push("forma");
  if (a.form !== "sobremesa") steps.push("movilidad");
  if (a.form === "sobremesa") steps.push("sobremesa");
  if (a.mode === "normal") steps.push("pantalla", "puertos");
  steps.push("anos", "presupuesto", "origen", "result");
  return steps;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

function Single<T extends string | number>({ options, value, onPick }: { options: Opt<T>[]; value?: T; onPick: (value: T) => void }) {
  return (
    <div className="opts one">
      {options.map((option) => (
        <button key={String(option.value)} type="button" className={value === option.value ? "opt on" : "opt"} onClick={() => onPick(option.value)}>
          <span className="top">
            <b>{option.title}</b>
            <span className="mono" aria-hidden>→</span>
          </span>
          {option.detail ? <small>{option.detail}</small> : null}
        </button>
      ))}
    </div>
  );
}

function Multi<T extends string>({ options, values, onToggle, one }: { options: Opt<T>[]; values: T[]; onToggle: (value: T) => void; one?: boolean }) {
  return (
    <div className={one ? "opts one" : "opts"}>
      {options.map((option) => {
        const on = values.includes(option.value);
        return (
          <button key={option.value} type="button" className={on ? "opt on" : "opt"} aria-pressed={on} onClick={() => onToggle(option.value)}>
            <span className="top">
              <b>{option.title}</b>
              <span className="box">{on ? "✓" : ""}</span>
            </span>
            {option.detail ? <small>{option.detail}</small> : null}
          </button>
        );
      })}
    </div>
  );
}

function Chips<T extends string | number | null>({ options, value, onPick }: { options: { value: T; label: string }[]; value: T; onPick: (value: T) => void }) {
  return (
    <div className="chip-row">
      {options.map((option) => (
        <button key={String(option.value)} type="button" className={value === option.value ? "chip mono on" : "chip mono"} onClick={() => onPick(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Next({ onClick, label = "Continuar", hint, disabled }: { onClick: () => void; label?: string; hint?: string; disabled?: boolean }) {
  return (
    <button type="button" className="cta glow" onClick={onClick} disabled={disabled}>
      <span>{label}</span>
      <span className="mono">{hint ?? "→"}</span>
    </button>
  );
}

export default function RecomendarPage() {
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [index, setIndex] = useState(0);
  const [budgetText, setBudgetText] = useState("");

  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("modo");
    if (mode === "novato" || mode === "normal" || mode === "experto") {
      setAnswers((current) => ({ ...current, mode: mode as Mode }));
      setIndex(1);
    }
  }, []);

  const steps = useMemo(() => stepsFor(answers), [answers]);
  const step = steps[Math.min(index, steps.length - 1)];
  const novato = answers.mode === "novato";
  const set = (patch: Partial<Answers>) => setAnswers((current) => ({ ...current, ...patch }));
  const next = () => {
    setIndex((current) => Math.min(current + 1, stepsFor(answers).length - 1));
    window.scrollTo({ top: 0 });
  };
  const pick = (patch: Partial<Answers>) => {
    const merged = { ...answers, ...patch };
    setAnswers(merged);
    setIndex((current) => Math.min(current + 1, stepsFor(merged).length - 1));
    window.scrollTo({ top: 0 });
  };
  const back = () => setIndex((current) => Math.max(0, current - 1));
  const restart = () => {
    setAnswers({ ...DEFAULT_ANSWERS, mode: answers.mode });
    setIndex(1);
    setBudgetText("");
  };

  const result = useMemo(() => (step === "result" ? advise(answers) : null), [step, answers]);
  const total = steps.length - 1;
  const position = Math.min(index, total);
  const sectionName: Record<Step, string> = {
    modo: "Modo", usos: "Uso", basico: "Uso", prog: "Programar", media: "Foto y vídeo", audio: "Audio", ia: "IA local", juegos: "Juegos", fan: "Hardware",
    forma: "Formato", movilidad: "Movilidad", sobremesa: "Sobremesa", pantalla: "Pantalla", puertos: "Puertos", anos: "Años", presupuesto: "Presupuesto", origen: "Origen", experto: "Lo que quieres", result: "Resultado",
  };

  return (
    <main className="screen">
      {step !== "result" ? (
        <>
          <div className="prog" aria-hidden>
            {steps.slice(0, -1).map((entry, i) => (
              <i key={entry + i} className={i < position ? "d" : i === position ? "c" : ""} />
            ))}
          </div>
          <div className="kick">
            {String(position + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} · {sectionName[step]}
          </div>
        </>
      ) : (
        <div className="kick" style={{ marginBottom: 10 }}>
          Resultado · {novato ? "Ni idea, ayúdame" : answers.mode === "experto" ? "Sé lo que quiero" : "Algo sé"}
        </div>
      )}
      {index > 0 && step !== "result" ? (
        <button type="button" className="back-btn" onClick={back} style={{ marginTop: 8 }}>
          ← Atrás
        </button>
      ) : null}

      {step === "modo" && (
        <>
          <h1 className="question">¿Cuánto sabes de Mac?</h1>
          <p className="sub">Elige cómo quieres que te pregunte. Puedes volver atrás cuando quieras.</p>
          <div className="stack tight">
            {([
              ["novato", "01", "Ni idea, ayúdame", "Te pregunto como un amigo. Sin chips ni gigas."],
              ["normal", "02", "Algo sé", "Uso, pantalla, puertos y presupuesto."],
              ["experto", "03", "Sé lo que quiero", "Eliges chip, RAM y SSD. Yo busco el más barato que tenga sentido."],
            ] as const).map(([mode, n, title, detail]) => (
              <button key={mode} type="button" className={mode === "novato" ? "mode glow" : "mode"} onClick={() => pick({ mode })}>
                <span className="n">{n}</span>
                <span>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </span>
                <span className="ar">→</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "usos" && (
        <>
          <h1 className="question">{answers.mode === "experto" ? "¿Para qué lo vas a usar?" : novato ? "¿Qué vas a hacer con él?" : "¿Para qué lo vas a usar?"}</h1>
          <p className="sub">
            {answers.mode === "experto" ? "Opcional: con esto te digo si lo que pides te sobra o se te queda corto." : "Marca todas las que quieras. Lo que más pese, manda."}
          </p>
          <Multi options={novato ? USES_NOVATO : USES_NORMAL} values={answers.uses} onToggle={(value) => set({ uses: toggle(answers.uses, value) })} />
          {answers.uses.length ? (
            <div className="dashed" style={{ marginTop: 12 }}>
              <Explain term={USE_TERM[answers.uses[answers.uses.length - 1]] ?? "ram"} uses={[answers.uses[answers.uses.length - 1]]} open={novato} />
            </div>
          ) : null}
          <Next onClick={next} disabled={!answers.uses.length && answers.mode !== "experto"} label={answers.mode === "experto" && !answers.uses.length ? "Saltar" : "Continuar"} hint={answers.uses.length ? `${answers.uses.length} ${answers.uses.length === 1 ? "MARCADA" : "MARCADAS"} →` : "→"} />
        </>
      )}

      {step === "basico" && (
        <>
          <h1 className="question">¿Cuántas cosas sueles tener abiertas a la vez?</h1>
          <p className="sub">Piensa en la memoria como una mesa de trabajo: cuantas más cosas encima, más grande tiene que ser.</p>
          <Single
            value={answers.load}
            onPick={(load) => pick({ load })}
            options={[
              { value: "poco", title: "Una o dos", detail: "El navegador con pocas pestañas y poco más" },
              { value: "bastante", title: "Varias", detail: "Navegador con pestañas, música, correo, alguna videollamada" },
              { value: "mucho", title: "Muchísimas", detail: "Decenas de pestañas, varias apps pesadas a la vez" },
            ]}
          />
        </>
      )}

      {step === "prog" && (
        <>
          <h1 className="question">¿Qué programas?</h1>
          <Single
            value={answers.progKind}
            onPick={(progKind) => set({ progKind })}
            options={[
              { value: "web", title: "Webs", detail: "Frontend, backend, scripts" },
              { value: "movil", title: "Apps de iPhone o Android", detail: "Xcode, Android Studio, simuladores" },
              { value: "datos", title: "Datos o ciencia", detail: "Python, notebooks, análisis" },
            ]}
          />
          {!novato ? (
            <>
              <p className="legend" style={{ marginTop: 16 }}>¿Usas alguna de estas?</p>
              <Multi
                one
                options={[
                  { value: "docker", title: "Docker o máquinas virtuales", detail: "Reservan memoria fija mientras están encendidos" },
                  { value: "xcode", title: "Xcode", detail: "Ocupa más de 40 GB y le gusta la RAM" },
                ]}
                values={[answers.docker ? "docker" : "", answers.xcode ? "xcode" : ""].filter(Boolean) as ("docker" | "xcode")[]}
                onToggle={(value) => set(value === "docker" ? { docker: !answers.docker } : { xcode: !answers.xcode })}
              />
            </>
          ) : null}
          <Next onClick={next} />
        </>
      )}

      {step === "media" && (
        <>
          <h1 className="question">{novato ? "¿Fotos o vídeos?" : "¿Foto, vídeo o ambos?"}</h1>
          <Chips
            value={answers.mediaKind}
            onPick={(mediaKind) => set({ mediaKind })}
            options={[
              { value: "foto", label: "FOTO" },
              { value: "video", label: "VÍDEO" },
              { value: "ambos", label: "AMBOS" },
            ]}
          />
          {answers.mediaKind !== "foto" ? (
            <>
              <p className="legend" style={{ marginTop: 16 }}>{novato ? "¿Qué tipo de vídeos?" : "¿A qué resolución editas?"}</p>
              <Single
                value={answers.resolution}
                onPick={(resolution) => set({ resolution })}
                options={[
                  { value: "1080", title: novato ? "Vídeos del móvil o para redes" : "1080p", detail: novato ? "Montajes cortos, YouTube casero" : "Redes, YouTube, cursos" },
                  { value: "4k", title: novato ? "Vídeos buenos con cámara" : "4K", detail: novato ? "Bodas, clientes, YouTube serio" : "El estándar profesional de hoy" },
                  { value: "8k", title: novato ? "Cine o publicidad" : "8K o RAW pesado", detail: "Producción profesional" },
                ]}
              />
            </>
          ) : null}
          {!novato ? (
            <>
              <p className="legend" style={{ marginTop: 16 }}>¿Con qué app?</p>
              <Chips
                value={answers.mediaApp}
                onPick={(mediaApp) => set({ mediaApp })}
                options={[
                  { value: "lightroom", label: "LIGHTROOM" },
                  { value: "photoshop", label: "PHOTOSHOP" },
                  { value: "finalcut", label: "FINAL CUT" },
                  { value: "premiere", label: "PREMIERE" },
                  { value: "davinci", label: "DAVINCI" },
                  { value: "otra", label: "OTRA" },
                ]}
              />
            </>
          ) : null}
          <Next onClick={next} />
        </>
      )}

      {step === "audio" && (
        <>
          <h1 className="question">¿Cómo de grandes son tus proyectos?</h1>
          <Single
            value={answers.audioLoad}
            onPick={(audioLoad) => set({ audioLoad })}
            options={[
              { value: "pocas", title: "Pocas pistas", detail: "Grabar voz o guitarra, maquetas" },
              { value: "muchas", title: "Muchas pistas y plugins", detail: "Producción y mezcla completas" },
              { value: "orquesta", title: "Bibliotecas de orquesta", detail: "Kontakt, cuerdas, librerías de muchos GB" },
            ]}
          />
          <p className="legend" style={{ marginTop: 16 }}>¿Lo usarás en directo?</p>
          <Chips value={answers.live ? "si" : "no"} onPick={(value) => set({ live: value === "si" })} options={[{ value: "no", label: "NO" }, { value: "si", label: "SÍ, EN DIRECTO" }]} />
          <Next onClick={next} />
        </>
      )}

      {step === "ia" && (
        <>
          <h1 className="question">{novato ? "¿Qué quieres hacer con IA?" : "¿Qué tamaño de modelo?"}</h1>
          <p className="sub">En IA local el modelo tiene que caber entero en la memoria. Por eso aquí la RAM lo decide casi todo.</p>
          <Single
            value={answers.aiSize}
            onPick={(aiSize) => set({ aiSize })}
            options={
              novato
                ? [
                    { value: 7, title: "Probar un chat en mi ordenador", detail: "Modelos pequeños, para curiosear" },
                    { value: 14, title: "Usarlo en serio para escribir o programar", detail: "Modelos medianos" },
                    { value: 70, title: "Lo más grande posible", detail: "Modelos casi como los de la nube" },
                  ]
                : [
                    { value: 7, title: "7–8B", detail: "Llama 8B, Qwen 7B, Mistral 7B" },
                    { value: 14, title: "14B", detail: "Buen equilibrio para chat y código" },
                    { value: 30, title: "~30B", detail: "Modelos de 27–32B y MoE medianos" },
                    { value: 70, title: "70B", detail: "Lo más serio que corre en local" },
                    { value: 120, title: "100B o más", detail: "MoE grandes, 120B+" },
                  ]
            }
          />
          <p className="legend" style={{ marginTop: 16 }}>¿Para qué?</p>
          <Chips
            value={answers.aiTask}
            onPick={(aiTask) => set({ aiTask })}
            options={[
              { value: "chat", label: "CHAT" },
              { value: "codigo", label: "CÓDIGO" },
              { value: "imagen", label: "IMÁGENES" },
            ]}
          />
          <Next onClick={next} />
        </>
      )}

      {step === "juegos" && (
        <>
          <h1 className="question">¿A qué juegas y cómo?</h1>
          <Single
            value={answers.gameHow}
            onPick={(gameHow) => set({ gameHow })}
            options={[
              { value: "nativo", title: novato ? "Juegos que salen para Mac" : "Juegos nativos de Mac", detail: "Baldur's Gate 3, Cyberpunk, Resident Evil…" },
              { value: "nube", title: "En la nube", detail: "GeForce Now, Xbox Cloud: el juego corre en otro sitio" },
              { value: "windows", title: "Juegos de Windows", detail: "Con CrossOver o similares" },
            ]}
          />
          <p className="legend" style={{ marginTop: 16 }}>¿Cuánto juegas?</p>
          <Chips value={answers.gameLevel} onPick={(gameLevel) => set({ gameLevel })} options={[{ value: "casual", label: "DE VEZ EN CUANDO" }, { value: "serio", label: "EN SERIO" }]} />
          <Next onClick={next} />
        </>
      )}

      {step === "fan" && (
        <>
          <h1 className="question">¿Qué te enamora?</h1>
          <p className="sub">Aquí puedo recomendarte algo por encima de lo que necesitas, pero te lo diré.</p>
          <Multi
            options={[
              { value: "diseno", title: "El diseño", detail: "Colores, el iMac, lo fino" },
              { value: "potencia", title: "La potencia", detail: "Lo más rápido que haya" },
              { value: "coleccion", title: "Coleccionar", detail: "Modelos con historia" },
              { value: "nano", title: "La nanotextura", detail: "Pantalla mate sin reflejos" },
            ]}
            values={answers.fanWhy}
            onToggle={(value) => set({ fanWhy: toggle(answers.fanWhy, value) })}
          />
          {answers.fanWhy.includes("coleccion") ? <p className="note" style={{ marginTop: 10 }}>Para coleccionar, mira el catálogo: los Intel antiguos se compran baratos, pero no son para trabajar a diario.</p> : null}
          <Next onClick={next} />
        </>
      )}

      {step === "forma" && (
        <>
          <h1 className="question">{novato ? "¿Lo quieres para llevar o para dejarlo en una mesa?" : "¿Portátil o sobremesa?"}</h1>
          <Single
            value={answers.form}
            onPick={(form) => pick({ form })}
            options={[
              { value: "portatil", title: "Portátil", detail: "Para llevar de un sitio a otro" },
              { value: "sobremesa", title: "Sobremesa", detail: "Siempre en la misma mesa" },
              { value: "igual", title: "Me da igual", detail: "Lo que salga mejor" },
            ]}
          />
        </>
      )}

      {step === "movilidad" && (
        <>
          <h1 className="question">{novato ? "¿Lo vas a llevar encima?" : "¿Cuánto lo vas a mover?"}</h1>
          <Single
            value={answers.move}
            onPick={(move) => pick({ move })}
            options={[
              { value: "casa", title: "Casi nunca sale de casa", detail: "El peso me da igual" },
              { value: "aveces", title: "A veces", detail: "Viajes, de casa a la oficina" },
              { value: "diario", title: "Todos los días en la mochila", detail: "Que pese poco y aguante la batería" },
            ]}
          />
          <div className="dashed" style={{ marginTop: 12 }}>
            <Explain term="peso" />
            <Explain term="bateria" />
          </div>
        </>
      )}

      {step === "sobremesa" && (
        <>
          <h1 className="question">{novato ? "¿Ya tienes una pantalla?" : "¿Todo en uno o caja con monitor?"}</h1>
          <Single
            value={answers.desktopKind}
            onPick={(desktopKind) => pick({ desktopKind })}
            options={[
              { value: "todo", title: novato ? "No, lo quiero todo junto" : "Todo en uno (iMac)", detail: "Pantalla, altavoces y cámara incluidos" },
              { value: "caja", title: novato ? "Sí, ya tengo pantalla" : "Caja (Mac mini o Studio)", detail: "Lo conectas a tu monitor, teclado y ratón" },
              { value: "igual", title: "Me da igual", detail: "Lo que salga mejor" },
            ]}
          />
        </>
      )}

      {step === "pantalla" && (
        <>
          <h1 className="question">La pantalla</h1>
          <p className="legend">¿Cuántos monitores externos quieres conectar?</p>
          <Chips value={answers.externalDisplays} onPick={(externalDisplays) => set({ externalDisplays })} options={[{ value: 0, label: "NINGUNO" }, { value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3 O MÁS" }]} />
          <div className="opts one" style={{ marginTop: 14 }}>
            <button type="button" className={answers.brightLight ? "opt on" : "opt"} onClick={() => set({ brightLight: !answers.brightLight })}>
              <span className="top"><b>Trabajo con mucha luz</b><span className="box">{answers.brightLight ? "✓" : ""}</span></span>
              <small>Junto a una ventana, en terraza o al sol</small>
            </button>
            {answers.form !== "sobremesa" ? (
              <button type="button" className={answers.want120 ? "opt on" : "opt"} onClick={() => set({ want120: !answers.want120 })}>
                <span className="top"><b>Quiero 120 Hz</b><span className="box">{answers.want120 ? "✓" : ""}</span></span>
                <small>Movimiento más suave al hacer scroll</small>
              </button>
            ) : null}
          </div>
          <div className="dashed" style={{ marginTop: 12 }}>
            <Explain term="externas" />
            <Explain term="brillo" />
            <Explain term="hz120" />
          </div>
          <Next onClick={next} />
        </>
      )}

      {step === "puertos" && (
        <>
          <h1 className="question">¿Necesitas algún puerto?</h1>
          <p className="sub">Si no marcas nada, perfecto: un adaptador de 20–40 € cubre casi todo.</p>
          <Multi<Port>
            options={[
              { value: "hdmi", title: "HDMI", detail: "Tele o proyector sin adaptador" },
              { value: "sd", title: "Lector SD", detail: "Tarjetas de cámara" },
              { value: "magsafe", title: "MagSafe", detail: "Carga magnética" },
              { value: "ethernet", title: "Ethernet", detail: "Cable de red" },
            ]}
            values={answers.ports}
            onToggle={(value) => set({ ports: toggle(answers.ports, value) })}
          />
          <div className="dashed" style={{ marginTop: 12 }}>
            <Explain term="puertos" />
            <Explain term="magsafe" />
          </div>
          <Next onClick={next} hint={answers.ports.length ? `${answers.ports.length} →` : "NADA ESPECIAL →"} />
        </>
      )}

      {step === "anos" && (
        <>
          <h1 className="question">¿Cuántos años quieres que te dure?</h1>
          <Single
            value={answers.keepYears}
            onPick={(keepYears) => pick({ keepYears })}
            options={[
              { value: 3, title: "2 o 3 años", detail: "Lo cambio a menudo" },
              { value: 5, title: "Unos 5 años", detail: "Lo normal" },
              { value: 7, title: "Hasta que muera", detail: "7 años o más" },
            ]}
          />
          <div className="dashed" style={{ marginTop: 12 }}>
            <Explain term="soporte" />
          </div>
        </>
      )}

      {step === "presupuesto" && (
        <>
          <h1 className="question">¿Cuánto quieres gastar como mucho?</h1>
          <div className="split" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            {(novato ? [400, 600, 800, 1000, 1500, 2000] : answers.mode === "experto" ? [1000, 1500, 2500, 4000, 6000, 9000] : [600, 900, 1200, 1600, 2500, 4000]).map((preset) => (
              <button key={preset} type="button" className={answers.budget === preset && !budgetText ? "ios-choice compact on" : "ios-choice compact"} onClick={() => { setBudgetText(""); set({ budget: preset }); }}>
                <span className="mono">{eur(preset)}</span>
              </button>
            ))}
          </div>
          <label className="field-label" htmlFor="budget" style={{ marginTop: 14 }}>
            U otra cifra, en euros
            <input id="budget" className="field mono" inputMode="numeric" placeholder="750" value={budgetText} onChange={(event) => { setBudgetText(event.target.value); const value = Number(event.target.value.replace(/\D/g, "")); if (value >= 100) set({ budget: value }); }} />
          </label>
          {!novato ? (
            <>
              <p className="legend" style={{ marginTop: 14 }}>¿Es un tope fijo?</p>
              <Chips value={answers.flexible ? "flex" : "fijo"} onPick={(value) => set({ flexible: value === "flex" })} options={[{ value: "fijo", label: "FIJO" }, { value: "flex", label: "FLEXIBLE (+15 %)" }]} />
            </>
          ) : null}
          <Next onClick={next} hint={`${eur(answers.budget)} →`} />
        </>
      )}

      {step === "origen" && (
        <>
          <h1 className="question">{novato ? "¿Te importa que sea de segunda mano?" : "¿De dónde lo aceptarías?"}</h1>
          {novato ? (
            <Single
              value={answers.sources.length === 3 ? "todo" : answers.sources.length === 2 ? "reac" : "nuevo"}
              onPick={(value) => pick({ sources: value === "todo" ? ["nuevo", "reacondicionado", "particular"] : value === "reac" ? ["nuevo", "reacondicionado"] : ["nuevo"] })}
              options={[
                { value: "todo", title: "Me da igual, quiero ahorrar", detail: "Nuevo, reacondicionado o de otra persona" },
                { value: "reac", title: "Usado sí, pero con garantía", detail: "Nuevo o reacondicionado" },
                { value: "nuevo", title: "Solo nuevo", detail: "Aunque cueste más" },
              ]}
            />
          ) : (
            <>
              <p className="sub">Marca todas las que te valgan. La segunda mano es donde más se ahorra.</p>
              <Multi<Source>
                one
                options={[
                  { value: "nuevo", title: "Nuevo", detail: "Precio oficial" },
                  { value: "reacondicionado", title: "Reacondicionado", detail: "Revisado y con garantía" },
                  { value: "particular", title: "Usado de particular", detail: "Lo más barato, sin garantía" },
                ]}
                values={answers.sources}
                onToggle={(value) => set({ sources: toggle(answers.sources, value) })}
              />
              <Next onClick={next} label="Ver lo que necesito" disabled={!answers.sources.length} />
            </>
          )}
          <div className="dashed" style={{ marginTop: 12 }}>
            <Explain term="reacondicionado" />
            <Explain term="particular" />
          </div>
        </>
      )}

      {step === "experto" && (
        <>
          <h1 className="question">¿Qué Mac quieres?</h1>
          <p className="sub">Deja en «Igual» lo que no te importe. Busco el más barato con sentido que lo cumpla.</p>
          <div className="stack">
            <div>
              <p className="legend">Chip, generación mínima</p>
              <Chips<number | null> value={answers.expert.gen} onPick={(gen) => set({ expert: { ...answers.expert, gen } })} options={[{ value: null, label: "IGUAL" }, ...[1, 2, 3, 4, 5, 6].map((g) => ({ value: g, label: `M${g}+` }))]} />
            </div>
            <div>
              <p className="legend">Gama</p>
              <Chips<Tier | null> value={answers.expert.tier} onPick={(tier) => set({ expert: { ...answers.expert, tier } })} options={[{ value: null, label: "IGUAL" }, { value: "base", label: "BASE" }, { value: "pro", label: "PRO+" }, { value: "max", label: "MAX+" }, { value: "ultra", label: "ULTRA" }]} />
            </div>
            <div>
              <p className="legend">RAM mínima</p>
              <Chips<number | null> value={answers.expert.ram} onPick={(ram) => set({ expert: { ...answers.expert, ram } })} options={[{ value: null, label: "IGUAL" }, ...[8, 16, 24, 32, 48, 64, 96, 128].map((gb) => ({ value: gb, label: `${gb} GB` }))]} />
            </div>
            <div>
              <p className="legend">SSD mínimo</p>
              <Chips<number | null> value={answers.expert.ssd} onPick={(ssd) => set({ expert: { ...answers.expert, ssd } })} options={[{ value: null, label: "IGUAL" }, { value: 256, label: "256 GB" }, { value: 512, label: "512 GB" }, { value: 1024, label: "1 TB" }, { value: 2048, label: "2 TB" }, { value: 4096, label: "4 TB" }]} />
            </div>
            <div>
              <p className="legend">Pantalla</p>
              <Chips<Answers["expert"]["screen"]> value={answers.expert.screen} onPick={(screen) => set({ expert: { ...answers.expert, screen } })} options={[{ value: null, label: "IGUAL" }, { value: "13", label: "13″" }, { value: "14", label: "14″" }, { value: "15", label: "15″" }, { value: "16", label: "16″" }, { value: "24", label: "IMAC 24″" }, { value: "sin", label: "SIN PANTALLA" }]} />
            </div>
          </div>
          <div className="dashed" style={{ marginTop: 12 }}>
            <Explain term="chip" />
            <Explain term="ram" />
            <Explain term="ssd" />
          </div>
          <Next onClick={next} />
        </>
      )}

      {step === "result" && result ? <AdviceView result={result} answers={answers} onRestart={restart} onBack={back} /> : null}
    </main>
  );
}
