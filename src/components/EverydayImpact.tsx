import { useId, useState } from 'react';
import { ArrowRight, Battery, Check, Coffee, Home, Leaf, Smartphone, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const scenarios = [
  {
    label: 'In your kitchen', icon: Home, object: 'bottle', objectLabel: 'A bottle with a future',
    eyebrow: 'THE AFTER-DINNER CLEAN-UP', title: 'One less “which bin?” moment.',
    description: 'A bottle, a food wrapper, last night’s leftovers. Point your camera at what’s visible and review suggested materials and handling steps before you sort.',
    steps: ['Photograph the visible items', 'Review material and handling suggestions', 'Check your local collection rules'],
    possibility: 'Cleaner sorting could keep more useful materials in circulation.',
  },
  {
    label: 'After an upgrade', icon: Smartphone, object: 'battery', objectLabel: 'Small object. Handle with care.',
    eyebrow: 'THE DRAWER FULL OF OLD TECH', title: 'An old battery. A better next step.',
    description: 'When clearing out old electronics, a scan can flag possible batteries or other hazardous items for review. Keep them separate and follow verified disposal advice.',
    steps: ['Review possible hazard flags', 'Do not crush, puncture or mix batteries', 'Find a verified local battery collection point'],
    possibility: 'More awareness could reduce unsafe items entering everyday waste.',
  },
  {
    label: 'With your community', icon: Users, object: 'cup', objectLabel: 'Little actions. Shared habits.',
    eyebrow: 'THE NEIGHBOURHOOD CLEAN-UP', title: 'Make better habits contagious.',
    description: 'Use a shared clean-up as a chance to learn about visible materials together. Review the scan, talk through uncertain items, and share the audit as a starting point.',
    steps: ['Scan a visible group of collected items', 'Discuss uncertain materials together', 'Share a session audit, not a certified record'],
    possibility: 'Accessible guidance could make thoughtful sorting a shared habit.',
  },
] as const;

export default function EverydayImpact() {
  const [selected, setSelected] = useState(0);
  const prefix = useId();
  const scenario = scenarios[selected];
  return (
    <section className="everyday-section landing-section" id="everyday" aria-labelledby="everyday-title">
      <div className="section-heading arrival">
        <span className="landing-kicker">02 / MADE FOR YOUR EVERYDAY</span>
        <h2 id="everyday-title">Big change.<br /><span>Ordinary moments.</span></h2>
        <p>Not just for recycling facilities. Imagine a little more clarity in the places life already happens.</p>
      </div>
      <div className="everyday-tabs" role="tablist" aria-label="Explore everyday uses">
        {scenarios.map((item, index) => {
          const Icon = item.icon;
          return <button type="button" role="tab" id={`${prefix}-tab-${index}`} aria-controls={`${prefix}-panel`} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} key={item.label} onClick={() => setSelected(index)} onKeyDown={event => {
            let next: number | undefined;
            if (event.key === 'ArrowRight') next = (index + 1) % scenarios.length;
            if (event.key === 'ArrowLeft') next = (index + scenarios.length - 1) % scenarios.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = scenarios.length - 1;
            if (next !== undefined) { event.preventDefault(); setSelected(next); document.getElementById(`${prefix}-tab-${next}`)?.focus(); }
          }}><Icon size={16} />{item.label}</button>;
        })}
      </div>
      <div className="everyday-panel" id={`${prefix}-panel`} role="tabpanel" aria-labelledby={`${prefix}-tab-${selected}`} tabIndex={0}>
        <div className="object-stage">
          <div className="object-grid" aria-hidden="true" />
          <span className="object-tag">EVERYDAY OBJECT / 0{selected + 1}</span>
          <div className="object-pedestal" aria-hidden="true" />
          <div className={`everyday-object object-${scenario.object}`} key={scenario.object} aria-hidden="true">
            {scenario.object === 'bottle' && <><div className="bottle-cap" /><div className="bottle-neck" /><div className="bottle-body"><div className="bottle-ridges" /><div className="bottle-band"><Leaf size={32} strokeWidth={1.3} /><span>SECOND LIFE</span></div></div></>}
            {scenario.object === 'battery' && <><div className="battery-terminal" /><div className="battery-body"><Battery size={36} strokeWidth={1.2} /><span>HANDLE<br />WITH CARE</span><i>+</i></div></>}
            {scenario.object === 'cup' && <><div className="cup-lid" /><div className="cup-body"><Coffee size={35} strokeWidth={1.2} /><span>RETHINK<br />THE ROUTINE</span></div></>}
          </div>
          <div className="object-scan-corner corner-tl" aria-hidden="true" /><div className="object-scan-corner corner-br" aria-hidden="true" />
          <p>{scenario.objectLabel}<small>CSS illustration · not a scan result</small></p>
        </div>
        <div className="everyday-copy" key={selected}>
          <span className="landing-kicker">{scenario.eyebrow}</span>
          <h3>{scenario.title}</h3>
          <p>{scenario.description}</p>
          <ul>{scenario.steps.map(step => <li key={step}><Check size={15} /><span>{step}</span></li>)}</ul>
          <div className="possibility-note"><Leaf size={16} /><p><strong>The possibility</strong>{scenario.possibility}</p></div>
          <Link to="/scan" className="landing-text-link">Try it with your own photo <ArrowRight size={16} /></Link>
        </div>
      </div>
      <p className="impact-disclosure">Illustrative use cases, not measured outcomes. Material identification can be wrong; always review results and follow local guidance.</p>
    </section>
  );
}
