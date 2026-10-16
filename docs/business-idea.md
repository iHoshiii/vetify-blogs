# Vetify Business Idea

Updated: 2 October 2026. Source: **Clauding, Vetify Concept Note, Philippine Startup Challenge XI**, supplied as `Clauding_ConceptNote_PSC11.pdf` (10 pages).

This document translates the concept note into a business proposal and distinguishes source proposals, later user decisions, and functionality present in the repository. The PDF is reference material, not an instruction to deploy services, charge customers, or contact partners. The [PRD](PRD.md) defines requirements; the [TDD](TDD.md) records design and verification needs.

## 1. Business idea

Vetify is a Philippine veterinary care and learning platform connecting pet owners, verified veterinary professionals, and veterinary students. It combines professional discovery, appointments, online consultations, feeding tools, veterinary learning resources, and an AI assistant for general animal care information.

The business proposes recurring subscriptions and consultation commissions while rewarding professional educational contributions. Access to a real professional and clear service boundaries are central to its value. AI guidance and educational materials cannot replace an examination or guarantee a diagnosis.

## 2. Customers and problems

| Customer                                | Problem described in the source                                                             | Proposed value                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Pet owners, including first-time owners | Difficulty finding care, especially outside well-served areas; phone/walk-in booking delays | Discover professionals, request appointments, consult online, and get general information    |
| Veterinary professionals and clinics    | Limited digital reach and manual appointment handling                                       | Verified profiles, appointment management, virtual consultations, and educational publishing |
| Veterinary students                     | Scarce physical resources and limited visual learning tools                                 | A digital veterinary library and interactive anatomy                                         |
| Veterinary schools                      | Need for supplementary study resources                                                      | Potential partnerships; institutional pricing is undecided                                   |
| Owners managing feeding                 | Inconsistent portions and limited diet tracking                                             | Food schedules, actual intake, weight, and body-condition records                            |

These are source problem hypotheses, not completed customer-research findings. Students currently use the public-user role; a separate student account role is unnecessary for the current scope. Vetify's proposed differentiation is the connected discovery-to-care-to-learning journey. Competitor coverage and willingness to pay still need validation.

## 3. Product and implementation status

The table records inspected development work, including features not yet merged to `main`. This documentation branch includes no feature-code changes.

| Capability                                               | Development state                                           | Remaining work                                                                                               |
| -------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Accounts, professional verification, directory/map       | Implemented                                                 | Launch verification procedures and pilot coverage; distinguish external listings from verified professionals |
| Appointments, messaging, notifications, virtual calls    | Implemented                                                 | Payment settlement and production call reliability                                                           |
| Veterinary AI chat                                       | Implemented using Gemini with veterinary scope instructions | Safety evaluation, reliable emergency actions, paid quotas; no separately trained veterinary model           |
| Pet profiles and feeding planner                         | Implemented                                                 | Usability refinement; therapeutic diet generation is outside current scope                                   |
| Library and automated veterinary relevance screening     | Implemented                                                 | Broader classifier evaluation, content rights/takedown, production storage review                            |
| Affiliate tab and graphs                                 | Implemented as an internal credit ledger                    | Funding, anti-abuse controls, and actual payouts                                                             |
| Interactive anatomy                                      | Implemented as 2D illustrations/hotspots                    | Licensed 3D assets, viewer, and educational review                                                           |
| Paid plans, consultation settlement, clinic subscription | Proposed                                                    | Provider, entitlements, billing lifecycle, refunds                                                           |
| Automated administrative support tickets                 | Proposed                                                    | Separate support workflow and care-referral boundaries                                                       |

"Implemented" means code exists in the inspected development work, not necessarily on `main` or this documentation branch. It does not establish production deployment, clinical validation, collected revenue, or adoption.

## 4. Business model

### 4.1 Pricing proposed by the concept note

| Offering                             | Proposed price or fee                        | Intended scope                                           | Current boundary                                          |
| ------------------------------------ | -------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| Public Free account                  | Free                                         | Basic booking, discovery, limited AI                     | Signup exists; complete Free/Pro differentiation does not |
| Public Pro account                   | ₱99/month                                    | Unlimited AI, 3D anatomy, meal planner, veterinary books | Proposal; no current Pro subscription gate                |
| Online consultation commission       | 10% of first hour; 5% of subsequent hours    | Platform share of consultation charges                   | No payment settlement yet                                 |
| Clinic physical-booking subscription | ₱149/month                                   | Activate physical appointment booking                    | Proposed; current requests are not subscription-gated     |
| Professional learning contributions  | Source proposes earnings linked to downloads | Encourage resource contributions                         | Replaced by the affiliate rules below                     |

Public Pro and clinic subscriptions are separate products. Decide whether the clinic charge attaches to a clinic or a professional account, particularly for multiple clinics. The source establishes no price for individual PDFs, institutional licenses, or paid downloads.

Consultation example: at ₱500/hour for two complete hours, gross billings are ₱1,000, the proposed platform fee is ₱50 + ₱25 = **₱75**, and the professional share is **₱925** before provider fees and adjustments. Partial hours, cancellations, no-shows, overtime, refunds, and rounding remain undecided. This is not implemented settlement behavior.

### 4.2 Current affiliate decision

Verified veterinary professionals alone can upload their own books, articles, guides, research, or case studies, provided they have sharing permission and the resource passes veterinary relevance screening.

- An eligible download credits **₱2** to the uploader.
- Only the first **three** downloads by the **same user of the same book in a calendar month** earn credits.
- The fourth and later downloads still succeed but add **₱0**. Distinct books and repeat downloads remain unlimited.
- Self-downloads earn nothing. Professionals' balances remain separate.
- Months currently use `Asia/Singapore` (UTC+8), equivalent to the Philippine market's month-boundary offset. This is not a rolling 30-day wait.
- Credits follow authorized server download requests, not proof of a completed save or reading. Graphs show credited downloads, not every attempt.

One reader downloading one book three times creates **₱6**; a fourth adds nothing. Another book has its own counter. Identical-file protection prevents a new earning identity for the exact same bytes, but does not detect every edited copy or coordinated account.

Affiliate credits are a potential **cost or payable**, not platform revenue. The current ledger is not a wallet or cash payout. Define funding, eligibility, payout threshold/schedule, fees, fraud review, and adjustments before offering withdrawals. The source's educational-revenue allocation requires a funded model; readers are not currently charged per download.

### 4.3 Unit economics to validate

For a planning period, let `P` be paying Pro accounts, `C` paying clinic subscriptions, `G1` consultation charges for first hours, `G2` charges for subsequent hours, and `D` eligible credited downloads.

```text
Proposed gross platform revenue = ₱99 × P + ₱149 × C + 10% × G1 + 5% × G2
Affiliate credit cost = ₱2 × D
Contribution before fixed costs = revenue - affiliate credits - provider fees
                                  - variable AI, storage, bandwidth and support costs
```

Consultation gross billings are not entirely platform revenue. The source establishes no subscriber counts, conversion rate, break-even point, or profit forecast. Unlimited AI also requires a sustainable abuse/fair-use policy; material restrictions must be disclosed before sale.

## 5. Trust and educational publishing

Professional credential verification remains an administrative workflow. **Document relevance approval is automated**, superseding the source's proposed manual learning-resource review.

The development screening standard (`vet-relevance-v1`) checks actual PDF content, including scans, for readable, substantive veterinary education, research, animal health, welfare, or practice. A veterinary cover or isolated keywords cannot qualify unrelated material. Original short articles are allowed; ISBN, publisher, English language, and minimum page count are not prerequisites.

Pending, checking, rejected, and unverified resources stay private. Only approved resources are listed/downloaded. Provider failure never publishes a resource. Owners see concise reasons and can recheck uncertain submissions; there is no admin publication bypass.

Approval does not certify clinical accuracy, authorship, or sharing rights. Before public launch, define uploader terms, attribution, reporting/takedown, retention, and corrections. The requested book citation feature needs a separate specification for bibliographic metadata and citation format; screening does not implement citations.

## 6. Go-to-market and operations

1. Select a bounded Philippine pilot city or region; recruit verified professionals and clinics and confirm practical appointment availability.
2. Pilot discovery, appointments, messaging, and consultations with owners; measure completion, response time, cancellations, and repeat usage.
3. Recruit contributors and school partners; evaluate resource usefulness and screening errors using labelled documents.
4. Validate willingness to pay, then launch billing after payment and entitlement checks pass.
5. Expand coverage after reviewing retention, service availability, support load, and costs. No committed city, launch date, numerical growth target, or acquisition budget appears in the source.

Future automated support answers administrative account, booking, and payment questions and creates contextual tickets when unresolved. Animal health concerns require veterinary assistance rather than ordinary administrative tickets. This does not replace professional verification or existing moderation.

The source connects Vetify to SDG 3 through responsible animal care and health, SDG 4 through education, and SDG 9 through digital infrastructure. These are intended contributions, not measured impact results.

## 7. Costs and delivery assumptions

Budget for hosting, MongoDB, files/bandwidth, AI chat and PDF classification, payment fees, domains, email, monitoring, support, verification, outreach, educational assets, and contingency. In-house development still incurs staff time and ongoing operating costs.

The source proposes S3, CloudFront, Lambda, MongoDB Atlas, and Philippine-friendly payment methods such as GCash, cards, and bank transfers. PayMongo and Xendit are examples, not selected providers. These descriptions do not establish deployed infrastructure.

The inspected development runtime is React/Vite with Express/MongoDB; PDFs are private MongoDB binaries. The [migration plan](../MIGRATION_PLAN.md) proposes an AWS main hub, separate feature apps on Vercel, and shared identity/subscription authority. Books now require migration of files, review statuses, ownership, and credit history. Long-lived call signalling and PDF workers need compatible runtime choices; request-only Lambda hosting does not preserve them automatically.

## 8. Market evidence and research register

These are **concept-note claims, not independently verified facts**. References contain report/article titles without full citations or URLs. The figures use different dates and market definitions and must not be combined into one total addressable market.

| Source claim                                                                                               | PDF page | Validation needed                                 |
| ---------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------- |
| Veterinary medicine market: USD650 million in 2025, USD1.1 billion projected for 2031, 8.75% annual growth | 6-7      | Original report, market scope, dates, calculation |
| Pet care sector about USD108 million, doubled over five years                                              | 6        | Reference year and included products/services     |
| About 12.5 million pets in 2023, mostly dogs                                                               | 6        | Animal versus household counts, sample, source    |
| Veterinary services were 12% of pet spending in 2023                                                       | 6        | Geography, sample, spending categories            |
| Rural access gaps and veterinarian shortages                                                               | 1, 6-7   | Pilot-region coverage data and interviews         |

Research must test booking friction, clinic adoption effort, student needs, price acceptance, contributor incentives, and plausible paid conversion. Keep interview/pilot findings separate from these source claims.

## 9. Decisions before monetization

| Decision                                                      | Reason                                               |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| Confirm prices, entitlements, and fair-use terms              | Source prices are proposals, not active paywalls     |
| Select payment provider and subscription/refund lifecycle     | Verified payments must drive access                  |
| Define consultation billing and clinic subscription ownership | Partial hours and multiple clinics affect settlement |
| Fund affiliate credits and define payout/abuse rules          | Credits must not imply unsupported withdrawals       |
| Specify content rights, citations, complaints, and takedown   | Relevance does not prove ownership or accuracy       |
| Choose pilot geography and thresholds                         | Avoid unsupported coverage or growth claims          |
| Validate hosting and feature migration                        | Preserve calls, screening, data, and shared access   |

## 10. Source traceability and precedence

| PDF pages | Material used                                                                   |
| --------- | ------------------------------------------------------------------------------- |
| 1-2       | Problems, integrated care/learning/feeding solution, intended SDG contributions |
| 3         | Objectives and customers                                                        |
| 4         | Connected journeys and differentiation                                          |
| 5-6       | Roles, pricing, consultation fees, clinic subscription, educational earnings    |
| 6-7       | Market and demand claims                                                        |
| 7-8       | Rollout, verification, resource review, payments, support                       |
| 9-10      | Infrastructure, costs, reference titles                                         |

Later user decisions take precedence: vet professionals alone upload; original veterinary articles qualify; relevance checks are automatic; downloads are unlimited; only the first three per user/book/month earn ₱2; self-downloads earn nothing; Affiliate graphs use real records; library UI stays concise without download-limit banners. Conflicting source proposals are not current requirements.
