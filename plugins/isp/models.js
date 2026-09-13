export default [
  {
    "name": "isp.subscriber",
    "domain": "isp",
    "component": "mw.isp",
    "authority": "CANONICAL",
    "fields": {
      "subscriber_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "customer_organization_ref": {
        "type": "Reference",
        "ref_kind": "cross_domain:business.organization"
      },
      "contact_ref": {
        "type": "Reference",
        "ref_kind": "cross_domain:crm.contact"
      },
      "subscription_ref": {
        "type": "Reference",
        "ref_kind": "cross_domain:service.subscription"
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
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
