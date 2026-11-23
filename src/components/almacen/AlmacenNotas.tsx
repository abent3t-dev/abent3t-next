'use client';

/**
 * Almacén — la hoja "Notas" del Excel, para leer cómo se calculó el corte sin
 * abrirlo. En la hoja, un título sin texto abre una sección y un renglón
 * vacío la cierra (lo que sigue sin título va en una sección aparte).
 */

interface Seccion {
  titulo: string;
  items: [string, string][];
}

function secciones(notas: [string, string][]): Seccion[] {
  const r: Seccion[] = [];
  for (const [titulo, texto] of notas) {
    if (!titulo && !texto) {
      r.push({ titulo: '', items: [] });
      continue;
    }
    if (!texto) {
      r.push({ titulo, items: [] });
      continue;
    }
    if (r.length === 0) r.push({ titulo: '', items: [] });
    r[r.length - 1].items.push([titulo, texto]);
  }
  return r.filter((s) => s.items.length > 0);
}

export default function AlmacenNotas({ notas }: { notas: [string, string][] }) {
  const lista = secciones(notas);
  if (lista.length === 0) return null;
  return (
    <details className="bg-white rounded-lg shadow">
      <summary className="px-4 py-3 cursor-pointer select-none font-semibold text-[#424846] hover:bg-gray-50 rounded-lg">
        Cómo se calculó
        <span className="ml-2 text-sm font-normal text-gray-500">
          (las notas del Excel; las hojas que mencionan vienen en el Excel)
        </span>
      </summary>
      <div className="px-4 pb-5 space-y-6">
        {lista.map((s, i) => (
          <section key={`${s.titulo}-${i}`} className={s.titulo ? undefined : 'border-t border-gray-100 pt-4'}>
            {s.titulo && <h3 className="text-sm font-semibold uppercase tracking-wide text-[#222D59] mb-2">{s.titulo}</h3>}
            <dl className="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-x-6 gap-y-2 text-sm">
              {s.items.map(([titulo, texto], j) => (
                <div key={`${titulo}-${j}`} className="contents">
                  <dt className="font-medium text-[#424846]">{titulo}</dt>
                  <dd className="text-gray-700 mb-2 md:mb-0">{texto}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </details>
  );
}
