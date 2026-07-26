/* ============================================================
   BACKED — live engine bridge.

   Load AFTER data.js, BEFORE app.js:
     <script src="data.js"></script>
     <script src="api.js"></script>      ← the one wiring line
     <script src="app.js"></script>

   Every function resolves with the same shape app.js already reads
   from data.js. If the engine is down, slow (>4s), or errors, it
   resolves with the data.js mock instead — the demo cannot hard-fail.
   No caller ever needs a try/catch.

   Wiring into app.js (when Phase 4 lands, ~3 lines):
     - renderOpening: MARKET.openingComment → (await BackedAPI.openingLine()).rationale
     - margin-call step: DEMO.marginCall.text → (await BackedAPI.marginCall()).text
     - resolution step: DEMO.resolution → await BackedAPI.resolve(imageB64)
   ============================================================ */

'use strict';

const BackedAPI = (() => {

  const BASE = 'http://localhost:8787';
  const TIMEOUT_MS = 4000;
  const RESOLVE_TIMEOUT_MS = 30000;   // multimodal + thinking:high is slow

  async function post(path, body, fallback, timeout = TIMEOUT_MS){
    try {
      const res = await fetch(BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout)
      });
      if (!res.ok) return fallback;
      const out = await res.json();
      return out.error ? fallback : out;
    } catch (_){
      return fallback;                 // engine down → mock, silently
    }
  }

  return {
    /* → { action:"open_market", probability, rationale }
       or { action:"counter_offer", reason, revised:{topic,minutes,hour} } */
    openingLine(params){
      return post('/open_market', {
        user_id: MARKET.subject.toLowerCase(),
        topic: 'thermodynamics',
        minutes: 30,
        start_hour: '10',
        ...params
      }, {
        action: 'open_market',
        probability: MARKET.openingPrice,
        rationale: MARKET.openingComment
      });
    },

    /* The refusal beat: the doomed commitment. Same endpoint, inputs the
       learner history says will fail → Gemma counter-offers. Falls back to
       the canned refusal in DEMO.doomed so the beat always plays. */
    doomedCommitment(){
      return post('/open_market', {
        user_id: MARKET.subject.toLowerCase(),
        topic: DEMO.doomed.topic,
        minutes: DEMO.doomed.minutes,
        start_hour: DEMO.doomed.hour
      }, {
        action: 'counter_offer',
        reason: DEMO.doomed.reason,
        revised: DEMO.doomed.revised,
        fallback: true
      });
    },

    /* → { text } */
    marginCall(params){
      return post('/margin_call', {
        user_id: MARKET.subject.toLowerCase(),
        idle_minutes: 9,
        price_now: DEMO.marginCall.triggersAt,
        minutes_left: 22,
        ...params
      }, { text: DEMO.marginCall.text });
    },

    /* → { resolution:"YES"|"NO", confidence, text }
       imageB64: base64 (no data: prefix) of the evidence photo, or null
       to resolve on evidenceText alone. */
    resolve(imageB64, evidenceText){
      return post('/resolve', {
        market_id: MARKET.id,
        commitment: MARKET.question,
        topic: 'thermodynamics',
        minutes: 30,
        image_b64: imageB64 || undefined,
        evidence_text: evidenceText || undefined
      }, {
        resolution: DEMO.resolution.verdict.includes('YES') ? 'YES' : 'NO',
        confidence: DEMO.resolution.confidence,
        text: DEMO.resolution.text
      }, RESOLVE_TIMEOUT_MS);
    },

    /* True if the engine is up — lets app.js show a "live" indicator. */
    async health(){
      try {
        const r = await fetch(BASE + '/health', { signal: AbortSignal.timeout(1500) });
        return (await r.json()).ok === true;
      } catch (_){ return false; }
    }
  };
})();
