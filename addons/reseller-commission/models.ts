export default [
  {
    "name": "reseller.commission",
    "domain": "reseller",
    "component": "mw.reseller.commission",
    "authority": "CANONICAL",
    "fields": {
      "commission_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "reseller_organization_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "cross_domain:business.organization"
      },
      "source_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "order_subscription_or_invoice"
      },
      "amount": {
        "type": "Decimal",
        "required": true
      },
      "currency": {
        "type": "Reference",
        "required": true,
        "ref_kind": "cross_domain:foundation.currency"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "pending",
        "enum": [
          "pending",
          "earned",
          "approved",
          "paid",
          "void"
        ]
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
