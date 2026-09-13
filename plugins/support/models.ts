export default [
  {
    "name": "support.sla",
    "domain": "support",
    "component": "mw.support",
    "authority": "CANONICAL",
    "fields": {
      "sla_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "name": {
        "type": "String",
        "required": true
      },
      "priority": {
        "type": "Enum",
        "enum": [
          "low",
          "normal",
          "high",
          "urgent"
        ]
      },
      "response_target_minutes": {
        "type": "Integer",
        "required": true
      },
      "resolution_target_minutes": {
        "type": "Integer"
      },
      "lifecycle": {
        "type": "Enum",
        "required": true,
        "default": "draft",
        "enum": [
          "draft",
          "active",
          "retired"
        ]
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  },
  {
    "name": "support.ticket",
    "domain": "support",
    "component": "mw.support",
    "authority": "CANONICAL",
    "fields": {
      "ticket_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "requester_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "identity_or_contact"
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "subject": {
        "type": "String",
        "required": true
      },
      "description": {
        "type": "Text"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "new",
        "enum": [
          "new",
          "triaged",
          "open",
          "waiting",
          "resolved",
          "closed"
        ]
      },
      "priority": {
        "type": "Enum",
        "required": true,
        "default": "normal",
        "enum": [
          "low",
          "normal",
          "high",
          "urgent"
        ]
      },
      "sla_ref": {
        "type": "Relation",
        "target": "support.sla.sla_ref"
      },
      "incident_ref": {
        "type": "Reference",
        "ref_kind": "operations_incident"
      },
      "radicle_issue_ref": {
        "type": "Reference",
        "ref_kind": "radicle_issue"
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
