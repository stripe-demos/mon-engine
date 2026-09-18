import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeText, updateArtifactFromAnswer, buildRecommendedConfig } from './analyzer';
import { scoreArtifact, deriveStatus, getNextMissingField } from './scoring';
import { CONTEXT_CATEGORIES, CATEGORY_LABELS, FIELD_QUESTIONS, FIELD_OPTIONS, FIELD_EXAMPLES } from './constants';
import { FIELD_SCHEMA, FIELD_LABELS } from './scoring';
import { hasValue, formatValue } from './contentSummary';

const MonetizationContext = createContext(null);

const STORAGE_KEY = 'mon_engine_state_v1';
const ANALYSIS_STEP_DELAY = 650;

// Extraction phases are deliberately slow and sequential — the chat panel narrates
// each field it checks, one at a time, as an audit trail, so the results panel
// appears to "build" in real time rather than snapping to its final state.
const PHASE_START_DELAY = 2200;
const FIELD_SEARCH_DELAY = 1150;
const FIELD_RESULT_HOLD_DELAY = 950;
const PHASE_SETTLE_DELAY = 2200;
const PHASE_GAP_DELAY = 1600;

let idCounter = 0;
const nextId = (prefix = 'msg') => `${prefix}_${Date.now()}_${++idCounter}`;

function emptyArtifact(category) {
  return {
    category,
    title: CATEGORY_LABELS[category],
    content: {},
    fieldSources: {},
    status: 'waiting',
    completeness: 0,
    confidence: 0,
    evidence: [],
    assumptions: [],
    missingInformation: [],
    provenance: 'extracted',
    needsAnswer: false,
    updatedAt: null,
  };
}

function initialArtifacts() {
  return Object.fromEntries(CONTEXT_CATEGORIES.map((c) => [c, emptyArtifact(c)]));
}

function loadPersisted() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function summarizePlans(plans = []) {
  return plans
    .map((p) => {
      if (p.basePrice === undefined) return `${p.name} (custom pricing)`;
      if (p.basePrice === 0) return `${p.name} (free)`;
      return `${p.name} ($${p.basePrice}/mo)`;
    })
    .join(', ');
}

export function MonetizationProvider({ children }) {
  const persisted = useMemo(loadPersisted, []);

  const [source, setSource] = useState(persisted?.source ?? null);
  const [artifacts, setArtifacts] = useState(persisted?.artifacts ?? initialArtifacts());
  const [messages, setMessages] = useState(persisted?.messages ?? []);
  const [config, setConfig] = useState(persisted?.config ?? null);
  const [stage, setStage] = useState(persisted?.stage ?? 'context');
  const [analysisPhase, setAnalysisPhase] = useState(persisted?.analysisPhase ?? 'idle');
  const [proposedConfigVisible, setProposedConfigVisible] = useState(persisted?.proposedConfigVisible ?? false);
  const [pendingField, setPendingField] = useState(persisted?.pendingField ?? null);
  const [configVersion, setConfigVersion] = useState(persisted?.configVersion ?? 0);
  const [viewedConfigVersion, setViewedConfigVersion] = useState(
    persisted?.viewedConfigVersion ?? { test_and_iterate: 0, update_your_code: 0 }
  );

  const [flashCategory, setFlashCategory] = useState(null);

  const generationRef = useRef(0);
  const timeoutsRef = useRef([]);
  const flashTimeoutRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          source, artifacts, messages, config, stage, analysisPhase, proposedConfigVisible, pendingField,
          configVersion, viewedConfigVersion,
        })
      );
    } catch {
      // sessionStorage unavailable (e.g. private mode) — degrade to in-memory only.
    }
  }, [source, artifacts, messages, config, stage, analysisPhase, proposedConfigVisible, pendingField, configVersion, viewedConfigVersion]);

  const clearScheduled = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  const schedule = useCallback((delay, fn) => {
    const t = setTimeout(fn, delay);
    timeoutsRef.current.push(t);
    return t;
  }, []);

  const pushMessage = useCallback((message) => {
    const id = message.id || nextId('msg');
    setMessages((prev) => [...prev, { id, createdAt: new Date().toISOString(), ...message }]);
    return id;
  }, []);

  const updateMessage = useCallback((id, patch) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  // Appends a new audit-trail entry (or patches an existing one by field) to
  // an 'audit' message — used to reveal each field check one at a time.
  const appendAuditEntry = useCallback((messageId, entry) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, entries: [...m.entries, entry] } : m)));
  }, []);

  const patchAuditEntry = useCallback((messageId, field, patch) => {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m;
      return { ...m, entries: m.entries.map((e) => (e.field === field ? { ...e, ...patch } : e)) };
    }));
  }, []);

  const applyArtifactPatch = useCallback((category, patch, { markUpdated = true, statusOverride } = {}) => {
    setArtifacts((prev) => {
      const current = prev[category];
      const nextContent = { ...current.content, ...(patch.content || {}) };
      const nextFieldSources = { ...current.fieldSources, ...(patch.fieldSources || {}) };
      const nextEvidence = [...current.evidence, ...(patch.evidence || [])];
      const nextAssumptions = Array.from(new Set([...current.assumptions, ...(patch.assumptions || [])]));

      const score = scoreArtifact(category, nextContent, nextFieldSources, {
        evidenceCount: nextEvidence.length,
      });

      const hasBeenAnalyzed = current.status !== 'waiting' || markUpdated;
      const needsAnswer = patch.needsAnswer ?? current.needsAnswer;
      const status = statusOverride || deriveStatus(score, { hasBeenAnalyzed, hasPendingQuestion: needsAnswer });

      const provenanceValues = Object.values(nextFieldSources);
      const provenance = provenanceValues.includes('user_confirmed')
        ? 'user_confirmed'
        : provenanceValues.includes('extracted')
          ? 'extracted'
          : provenanceValues.includes('recommended')
            ? 'recommended'
            : provenanceValues.includes('inferred')
              ? 'inferred'
              : current.provenance;

      return {
        ...prev,
        [category]: {
          ...current,
          content: nextContent,
          fieldSources: nextFieldSources,
          evidence: nextEvidence,
          assumptions: nextAssumptions,
          missingInformation: score.missingFields,
          completeness: score.completeness,
          confidence: score.confidence,
          confidenceFactors: score.confidenceFactors,
          needsAnswer,
          provenance,
          status: markUpdated && current.status === 'ready' ? 'updated' : status,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }, []);

  const askField = useCallback((category, field) => {
    setPendingField({ category, field });
    setArtifacts((prev) => ({ ...prev, [category]: { ...prev[category], needsAnswer: true } }));
    const options = FIELD_OPTIONS[category]?.[field];
    const example = FIELD_EXAMPLES[category]?.[field];
    const content = example ? `${FIELD_QUESTIONS[category][field]}\n${example}` : FIELD_QUESTIONS[category][field];
    if (options) {
      pushMessage({
        role: 'assistant',
        type: 'action',
        content,
        category,
        actions: options.map((o) => ({ id: `field:${category}:${field}:${o.id}`, label: o.label, recommended: o.recommended })),
      });
    } else {
      pushMessage({
        role: 'assistant',
        type: 'form',
        content,
        category,
      });
    }
  }, [pushMessage]);

  const advanceQuestionFlow = useCallback((category, content) => {
    const nextField = getNextMissingField(category, content);
    if (nextField) {
      askField(category, nextField);
      return;
    }

    setPendingField(null);
    setArtifacts((prev) => {
      const current = prev[category];
      const score = scoreArtifact(category, current.content, current.fieldSources, {
        evidenceCount: current.evidence.length,
      });
      const status = deriveStatus(score, { hasBeenAnalyzed: true, hasPendingQuestion: false });
      return { ...prev, [category]: { ...current, needsAnswer: false, status } };
    });

    // Any path through the pricing questions (recommended, comparable, manual,
    // or from-scratch) should leave the user with a config they can actually
    // test — generate a fallback if the chat flow never produced one.
    if (category === 'pricing_and_packaging') {
      setConfig((prev) => {
        if (prev) return prev;
        const recommended = buildRecommendedConfig();
        setConfigVersion((v) => v + 1);
        setProposedConfigVisible(true);
        pushMessage({
          role: 'assistant',
          type: 'text',
          content: 'Your pricing details are complete — I put together a testable configuration based on them. You can review and edit it in Test and iterate.',
          category,
        });
        return recommended;
      });
    }
  }, [askField, pushMessage]);

  const runAnalysis = useCallback((src, genId) => {
    const isCurrent = () => generationRef.current === genId;

    setAnalysisPhase('reading_source');
    pushMessage({
      role: 'assistant',
      type: 'text',
      content:
        src.type === 'document'
          ? `Thanks — I'm reading \`${src.name}\` and organizing what it says about your business, product, customers, and monetization model.`
          : src.type === 'url'
            ? `Thanks — I'm reading ${src.name} and organizing what it says about your business, product, customers, and monetization model.`
            : `Thanks — I'm organizing what you shared about your business, product, customers, and monetization model.`,
    });

    const analysis = analyzeText(src.rawText || '', src.id, src.name);
    const EXTRACTION_CATEGORIES = ['business_details', 'business_model', 'value_proposition', 'what_you_sell'];

    let cursor = PHASE_START_DELAY;

    EXTRACTION_CATEGORIES.forEach((category) => {
      const fields = [...FIELD_SCHEMA[category].required, ...FIELD_SCHEMA[category].optional];
      const phaseDelay = cursor;
      const pushedEvidenceIds = new Set();

      schedule(phaseDelay, () => {
        if (!isCurrent()) return;
        setAnalysisPhase(category);
        setArtifacts((prev) => ({ ...prev, [category]: { ...prev[category], status: 'analyzing' } }));
        const messageId = pushMessage({
          role: 'assistant',
          type: 'audit',
          category,
          title: `Auditing ${CATEGORY_LABELS[category].toLowerCase()}`,
          entries: [],
          status: 'active',
        });

        let fieldCursor = 0;
        fields.forEach((field) => {
          schedule(fieldCursor, () => {
            if (!isCurrent()) return;
            appendAuditEntry(messageId, { field, label: FIELD_LABELS[field] || field, state: 'searching' });
          });
          fieldCursor += FIELD_SEARCH_DELAY;

          schedule(fieldCursor, () => {
            if (!isCurrent()) return;
            const value = analysis[category].content[field];
            const found = hasValue(value);
            patchAuditEntry(messageId, field, {
              state: found ? 'found' : 'missing',
              value: found ? formatValue(value) : null,
            });
            if (found) {
              const evidence = (analysis[category].evidence || []).filter(
                (e) => e.supportedFields.includes(field) && !pushedEvidenceIds.has(e.id)
              );
              evidence.forEach((e) => pushedEvidenceIds.add(e.id));
              applyArtifactPatch(category, {
                content: { [field]: value },
                fieldSources: { [field]: analysis[category].fieldSources[field] },
                evidence,
              }, { markUpdated: false, statusOverride: 'analyzing' });
            }
          });
          fieldCursor += FIELD_RESULT_HOLD_DELAY;
        });

        schedule(fieldCursor + PHASE_SETTLE_DELAY, () => {
          if (!isCurrent()) return;
          applyArtifactPatch(category, { assumptions: analysis[category].assumptions }, { markUpdated: false });
          const schema = FIELD_SCHEMA[category];
          const requiredFound = schema.required.filter((f) => hasValue(analysis[category].content[f])).length;
          const optionalFound = schema.optional.filter((f) => hasValue(analysis[category].content[f])).length;
          updateMessage(messageId, {
            status: 'done',
            allRequiredFound: requiredFound === schema.required.length,
            requiredSummary: `${requiredFound}/${schema.required.length} required fields found`,
            optionalSummary: `${optionalFound}/${schema.optional.length} optional fields found`,
          });
        });
      });

      cursor = phaseDelay + fields.length * (FIELD_SEARCH_DELAY + FIELD_RESULT_HOLD_DELAY) + PHASE_SETTLE_DELAY + PHASE_GAP_DELAY;
    });

    schedule(cursor, () => {
      if (!isCurrent()) return;
      setAnalysisPhase('pricing_and_packaging');
      applyArtifactPatch('pricing_and_packaging', {}, { statusOverride: 'needs_information' });
      pushMessage({
        role: 'assistant',
        type: 'text',
        content: 'No pricing or packaging strategy was found in the source. Let me know how much guidance you want and I\'ll take it from there.',
        category: 'pricing_and_packaging',
      });
      askField('pricing_and_packaging', 'pricingGuidanceLevel');
      setAnalysisPhase('context_ready');
    });
  }, [applyArtifactPatch, appendAuditEntry, askField, patchAuditEntry, pushMessage, schedule, updateMessage]);

  // Lets the user add another document or website mid-flow, without resetting
  // anything already confirmed. Only fills gaps in fields that are still
  // missing — existing content (whatever its provenance) always wins, so a
  // later reference can never silently overwrite an earlier answer.
  const addReferenceSource = useCallback((src) => {
    pushMessage({
      role: 'user',
      type: 'text',
      content: src.type === 'url' ? `Added reference: ${src.name}` : `Uploaded reference: ${src.name}`,
    });

    const analysis = analyzeText(src.rawText || '', src.id, src.name);
    const EXTRACTION_CATEGORIES = ['business_details', 'business_model', 'value_proposition', 'what_you_sell', 'pricing_and_packaging'];
    const filledLabels = [];

    EXTRACTION_CATEGORIES.forEach((category) => {
      const current = artifacts[category].content;
      const patchContent = {};
      const patchSources = {};
      const filledFields = [];

      Object.keys(analysis[category].content).forEach((field) => {
        if (hasValue(current[field])) return;
        const value = analysis[category].content[field];
        if (!hasValue(value)) return;
        patchContent[field] = value;
        patchSources[field] = analysis[category].fieldSources[field];
        filledFields.push(field);
      });

      if (filledFields.length === 0) return;
      const evidence = (analysis[category].evidence || []).filter((e) =>
        e.supportedFields.some((f) => filledFields.includes(f))
      );
      applyArtifactPatch(category, { content: patchContent, fieldSources: patchSources, evidence }, { markUpdated: true });
      filledFields.forEach((f) => filledLabels.push(FIELD_LABELS[f] || f));
    });

    pushMessage({
      role: 'assistant',
      type: 'text',
      content: filledLabels.length
        ? `Found new details in ${src.name}: ${filledLabels.join(', ')}. I've added them to your context.`
        : `I read ${src.name}, but everything it covers is already in your context — nothing new to add.`,
    });
  }, [applyArtifactPatch, artifacts, pushMessage]);

  const startContextAnalysis = useCallback((src) => {
    clearScheduled();
    generationRef.current += 1;
    const genId = generationRef.current;
    setSource(src);
    setArtifacts(initialArtifacts());
    setMessages([]);
    setConfig(null);
    setProposedConfigVisible(false);
    setPendingField(null);
    setStage('context');
    runAnalysis(src, genId);
  }, [clearScheduled, runAnalysis]);

  const pendingQuestionCategory = pendingField?.category ?? null;

  const answerCategoryQuestion = useCallback((category, answerText) => {
    if (!pendingField || pendingField.category !== category) return;
    const { field } = pendingField;
    pushMessage({ role: 'user', type: 'text', content: answerText, category });
    const patch = updateArtifactFromAnswer(category, field, answerText);
    const nextContent = { ...artifacts[category].content, ...patch.content };
    applyArtifactPatch(category, patch);
    pushMessage({
      role: 'assistant',
      type: 'text',
      content: `Got it — I updated ${CATEGORY_LABELS[category]}.`,
      category,
    });
    advanceQuestionFlow(category, nextContent);
  }, [advanceQuestionFlow, applyArtifactPatch, artifacts, pendingField, pushMessage]);

  const handleAction = useCallback((actionId) => {
    if (actionId.startsWith('field:')) {
      const [, category, field, optionId] = actionId.split(':');
      const options = FIELD_OPTIONS[category]?.[field] || [];
      const chosen = options.find((o) => o.id === optionId);
      const label = chosen?.label || optionId;
      pushMessage({ role: 'user', type: 'text', content: label, category });

      const patch = { content: { [field]: label }, fieldSources: { [field]: 'user_confirmed' } };
      let nextContent = { ...artifacts[category].content, ...patch.content };

      if (category === 'pricing_and_packaging' && field === 'pricingGuidanceLevel'
        && (optionId === 'get_recommendations' || optionId === 'start_from_comparable')) {
        const recommended = buildRecommendedConfig();
        setConfig(recommended);
        setConfigVersion((v) => v + 1);
        patch.content.currentPricingApproach = 'Recommended by the agent';
        patch.content.pricePerOffering = summarizePlans(recommended.plans);
        patch.content.pricingModels = 'Usage-based, tiered by plan (Free, Scale, Enterprise)';
        patch.fieldSources.currentPricingApproach = 'recommended';
        patch.fieldSources.pricePerOffering = 'recommended';
        patch.fieldSources.pricingModels = 'recommended';
        nextContent = { ...nextContent, ...patch.content };
        applyArtifactPatch(category, patch);
        pushMessage({
          role: 'assistant',
          type: 'text',
          content: 'I put together a recommended Free / Scale / Enterprise structure with a 15% cloud markup and 20% AI markup. This is a recommendation, not something found in your source — you can edit every value.',
          category,
        });
        pushMessage({
          role: 'assistant',
          type: 'action',
          content: 'Ready to see how this looks to customers?',
          actions: [{ id: 'view_proposed_configuration', label: 'View proposed configuration' }],
        });
        if (optionId === 'start_from_comparable') {
          askField(category, 'pricingComparableCompany');
        } else {
          setPendingField(null);
          setArtifacts((prev) => ({ ...prev, [category]: { ...prev[category], needsAnswer: false } }));
        }
        return;
      }

      applyArtifactPatch(category, patch);
      advanceQuestionFlow(category, nextContent);
      return;
    }

    if (actionId === 'view_proposed_configuration') {
      pushMessage({ role: 'user', type: 'text', content: 'View proposed configuration' });
      setProposedConfigVisible(true);
      setStage('test_and_iterate');
      pushMessage({
        role: 'assistant',
        type: 'text',
        content: 'Here\'s the proposed configuration. You can test the pricing page, checkout, and invoice previews, and edit anything before moving on.',
      });
      return;
    }
  }, [advanceQuestionFlow, applyArtifactPatch, artifacts, askField, pushMessage]);

  const applyConfigEdit = useCallback((patchFn, summaryText) => {
    setConfig((prev) => {
      const next = patchFn(prev);
      applyArtifactPatch('pricing_and_packaging', {
        content: {
          pricePerOffering: summarizePlans(next.plans),
        },
        fieldSources: {
          pricePerOffering: 'user_confirmed',
        },
      }, { markUpdated: true });
      return next;
    });
    setConfigVersion((v) => v + 1);
    if (summaryText) {
      pushMessage({ role: 'assistant', type: 'text', content: summaryText, category: 'pricing_and_packaging' });
    }
  }, [applyArtifactPatch, pushMessage]);

  const requestArtifactPrompt = useCallback((category) => {
    const field = getNextMissingField(category, artifacts[category].content);
    if (!field) {
      pushMessage({
        role: 'assistant',
        type: 'text',
        content: `${CATEGORY_LABELS[category]} already has everything I need. Ask me to change anything and I'll update it.`,
        category,
      });
      return;
    }
    askField(category, field);
  }, [artifacts, askField, pushMessage]);

  const markStageViewed = useCallback((stageKey) => {
    if (stageKey === 'context') return;
    setViewedConfigVersion((prev) => ({ ...prev, [stageKey]: configVersion }));
  }, [configVersion]);

  const dirtyStages = {
    test_and_iterate: configVersion > viewedConfigVersion.test_and_iterate,
    update_your_code: configVersion > viewedConfigVersion.update_your_code,
  };

  const nextRequiredCategory = CONTEXT_CATEGORIES.find((category) =>
    FIELD_SCHEMA[category].required.some((f) => !hasValue(artifacts[category].content[f]))
  ) ?? null;

  const remainingTaskCount = CONTEXT_CATEGORIES.reduce(
    (total, category) =>
      total + FIELD_SCHEMA[category].required.filter((f) => !hasValue(artifacts[category].content[f])).length,
    0
  );

  const launchReady = !nextRequiredCategory && Boolean(config);

  // Briefly highlights an artifact card (distinct from the persistent
  // in-progress border) to draw the eye when jumping there from elsewhere,
  // e.g. clicking "N tasks left" — fades back out on its own.
  const flashArtifact = useCallback((category) => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlashCategory(category);
    flashTimeoutRef.current = setTimeout(() => setFlashCategory(null), 1600);
  }, []);

  const resetDemo = useCallback(() => {
    clearScheduled();
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    generationRef.current += 1;
    setSource(null);
    setArtifacts(initialArtifacts());
    setMessages([]);
    setConfig(null);
    setStage('context');
    setAnalysisPhase('idle');
    setProposedConfigVisible(false);
    setPendingField(null);
    setFlashCategory(null);
    setConfigVersion(0);
    setViewedConfigVersion({ test_and_iterate: 0, update_your_code: 0 });
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // sessionStorage unavailable — nothing to clear.
    }
  }, [clearScheduled]);

  const launchModel = useCallback(() => {
    pushMessage({
      role: 'assistant',
      type: 'text',
      content: 'Your monetization model is live. Compute jobs and AI token usage will now be metered and billed according to this configuration.',
    });
  }, [pushMessage]);

  useEffect(() => clearScheduled, [clearScheduled]);

  const activeCategory = pendingField?.category
    ?? (CONTEXT_CATEGORIES.includes(analysisPhase) ? analysisPhase : null);

  const value = {
    source,
    artifacts,
    messages,
    config,
    stage,
    analysisPhase,
    activeCategory,
    proposedConfigVisible,
    pendingQuestionCategory,
    dirtyStages,
    nextRequiredCategory,
    remainingTaskCount,
    launchReady,
    flashCategory,
    flashArtifact,
    setStage,
    markStageViewed,
    startContextAnalysis,
    answerCategoryQuestion,
    addReferenceSource,
    handleAction,
    applyConfigEdit,
    pushMessage,
    requestArtifactPrompt,
    launchModel,
    resetDemo,
    setConfig,
  };

  return <MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>;
}

export function useMonetization() {
  const ctx = useContext(MonetizationContext);
  if (!ctx) throw new Error('useMonetization must be used within MonetizationProvider');
  return ctx;
}
