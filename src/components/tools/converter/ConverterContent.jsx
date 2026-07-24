import { useEffect, useMemo, useState } from 'react';
import { Link2, RotateCcw, Upload } from 'lucide-react';
import ConverterActivePreview from '@/components/tools/converter/ConverterActivePreview';
import ConverterConvertPanel from '@/components/tools/converter/ConverterConvertPanel';
import ConverterQualityPanel from '@/components/tools/converter/ConverterQualityPanel';
import ConverterActionPanel from '@/components/tools/converter/ConverterActionPanel';
import ConverterFileStrip from '@/components/tools/converter/ConverterFileStrip';
import ConverterUploadZone from '@/components/tools/converter/ConverterUploadZone';
import ConverterAuthorizedUrlImportSlot from '@/components/tools/converter/ConverterAuthorizedUrlImportSlot';
import ConverterPlaylistDiscoverySlot from '@/components/tools/converter/ConverterPlaylistDiscoverySlot';
import ConverterAiAssistSlot from '@/components/tools/converter/ConverterAiAssistSlot';
import ConverterAiOcrSlot from '@/components/tools/converter/ConverterAiOcrSlot';
import ConverterAiTranscribeSlot from '@/components/tools/converter/ConverterAiTranscribeSlot';
import PdfPrivacyNote from '@/components/tools/pdftools/PdfPrivacyNote';
import { hasRequiredAcknowledgments } from '@/components/tools/converter/converter-ui-utils';
import { useConverterWorkspace } from '@/hooks/useConverterWorkspace';
import { useToolCapabilities } from '@/hooks/useToolCapabilities';
import { setRemoteAiPlanSeed } from '@/lib/tools/converter/ai/ai-plan-seed.js';
import {
  CONVERTER_URL_IMPORT_CAPABILITY,
  CONVERTER_PLAYLIST_IMPORT_CAPABILITY,
  CONVERTER_AI_ASSIST_CAPABILITY,
  CONVERTER_AI_OCR_CAPABILITY,
  CONVERTER_AI_TRANSCRIBE_CAPABILITY,
} from '@/lib/tools/tool-capabilities';

function stemFromFileName(name) {
  const base = String(name ?? 'file');
  const idx = base.lastIndexOf('.');
  return idx > 0 ? base.slice(0, idx) : base;
}

export default function ConverterContent() {
  const { slots, has } = useToolCapabilities();
  const workspace = useConverterWorkspace();
  const {
    jobs,
    statusMessage,
    rejections,
    acceptAttribute,
    acknowledgments,
    addFiles,
    pasteFromClipboard,
    setOperation,
    setOptions,
    setAcknowledgment,
    getSourceObjectUrl,
    startJob,
    cancelJob,
    retryJob,
    removeJob,
    reset,
    downloadJob,
    deviceProfile,
    isJobReadyToConvert,
  } = workspace;

  const visibleJobs = useMemo(() => jobs.filter((job) => !job.removed), [jobs]);
  const isEmpty = visibleJobs.length === 0;
  const [activeJobId, setActiveJobId] = useState(/** @type {string | null} */ (null));
  const [outputStem, setOutputStem] = useState('');
  const [adminSourcesOpen, setAdminSourcesOpen] = useState(false);
  const canImportLinks = has(CONVERTER_URL_IMPORT_CAPABILITY);

  const activeJob = useMemo(
    () => visibleJobs.find((job) => job.id === activeJobId) ?? visibleJobs[0] ?? null,
    [visibleJobs, activeJobId],
  );

  useEffect(() => {
    if (!visibleJobs.length) {
      setActiveJobId(null);
      return;
    }
    if (!activeJobId || !visibleJobs.some((job) => job.id === activeJobId)) {
      setActiveJobId(visibleJobs[0].id);
    }
  }, [visibleJobs, activeJobId]);

  useEffect(() => {
    if (!activeJob) {
      setOutputStem('');
      return;
    }
    setOutputStem(stemFromFileName(activeJob.source.name));
  }, [activeJob?.id, activeJob?.source.name]);

  const sourceUrls = useMemo(() => {
    /** @type {Record<string, string | null>} */
    const map = {};
    for (const job of visibleJobs) {
      map[job.id] = getSourceObjectUrl(job.id);
    }
    return map;
  }, [visibleJobs, getSourceObjectUrl]);

  const activeSourceUrl = activeJob ? sourceUrls[activeJob.id] ?? null : null;

  const canConvertActive = Boolean(
    activeJob
    && isJobReadyToConvert(activeJob)
    && hasRequiredAcknowledgments(activeJob, acknowledgments),
  );

  // Keep paste working after the empty dropzone unmounts.
  useEffect(() => {
    if (isEmpty) return undefined;
    const onPaste = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      const fileList = event.clipboardData?.files;
      if (fileList?.length) {
        event.preventDefault();
        void addFiles([...fileList]);
        return;
      }
      event.preventDefault();
      void pasteFromClipboard();
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isEmpty, addFiles, pasteFromClipboard]);

  const adminSourcePanels = slots.inputSources ?? (
    <>
      <ConverterAuthorizedUrlImportSlot />
      <ConverterPlaylistDiscoverySlot />
    </>
  );

  const showAi = has(CONVERTER_AI_ASSIST_CAPABILITY)
    || has(CONVERTER_AI_OCR_CAPABILITY)
    || has(CONVERTER_AI_TRANSCRIBE_CAPABILITY)
    || Boolean(slots.aiPanels);
  const aiPanels = slots.aiPanels ?? (
    <>
      <ConverterAiAssistSlot
        canApplyRemote={has(CONVERTER_URL_IMPORT_CAPABILITY) || has(CONVERTER_PLAYLIST_IMPORT_CAPABILITY)}
        onApplyLocalPlan={(plan) => {
          if (!activeJob) return;
          if (plan.operationId) {
            setOperation(activeJob.id, plan.operationId, plan.options || {});
          }
        }}
        onApplyRemotePlan={(plan) => {
          setRemoteAiPlanSeed(plan);
        }}
      />
      <ConverterAiOcrSlot />
      <ConverterAiTranscribeSlot />
    </>
  );

  const onSetOptions = (options) => {
    if (!activeJob) return;
    setOptions(activeJob.id, options);
  };

  return (
    <div className={`pdf-editor tools-converter-workspace${isEmpty ? ' pdf-editor--empty' : ' pdf-editor--active'}`}>
      <p className="tools-converter-live" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </p>

      {!isEmpty && (
        <header className="pdf-editor-header pdf-editor-header--actions-only">
          <div className="pdf-editor-header-actions">
            <label className="pdf-btn pdf-btn--secondary pdf-btn--file pdf-btn--sm">
              <Upload size={14} /> Add files
              <input
                type="file"
                accept={acceptAttribute}
                multiple
                hidden
                onChange={(e) => {
                  if (!e.target.files?.length) return;
                  void addFiles([...e.target.files]);
                  e.target.value = '';
                }}
              />
            </label>
            {canImportLinks && (
              <button
                type="button"
                className="pdf-btn pdf-btn--ghost pdf-btn--sm"
                onClick={() => setAdminSourcesOpen((open) => !open)}
              >
                <Link2 size={14} /> Import links
              </button>
            )}
            <button
              type="button"
              className="pdf-btn pdf-btn--ghost pdf-btn--sm"
              onClick={() => {
                setAdminSourcesOpen(false);
                setActiveJobId(null);
                setOutputStem('');
                void reset();
              }}
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </header>
      )}

      {!isEmpty && (
        <ConverterFileStrip
          jobs={visibleJobs}
          activeJobId={activeJob?.id ?? null}
          sourceUrls={sourceUrls}
          onSelect={setActiveJobId}
          onRemove={(jobId) => {
            void removeJob(jobId);
            if (activeJobId === jobId) setActiveJobId(null);
          }}
        />
      )}

      {adminSourcesOpen && canImportLinks ? (
        <div className="converter-admin-sources">{adminSourcePanels}</div>
      ) : null}

      <div className={`pdf-editor-body${!isEmpty ? ' converter-workspace-columns' : ''}`}>
        {isEmpty ? (
          <main className="pdf-preview-area">
            <ConverterUploadZone
              accept={acceptAttribute}
              onFiles={addFiles}
              onPaste={pasteFromClipboard}
              rejections={rejections}
              canImportLinks={canImportLinks}
              onImportLinks={() => setAdminSourcesOpen(true)}
            />
          </main>
        ) : (
          <>
            <div className="converter-col converter-col--preview">
              <div className="converter-grid-preview">
                <ConverterActivePreview
                  job={activeJob}
                  sourceUrl={activeSourceUrl}
                />
              </div>
              <ConverterQualityPanel
                job={activeJob}
                onSetOptions={onSetOptions}
              />
            </div>
            <div className="converter-col converter-col--settings">
              <div className="converter-grid-settings">
                <ConverterConvertPanel
                  job={activeJob}
                  deviceProfile={deviceProfile}
                  acknowledgments={acknowledgments}
                  outputStem={outputStem}
                  onOutputStemChange={setOutputStem}
                  onSetOperation={(operationId) => {
                    if (!activeJob) return;
                    setOperation(activeJob.id, operationId);
                  }}
                  onAcknowledge={(code, checked) => {
                    if (!activeJob) return;
                    setAcknowledgment(activeJob.id, code, checked);
                  }}
                />
              </div>
              <ConverterActionPanel
                job={activeJob}
                canConvert={canConvertActive}
                needsAcknowledgments={Boolean(
                  activeJob && !hasRequiredAcknowledgments(activeJob, acknowledgments),
                )}
                onConvert={() => {
                  if (!activeJob) return;
                  startJob(activeJob.id);
                }}
                onCancel={() => {
                  if (!activeJob) return;
                  cancelJob(activeJob.id);
                }}
                onRetry={() => {
                  if (!activeJob) return;
                  void retryJob(activeJob.id);
                }}
                onDownload={() => {
                  if (!activeJob) return;
                  void downloadJob(activeJob.id);
                }}
              />
            </div>
          </>
        )}
      </div>

      {!isEmpty && showAi && (
        <details className="converter-admin-details">
          <summary>Admin tools</summary>
          {aiPanels}
        </details>
      )}

      {rejections.length > 0 && !isEmpty && (
        <ul className="tools-converter-rejections" aria-live="polite">
          {rejections.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              <span>{item.message}</span>
            </li>
          ))}
        </ul>
      )}

      <PdfPrivacyNote compact={!isEmpty} />
    </div>
  );
}
