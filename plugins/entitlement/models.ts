export default [
  {
    "name": "entitlement.allocation",
    "domain": "entitlement",
    "component": "mw.entitlement",
    "authority": "CANONICAL",
    "fields": {
      "allocation_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "subscription_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "cross_domain:service.subscription"
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "resource_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "resource"
      },
      "authorization_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "authorization_decision"
      },
      "policy_version": {
        "type": "String",
        "required": true
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "pending",
        "enum": [
          "pending",
          "active",
          "suspended",
          "revoked"
        ]
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
