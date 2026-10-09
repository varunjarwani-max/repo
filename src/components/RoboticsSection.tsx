import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bot, Camera, Code2, KeyRound, Recycle, ShieldCheck, Terminal } from 'lucide-react';

const stages = [
  { icon: Camera, title: 'Capture a frame', detail: 'Camera above a conveyor', status: 'INPUT' },
  { icon: Code2, title: 'Understand the waste', detail: 'Item labels, categories & boxes', status: 'ECOSCAN API' },
  { icon: Bot, title: 'Guide a sorting system', detail: 'Validated machine decisions', status: 'FUTURE INTEGRATION' },
  { icon: Recycle, title: 'Recover more material', detail: 'Separate for recycling', status: 'INTENDED OUTCOME' },
];

export default function RoboticsSection() {
  return (
    <section id="robotics" className="robotics-section landing-section" aria-labelledby="robotics-title">
      <div className="section-heading arrival">
        <span className="landing-kicker">BUILT FOR BUILDERS / MACHINERY & ROBOTICS</span>
        <h2 id="robotics-title">Beyond the screen.<br /><span>Into the sorting line.</span></h2>
        <p>EcoScan AI is more than a tool for everyday sorting. Our vision is to help future machines and sorting robots identify waste, separate recyclable materials, and keep more recoverable resources out of landfills.</p>
      </div>
      <div className="robotics-pipeline arrival">
        <div className="robotics-diagram-heading"><span><Bot size={17} /> FROM VISION TO RECOVERY</span><span>Conceptual workflow</span></div>
        <ol className="robotics-stages">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return <li key={stage.title}><span className="robotics-stage-number">0{index + 1}</span><Icon className="robotics-stage-icon" size={25} strokeWidth={1.5} aria-hidden="true" /><span className="robotics-stage-status">{stage.status}</span><h3>{stage.title}</h3><p>{stage.detail}</p>{index < stages.length - 1 && <ArrowRight className="robotics-stage-arrow" size={19} aria-hidden="true" />}</li>;
          })}
        </ol>
        <p className="robotics-safety-note"><ShieldCheck size={16} /><span>The API returns structured detections today. Physical sorting requires calibration, safety controls, and human validation; EcoScan has not been tested on robot hardware.</span></p>
      </div>
      <div className="robotics-builder-grid">
        <article className="robotics-builder-card arrival"><KeyRound size={23} strokeWidth={1.5} /><div><span className="landing-kicker">01 / CONNECT YOUR SYSTEM</span><h3>An API key. Your next prototype.</h3><p>API keys give external applications authenticated access to waste classification. Send a photo from your prototype and receive machine-readable results for your own integration.</p><Link to="/developers#api-keys" className="landing-button landing-button-primary">Open API key manager <ArrowUpRight size={16} /></Link></div></article>
        <article className="robotics-builder-card arrival"><Terminal size={23} strokeWidth={1.5} /><div><span className="landing-kicker">02 / TEST BEFORE YOU BUILD</span><h3>See exactly how the API works.</h3><p>Try the playground beside the key manager: upload a photo, execute a request, and inspect the HTTP status, response time, JSON, and detection overlays.</p><Link to="/developers#api-playground" className="landing-button landing-button-ghost">Test the API <ArrowRight size={16} /></Link></div></article>
      </div>
      <p className="impact-disclosure">Landfill diversion is an intended future benefit, not a measured result. API access requires a configured server and key store.</p>
    </section>
  );
}
