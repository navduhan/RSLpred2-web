'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowLeftRight, CheckCircle2, Download, Files, FlaskConical, Layers3, Table2 } from 'lucide-react';

type ResultValue = string | number | boolean | null;
type ResultRow = Record<string, ResultValue>;
type StoredResults = {
  results?: Record<string, ResultRow[]>;
  executionMode?: 'slurm' | 'local';
  clusterJobId?: string;
  remoteError?: string;
};

const levelMeta = (fileName: string) => {
  if (fileName.includes('single_vs_dual')) return { level: 'Level I', title: 'Single vs dual localization', note: 'Primary localization mode' };
  if (fileName.includes('single_class')) return { level: 'Level II', title: 'Single-localization class', note: '10 cellular compartments' };
  if (fileName.includes('dual_class')) return { level: 'Level III', title: 'Dual-localization class', note: '6 compartment pairs' };
  if (fileName.includes('membrane')) return { level: 'Level IV', title: 'Membrane topology', note: 'Single-pass or multi-pass' };
  return { level: 'Result', title: fileName, note: 'Prediction output' };
};

const levelRank = (fileName: string) => {
  if (fileName.includes('single_vs_dual')) return 1;
  if (fileName.includes('single_class')) return 2;
  if (fileName.includes('dual_class')) return 3;
  if (fileName.includes('membrane')) return 4;
  return 99;
};

const sortByLevel = (files: string[]) => [...files].sort((a, b) => levelRank(a) - levelRank(b));

const rowsToTsv = (rows: ResultRow[]) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [headers.join('\t'), ...rows.map((row) => headers.map((header) => String(row[header] ?? '')).join('\t'))].join('\n');
};

const saveTextFile = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function ResultsPage() {
  const [data, setData] = useState<StoredResults | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeLevel, setActiveLevel] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem('rslpred2_last_results');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as StoredResults;
          setData(parsed);
          setActiveLevel(sortByLevel(Object.keys(parsed.results || {}))[0] || '');
        } catch (error: unknown) {
          console.error('Unable to read stored RSLpred2 results.', error);
        }
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const resultFiles = useMemo(() => sortByLevel(Object.keys(data?.results || {})), [data]);
  const activeRows = data?.results?.[activeLevel] || [];
  const totalRows = useMemo(() => Math.max(0, ...resultFiles.map((file) => data?.results?.[file]?.length || 0)), [data, resultFiles]);

  const downloadActive = () => {
    if (activeRows.length) saveTextFile(rowsToTsv(activeRows), activeLevel || 'RSLpred2_results.txt');
  };

  const downloadAll = () => {
    const content = resultFiles
      .map((file) => `# ${levelMeta(file).level}: ${levelMeta(file).title}\n${rowsToTsv(data?.results?.[file] || [])}`)
      .join('\n\n');
    if (content) saveTextFile(content, 'RSLpred2_all_levels.txt');
  };

  if (!loaded) {
    return <div className="container mx-auto min-h-[480px] max-w-7xl py-8" aria-live="polite" />;
  }

  if (!data || resultFiles.length === 0) {
    return (
      <div className="container mx-auto max-w-5xl py-10 sm:py-16">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#d7e3da] bg-[#f7f8f3] px-6 py-16 text-center sm:px-12">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[38px] border-[#dfeadf]" />
          <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-[#136d4b] shadow-sm"><FlaskConical className="h-6 w-6" /></span>
          <p className="relative mt-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#136d4b]">Results workspace</p>
          <h1 className="relative mt-2 font-serif text-4xl font-semibold text-[#082b3b]">No prediction results yet</h1>
          <p className="relative mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600">Submit rice protein sequences on the Prediction page. Completed results will open here automatically and remain available in this browser.</p>
          <Link href="/prediction" className="relative mt-7 inline-flex items-center gap-2 rounded-full bg-[#136d4b] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_25px_rgba(19,109,75,0.2)]"><FlaskConical className="h-4 w-4" /> Start a prediction</Link>
        </section>
      </div>
    );
  }

  const activeMeta = levelMeta(activeLevel);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 py-5 sm:py-8">
      <header className="relative overflow-hidden rounded-[2rem] bg-[#082b3b] px-6 py-8 text-white sm:px-9">
        <div className="pointer-events-none absolute -right-10 -top-28 h-72 w-72 rounded-full border-[46px] border-white/5" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#8fd0af]"><CheckCircle2 className="h-4 w-4" /> Analysis complete</div>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">RSLpred2 results</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Review each requested prediction level, inspect the tabular output, or export the complete analysis.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/prediction" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"><ArrowLeft className="h-4 w-4" /> New prediction</Link>
            <button type="button" onClick={downloadAll} className="inline-flex items-center gap-2 rounded-full bg-[#d9a62e] px-5 py-2.5 text-xs font-black text-[#082b3b] transition hover:bg-[#efbd45]"><Files className="h-4 w-4" /> Download all levels</button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Run summary">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Sequences</p><p className="mt-2 font-serif text-3xl font-semibold text-[#082b3b]">{totalRows}</p><p className="mt-1 text-xs text-slate-500">Protein records analyzed</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Outputs</p><p className="mt-2 font-serif text-3xl font-semibold text-[#082b3b]">{resultFiles.length}</p><p className="mt-1 text-xs text-slate-500">Prediction levels available</p></div>
        <div className={`rounded-2xl border p-5 ${data.executionMode === 'slurm' ? 'border-[#cfe1d5] bg-[#eef6f0]' : 'border-amber-200 bg-amber-50'}`}><p className={`text-[10px] font-black uppercase tracking-[0.16em] ${data.executionMode === 'slurm' ? 'text-[#136d4b]' : 'text-amber-700'}`}>Executor</p><p className={`mt-2 font-serif text-3xl font-semibold ${data.executionMode === 'slurm' ? 'text-[#136d4b]' : 'text-amber-800'}`}>{data.executionMode === 'slurm' ? 'SLURM' : data.executionMode === 'local' ? 'Local fallback' : 'Unverified'}</p><p className="mt-1 text-xs text-slate-600">{data.clusterJobId ? `Cluster job ${data.clusterJobId}` : data.executionMode ? 'Real model output' : 'Legacy stored result'}</p></div>
      </section>

      {data.executionMode === 'local' && data.remoteError && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><strong>Cluster fallback used.</strong> SLURM was unavailable for this run: {data.remoteError}</div>}

      <div className="space-y-4">
        <nav className="rounded-[1.5rem] border border-slate-200 bg-[#f7f8f5] p-3" aria-label="Prediction levels">
          <div className="flex flex-col gap-3 px-2 pb-2 pt-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#136d4b]">Output navigator</p><h2 className="mt-1 font-serif text-xl font-semibold text-[#082b3b]">Prediction levels</h2></div><p className="text-[11px] text-slate-500">Choose a level to update the table below.</p></div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {resultFiles.map((fileName) => {
              const meta = levelMeta(fileName);
              const isActive = activeLevel === fileName;
              return <button key={fileName} type="button" onClick={() => setActiveLevel(fileName)} className={`w-full rounded-xl border p-3 text-left transition ${isActive ? 'border-[#136d4b] bg-[#136d4b] text-white shadow-sm' : 'border-transparent bg-white text-slate-700 hover:border-[#bcd2c3]'}`}><span className={`text-[10px] font-black uppercase tracking-[0.15em] ${isActive ? 'text-[#bce2cb]' : 'text-[#136d4b]'}`}>{meta.level}</span><span className="mt-1 block text-sm font-bold leading-5">{meta.title}</span><span className={`mt-1 block text-[11px] ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{meta.note}</span></button>;
            })}
          </div>
        </nav>

        <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(8,43,59,0.06)]">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#136d4b]">{activeMeta.level}</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#082b3b]">{activeMeta.title}</h2><p className="mt-1 text-xs text-slate-500">{activeRows.length} result row{activeRows.length === 1 ? '' : 's'}</p></div>
            <button type="button" onClick={downloadActive} disabled={!activeRows.length} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#136d4b] px-4 py-2.5 text-xs font-bold text-[#136d4b] transition hover:bg-[#edf6f0] disabled:opacity-40"><Download className="h-4 w-4" /> Download this level</button>
          </div>

          <div className="flex items-center justify-end gap-1.5 border-b border-slate-100 bg-slate-50 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500"><ArrowLeftRight className="h-3.5 w-3.5" /> Scroll horizontally to view all columns</div>
          <div className="results-table-scroll overflow-x-scroll">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-[#edf4ef] text-[#082b3b]">
                <tr>{activeRows.length > 0 && Object.keys(activeRows[0]).map((header) => <th key={header} className="border-b border-[#d5e2d9] px-5 py-3.5 font-black uppercase tracking-[0.08em]">{header}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {activeRows.map((row, rowIndex) => <tr key={rowIndex} className="transition hover:bg-[#fafbf8]">{Object.entries(row).map(([key, value]) => <td key={key} className="whitespace-nowrap px-5 py-3.5 text-slate-700">{key.toLowerCase().includes('prediction') ? <span className="rounded-full border border-[#bcd9c6] bg-[#edf7f0] px-2.5 py-1 font-sans font-bold text-[#136d4b]">{String(value ?? '')}</span> : <span>{String(value ?? '')}</span>}</td>)}</tr>)}
                {!activeRows.length && <tr><td colSpan={10} className="px-5 py-16 text-center"><Table2 className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-sans text-sm font-bold text-slate-700">No rows returned for this level</p></td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-[11px] text-slate-500"><Layers3 className="h-3.5 w-3.5" /> Values are shown exactly as returned by the prediction service.</div>
        </section>
      </div>
    </div>
  );
}
