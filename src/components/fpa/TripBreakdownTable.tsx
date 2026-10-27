'use client';

import {
  TRAVELER_TYPE_LABELS,
  TRIP_TYPE_LABELS,
  type FpaTripBreakdown,
  type FpaTripTravelerCost,
  type Money,
  type TravelerType,
} from '@/types/fpa';
import { NO_DISPONIBLE, formatPesos } from '@/lib/fpa-format';

/**
 * FP&A (B1, reunión del 26-oct, 34:38) — desglose de un viaje: vuelo,
 * hospedaje y alimentos por tipo de viajero, el transporte (una vez por viaje)
 * y el costo de un viaje por los viajes del año. Todos los montos los calcula
 * el API con las tarifas de la versión; aquí solo se enseñan, con la cuenta
 * que los explica.
 */

const people = (count: number, type: TravelerType) =>
  `${count} ${count === 1 ? TRAVELER_TYPE_LABELS[type].one : TRAVELER_TYPE_LABELS[type].many}`;

const units = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Sin centavos si son cero (las tarifas suelen ser enteras); si no, con ellos. */
const pesos = (value: string) => formatPesos(value, !/\.00$/.test(value));

interface Row {
  concept: string;
  who: string | null;
  formula: string;
  amount: string;
}

function travelerRows(b: FpaTripBreakdown, t: FpaTripTravelerCost): Row[] {
  const who = b.travelers.length > 1 ? people(t.count, t.traveler_type) : null;
  return [
    {
      concept: 'Vuelo',
      who,
      formula: `${people(t.count, t.traveler_type)} × ${pesos(t.flight_per_person)}`,
      amount: t.flight,
    },
    {
      concept: 'Hospedaje',
      who,
      formula: `${units(b.nights, 'noche', 'noches')} × ${pesos(t.hotel_per_night)} × ${t.count}`,
      amount: t.hotel,
    },
    {
      concept: 'Alimentos',
      who,
      formula: `${units(b.days, 'día', 'días')} × ${pesos(t.meals_per_day)} × ${t.count}`,
      amount: t.meals,
    },
  ];
}

const TD = 'px-3 py-1.5 align-top';

export default function TripBreakdownTable({
  breakdown,
  totalMxn,
  versionCode,
}: {
  breakdown: FpaTripBreakdown;
  /** Total de la línea en pesos (lo calculó el API). */
  totalMxn: Money;
  versionCode: string;
}) {
  const b = breakdown;
  // Vuelo, hospedaje y alimentos, cada uno con sus tipos de viajero juntos
  const byTraveler = b.travelers.map((t) => travelerRows(b, t));
  const rows: Row[] = [0, 1, 2].flatMap((i) => byTraveler.map((list) => list[i]));
  rows.push({
    concept: 'Transporte',
    who: 'una vez por viaje',
    formula: `${units(b.days, 'día', 'días')} × ${pesos(b.transport.per_day)} (tarifa de ${b.transport.traveler_type})`,
    amount: b.transport.amount,
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-[#424846]">
          Desglose de un viaje · {TRIP_TYPE_LABELS[b.trip_type] ?? b.trip_type} ·{' '}
          {units(b.nights, 'noche', 'noches')} ({units(b.days, 'día', 'días')})
        </h4>
        <p className="text-xs text-gray-500">Tarifas de la versión {versionCode}; las fija planeación</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th scope="col" className="px-3 py-1.5 text-left font-medium">Concepto</th>
              <th scope="col" className="px-3 py-1.5 text-left font-medium">Cuenta</th>
              <th scope="col" className="px-3 py-1.5 text-right font-medium">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={`${r.concept}-${r.who ?? ''}`}>
                <th scope="row" className={`${TD} text-left font-medium text-gray-700 whitespace-nowrap`}>
                  {r.concept}
                  {r.who && <span className="font-normal text-gray-500"> · {r.who}</span>}
                </th>
                <td className={`${TD} text-gray-600`}>{r.formula}</td>
                <td className={`${TD} text-right tabular-nums text-gray-900 whitespace-nowrap`}>{pesos(r.amount)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50">
              <th scope="row" colSpan={2} className={`${TD} text-left font-semibold text-gray-800`}>
                Costo de un viaje
              </th>
              <td className={`${TD} text-right tabular-nums font-semibold text-gray-900 whitespace-nowrap`}>
                {pesos(b.per_trip)}
              </td>
            </tr>
            <tr className="bg-[#f2f8ef]">
              <th scope="row" colSpan={2} className={`${TD} text-left font-semibold text-[#3d8425]`}>
                {b.trips > 0
                  ? `× ${units(b.trips, 'viaje', 'viajes')} en el año`
                  : 'Marca en «Viajes por mes» cuántos viajes hay en cada mes'}
              </th>
              <td className={`${TD} text-right tabular-nums font-bold text-[#222D59] whitespace-nowrap`}>
                {b.trips > 0 ? (totalMxn === null ? NO_DISPONIBLE : pesos(totalMxn)) : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        La renta de vehículo todavía no tiene tarifa y no suma al viaje.
      </p>
    </div>
  );
}
