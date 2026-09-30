import { NextResponse } from 'next/server';

// Laikapstākļi Rīgā (Open-Meteo, bez atslēgas). Kešots 15 min, lai nepārslogotu ne API, ne hostingu.
export const revalidate = 900;
export const dynamic = 'force-static';

export async function GET() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=56.95&longitude=24.11&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FRiga&forecast_days=1';
    const r = await fetch(url, { next: { revalidate: 900 } });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    return NextResponse.json(
      {
        t: Math.round(j.current.temperature_2m),
        feels: Math.round(j.current.apparent_temperature),
        code: j.current.weather_code,
        wind: Math.round(j.current.wind_speed_10m / 3.6),
        day: j.current.is_day === 1,
        max: Math.round(j.daily.temperature_2m_max[0]),
        min: Math.round(j.daily.temperature_2m_min[0]),
      },
      { headers: { 'cache-control': 'public, s-maxage=900, stale-while-revalidate=1800', 'netlify-cdn-cache-control': 'public, s-maxage=900, stale-while-revalidate=1800' } },
    );
  } catch {
    return NextResponse.json({ error: 'nav datu' }, { status: 503 });
  }
}
