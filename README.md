# Securing the Agentic Enterprise

**An end-to-end, interactive view of AI agent risk across the enterprise deployment stack.**

Live model and whitepaper: **https://dannyliv.github.io/e2e-Agentic-Risks/**

AI agents are not a new application bolted onto old infrastructure. They are a new trust topology, where untrusted text, non-human identities, and autonomous action collapse boundaries that classic security kept apart. This project maps that topology end to end: how agents are actually deployed, where they get attacked, what defends them, and what still has no answer.

## What is here

- **An interactive threat map.** A clickable model of the eleven-layer enterprise agent deployment. Click any layer to see the surfaces it exposes, the validated incidents that hit it, the controls that help, and where coverage runs out.
- **A risk taxonomy explorer.** All 50 canonical risks across 8 families, each mapped to the deployment layers it touches, the OWASP LLM and OWASP Agentic threat IDs, a validated real-world example, and an honest gap call. Filter by family, severity, or coverage.
- **A risk-to-solution mapping.** Every risk against its strongest controls, with an explicit coverage gap for each.
- **A two-part whitepaper** (read online, also in `/whitepaper` as Word documents):
  - Part 1: how agents are deployed and where they get attacked.
  - Part 2: the taxonomy, the solution landscape, and the gaps.

## The numbers

| Metric | Value |
| --- | --- |
| Canonical risks | 50, across 8 families |
| Deployment layers | 11, with 7 trust boundaries |
| Validated real-world incidents | 70, every one verified against a primary source |
| Risks under-served or open | 36 (32 under-served, 4 open problems) |

Every incident referenced (EchoLeak / CVE-2025-32711, ForcedLeak, the Salesloft Drift OAuth token theft, MCP Inspector RCE / CVE-2025-49596, CamoLeak, the November 2025 AI-orchestrated espionage disruption, and more) is a real, documented event with a primary-source citation.

## How it was built

The research was produced by a multi-agent pipeline: parallel domain researchers enumerated attack vectors and candidate incidents, then every example was adversarially verified against its primary source before entering the dataset. The findings were clustered into a canonical taxonomy (50 risks after an adversarial-review expansion and a code-security pass that took it end-to-end), mapped to an 11-layer reference architecture (grounded in Google SAIF, CSA MAESTRO, the OWASP Agentic Security Initiative, and cloud-vendor agent platforms), and each risk was mapped to its solution landscape with an explicit gap analysis.

The site is a dependency-free static build. All content is driven by `assets/data.json`; the interactive diagram, explorer, and mapping table are rendered client-side in vanilla JavaScript.

## Structure

```
index.html            interactive threat map, taxonomy explorer, solution mapping
part-1.html           whitepaper, Part 1
part-2.html           whitepaper, Part 2
assets/data.json      the full validated dataset (risks, examples, solutions, architecture)
assets/app.js         client-side rendering
assets/figures/       the four diagrams
whitepaper/           the two-part whitepaper as Word documents
```

## Author

By **Danny Livshits**. Two of the author's open-source security research tools are referenced in the analysis where relevant: [a2a-audit](https://github.com/dannyliv/a2a-audit) (an A2A agent-card posture auditor) and Agent Guard (open prompt-injection detection models). Both are research instruments, not commercial products.

## License

MIT. See [LICENSE](LICENSE).

## Disclaimer

This repository, the interactive site, and the accompanying whitepaper are open research published for educational and defensive-security purposes. The author's referenced tools (a2a-audit, Agent Guard) are open-source research instruments, not commercial or enterprise security products, and are provided as is, without warranty of any kind. The author accepts no liability for any use of this material. Vendor and product names are the property of their respective owners and are referenced for analysis only; their inclusion is not an endorsement. Verify every control against your own environment before relying on it.
