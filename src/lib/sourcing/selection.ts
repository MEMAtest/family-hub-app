import type { ProjectSourcing, SourcedProduct, SourcingRequirement, SourcingRoomId } from '@/types/sourcing.types';
import { productComponentEvidence } from './productMatching';
import { plannedTileCalculation } from './tilePlanner';

export function demandFor(sourcing: ProjectSourcing, requirement: SourcingRequirement): SourcingRequirement {
  const original = sourcing.requirements.find((item) => item.id === requirement.replacesRequirementId && item.roomId === requirement.roomId && !item.replacesRequirementId);
  return original ?? requirement;
}

export function requiredDemands(sourcing: ProjectSourcing, roomId?: SourcingRoomId) {
  return sourcing.requirements.filter((item) => (!roomId || item.roomId === roomId) && !item.replacesRequirementId && item.purpose !== 'alternative' && item.purpose !== 'check' && item.category !== 'Fitter check');
}

export function primaryComponent(requirement: SourcingRequirement) {
  return requirement.primaryComponent ?? (requirement.requiredComponents.includes('vanity') ? 'vanity' : requirement.requiredComponents[0]);
}

export function evaluateSelection(sourcing: ProjectSourcing, requirement: SourcingRequirement, components?: string[], quantity?: number) {
  const demand = demandFor(sourcing, requirement);
  const required = components ?? demand.requiredComponents;
  const target = quantity ?? demand.quantity;
  const selected = sourcing.basket.filter((entry) => {
    const linked = sourcing.requirements.find((item) => item.id === entry.requirementId);
    return linked && linked.roomId === demand.roomId && demandFor(sourcing, linked).id === demand.id;
  }).flatMap((item) => {
    const product = sourcing.products.find((candidate) => candidate.id === item.productId);
    return product ? [{ item, product, evidence: productComponentEvidence(product, demand.requiredComponents) }] : [];
  });
  const coverage = required.map((component) => {
    const amount = selected.reduce((sum, { item, evidence }) => {
      const entry = evidence[component];
      return sum + (entry?.state === 'included' && Number.isFinite(entry.quantity) && entry.quantity > 0 && Number.isFinite(item.quantity) && item.quantity > 0 ? entry.quantity * item.quantity : 0);
    }, 0);
    return { component, quantity: amount, required: target, unknown: selected.some(({ evidence }) => !evidence[component] || evidence[component].state === 'unknown') };
  });
  const missing = coverage.filter((part) => part.quantity < part.required).map((part) => part.component);
  const enough = demand.category === 'Tiles' ? selected.some(({ item }) => !!plannedTileCalculation(sourcing, item)) : required.length ? missing.length === 0 : selected.reduce((sum, { item }) => sum + (Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 0), 0) >= target;
  const complete = selected.length > 0 && enough;
  const warnings = coverage.filter((part) => part.quantity > part.required && /waste|valves/.test(part.component)).map((part) => `Duplicate ${part.component.replace(/-/g, ' ')}: ${part.quantity}/${part.required}. Review bundled and separate parts; nothing removed.`);
  const primary = primaryComponent(demand);
  if (primary && selected.filter(({ evidence }) => evidence[primary]?.state === 'included').length > 1) warnings.push('Multiple fixture choices for this demand. Resolve the competing selections before ordering.');
  return { demand, selected, selections: selected, coverage, missing, complete, partial: !complete && selected.length > 0, unknown: coverage.some((part) => part.unknown && part.quantity < part.required), warnings,
    deviation: selected.some(({ item }) => !!item.optionRequirementId || !!sourcing.requirements.find((entry) => entry.id === item.requirementId)?.replacesRequirementId) };
}

export function quoteSelection(sourcing: ProjectSourcing, line: NonNullable<ProjectSourcing['quoteLines']>[number]) {
  const requirement = sourcing.requirements.find((item) => item.id === line.requirementId && item.roomId === line.roomId);
  if (!requirement) return { selections: [], selected: [], coverage: line.components.map((component) => ({ component, quantity: 0, required: line.quantity, unknown: false })), complete: false, partial: false, unknown: false, warnings: [], missing: line.components, deviation: false };
  const result = evaluateSelection(sourcing, requirement, line.components, line.quantity);
  // Selection is a basket fact, not a coverage verdict. Anchor purchases to the demand line.
  const primary = primaryComponent(result.demand);
  const anchor = primary ? line.components.includes(primary) : sourcing.quoteLines?.find((entry) => entry.requirementId === result.demand.id)?.id === line.id;
  const selections = result.selected.filter(({ evidence }) => anchor || line.components.some((part) => evidence[part]?.state === 'included') || !Object.values(evidence).some((entry) => entry.state === 'included'));
  return { ...result, selected: selections, selections, partial: !result.complete && selections.length > 0 };
}

export function isPrimaryOption(product: SourcedProduct, requirement: SourcingRequirement) {
  const primary = primaryComponent(requirement);
  return !primary || productComponentEvidence(product, requirement.requiredComponents)[primary]?.state === 'included';
}

/** Legacy supporting-part tags cannot establish that its dimensions describe the main fixture. */
export function isDimensionedFixture(product: SourcedProduct, requirement: SourcingRequirement) {
  const primary = primaryComponent(requirement);
  if (primary && product.components.length && !product.components.includes(primary) && !product.componentEvidence?.[primary]) return false;
  return isPrimaryOption(product, requirement);
}
