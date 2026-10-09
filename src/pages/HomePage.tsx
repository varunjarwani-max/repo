import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, Camera, Check, Globe2, Leaf, Recycle, ScanLine, ShieldCheck, Sparkles } from 'lucide-react';
import WorldGlobe from '../components/WorldGlobe';
import ScanPreview from '../components/ScanPreview';
import EverydayImpact from '../components/EverydayImpact';
import IndiaWasteStory from '../components/IndiaWasteStory';
import '../landing.css';

const workflow = [
  { icon: Camera, title: 'See it.', description: 'Capture a camera frame or upload a photo of the waste in front of you.' },
  { icon: ScanLine, title: 'Understand it.', description: 'Review suggested materials, possible hazards and handling guidance.' },
  { icon: Recycle, title: 'Rethink it.', description: 'Use local rules to decide what to reuse, recycle or keep safely separate.' },
];

export default function HomePage() {
  const [paused, setPaused] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.setAttribute('data-in-view', 'true'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    pageRef.current?.querySelectorAll('.arrival').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`landing-page ${paused ? 'motion-paused' : ''}`} ref={pageRef}>
      <section className="landing-hero" aria-labelledby="home-title">
        <div className="landing-hero-copy">
          <div className="landing-hero-badge"><span /><span>ENVIRONMENTAL HACKS 2026 / WASTE INTELLIGENCE</span></div>
          <h1 id="home-title">See waste.<br /><span>Discover</span><br />potential<span className="hero-period">.</span></h1>
          <p>One photo. A clearer sorting decision. Identify visible materials, flag potential hazards, and turn mixed waste into an actionable plan.</p>
          <div className="landing-actions">
            <Link to="/scan" className="landing-button landing-button-primary">Start scanning <ArrowUpRight size={18} /></Link>
            <a href="#india-story" className="landing-button landing-button-ghost">Explore India&apos;s waste <ArrowDown size={15} /></a>
          </div>
          <div className="landing-hero-note"><Check size={14} /><span>No account needed</span><span className="note-separator">/</span><span>A frame, not a continuous feed</span></div>
        </div>
        <ScanPreview />
        <div className="landing-hero-bottom"><span><Globe2 size={13} /> BUILT FOR A MORE CIRCULAR WORLD</span><a href="#how-it-works">SCROLL TO DISCOVER <ArrowDown size={13} /></a></div>
      </section>

      <div className="landing-marquee" aria-hidden="true"><div>{[0, 1].map(copy => <span key={copy}><Recycle size={20} /> LESS GUESSWORK <i /> BETTER HABITS <i /> MORE SECOND LIVES <i /> ONE SHARED PLANET <i /></span>)}</div></div>

      <IndiaWasteStory visual={<WorldGlobe paused={paused} onToggleMotion={() => setPaused(value => !value)} />} />

      <section className="workflow-section landing-section" id="how-it-works" aria-labelledby="workflow-title">
        <div className="section-heading workflow-heading arrival"><div><span className="landing-kicker">01 / FROM CAMERA TO CLARITY</span><h2 id="workflow-title">See beyond <span>the bin.</span></h2></div><p>You don&apos;t need to be an expert.<br />Just curious about what comes next.</p></div>
        <div className="workflow-grid">{workflow.map((step, index) => {
          const Icon = step.icon;
          return <article className="workflow-card arrival" key={step.title} style={{ animationDelay: `${index * 90}ms` }}><div className="workflow-card-top"><Icon size={24} strokeWidth={1.3} /><span>0{index + 1}</span></div><h3>{step.title}</h3><p>{step.description}</p><div className="workflow-line" /></article>;
        })}</div>
        <p className="workflow-footnote"><Sparkles size={14} /> Powered by Gemini image understanding when the server API key is configured. The scanner clearly reports unavailable analysis.</p>
      </section>

      <EverydayImpact />

      <section className="potential-section landing-section" aria-labelledby="potential-title">
        <div className="section-heading arrival"><span className="landing-kicker">03 / THE RIPPLE EFFECT</span><h2 id="potential-title">Better choices here.<br /><span>Possibilities everywhere.</span></h2><p>If everyday guidance became more accessible, small actions could add up. Here&apos;s the future we&apos;re working towards.</p></div>
        <div className="potential-grid">
          <article className="potential-card arrival"><Recycle size={25} strokeWidth={1.3} /><span>01 / MATERIALS</span><h3>More second lives.</h3><p>Better separation could reduce contamination and help recyclable materials stay useful.</p><div className="potential-art circulation-art" aria-hidden="true"><i /><i /><i /><Recycle size={35} strokeWidth={1} /></div></article>
          <article className="potential-card arrival"><ShieldCheck size={25} strokeWidth={1.3} /><span>02 / PEOPLE</span><h3>More mindful handling.</h3><p>Visible hazard flags could help people pause before mixing batteries and other risky items into normal waste.</p><div className="potential-art safety-art" aria-hidden="true"><i /><i /><ShieldCheck size={52} strokeWidth={1} /></div></article>
          <article className="potential-card arrival"><Leaf size={25} strokeWidth={1.3} /><span>03 / EVERYDAY LIFE</span><h3>Less second-guessing.</h3><p>A little understanding could turn a confusing daily chore into a more thoughtful routine.</p><div className="potential-art habit-art" aria-hidden="true"><i /><i /><i /><Leaf size={35} strokeWidth={1} /></div></article>
        </div>
        <p className="impact-disclosure">Potential benefits, not verified product impact. No carbon savings, recovery rates or user totals are claimed.</p>
      </section>

      <section className="landing-cta landing-section arrival" aria-labelledby="cta-title"><span className="landing-kicker">YOUR NEXT SMALL STEP</span><h2 id="cta-title">A better tomorrow.<br /><span>Start with what&apos;s in front of you.</span></h2><p>Your camera. A little curiosity. A different way to see waste.</p><Link to="/scan" className="landing-button landing-button-primary">Make your first scan <ArrowRight size={18} /></Link><Link to="/about" className="landing-text-link">Understand the limits <ArrowUpRight size={14} /></Link><div className="cta-orbit" aria-hidden="true" /></section>

      <footer className="landing-footer"><Link to="/" className="landing-footer-brand"><Leaf size={17} /> EcoScan AI</Link><span>SMALL ACTIONS. SHARED POSSIBILITIES.</span><Link to="/about">What&apos;s real? <ArrowUpRight size={13} /></Link></footer>
    </div>
  );
}
