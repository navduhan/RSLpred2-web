'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, BookOpen, Check, CheckCircle2, ClipboardPaste, Copy, Database, ExternalLink, FileUp, Info, X, Loader2, Play, RefreshCw, Upload, Zap, Layers } from 'lucide-react';
import TurnstileWidget from '@/components/TurnstileWidget';
import { withBasePath } from '@/lib/base-path';
import { buildJobBookmark } from '@/lib/job-bookmark';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

const DEMO_ACCESSIONS = 'Q01883\nP0C510\nP0C432';

const DEMO_FASTA = `>sp|Q01883|RAG1_ORYSJ Seed allergenic protein RAG1 OS=Oryza sativa subsp. japonica OX=39947 GN=RAG1 PE=1 SV=2
MASNKVVFSVLLLVVLSVLAAAMATMADHHQVYSPGEQCRPGISYPTYSLPQCRTLVRRQ
CVGRGAASAADEQVWQDCCRQLAAVDDGWCRCGALDHMLSGIYRELGATEAGHPMAEVFP
GCRRGDLERAAASLPAFCNVDIPNGPGGVCYWLGYPRTPRTGH
>sp|P0C510|RBL_ORYSA Ribulose bisphosphate carboxylase large chain OS=Oryza sativa OX=4530 GN=rbcL PE=1 SV=1
MSPQTETKASVGFKAGVKDYKLTYYTPEYETKDTDILAAFRVTPQPGVPPEEAGAAVAAE
SSTGTWTTVWTDGLTSLDRYKGRCYHIEPVVGEDNQYIAYVAYPLDLFEEGSVTNMFTSI
VGNVFGFKALRALRLEDLRIPPTYSKTFQGPPHGIQVERDKLNKYGRPLLGCTIKPKLGL
SAKNYGRACYECLRGGLDFTKDDENVNSQPFMRWRDRFVFCAEAIYKSQAETGEIKGHYL
NATAGTCEEMIKRAVFARELGVPIVMHDYLTGGFTANTSLAHYCRDNGLLLHIHRAMHAV
IDRQKNHGMHFRVLAKALRMSGGDHIHAGTVVGKLEGEREMTLGFVDLLRDDFIEKDRAR
GIFFTQDWVSMPGVIPVASGGIHVWHMPALTEIFGDDSVLQFGGGTLGHPWGNAPGAAAN
RVALEACVQARNEGRDLAREGNEIIRSACKWSPELAAACEIWKAIKFEFEPVDKLDS
>sp|P0C432|PSBA_ORYSA Photosystem II protein D1 OS=Oryza sativa OX=4530 GN=psbA PE=3 SV=1
MTAILERRESTSLWGRFCNWITSTENRLYIGWFGVLMIPTLLTATSVFIIAFIAAPPVDI
DGIREPVSGSLLYGNNIISGAIIPTSAAIGLHFYPIWEAASVDEWLYNGGPYELIVLHFL
LGVACYMGREWELSFRLGMRPWIAVAYSAPVAAATAVFLIYPIGQGSFSDGMPLGISGTF
NFMIVFQAEHNILMHPFHMLGVAGVFGGSLFSAMHGSLVTSSLIRETTENESANEGYRFG
QEEETYNIVAAHGYFGRLIFQYASFNNSRSLHFFLAAWPVVGIWFTALGISTMAFNLNGF
NFNQSVVDSQGRVINTWADIINRANLGMEVMHERNAHNFPLDLAALEVPSLNG`;

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

async function readPredictionResponse(response: Response) {
  const raw = await response.text();
  try {
    return JSON.parse(raw) as PredictionJobResponse;
  } catch {
    const status = `${response.status} ${response.statusText}`.trim();
    throw new Error(`The prediction service returned an unexpected response (${status}). Please contact the server administrator.`);
  }
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function pollPredictionJob(jobId: string, jobToken: string, onUpdate: (message: string) => void, isCancelled: () => boolean) {
  while (!isCancelled()) {
    const response = await fetch(withBasePath(`/api/predict?jobId=${encodeURIComponent(jobId)}`), {
      cache: 'no-store', headers: { 'X-RSLpred2-Job-Token': jobToken },
    });
    const job = await readPredictionResponse(response);
    if (!response.ok) throw new Error(job.error || 'Unable to read prediction status.');
    onUpdate(job.message || `Job status: ${job.status}`);
    if (job.status === 'completed' || job.status === 'failed') return job;
    await wait(3000);
  }
  return null;
}

export default function PredictionPage() {
  const [inputMode, setInputMode] = useState<'accession' | 'upload' | 'paste'>('paste');

  // Accession Tab & Input
  const [accType, setAccType] = useState<'ncbi' | 'uniprot'>('ncbi');
  const [accession, setAccession] = useState('');

  // Sequence Textarea
  const [textareaSeq, setTextareaSeq] = useState('');
  const [fileName, setFileName] = useState('');

  // Deepest prediction level to run
  const [predictionLevel, setPredictionLevel] = useState<'level1' | 'level2' | 'level3' | 'level4'>('level2');

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
  const [jobReceipt, setJobReceipt] = useState<{ jobId: string; url: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const sequenceCount = (textareaSeq.match(/^>/gm) || []).length;

  useEffect(() => {
    const storedJob = localStorage.getItem('rslpred2_active_job');
    if (!storedJob) return;
    let activeJob: { jobId: string; jobToken: string };
    try {
      activeJob = JSON.parse(storedJob) as { jobId: string; jobToken: string };
      if (!activeJob.jobId || !activeJob.jobToken || activeJob.jobId.includes('-')) throw new Error('Invalid stored job.');
    } catch {
      localStorage.removeItem('rslpred2_active_job');
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSubmitting(true);
      setJobStatusText('Resuming job monitoring…');
      const bookmarkUrl = buildJobBookmark(activeJob);
      setJobReceipt({ jobId: activeJob.jobId, url: bookmarkUrl });
      void pollPredictionJob(activeJob.jobId, activeJob.jobToken, setJobStatusText, () => cancelled)
        .then((job) => {
          if (!job || cancelled) return;
          localStorage.removeItem('rslpred2_active_job');
          if (job.status === 'failed') throw new Error(job.error || 'Prediction failed.');
          localStorage.setItem('rslpred2_last_results', JSON.stringify(job));
          window.location.assign(bookmarkUrl);
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
  }, []);

  const fetchAccessionsData = async (accString: string, db: 'ncbi' | 'uniprot') => {
    setFetchingAcc(true);
    try {
      const res = await fetch(withBasePath('/api/accession'), {
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

  const loadDemoAccession = () => {
    setInputMode('accession');
    setAccType('uniprot');
    setAccession(DEMO_ACCESSIONS);
    setTextareaSeq('');
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
        const res = await fetch(withBasePath('/api/accession'), {
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

    const level = predictionLevel;

    setSubmitting(true);
    setJobStatusText('Submitting the job…');

    try {
      const res = await fetch(withBasePath('/api/predict'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequence: seqToRun,
          level,
          model: predMethod,
          turnstileToken,
        }),
      });

      const data = await readPredictionResponse(res);
      if (!res.ok) {
        throw new Error(data.error || 'Job submission failed');
      }
      if (!data.jobToken) throw new Error('The server did not return a private job token.');
      const activeJob = { jobId: data.jobId, jobToken: data.jobToken };
      const bookmarkUrl = buildJobBookmark(activeJob);
      localStorage.setItem('rslpred2_active_job', JSON.stringify(activeJob));
      setJobReceipt({ jobId: data.jobId, url: bookmarkUrl });
      setJobStatusText(data.message || 'Job accepted. Waiting for SLURM…');
      const completedJob = await pollPredictionJob(data.jobId, data.jobToken, setJobStatusText, () => false);
      if (!completedJob) return;
      localStorage.removeItem('rslpred2_active_job');
      if (completedJob.status === 'failed') throw new Error(completedJob.error || 'Prediction failed.');
      localStorage.setItem('rslpred2_last_results', JSON.stringify(completedJob));
      window.location.assign(bookmarkUrl);
    } catch (err: unknown) {
      setSubmitting(false);
      setTurnstileToken('');
      setTurnstileResetKey((value) => value + 1);
      setErrorModalText(getErrorMessage(err));
    }
  };

  const handleReset = () => {
    setInputMode('paste');
    setAccession('');
    setTextareaSeq('');
    setFileName('');
    setPredictionLevel('level2');
    setPredMethod('fast');
    setTurnstileToken('');
    setJobReceipt(null);
    setLinkCopied(false);
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-10 py-8 sm:py-12">
      <header className="mx-auto max-w-5xl text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a6a3c]">RSLpred-2.0 analysis</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-[#1e2a33] sm:text-5xl">Predict the subcellular localization of rice proteins</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#667581]">Submit protein sequences, choose the required localization depth, and run the rice-specific prediction models.</p>
        <dl className="mx-auto mt-6 grid max-w-lg grid-cols-3 overflow-hidden rounded-xl border border-[#d1dbe2] bg-white text-center">
            <div className="border-r border-[#d1dbe2] px-4 py-3"><dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#7a8791]">Input</dt><dd className="mt-1 text-xs font-bold text-[#2c3943]">Protein FASTA</dd></div>
            <div className="border-r border-[#d1dbe2] px-4 py-3"><dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#7a8791]">Limit</dt><dd className="mt-1 text-xs font-bold text-[#2c3943]">10,000 records</dd></div>
            <div className="px-4 py-3"><dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#7a8791]">Retention</dt><dd className="mt-1 text-xs font-bold text-[#2c3943]">30 days</dd></div>
        </dl>
      </header>

      <form onSubmit={(e) => e.preventDefault()}>
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#cdd7df] bg-white shadow-[0_20px_55px_rgba(30,54,72,0.08)]">
          {/* Left Column: Input Options (7 cols) */}
          <section className="bg-white p-6 sm:p-8 lg:p-10" aria-labelledby="input-heading">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#234b6b]">Step 1</p>
              <h2 id="input-heading" className="mt-1 text-2xl font-semibold text-[#1e2a33]">Choose the input method</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">RSLpred2 accepts protein sequences from one source at a time.</p>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-[240px_1fr] sm:items-end">
              <div><span className="mb-2 block text-xs font-bold text-[#2c3943]">Sequence type</span><div className="rounded-xl border border-[#c8d3dc] bg-[#fbfcfd] px-4 py-3 text-sm font-semibold text-[#263642]">Protein</div></div>
            <div><span className="mb-2 block text-xs font-bold text-[#2c3943]">Input method</span><div className="grid grid-cols-3 gap-1 rounded-xl bg-[#eef1f3] p-1" role="tablist" aria-label="Protein input method">
              {[
                { id: 'paste' as const, label: 'Paste FASTA', icon: ClipboardPaste },
                { id: 'upload' as const, label: 'Upload FASTA', icon: FileUp },
                { id: 'accession' as const, label: 'Accessions', icon: Database },
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
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition ${selected ? 'bg-white text-[#234b6b] shadow-sm' : 'text-[#687681] hover:text-[#1e2a33]'}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            </div></div>

            <div className="mt-8 border-t border-[#d8e0e6] pt-8">
              <div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a3c]">Step 2</p><h2 className="mt-1 text-2xl font-semibold text-[#1e2a33]">Add sequence data</h2></div><button type="button" onClick={() => { setAccession(''); setTextareaSeq(''); setFileName(''); }} className="rounded-xl border border-[#c8d3dc] bg-white px-4 py-2.5 text-xs font-bold text-[#405565] hover:border-[#466b86]">Clear</button></div>
            <div className="min-w-0">

            {inputMode === 'accession' && (
              <div className="space-y-4" role="tabpanel">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label htmlFor="rsl-accessions" className="text-sm font-bold text-slate-800">Accession IDs</label>
                    <p className="mt-1 text-xs text-slate-500">Separate multiple IDs with commas, spaces, or new lines.</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <button type="button" onClick={loadDemoAccession} className="text-[11px] font-bold text-[#234b6b] hover:underline">Load 3 rice accessions</button>
                    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {(['ncbi', 'uniprot'] as const).map((db) => (
                      <button
                        key={db}
                        type="button"
                        onClick={() => setAccType(db)}
                        className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${accType === db ? 'bg-[#234b6b] text-white shadow-sm' : 'text-slate-500'}`}
                      >
                        {db === 'ncbi' ? 'NCBI' : 'UniProt'}
                      </button>
                    ))}
                    </div>
                  </div>
                </div>
                <textarea
                  id="rsl-accessions"
                  rows={4}
                  value={accession}
                  onChange={(e) => { setAccession(e.target.value); setTextareaSeq(''); }}
                  placeholder="Q01883&#10;P0C510&#10;P0C432"
                  className="form-input-rslpred w-full resize-y p-3 font-mono text-xs leading-6"
                />
                <div className="flex flex-col gap-3 rounded-xl border border-[#DDE7EA] bg-[#FCFAF4] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-slate-600"><strong className="text-[#3c5d73]">Run prediction</strong> will fetch these sequences automatically. Preview is optional.</p>
                  <button
                    type="button"
                    onClick={handleFetchAccessions}
                    disabled={fetchingAcc}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[#b9c9d5] bg-white px-4 py-2 text-xs font-bold text-[#234b6b] transition hover:border-[#234b6b] disabled:opacity-50"
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
                <div className="relative cursor-pointer rounded-2xl border-2 border-dashed border-[#C9D5D8] bg-[#FCFAF4] p-8 text-center transition hover:border-[#234b6b] hover:bg-[#F1F5F5]">
                  <input type="file" accept=".fasta,.fa,.txt,.csv,.tsv" onChange={handleFileUpload} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                  <Upload className="mx-auto h-7 w-7 text-[#234b6b]" />
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
                  <button type="button" onClick={() => setTextareaSeq(DEMO_FASTA)} className="shrink-0 text-xs font-bold text-[#234b6b] hover:underline">Load demo</button>
                </div>
                <textarea id="rsl-fasta" rows={12} value={textareaSeq} onChange={(e) => setTextareaSeq(e.target.value)} placeholder=">protein_id&#10;MALQVESTF..." className="form-input-rslpred min-h-[20rem] w-full resize-y bg-white p-4 font-mono text-xs leading-6" />
              </div>
            )}

            {textareaSeq && inputMode !== 'paste' && (
              <div className="overflow-hidden rounded-2xl border border-[#D9E4E7] bg-white">
                <div className="flex items-center justify-between border-b border-[#DDE7EA] bg-[#F1F5F5] px-4 py-3">
                  <span className="flex items-center gap-2 text-xs font-bold text-[#234b6b]"><CheckCircle2 className="h-4 w-4" /> {sequenceCount} sequence{sequenceCount === 1 ? '' : 's'} ready</span>
                  <button type="button" onClick={() => setTextareaSeq('')} className="text-[11px] font-bold text-slate-500 hover:text-slate-800">Clear preview</button>
                </div>
                <textarea rows={7} value={textareaSeq} onChange={(e) => setTextareaSeq(e.target.value)} className="w-full resize-y border-0 bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100 outline-none" aria-label="Fetched FASTA preview" />
              </div>
            )}
              <div className="mt-5 flex flex-col gap-3 border-l-2 border-[#466b86] bg-[#f4f7f9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-[#536470]"><strong className="text-[#263642]">Working with a large dataset?</strong> Use the standalone RSLpred-2.0 package for local, scripted, and repeated analyses.</p>
                <Link href="/download" className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#234b6b] hover:underline">View standalone tool <ExternalLink className="h-3.5 w-3.5" /></Link>
              </div>
            </div>
            </div>
          </section>

          <section className="border-t border-[#d8e0e6] bg-[#fbfcfd] p-6 sm:p-8 lg:p-10" aria-labelledby="options-heading">
            <div className="space-y-6">
              <div className="flex items-start justify-between border-b border-[#d1dbe2] pb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a3c]">Step 3</p>
                  <h2 id="options-heading" className="mt-1 text-2xl font-semibold text-[#1e2a33]">Choose the prediction level</h2>
                </div>
              </div>

              {/* Level Selection Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#8a6a3c]" />
                    <span>Select prediction depth</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLevelModal(true)}
                    className="text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`flex cursor-pointer items-center space-x-3 rounded-xl border p-4 transition-all ${
                    predictionLevel === 'level1' ? 'border-[#466b86] bg-[#edf3f6]' : 'border-[#d1dbe2] bg-white hover:border-[#aebfcc]'
                  }`}>
                    <input
                      type="radio"
                      name="predictionLevel"
                      checked={predictionLevel === 'level1'}
                      onChange={() => setPredictionLevel('level1')}
                      className="h-4 w-4 text-[#234b6b] focus:ring-[#234b6b]"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">Level I: Single vs Dual</div>
                      <div className="text-[11px] text-slate-500">Classifies query sequences into single or dual organelle localization</div>
                    </div>
                  </label>

                  <label className={`flex cursor-pointer items-center space-x-3 rounded-xl border p-4 transition-all ${
                    predictionLevel === 'level2' ? 'border-[#466b86] bg-[#edf3f6]' : 'border-[#d1dbe2] bg-white hover:border-[#aebfcc]'
                  }`}>
                    <input
                      type="radio"
                      name="predictionLevel"
                      checked={predictionLevel === 'level2'}
                      onChange={() => setPredictionLevel('level2')}
                      className="h-4 w-4 text-[#234b6b] focus:ring-[#234b6b]"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">Level II: Single 10-Class</div>
                      <div className="text-[11px] text-slate-500">10 Organelles: Vacuole, Cytoplasm, Peroxisome, Golgi, ER, Membrane, etc.</div>
                    </div>
                  </label>

                  <label className={`flex cursor-pointer items-center space-x-3 rounded-xl border p-4 transition-all ${
                    predictionLevel === 'level3' ? 'border-[#466b86] bg-[#edf3f6]' : 'border-[#d1dbe2] bg-white hover:border-[#aebfcc]'
                  }`}>
                    <input
                      type="radio"
                      name="predictionLevel"
                      checked={predictionLevel === 'level3'}
                      onChange={() => setPredictionLevel('level3')}
                      className="h-4 w-4 text-[#234b6b] focus:ring-[#234b6b]"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">Level III: Dual 6-Class</div>
                      <div className="text-[11px] text-slate-500">6 Organelle Pairs: Plastid & Mitochondria, Nucleus & Cytoplasm, etc.</div>
                    </div>
                  </label>

                  <label className={`flex cursor-pointer items-center space-x-3 rounded-xl border p-4 transition-all ${
                    predictionLevel === 'level4' ? 'border-[#466b86] bg-[#edf3f6]' : 'border-[#d1dbe2] bg-white hover:border-[#aebfcc]'
                  }`}>
                    <input
                      type="radio"
                      name="predictionLevel"
                      checked={predictionLevel === 'level4'}
                      onChange={() => setPredictionLevel('level4')}
                      className="h-4 w-4 text-[#234b6b] focus:ring-[#234b6b]"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">Level IV: Membrane Topology</div>
                      <div className="text-[11px] text-slate-500">Classifies membrane proteins into Single-Pass or Multi-Pass</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="my-3 border-t border-[#d8e0e6]" />

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

                <div className="grid grid-cols-2 gap-px border border-[#d1dbe2] bg-[#d1dbe2]">
                  <label className={`flex cursor-pointer flex-col justify-between space-y-1 p-3 transition-all ${
                    predMethod === 'fast' ? 'bg-[#edf3f6]' : 'bg-white hover:bg-[#f4f7f9]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900">Fast</span>
                      <input
                        type="radio"
                        name="predMethod"
                        value="fast"
                        checked={predMethod === 'fast'}
                        onChange={() => setPredMethod('fast')}
                        className="w-3.5 h-3.5 text-[#234b6b] focus:ring-[#234b6b]"
                      />
                    </div>
                    <span className="text-[11px] text-slate-600">DPCP Feature Vector. Fast speed.</span>
                  </label>

                  <label className={`flex cursor-pointer flex-col justify-between space-y-1 p-3 transition-all ${
                    predMethod === 'sensitive' ? 'bg-[#efece5]' : 'bg-white hover:bg-[#f4f7f9]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900">Sensitive</span>
                      <input
                        type="radio"
                        name="predMethod"
                        value="sensitive"
                        checked={predMethod === 'sensitive'}
                        onChange={() => setPredMethod('sensitive')}
                        className="w-3.5 h-3.5 text-[#8a6a3c] focus:ring-[#8a6a3c]"
                      />
                    </div>
                    <span className="text-[11px] text-slate-600">TPC Feature Vector. Highest accuracy.</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 space-y-4 border-t border-[#c3cfd8] pt-7">
              <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a3c]">Step 4</p><h3 className="mt-1 text-xl font-semibold text-[#1e2a33]">Verify and submit</h3><p className="mt-1 text-xs leading-5 text-[#667581]">Your private results page opens automatically when processing is complete.</p></div>
              <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTurnstileToken} resetKey={turnstileResetKey} />
              {submitting && (
                <div className="rounded-xl border border-[#C4D8DE] bg-[#EEF4F5] p-3" role="status" aria-live="polite">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#234b6b]"><Loader2 className="h-4 w-4 animate-spin" /> Prediction in progress</div>
                  <p className="mt-1 pl-6 text-[11px] leading-5 text-slate-600">{jobStatusText} You may keep this page open; status checks use short requests.</p>
                  {jobReceipt && (
                    <div className="mt-3 rounded-lg border border-[#D4E0E3] bg-white p-3">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#234b6b]"><Bookmark className="h-3.5 w-3.5" /> Save your results link</div>
                      <p className="mt-1 font-mono text-[11px] font-bold text-[#1e2a33]">{jobReceipt.jobId}</p>
                      <div className="mt-2 flex gap-2">
                        <input readOnly value={jobReceipt.url} aria-label="Bookmarkable results URL" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 font-mono text-[10px] text-slate-600" />
                        <button type="button" onClick={() => void navigator.clipboard.writeText(jobReceipt.url).then(() => { setLinkCopied(true); window.setTimeout(() => setLinkCopied(false), 1800); })} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1e2a33] px-3 py-2 text-[11px] font-bold text-white">{linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{linkCopied ? 'Copied' : 'Copy'}</button>
                      </div>
                      <p className="mt-2 text-[10px] leading-4 text-slate-500">Keep this private link. It remains available for 30 days.</p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 px-3 py-3 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-slate-800"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset All</span>
              </button>

              <button
                type="button"
                onClick={handleRunPrediction}
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 bg-[#234b6b] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#18384f] disabled:opacity-50"
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
          </section>
        </div>
      </form>

      <section className="border-y border-[#c4ccc5] py-6" aria-labelledby="prediction-citation-title">
        <div className="grid gap-4 md:grid-cols-[190px_1fr] md:items-start">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#e9eff3] text-[#234b6b]">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#234b6b]">Publication</p>
              <h2 id="prediction-citation-title" className="mt-0.5 text-sm font-bold text-[#1e2a33]">Please cite RSLpred2</h2>
            </div>
          </div>
          <div className="border-t border-[#d8e0e6] pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <cite className="block not-italic text-xs font-semibold leading-5 text-slate-700">
              Duhan, N., &amp; Kaundal, R. (2025). RSLpred2: An Integrated Web Server for the Annotation of Rice Proteome Subcellular Localization Using Deep Learning. <em>Rice, 18</em>, 58.
            </cite>
            <a
              href="https://doi.org/10.1186/s12284-025-00767-7"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#234b6b] hover:underline"
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
              <h3 className="font-bold text-lg text-slate-900">About prediction levels</h3>
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
              <h3 className="font-bold text-lg text-slate-900">About model strategies</h3>
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
              <h3>Prediction could not be submitted</h3>
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
