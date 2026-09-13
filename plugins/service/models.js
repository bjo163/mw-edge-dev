export default [
  {
    "name": "service.subscription",
    "domain": "service",
    "component": "mw.service",
    "authority": "CANONICAL",
    "fields": {
      "subscription_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "order_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "cross_domain:commerce.order"
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "lifecycle": {
        "type": "Enum",
        "required": true,
        "default": "pending",
        "enum": [
          "pending",
          "active",
          "suspended",
          "cancelled",
          "expired"
        ]
      },
      "effective_at": {
        "type": "DateTime",
        "required": true
      },
      "expires_at": {
        "type": "DateTime"
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
