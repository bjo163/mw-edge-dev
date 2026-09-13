export default [
  {
    "name": "support.escalation",
    "domain": "support",
    "component": "mw.support.escalation",
    "authority": "CANONICAL",
    "fields": {
      "escalation_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "ticket_ref": {
        "type": "Relation",
        "required": true,
        "target": "support.ticket.ticket_ref"
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "new",
        "enum": [
          "new",
          "triaged",
          "escalated",
          "mitigated",
          "resolved",
          "closed"
        ]
      },
      "target_ref": {
        "type": "Reference",
        "ref_kind": "team_incident_or_issue"
      },
      "reason": {
        "type": "Text",
        "required": true
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
