import Image from 'next/image';
import Link from 'next/link';
import { withBasePath } from '@/lib/base-path';
import { ArrowRight, ArrowUpRight, BookOpen, Download } from 'lucide-react';

const hierarchy = [
  ['01', 'Single vs dual', 'Primary routing'],
  ['02', '10 classes', 'Single localization'],
  ['03', '6 pairs', 'Dual localization'],
  ['04', 'Membrane type', 'Single- or multi-pass'],
];

export default function Home() {
  return (
    <div className="pb-16 pt-6 sm:pt-10">
      <section className="relative min-h-[650px] overflow-hidden border border-[#d8e0e6] bg-[#f7f8f9]" aria-labelledby="hero-title">
        <div className="relative z-10 flex min-h-[650px] w-full flex-col justify-center bg-gradient-to-r from-[#f7f8f9] via-[#f7f8f9]/95 to-[#f7f8f9]/35 px-7 py-14 sm:px-12 lg:w-[58%] lg:px-14">
          <p className="mb-6 text-xs font-bold uppercase tracking-[0.16em] text-[#466b86]">Rice protein localization</p>
          <h1 id="hero-title" className="max-w-xl font-sans text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-[#1e2a33] sm:text-6xl">
            Predict subcellular localization of rice proteins.
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-[#5d665f]">
            RSLpred-2.0 uses rice-specific deep-learning models to predict protein subcellular localization through a four-level classification system.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/prediction" className="inline-flex items-center gap-2 bg-[#234b6b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#18384f]">
              Run prediction <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/download" className="inline-flex items-center gap-2 border border-[#bac6cf] bg-white px-5 py-3 text-sm font-bold text-[#27342b] transition hover:border-[#234b6b]">
              <Download className="h-4 w-4" /> Download
            </Link>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0">
          <Image
            src={withBasePath('/assets/images/rslpred2_hero.png')}
            alt="Scientific montage of a rice plant, plant cell organelles, a membrane, and a protein structure"
            fill
            priority
            sizes="(min-width: 1280px) 1216px, 100vw"
            className="object-contain object-right-bottom"
          />
        </div>
      </section>

      <section className="border-x border-b border-[#d8e0e6] bg-[#f1f3ef]" aria-label="Model summary">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {[
            ['8,000', 'TPC features'],
            ['4', 'prediction levels'],
            ['10', 'single classes'],
            ['6', 'dual pairs'],
          ].map(([value, label]) => (
            <div key={label} className="border-b border-r border-[#d8e0e6] px-6 py-5 last:border-r-0 lg:border-b-0">
              <dt className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#6b756d]">{label}</dt>
              <dd className="mt-1 font-sans text-3xl font-semibold text-[#1e2b22]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-12 border-b border-[#cfd5cf] py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20" aria-labelledby="hierarchy-title">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#466b86]">Prediction architecture</p>
          <h2 id="hierarchy-title" className="mt-4 max-w-md font-sans text-4xl font-semibold leading-tight tracking-[-0.03em] text-[#1e2a33] sm:text-5xl">Four-level localization framework</h2>
          <p className="mt-5 max-w-md text-sm leading-6 text-[#657068]">The model narrows each sequence from broad localization behavior to the relevant cellular compartment or membrane topology.</p>
        </div>

        <ol className="border-t border-[#b9c5ce]">
          {hierarchy.map(([level, label, detail]) => (
            <li key={level} className="grid grid-cols-[54px_1fr] gap-3 border-b border-[#b9c5ce] py-5 sm:grid-cols-[64px_1fr_180px] sm:items-center">
              <span className="font-mono text-xs font-bold text-[#466b86]">{level}</span>
              <h3 className="text-base font-bold text-[#263642]">{label}</h3>
              <p className="col-start-2 text-sm text-[#6b7882] sm:col-start-auto">{detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="py-20" aria-labelledby="workflow-title">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#466b86]">Method overview</p>
            <h2 id="workflow-title" className="mt-3 font-sans text-4xl font-semibold tracking-[-0.03em] text-[#1e2a33]">RSLpred2 prediction workflow</h2>
          </div>
          <Link href="/help" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#315e7d] hover:underline">Read the guide <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <figure className="border border-[#d3dce3] bg-white p-3 sm:p-5">
          <Image
            src={withBasePath('/assets/images/rslpred2_workflow_acd.png')}
            alt="RSLpred-2.0 workflow from rice protein sequence through tripeptide composition, convolutional neural networks, and four localization levels"
            width={1608}
            height={978}
            sizes="(min-width: 1280px) 1170px, calc(100vw - 48px)"
            className="mx-auto h-auto w-full object-contain lg:max-h-[620px] lg:w-auto"
          />
          <figcaption className="flex flex-col gap-1 border-t border-[#e0e4df] px-1 pt-4 text-xs text-[#6b7882] sm:flex-row sm:justify-between">
            <span>RSLpred-2.0 four-level protein subcellular localization workflow.</span>
            <span>TPC · 8,000 features · CNN</span>
          </figcaption>
        </figure>
      </section>

      <section className="grid border-y border-[#b9c5ce] py-10 lg:grid-cols-[230px_1fr] lg:gap-12" aria-labelledby="citation-title">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#e1e8e0] text-[#315e7d]"><BookOpen className="h-4 w-4" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#466b86]">Publication</p><h2 id="citation-title" className="mt-1 font-bold text-[#263642]">Please cite RSLpred2</h2></div>
        </div>
        <div className="mt-6 border-t border-[#d4d9d4] pt-6 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
          <cite className="block max-w-3xl text-sm font-semibold leading-6 text-[#4e5851] not-italic">Duhan, N., &amp; Kaundal, R. (2025). RSLpred2: An Integrated Web Server for the Annotation of Rice Proteome Subcellular Localization Using Deep Learning. <em>Rice, 18</em>, 58.</cite>
          <a href="https://doi.org/10.1186/s12284-025-00767-7" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#315e7d] hover:underline">DOI: 10.1186/s12284-025-00767-7 <ArrowUpRight className="h-4 w-4" /></a>
        </div>
      </section>
    </div>
  );
}
