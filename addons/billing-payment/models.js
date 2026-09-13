export default [
  {
    "name": "billing.payment",
    "domain": "billing",
    "component": "mw.billing.payment",
    "authority": "OBSERVATION",
    "fields": {
      "payment_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "invoice_ref": {
        "type": "Relation",
        "required": true,
        "target": "billing.invoice.invoice_ref"
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "provider_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "payment_provider"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "enum": [
          "pending",
          "succeeded",
          "failed",
          "refunded"
        ]
      },
      "observed_at": {
        "type": "DateTime",
        "required": true
      },
      "provenance_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "provenance"
      }
    }
  }
];
