# AI Workflows

## What It Is

The AI workflow routes expose chatbot, report analysis, drug interaction, and clinical decision support APIs.

## Why They Exist

They demonstrate how foundation-model workflows fit into hospital operations while keeping AI keys server-side.

## Current Behavior

The current backend returns deterministic, medically cautious demo responses. This makes the project verifiable without paid or rate-limited AI keys while still honoring the provider selection fields from the UI.

## Flow

1. UI sends a structured request with selected provider.
2. Backend validates the payload and authenticates the user.
3. Route returns a structured response with disclaimers and emergency flags when relevant.

## Risks and Next Step

Production AI calls need provider service modules with timeouts, retries, rate-limit handling, audit logging, and clinical validation.
