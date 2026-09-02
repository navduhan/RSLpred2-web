'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle2, ClipboardPaste, Database, ExternalLink, FileUp, Info, X, Loader2, Play, RefreshCw, Upload, Zap, Layers, Mail } from 'lucide-react';
import TurnstileWidget from '@/components/TurnstileWidget';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

const DEMO_FASTA = `>LOC_Os01g01010.1 | Rice protein 1
MAPDPEASSRRRRSRSKSPSSRSPRRSSSRSPRRSRSRSPRRSRSRSPRRSRSRSPRRSR
>LOC_Os01g01020.1 | Rice protein 2
MALQVESTFDLSCSCSGGSGGSGNDSSSLSFTPSCSSSSSAASSSSSSFSSSSSSSSSS
SPSFLSDFLSSDFLSSFLSDFLSSLSSFSSFSSSSSFLSFLSDFLS
>LOC_Os01g01030.1 | Rice protein 3
MANPNSRSKSPSSRSPRRSSSRSPRRSRSRSPRRSRSRSPRRSRSRSPRRSRSRSPRRSR`;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'An unexpected error occurred.';

type PredictionJobResponse = {
  jobId: string;
  jobToken?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  message?: string;
  error?: string;
  results?: Record<string, Record<string, string | number>[]>;
  [key: string]: unknown;
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function pollPredictionJob(jobId: string, jobToken: string, onUpdate: (message: string) => void, isCancelled: () => boolean) {
  while (!isCancelled()) {
    const response = await fetch(`/api/predict?jobId=${encodeURIComponent(jobId)}`, {
      cache: 'no-store', headers: { Authorization: `Bearer ${jobToken}` },
    });
    const job = await response.json() as PredictionJobResponse;
    if (!response.ok) throw new Error(job.error || 'Unable to read prediction status.');
    onUpdate(job.message || `Job status: ${job.status}`);
    if (job.status === 'completed' || job.status === 'failed') return job;
    await wait(3000);
  }
  return null;
}

export default function PredictionPage() {
  const router = useRouter();

  const [inputMode, setInputMode] = useState<'accession' | 'upload' | 'paste'>('accession');

  // Accession Tab & Input
  const [accType, setAccType] = useState<'ncbi' | 'uniprot'>('ncbi');
  const [accession, setAccession] = useState('');

  // Sequence Textarea
  const [textareaSeq, setTextareaSeq] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [fileName, setFileName] = useState('');

  // Level Checkboxes
  const [phase1radio, setPhase1radio] = useState(true);
  const [phase2radio, setPhase2radio] = useState(true);
  const [phase3radio, setPhase3radio] = useState(false);
  const [phase4radio, setPhase4radio] = useState(false);

  // Strategy Model Radio (fast vs sensitive)
  const [predMethod, setPredMethod] = useState<'fast' | 'sensitive'>('fast');

  // Modals
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [errorModalText, setErrorModalText] = useState('');

  // Processing state
  const [submitting, setSubmitting] = useState(false);
  const [jobStatusText, setJobStatusText] = useState('Submitting the job…');
  const [fetchingAcc, setFetchingAcc] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const sequenceCount = (textareaSeq.match(/^>/gm) || []).length;

  useEffect(() => {
    const storedJob = localStorage.getItem('rslpred2_active_job');
    if (!storedJob) return;
    let activeJob: { jobId: string; jobToken: string };
    try {
      activeJob = JSON.parse(storedJob) as { jobId: string; jobToken: string };
      if (!activeJob.jobId || !activeJob.jobToken) throw new Error('Invalid stored job.');
    } catch {
      localStorage.removeItem('rslpred2_active_job');
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSubmitting(true);
      setJobStatusText('Resuming job monitoring…');
      void pollPredictionJob(activeJob.jobId, activeJob.jobToken, setJobStatusText, () => cancelled)
        .then((job) => {
          if (!job || cancelled) return;
          localStorage.removeItem('rslpred2_active_job');
          if (job.status === 'failed') throw new Error(job.error || 'Prediction failed.');
          localStorage.setItem('rslpred2_last_results', JSON.stringify(job));
          router.push('/results');
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setSubmitting(false);
            setErrorModalText(getErrorMessage(error));
          }
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [router]);

  const fetchAccessionsData = async (accString: string, db: 'ncbi' | 'uniprot') => {
    setFetchingAcc(true);
    try {
      const res = await fetch('/api/accession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessions: accString, db }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch accession sequences');
      }
      setTextareaSeq(data.fasta);
    } catch (err: unknown) {
      setErrorModalText(getErrorMessage(err));
    } finally {
      setFetchingAcc(false);
    }
  };

  const handleFetchAccessions = async () => {
    if (!accession.trim()) {
      setErrorModalText('Please enter or upload accession ID(s).');
      return;
    }
    await fetchAccessionsData(accession, accType);
  };

  // Upload handler supporting BOTH FASTA files and Accession List files (.txt, .csv, .tsv, .fasta)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = (event.target?.result as string) || '';
        const trimmed = text.trim();

        if (trimmed.startsWith('>')) {
          setTextareaSeq(trimmed);
        } else {
          const cleanedAccessions = trimmed
            .split(/[\r\n,;\s]+/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
            .join(', ');

          setAccession(cleanedAccessions);
          if (cleanedAccessions) {
            await fetchAccessionsData(cleanedAccessions, accType);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleRunPrediction = async () => {
    let seqToRun = textareaSeq;

    if (!seqToRun.trim() && accession.trim()) {
      setFetchingAcc(true);
      try {
        const res = await fetch('/api/accession', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessions: accession, db: accType }),
        });
        const data = await res.json();
        if (res.ok && data.fasta) {
          seqToRun = data.fasta;
          setTextareaSeq(data.fasta);
        } else {
          throw new Error(data.error || 'Could not fetch accession sequence');
        }
      } catch (err: unknown) {
        setFetchingAcc(false);
        setErrorModalText(getErrorMessage(err));
        return;
      }
      setFetchingAcc(false);
    }

    if (!seqToRun.trim() || !seqToRun.includes('>')) {
      setErrorModalText('Please enter valid FASTA sequence(s) starting with ">" or fetch valid Accession ID(s).');
      return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setErrorModalText('Please complete the anti-bot verification before submitting.');
      return;
    }

    let level = 'level1';
    if (phase4radio) level = 'level4';
    else if (phase3radio) level = 'level3';
    else if (phase2radio) level = 'level2';
    else if (phase1radio) level = 'level1';

    setSubmitting(true);
    setJobStatusText('Submitting the job…');

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequence: seqToRun,
          level,
          model: predMethod,
          emailAddress,
          turnstileToken,
        }),
      });

      const data = await res.json() as PredictionJobResponse;
      if (!res.ok) {
        throw new Error(data.error || 'Job submission failed');
      }
      if (!data.jobToken) throw new Error('The server did not return a private job token.');
      localStorage.setItem('rslpred2_active_job', JSON.stringify({ jobId: data.jobId, jobToken: data.jobToken }));
      setJobStatusText(data.message || 'Job accepted. Waiting for SLURM…');
      const completedJob = await pollPredictionJob(data.jobId, data.jobToken, setJobStatusText, () => false);
      if (!completedJob) return;
      localStorage.removeItem('rslpred2_active_job');
      if (completedJob.status === 'failed') throw new Error(completedJob.error || 'Prediction failed.');
      localStorage.setItem('rslpred2_last_results', JSON.stringify(completedJob));
      router.push('/results');
    } catch (err: unknown) {
      setSubmitting(false);
      setTurnstileToken('');
      setTurnstileResetKey((value) => value + 1);
      setErrorModalText(getErrorMessage(err));
    }
  };

  const handleReset = () => {
    setInputMode('accession');
    setAccession('');
    setTextareaSeq('');
    setEmailAddress('');
    setFileName('');
    setPhase1radio(true);
    setPhase2radio(true);
    setPhase3radio(false);
    setPhase4radio(false);
    setPredMethod('fast');
    setTurnstileToken('');
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 py-4">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-[#cddcd3] bg-[#f7f8f3] px-6 py-7 sm:px-9">
        <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full border-[42px] border-[#dce9df]/60" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#136d4b]">RSLpred-2.0 prediction server</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#082b3b] sm:text-4xl">
            Configure a rice localization run
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Choose one input method, select the prediction levels and model strategy, then run the analysis. Accession sequences are fetched automatically at submission.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Input Options (7 cols) */}
          <div className="space-y-6 rounded-[1.5rem] border border-[#d8e2db] bg-white p-5 shadow-[0_16px_45px_rgba(8,43,59,0.06)] sm:p-7 lg:col-span-7">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#136d4b]">Step 1</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-[#082b3b]">Provide protein input</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Choose one input route. Your loaded sequence remains editable before submission.</p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#f1f5f1] p-1.5" role="tablist" aria-label="Protein input method">
              {[
                { id: 'accession' as const, label: 'Accessions', icon: Database },
                { id: 'upload' as const, label: 'Upload', icon: FileUp },
                { id: 'paste' as const, label: 'Paste FASTA', icon: ClipboardPaste },
              ].map((tab) => {
                const Icon = tab.icon;
                const selected = inputMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setInputMode(tab.id)}
                    className={`flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-xs font-bold transition ${selected ? 'bg-white text-[#136d4b] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {inputMode === 'accession' && (
              <div className="space-y-4" role="tabpanel">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label htmlFor="rsl-accessions" className="text-sm font-bold text-slate-800">Accession IDs</label>
                    <p className="mt-1 text-xs text-slate-500">Separate multiple IDs with commas, spaces, or new lines.</p>
                  </div>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {(['ncbi', 'uniprot'] as const).map((db) => (
                      <button
                        key={db}
                        type="button"
                        onClick={() => setAccType(db)}
                        className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${accType === db ? 'bg-[#136d4b] text-white shadow-sm' : 'text-slate-500'}`}
                      >
                        {db === 'ncbi' ? 'NCBI' : 'UniProt'}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  id="rsl-accessions"
                  rows={4}
                  value={accession}
                  onChange={(e) => { setAccession(e.target.value); setTextareaSeq(''); }}
                  placeholder="LOC_Os01g01010.1&#10;LOC_Os01g01020.1"
                  className="form-input-rslpred w-full resize-y p-3 font-mono text-xs leading-6"
                />
                <div className="flex flex-col gap-3 rounded-xl border border-[#dbe7df] bg-[#f7faf7] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-slate-600"><strong className="text-[#164735]">Run prediction</strong> will fetch these sequences automatically. Preview is optional.</p>
                  <button
                    type="button"
                    onClick={handleFetchAccessions}
                    disabled={fetchingAcc}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[#b8cec0] bg-white px-4 py-2 text-xs font-bold text-[#136d4b] transition hover:border-[#136d4b] disabled:opacity-50"
                  >
                    {fetchingAcc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                    {fetchingAcc ? 'Fetching…' : 'Fetch & preview'}
                  </button>
                </div>
              </div>
            )}

            {inputMode === 'upload' && (
              <div className="space-y-3" role="tabpanel">
                <div>
                  <p className="text-sm font-bold text-slate-800">FASTA or accession-list file</p>
                  <p className="mt-1 text-xs text-slate-500">Accepted formats: .fasta, .fa, .txt, .csv, and .tsv.</p>
                </div>
                <div className="relative cursor-pointer rounded-2xl border-2 border-dashed border-[#bfd0c4] bg-[#f8faf8] p-8 text-center transition hover:border-[#136d4b] hover:bg-[#f3f8f4]">
                  <input type="file" accept=".fasta,.fa,.txt,.csv,.tsv" onChange={handleFileUpload} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                  <Upload className="mx-auto h-7 w-7 text-[#136d4b]" />
                  <p className="mt-3 text-sm font-bold text-slate-800">Choose a file or drop it here</p>
                  <p className="mt-1 text-xs text-slate-500">{fileName || 'FASTA sequences and accession lists are supported'}</p>
                </div>
              </div>
            )}

            {inputMode === 'paste' && (
              <div className="space-y-3" role="tabpanel">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label htmlFor="rsl-fasta" className="text-sm font-bold text-slate-800">FASTA sequence</label>
                    <p className="mt-1 text-xs text-slate-500">Up to 10,000 sequences; each header must begin with &gt;.</p>
                  </div>
                  <button type="button" onClick={() => setTextareaSeq(DEMO_FASTA)} className="shrink-0 text-xs font-bold text-[#136d4b] hover:underline">Load demo</button>
                </div>
                <textarea id="rsl-fasta" rows={10} value={textareaSeq} onChange={(e) => setTextareaSeq(e.target.value)} placeholder=">protein_id&#10;MALQVESTF..." className="form-input-rslpred w-full resize-y bg-slate-50 p-3 font-mono text-xs leading-6" />
              </div>
            )}

            {textareaSeq && inputMode !== 'paste' && (
              <div className="overflow-hidden rounded-2xl border border-[#cfe2d6] bg-white">
                <div className="flex items-center justify-between border-b border-[#dce9e1] bg-[#f3f8f4] px-4 py-3">
                  <span className="flex items-center gap-2 text-xs font-bold text-[#136d4b]"><CheckCircle2 className="h-4 w-4" /> {sequenceCount} sequence{sequenceCount === 1 ? '' : 's'} ready</span>
                  <button type="button" onClick={() => setTextareaSeq('')} className="text-[11px] font-bold text-slate-500 hover:text-slate-800">Clear preview</button>
                </div>
                <textarea rows={7} value={textareaSeq} onChange={(e) => setTextareaSeq(e.target.value)} className="w-full resize-y border-0 bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100 outline-none" aria-label="Fetched FASTA preview" />
              </div>
            )}

            <div className="space-y-2 border-t border-slate-200 pt-5">
              <label htmlFor="rsl-email" className="flex items-center gap-2 text-sm font-bold text-slate-800"><Mail className="h-4 w-4 text-slate-400" /> Email notification <span className="font-normal text-slate-400">optional</span></label>
              <input id="rsl-email" type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="name@example.edu" className="form-input-rslpred w-full px-3.5 py-2.5 text-xs" />
            </div>
          </div>

          {/* Right Column: Prediction Options (5 cols) */}
          <div className="flex flex-col justify-between space-y-6 self-start rounded-[1.5rem] border border-[#d8e2db] bg-white p-5 shadow-[0_16px_45px_rgba(8,43,59,0.06)] sm:p-7 lg:sticky lg:top-24 lg:col-span-5">
            <div className="space-y-6">
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a17111]">Step 2</p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold text-[#082b3b]">Prediction options</h2>
                </div>
              </div>

              {/* Level Selection Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#4c3379]" />
                    <span>Select Level(s)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLevelModal(true)}
                    className="text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <label className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 ${
                    phase1radio ? 'border-[#136d4b] bg-[#136d4b]/5 shadow-sm' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={phase1radio}
                      onChange={(e) => setPhase1radio(e.target.checked)}
                      className="w-4 h-4 text-[#136d4b] focus:ring-[#136d4b] rounded"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">Level I: Single vs Dual</div>
                      <div className="text-[11px] text-slate-500">Classifies query sequences into single or dual organelle localization</div>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 ${
                    phase2radio ? 'border-[#136d4b] bg-[#136d4b]/5 shadow-sm' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={phase2radio}
                      onChange={(e) => setPhase2radio(e.target.checked)}
                      className="w-4 h-4 text-[#136d4b] focus:ring-[#136d4b] rounded"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">Level II: Single 10-Class</div>
                      <div className="text-[11px] text-slate-500">10 Organelles: Vacuole, Cytoplasm, Peroxisome, Golgi, ER, Membrane, etc.</div>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 ${
                    phase3radio ? 'border-[#136d4b] bg-[#136d4b]/5 shadow-sm' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={phase3radio}
                      onChange={(e) => setPhase3radio(e.target.checked)}
                      className="w-4 h-4 text-[#136d4b] focus:ring-[#136d4b] rounded"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">Level III: Dual 6-Class</div>
                      <div className="text-[11px] text-slate-500">6 Organelle Pairs: Plastid & Mitochondria, Nucleus & Cytoplasm, etc.</div>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 ${
                    phase4radio ? 'border-[#136d4b] bg-[#136d4b]/5 shadow-sm' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={phase4radio}
                      onChange={(e) => setPhase4radio(e.target.checked)}
                      className="w-4 h-4 text-[#136d4b] focus:ring-[#136d4b] rounded"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">Level IV: Membrane Topology</div>
                      <div className="text-[11px] text-slate-500">Classifies membrane proteins into Single-Pass or Multi-Pass</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-200 my-3" />

              {/* Strategy Model Selection Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Select Model Strategy</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowStrategyModal(true)}
                    className="text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-1 ${
                    predMethod === 'fast' ? 'border-[#136d4b] bg-[#136d4b]/10 shadow-sm' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900">Fast</span>
                      <input
                        type="radio"
                        name="predMethod"
                        value="fast"
                        checked={predMethod === 'fast'}
                        onChange={() => setPredMethod('fast')}
                        className="w-3.5 h-3.5 text-[#136d4b] focus:ring-[#136d4b]"
                      />
                    </div>
                    <span className="text-[11px] text-slate-600">DPCP Feature Vector. Fast speed.</span>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-1 ${
                    predMethod === 'sensitive' ? 'border-[#4c3379] bg-[#4c3379]/10 shadow-sm' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900">Sensitive</span>
                      <input
                        type="radio"
                        name="predMethod"
                        value="sensitive"
                        checked={predMethod === 'sensitive'}
                        onChange={() => setPredMethod('sensitive')}
                        className="w-3.5 h-3.5 text-[#4c3379] focus:ring-[#4c3379]"
                      />
                    </div>
                    <span className="text-[11px] text-slate-600">TPC Feature Vector. Highest accuracy.</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 border-t border-slate-200 pt-6">
              <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTurnstileToken} resetKey={turnstileResetKey} />
              {submitting && (
                <div className="rounded-xl border border-[#bed7c7] bg-[#eef7f1] p-3" role="status" aria-live="polite">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#136d4b]"><Loader2 className="h-4 w-4 animate-spin" /> Prediction in progress</div>
                  <p className="mt-1 pl-6 text-[11px] leading-5 text-slate-600">{jobStatusText} You may keep this page open; status checks use short requests.</p>
                </div>
              )}
              <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-3 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset All</span>
              </button>

              <button
                type="button"
                onClick={handleRunPrediction}
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#136d4b] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(19,109,75,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0d583c] disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Monitoring job…</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Prediction</span>
                  </>
                )}
              </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      <section className="rounded-2xl border border-[#d8e2db] bg-[#f7f8f5] p-5 sm:p-6" aria-labelledby="prediction-citation-title">
        <div className="grid gap-4 md:grid-cols-[190px_1fr] md:items-start">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dfece4] text-[#136d4b]">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#136d4b]">Publication</p>
              <h2 id="prediction-citation-title" className="mt-0.5 text-sm font-bold text-[#082b3b]">Please cite RSLpred2</h2>
            </div>
          </div>
          <div className="border-t border-[#d8e2db] pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <cite className="block not-italic text-xs font-semibold leading-5 text-slate-700">
              Duhan, N., &amp; Kaundal, R. (2025). RSLpred2: An Integrated Web Server for the Annotation of Rice Proteome Subcellular Localization Using Deep Learning. <em>Rice, 18</em>, 58.
            </cite>
            <a
              href="https://doi.org/10.1186/s12284-025-00767-7"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#136d4b] hover:underline"
            >
              DOI: 10.1186/s12284-025-00767-7 <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Level Info Modal */}
      {showLevelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">About Prediction Levels</h3>
              <button onClick={() => setShowLevelModal(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed max-h-96 overflow-y-auto">
              <p><strong>Level I:</strong> First level where a query sequence is predicted as single localization or dual localization.</p>
              <hr />
              <p><strong>Level II:</strong> Classifies single localization into 10 classes: Vacuole, Cytoplasm, Peroxisome, Golgi, Endoplasmic, Membrane, Secreted, Cell, Mitochondria, Plastid.</p>
              <hr />
              <p><strong>Level III:</strong> Classifies dual localization into 6 classes: Plastid & Mitochondria, Nucleus & Cytoplasm, Cytoplasm & Membrane, ER & Membrane, Golgi & Membrane, Membrane & Mitochondria.</p>
              <hr />
              <p><strong>Level IV:</strong> Classifies Membrane predicted in Level I into single-pass or multi-pass.</p>
            </div>
            <div className="pt-2 text-right">
              <button
                onClick={() => setShowLevelModal(false)}
                className="btn-primary-rslpred px-5 py-2 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Info Modal */}
      {showStrategyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">About Prediction Strategy</h3>
              <button onClick={() => setShowStrategyModal(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <p>There are two prediction strategies available in RSLpred-2.0 [Fast, Sensitive]:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>The <strong>Fast</strong> approach model provides a fast prediction using Dipeptide Amino Acid Composition (DPCP). Useful for annotating a huge number of proteins.</li>
                <li>The <strong>Sensitive</strong> approach model provides a more sensitive prediction using Tripeptide Amino Acid Composition (TPC) at the cost of longer computation time. Useful for annotating a small number of proteins with high-quality prediction.</li>
              </ul>
            </div>
            <div className="pt-2 text-right">
              <button
                onClick={() => setShowStrategyModal(false)}
                className="btn-primary-rslpred px-5 py-2 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorModalText && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 text-red-600 font-bold text-lg">
              <h3>Error in Job Submission</h3>
              <button onClick={() => setErrorModalText('')} className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-700">{errorModalText}</p>
            <div className="pt-2 text-right">
              <button
                onClick={() => setErrorModalText('')}
                className="px-5 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
