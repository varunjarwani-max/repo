import { ArrowUpRight, CalendarDays, Info, MapPin, Recycle, Trash2 } from 'lucide-react';
import { INDIA_WASTE_REPORT, LANDFILL_PHOTOS, PHOTO_LICENSE_URL } from '../data/indiaWasteData';
import { HONESTY_STRINGS } from '../lib/constants';
import '../india-story.css';

const formatTonnes = (value: number) => new Intl.NumberFormat('en-IN').format(value);

export default function IndiaWasteStory({ visual }: { visual?: import('react').ReactNode }) {
  const report = INDIA_WASTE_REPORT;
  const processingShare = report.processedTonnesPerDay / report.generatedTonnesPerDay * 100;
  const unprocessed = report.generatedTonnesPerDay - report.processedTonnesPerDay;

  return (
    <section className="india-story landing-section" id="india-story" aria-labelledby="india-title">
      <div className="section-heading india-heading arrival">
        <div><span className="landing-kicker">IN FOCUS / INDIA</span><h2 id="india-title">One country.<br /><span>A daily mountain of waste.</span></h2></div>
        <div className="india-report-stamp"><span><CalendarDays size={14} aria-hidden="true" /> REPORTED {report.published.toUpperCase()}</span><p>{report.scope}<br />Published statistics. Not a live counter.</p></div>
      </div>

      <div className="india-context-grid">
      {visual}
      <div className="india-stat-grid arrival">
        <article className="india-stat"><span><Trash2 size={17} aria-hidden="true" /> WASTE GENERATED</span><strong>{formatTonnes(report.generatedTonnesPerDay)}</strong><small>tonnes per day</small><p>Total reported urban municipal waste.</p></article>
        <article className="india-stat india-stat-featured"><span><Recycle size={17} aria-hidden="true" /> WASTE PROCESSED</span><strong>{formatTonnes(report.processedTonnesPerDay)}</strong><small>tonnes per day · {processingShare.toFixed(2)}% of generated waste</small><p>Includes recovery, composting and energy.</p></article>
        <article className="india-stat"><span><Info size={17} aria-hidden="true" /> PROCESSING GAP</span><strong>{formatTonnes(unprocessed)}</strong><small>tonnes per day · calculated difference</small><p>Not a measured amount sent to landfill.</p></article>
      </div>
      </div>

      <div className="india-processing arrival">
        <div className="india-processing-label"><span>Reported processing share</span><strong>{processingShare.toFixed(2)}<small>%</small></strong></div>
        <div className="india-processing-track" role="meter" aria-label="Share of urban municipal waste reported as processed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(processingShare.toFixed(2))} aria-valuetext={`${processingShare.toFixed(2)} percent processed, not a recycling rate`}><span style={{ width: `${processingShare}%` }} /></div>
        <div className="india-processing-legend"><span><i /> Processed · {processingShare.toFixed(2)}%</span><span><i /> Processing gap · {(100 - processingShare).toFixed(2)}%</span></div>
        <div className="india-recycling-note"><Recycle size={20} aria-hidden="true" /><div><h3>How much is actually recycled?</h3><p>{HONESTY_STRINGS.recyclingDataNotice}</p><strong>Recycling-only total: not reported in this source.</strong></div></div>
        <div className="india-source"><p>{HONESTY_STRINGS.indiaDataNotice}</p><a href={report.sourceUrl} target="_blank" rel="noopener noreferrer">Read the government report <ArrowUpRight size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a><span>{report.sourcePublisher} · {report.published}</span></div>
      </div>

      <div className="india-gallery-heading arrival"><div><span className="landing-kicker">ON THE GROUND / DELHI</span><h3>Behind every tonne, <span>a place.</span></h3></div><span className="india-archive-tag"><CalendarDays size={13} aria-hidden="true" /> HISTORICAL PHOTO ARCHIVE</span></div>
      <p className="india-photo-notice"><Info size={14} aria-hidden="true" /> {HONESTY_STRINGS.landfillPhotoNotice}</p>
      <div className="india-photo-grid">{LANDFILL_PHOTOS.map((photo, index) => (
        <figure className="india-photo-card arrival" key={photo.id}>
          <div className="india-photo-frame"><img src={photo.image} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" /><span className="india-photo-number">0{index + 1} / ARCHIVE</span><span className="india-photo-date">PHOTOGRAPHED {photo.captured}</span></div>
          <figcaption><span className="india-photo-location"><MapPin size={13} aria-hidden="true" /> Ghazipur landfill · Delhi, India</span><h4>{photo.title}</h4><p>Photo: <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{photo.photographer}<span className="sr-only"> — photograph source (opens in a new tab)</span></a> · <a href={PHOTO_LICENSE_URL} target="_blank" rel="noopener noreferrer">CC BY-SA 4.0<span className="sr-only"> (opens in a new tab)</span></a><br />Original files unchanged; cropped to fit the display.</p></figcaption>
        </figure>
      ))}</div>
    </section>
  );
}
