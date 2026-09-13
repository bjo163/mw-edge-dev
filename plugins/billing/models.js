export default [
  {
    "name": "billing.invoice",
    "domain": "billing",
    "component": "mw.billing",
    "authority": "CANONICAL",
    "fields": {
      "invoice_ref": {
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
      "amount_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "amount_or_pricing_snapshot"
      },
      "amount": {
        "type": "Decimal"
      },
      "currency": {
        "type": "Reference",
        "ref_kind": "cross_domain:foundation.currency"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "draft",
        "enum": [
          "draft",
          "issued",
          "paid",
          "void",
          "overdue"
        ]
      },
      "issued_at": {
        "type": "DateTime"
      },
      "due_at": {
        "type": "DateTime"
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
