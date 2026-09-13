# Minimal addon reference

This addon demonstrates the contract difference between a domain-owning plugin and an addon.

It extends `mw.example`, shares the `example` database, consumes only extension points declared by its host, and requires the host model capability. It does not create or own a separate domain database.

Its deterministic fixture references the host plugin fixture, proving dependency and lifecycle ordering through the real loader. Contract tests also verify that the addon resolves its host and that incompatible extension/dependency declarations fail deterministically.
