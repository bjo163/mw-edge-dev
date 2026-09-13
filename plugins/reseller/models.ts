export default [
  {
    "name": "reseller.relationship",
    "domain": "reseller",
    "component": "mw.reseller",
    "authority": "CANONICAL",
    "fields": {
      "relationship_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "platform_or_owner_tenant"
      },
      "reseller_organization_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "cross_domain:business.organization"
      },
      "downstream_tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "pending",
        "enum": [
          "pending",
          "active",
          "suspended",
          "terminated"
        ]
      },
      "authorization_ref": {
        "type": "Reference",
        "ref_kind": "authorization_decision"
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
