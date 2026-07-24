import { useCallback, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  listAssistantDestinations,
  mapDestinationToPlan,
} from '@/lib/tools/converter/goal-assistant.js';
import { listCompatibilityProfiles } from '@/lib/tools/converter/compatibility-profiles.js';
import { formatWarning } from '@/lib/tools/converter/converter-warnings.js';
import { jobToSourceAnalysis } from '@/lib/tools/converter/workspace/batch-selection.js';

/**
 * @param {object} props
 * @param {ReadonlyArray<import('@/lib/tools/converter/converter-job-model.js').ConverterJob>} [props.selectedJobs]
 * @param {import('@/lib/tools/converter/source-analysis.js').SourceAnalysis | null} [props.firstAnalyzedSource]
 * @param {(suggestion: import('@/lib/tools/converter/goal-assistant.js').AssistantSuggestion) => void} props.onApply
 * @param {boolean} [props.disabled]
 */
export default function ConverterGoalAssistant({
  selectedJobs = [],
  firstAnalyzedSource = null,
  onApply,
  disabled = false,
}) {
  const [activeDestinationId, setActiveDestinationId] = useState('');

  const source = useMemo(() => {
    if (firstAnalyzedSource?.format) return firstAnalyzedSource;
    for (const job of selectedJobs) {
      const analysis = jobToSourceAnalysis(job);
      if (analysis?.format) return analysis;
    }
    return null;
  }, [firstAnalyzedSource, selectedJobs]);

  const destinations = useMemo(() => {
    const all = listAssistantDestinations();
    if (!source?.category) return all;

    const category = String(source.category);
    const profileHints = new Map(
      listCompatibilityProfiles().map((profile) => [profile.id, profile.categoryHints ?? []]),
    );

    return all.filter((destination) => {
      if (destination.kind === 'profile' || destination.kind === 'compatibility') {
        const profileId = destination.refId ?? destination.id.replace(/^profile:/, '');
        const hints = profileHints.get(profileId);
        return !hints?.length || hints.includes(/** @type {'image' | 'audio' | 'video' | 'data'} */ (category));
      }
      const bareId = destination.refId ?? destination.id.replace(/^preset:/, '');
      if (bareId === 'preserve-animation') {
        return category === 'image' && source.animated === true;
      }
      if (bareId === 'social-video') {
        return category === 'video' || category === 'image';
      }
      return mapDestinationToPlan(destination.id, source) != null;
    });
  }, [source]);

  const suggestion = useMemo(() => {
    if (!source || !activeDestinationId) return null;
    return mapDestinationToPlan(activeDestinationId, source);
  }, [activeDestinationId, source]);

  const handleSelect = useCallback((destinationId) => {
    setActiveDestinationId(destinationId);
  }, []);

  const handleApply = useCallback(() => {
    if (!suggestion) return;
    onApply(suggestion);
  }, [onApply, suggestion]);

  if (!source) return null;

  return (
    <section className="tools-converter-assistant" aria-labelledby="converter-assistant-heading">
      <div className="tools-converter-assistant-header">
        <Sparkles size={18} aria-hidden />
        <div>
          <h2 id="converter-assistant-heading">Goal assistant</h2>
          <p>Suggested destinations for {source.format.toUpperCase()} ({source.category}).</p>
        </div>
      </div>

      <div
        className="tools-converter-assistant-chips"
        role="listbox"
        aria-label="Conversion destinations"
        aria-activedescendant={activeDestinationId ? `destination-${activeDestinationId}` : undefined}
      >
        {destinations.map((destination) => {
          const isActive = activeDestinationId === destination.id;
          return (
            <button
              key={destination.id}
              id={`destination-${destination.id}`}
              type="button"
              role="option"
              aria-selected={isActive}
              className={`tools-converter-assistant-chip${isActive ? ' tools-converter-assistant-chip--active' : ''}`}
              disabled={disabled}
              onClick={() => handleSelect(destination.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleSelect(destination.id);
                }
              }}
            >
              <span className="tools-converter-assistant-chip-label">{destination.label}</span>
              <span className="tools-converter-assistant-chip-desc">{destination.description}</span>
            </button>
          );
        })}
      </div>

      {suggestion && (
        <div className="tools-converter-assistant-detail" role="region" aria-live="polite">
          <p className="tools-converter-assistant-explanation">{suggestion.explanation}</p>
          {suggestion.warnings.length > 0 && (
            <ul className="tools-converter-assistant-warnings">
              {suggestion.warnings.map((code) => {
                const warning = formatWarning(code);
                return (
                  <li key={code} data-severity={warning.severity}>
                    {warning.message}
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            className="tools-converter-btn tools-converter-btn--primary"
            disabled={disabled}
            onClick={handleApply}
          >
            Apply destination
          </button>
        </div>
      )}
    </section>
  );
}
