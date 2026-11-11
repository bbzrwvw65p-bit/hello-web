import { CHECKLIST } from "@/lib/checklist";

export const metadata = { title: "Comprar usado sin sustos" };

export default function ChecklistPage() {
  return (
    <main className="screen">
      <div className="kick">Lista de comprobación</div>
      <h1 className="question">Comprar un Mac usado sin sustos</h1>
      <p className="sub">Llévala abierta el día que quedes. Si algo de «Bloqueos» falla, no lo compres aunque sea una ganga.</p>
      {CHECKLIST.map((section) => (
        <section key={section.title} style={{ marginTop: 18 }}>
          <div className="between">
            <h2 className="h2" style={{ margin: "6px 0 4px" }}>{section.title}</h2>
            {section.minutes ? <span className="kick">{section.minutes}</span> : null}
          </div>
          <ul className="check-list">
            {section.items.map((item) => (
              <li key={item.text}>
                <div>
                  <b>{item.text}</b>
                  {item.how ? <p>{item.how}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
