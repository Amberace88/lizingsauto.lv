import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="num display text-7xl text-petrol">404</p>
      <h1 className="display-md mt-4 text-3xl">Šī lapa ir aizbraukusi</h1>
      <p className="mt-3 text-ink-2">Iespējams, auto jau ir pārdots vai adrese ir mainījusies.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/katalogs" className="btn btn-primary">Uz katalogu</Link>
        <Link href="/" className="btn btn-ghost">Sākums</Link>
      </div>
    </div>
  );
}
