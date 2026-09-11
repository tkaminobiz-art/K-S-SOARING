# Site analytics contract v1.2

## GA4 baseline (2026-09-11)

Reuse property `542649124`, stream `15129348770`, measurement ID
`G-J6PMQ8DRYX`; do not create a duplicate property. Website URL is
`https://www.sokujitu-kaishu.com/`.

Owner: site owner. Questions: how many visits, which acquisition sources,
how far visitors read, and which outbound links they use.

| GA4 event | Trigger / parameters | Non-trigger / deduplication |
| --- | --- | --- |
| `page_view` | One automatic config page view per document; sanitized `page_location` and `page_referrer` strings | No extra wrapper tag on `/roulette/`; history-triggered page views disabled |
| `scroll` | GA4 enhanced measurement threshold | Provider default once per document; no second custom scroll handler |
| `click` | Enhanced measurement of outbound links; standard link parameters | Not proof of a completed LINE consultation; not imported into Google Ads |

GA4 config runs only on the two production domains, never on preview or local
debug hosts. Existing Ads config and its two conversion payloads remain unchanged.
The shared Google tag is loaded once. GA4 URLs omit fragments and unknown query
keys; only standard campaign/click attribution keys and the roulette flag remain.
Referrer URLs omit query strings and fragments. No customer identity, user ID,
free-form values, or user-provided data collection is added. Google signals and
ad personalization signals are disabled in this GA4 config. Search/form/video/
download enhanced measurement is disabled; email redaction remains enabled.

No new consent interface or claim of legal compliance is introduced. This uses
the site's existing tracking policy; any future consent integration must gate
analytics and advertising independently and test denial and withdrawal.
GA4 linking must not restart campaigns, change budgets, or import duplicate
primary conversions. Provider receipt must be verified separately from dispatch.

## Existing Google Ads conversion contract v1.1

Scope: preserve the existing two conversion actions and repair the visible-time
timer after back/forward-cache restoration. No page content, advertising budget,
campaign delivery status, or conversion destination is changed by this code patch.

| Event | Decision / owner | Trigger | Non-trigger / deduplication | Google Ads destination |
| --- | --- | --- | --- | --- |
| `line_click` | Measure contact intent; site owner / ads operator | Click an existing link to the official LINE account | No page-load event; repeated clicks within 1.5 seconds are suppressed; clicking is not proof of a completed consultation | `AW-18262130937/NYplCJLBxc8cEPmBiIRE` |
| `lp_30s_visible` | Measure LP engagement; site owner / ads operator | 30 seconds of accumulated visible time in one document, including visible time before/after BFCache restoration | Hidden/away time excluded; at most once per same-origin tab session using `ks-google-ads-lp-30s-fired`; a reload before reaching 30 seconds starts a new document timer | `AW-18262130937/01NXCOnXws8cEPmBiIRE` |

Both map to the provider event `conversion`, with the existing `send_to` string.
No additional event parameters, customer identity fields, or free-form data are
introduced. The session flag records local dispatch, not Google acceptance;
there is no automatic retransmission and no claim of guaranteed delivery.

Transport remains restricted to the two existing production hostnames, with
the existing explicit local-debug exception. Preview hosts must not transmit.
The existing consent configuration is not changed by this repair. No CMP or
new consent UI is introduced, and region-specific legal suitability is not
asserted. A future consent change must separately test unknown, denied,
analytics/marketing accepted, and withdrawn states before deployment.

QA: `node --test tests/analytics-visible-time.test.mjs` executes the exact inline
production timer with a synthetic clock, session storage, and lifecycle events.
Browser verification additionally checks the deployed code, ordinary timing,
LINE handlers, and network payloads while blocking conversion endpoints to
avoid contaminating Google Ads. Provider receipt and real-device LINE app
switching are separate verification stages.
