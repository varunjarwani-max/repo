import { Camera } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyScanState({ title, description }: { title: string; description: string }) {
  return <section className="mx-auto my-8 w-full max-w-xl rounded-2xl border border-border bg-surface p-6 text-center">
    <Camera className="mx-auto mb-3 text-accent" size={28} aria-hidden="true" />
    <h1 className="text-xl font-semibold text-text">{title}</h1>
    <p className="mt-2 text-sm text-muted">{description}</p>
    <Link to="/scan" className="eco-button primary mt-5 inline-flex">Open scanner</Link>
  </section>;
}
