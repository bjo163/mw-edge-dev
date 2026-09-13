export default [
  {
    "name": "commerce.order",
    "domain": "commerce",
    "component": "mw.commerce",
    "authority": "CANONICAL",
    "fields": {
      "order_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "offer_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "cross_domain:catalog.offer"
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "subject_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "customer_or_subject"
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
        "default": "draft",
        "enum": [
          "draft",
          "submitted",
          "accepted",
          "rejected",
          "cancelled"
        ]
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
