import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Database, Gauge, Layers3, Monitor, Play, Table2 } from 'lucide-react';

const sections = [
  ['input', '01', 'Input data'],
  ['models', '02', 'Model strategy'],
  ['levels', '03', 'Prediction levels'],
  ['run', '04', 'Run analysis'],
  ['results', '05', 'Read results'],
  ['compatibility', '06', 'Compatibility'],
];

const levels = [
  ['I', 'Single vs dual', 'Determines whether a protein has one predicted localization or a dual localization.'],
  ['II', 'Single localization', 'Classifies single-localized proteins into 10 cellular compartments.'],
  ['III', 'Dual localization', 'Classifies dual-localized proteins into 6 supported compartment pairs.'],
  ['IV', 'Membrane topology', 'Classifies predicted membrane proteins as single-pass or multi-pass.'],
];

const browsers = [
  ['Linux', 'Ubuntu 22.04', 'Chrome 108+', 'Firefox 112+', '—', 'Edge 113+'],
  ['macOS', 'Ventura or later', 'Latest', 'Latest', 'Safari 16.4+', 'Latest'],
  ['Windows', '10 or 11', 'Chrome 108+', 'Firefox 112+', '—', 'Edge 113+'],
];

const quickStart = [
  { icon: Database, number: '1', title: 'Provide sequences', copy: 'Enter NCBI or UniProt accessions, upload a file, or paste FASTA.' },
  { icon: Layers3, number: '2', title: 'Choose levels', copy: 'Select one or more prediction levels and a model strategy.' },
  { icon: Table2, number: '3', title: 'Review output', copy: 'The completed run opens directly in the Results workspace.' },
];

export default function HelpPage() {
  return (
    <div className="container mx-auto max-w-7xl space-y-6 py-5 sm:py-8">
      <header className="relative overflow-hidden rounded-[2rem] bg-[#082b3b] px-6 py-9 text-white sm:px-10 sm:py-11">
        <div className="pointer-events-none absolute -right-16 -top-32 h-80 w-80 rounded-full border-[52px] border-white/5" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#8fd0af]"><BookOpen className="h-4 w-4" /> RSLpred-2.0 handbook</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">From sequence to localization</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">A concise guide to preparing rice protein inputs, choosing prediction levels, running the model, and exporting results.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-xs font-bold text-white">No account required</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">The web server is free to use. For questions, contact <a className="font-bold text-[#9edab8] hover:underline" href="mailto:naveen.duhan@usu.edu">naveen.duhan@usu.edu</a>.</p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Quick start">
        {quickStart.map(({ icon: Icon, number, title, copy }) => (
          <div key={number} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(8,43,59,0.04)]">
            <div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e5f1e9] text-[#136d4b]"><Icon className="h-4 w-4" /></span><span className="font-serif text-2xl text-slate-300">{number}</span></div>
            <h2 className="mt-4 font-serif text-xl font-semibold text-[#082b3b]">{title}</h2><p className="mt-2 text-xs leading-5 text-slate-600">{copy}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-7 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="self-start lg:sticky lg:top-24">
          <nav className="rounded-2xl border border-slate-200 bg-[#f7f8f5] p-3" aria-label="Help topics">
            <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#136d4b]">On this page</p>
            {sections.map(([href, number, label]) => <a key={href} href={`#${href}`} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-white hover:text-[#136d4b]"><span className="font-mono text-[10px] text-slate-400 group-hover:text-[#136d4b]">{number}</span>{label}</a>)}
          </nav>
          <Link href="/prediction" className="mt-3 flex items-center justify-between rounded-2xl bg-[#136d4b] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#0d583c]">Open Prediction <ArrowRight className="h-4 w-4" /></Link>
        </aside>

        <article className="space-y-5">
          <section id="input" className="scroll-mt-24 rounded-[1.5rem] border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e5f1e9] text-[#136d4b]"><Database className="h-4 w-4" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#136d4b]">01 · Input data</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#082b3b]">Three ways to provide proteins</h2></div></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ['Accessions', 'Enter multiple NCBI or UniProt protein accessions separated by commas or new lines. Fetch & preview is optional; Run Prediction can fetch them automatically.'],
                ['Upload', 'Upload FASTA directly, or upload a TXT, CSV, or TSV accession list. Accession lists are fetched automatically.'],
                ['Paste FASTA', 'Paste one or more amino-acid sequences. Every record must begin with a FASTA header using the > character.'],
              ].map(([title, copy]) => <div key={title} className="rounded-xl bg-[#f7f8f5] p-4"><h3 className="text-sm font-bold text-[#082b3b]">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-600">{copy}</p></div>)}
            </div>
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Only amino-acid sequences are supported; nucleotide sequences should not be submitted.</p>
          </section>

          <section id="models" className="scroll-mt-24 rounded-[1.5rem] border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fff3d7] text-[#9a6b00]"><Gauge className="h-4 w-4" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9a6b00]">02 · Model strategy</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#082b3b]">Choose speed or sensitivity</h2></div></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#cfe0d5] bg-[#f0f7f2] p-5"><h3 className="font-serif text-xl font-semibold text-[#136d4b]">Fast</h3><p className="mt-2 text-xs leading-5 text-slate-600">Uses dipeptide composition features. Best for larger protein sets and faster turnaround.</p></div><div className="rounded-xl border border-[#d9d1e6] bg-[#f6f3fa] p-5"><h3 className="font-serif text-xl font-semibold text-[#4c3379]">Sensitive</h3><p className="mt-2 text-xs leading-5 text-slate-600">Uses tripeptide composition features. Best for smaller sets when prediction sensitivity is the priority.</p></div></div>
          </section>

          <section id="levels" className="scroll-mt-24 rounded-[1.5rem] border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ece7f4] text-[#4c3379]"><Layers3 className="h-4 w-4" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4c3379]">03 · Prediction levels</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#082b3b]">A four-level hierarchy</h2></div></div>
            <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">{levels.map(([number, title, copy]) => <div key={number} className="grid gap-2 py-4 sm:grid-cols-[80px_180px_1fr] sm:items-start"><span className="text-xs font-black uppercase tracking-[0.12em] text-[#136d4b]">Level {number}</span><h3 className="text-sm font-bold text-[#082b3b]">{title}</h3><p className="text-xs leading-5 text-slate-600">{copy}</p></div>)}</div>
          </section>

          <section id="run" className="scroll-mt-24 rounded-[1.5rem] border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e5f1e9] text-[#136d4b]"><Play className="h-4 w-4" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#136d4b]">04 · Run analysis</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#082b3b]">One primary action</h2></div></div>
            <p className="mt-5 text-sm leading-6 text-slate-600">Select the required levels and model, then choose <strong className="text-slate-900">Run Prediction</strong>. Processing status remains on the Prediction page; when the job finishes, the browser moves directly to Results. Email notification is optional.</p>
          </section>

          <section id="results" className="scroll-mt-24 rounded-[1.5rem] border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8eef3] text-[#31566b]"><Table2 className="h-4 w-4" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#31566b]">05 · Read results</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#082b3b]">Navigate by level</h2></div></div>
            <p className="mt-5 text-sm leading-6 text-slate-600">Results are organized from Level I through Level IV above a full-width table. Choose a level to update the table, scroll horizontally when more columns are present, download the active level, or export all available levels in one file.</p>
          </section>

          <section id="compatibility" className="scroll-mt-24 rounded-[1.5rem] border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600"><Monitor className="h-4 w-4" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">06 · Compatibility</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#082b3b]">Supported browsers</h2></div></div>
            <div className="results-table-scroll mt-6 overflow-x-scroll rounded-xl border border-slate-200"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-[#edf4ef] text-[#082b3b]"><tr>{['OS', 'Version', 'Chrome', 'Firefox', 'Safari', 'Edge'].map((header) => <th key={header} className="px-4 py-3 font-black uppercase tracking-[0.08em]">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{browsers.map((row) => <tr key={row[0]}>{row.map((value, index) => <td key={value} className={`px-4 py-3 ${index === 0 ? 'font-bold text-[#082b3b]' : 'text-slate-600'}`}>{value}</td>)}</tr>)}</tbody></table></div>
          </section>
        </article>
      </div>
    </div>
  );
}
