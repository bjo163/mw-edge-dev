export default [
  {
    "name": "crm.lead",
    "domain": "crm",
    "component": "mw.crm.pipeline",
    "authority": "CANONICAL",
    "fields": {
      "lead_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "contact_ref": {
        "type": "Relation",
        "target": "crm.contact.contact_ref"
      },
      "organization_ref": {
        "type": "Reference",
        "ref_kind": "cross_domain:business.organization"
      },
      "title": {
        "type": "String",
        "required": true
      },
      "source_ref": {
        "type": "Reference",
        "ref_kind": "external_source"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "new",
        "enum": [
          "new",
          "qualified",
          "disqualified",
          "converted"
        ]
      },
      "owner_ref": {
        "type": "Reference",
        "ref_kind": "identity_or_team"
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  },
  {
    "name": "crm.opportunity",
    "domain": "crm",
    "component": "mw.crm.pipeline",
    "authority": "CANONICAL",
    "fields": {
      "opportunity_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "lead_ref": {
        "type": "Relation",
        "target": "crm.lead.lead_ref"
      },
      "contact_ref": {
        "type": "Relation",
        "target": "crm.contact.contact_ref"
      },
      "organization_ref": {
        "type": "Reference",
        "ref_kind": "cross_domain:business.organization"
      },
      "title": {
        "type": "String",
        "required": true
      },
      "stage": {
        "type": "Enum",
        "required": true,
        "default": "open",
        "enum": [
          "open",
          "proposal",
          "negotiation",
          "won",
          "lost"
        ]
      },
      "owner_ref": {
        "type": "Reference",
        "ref_kind": "identity_or_team"
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
