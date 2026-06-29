import { getCatalogCollege } from '@/lib/tools/college/college-catalog';
import { computeBestScores } from '@/lib/tools/college/college-stats';

/**
 * Suggest reach/target/safety based on acceptance rate and student scores.
 * Returns null if insufficient data — financial safety is always manual.
 */
export function suggestClassification(catalogCollege, academics, testing) {
  if (!catalogCollege) return null;

  const rate = catalogCollege.acceptanceRate;
  const { bestSat, bestAct } = computeBestScores(testing);

  if (rate != null && rate < 0.15) {
    return 'reach';
  }

  const satRange = catalogCollege.satMid50;
  const actRange = catalogCollege.actMid50;

  let satPosition = null;
  let actPosition = null;

  if (bestSat && satRange) {
    if (bestSat < satRange[0]) satPosition = 'below';
    else if (bestSat > satRange[1]) satPosition = 'above';
    else satPosition = 'within';
  }

  if (bestAct && actRange) {
    if (bestAct < actRange[0]) actPosition = 'below';
    else if (bestAct > actRange[1]) actPosition = 'above';
    else actPosition = 'within';
  }

  const within = satPosition === 'within' || actPosition === 'within';
  const above = satPosition === 'above' || actPosition === 'above';
  const below = satPosition === 'below' || actPosition === 'below';

  if (within) return 'target';
  if (above && rate != null && rate >= 0.4) return 'safety';
  if (above) return 'target';
  if (below) return 'reach';

  if (rate != null) {
    if (rate < 0.25) return 'reach';
    if (rate < 0.5) return 'target';
    return 'safety';
  }

  return null;
}

export function classificationLabel(id) {
  const map = {
    reach: 'Reach',
    target: 'Target',
    safety: 'Safety',
    financial_safety: 'Financial safety',
  };
  return map[id] || 'Unclassified';
}

export function getEffectiveClassification(myCollege, academics, testing) {
  if (myCollege.classificationManual && myCollege.classification) {
    return myCollege.classification;
  }
  const catalog = getCatalogCollege(myCollege.catalogId);
  const suggested = suggestClassification(catalog, academics, testing);
  return myCollege.classification || suggested;
}
