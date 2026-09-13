export default [
  {
    "name": "business.organization",
    "domain": "business",
    "component": "mw.business",
    "authority": "CANONICAL",
    "fields": {
      "organization_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "ref_kind": "tenant_scope"
      },
      "name": {
        "type": "String",
        "required": true
      },
      "organization_type": {
        "type": "Enum",
        "required": true,
        "enum": [
          "internal",
          "customer",
          "vendor",
          "reseller",
          "other"
        ]
      },
      "lifecycle": {
        "type": "Enum",
        "required": true,
        "default": "draft",
        "enum": [
          "draft",
          "active",
          "suspended",
          "archived"
        ]
      },
      "owner_ref": {
        "type": "Reference",
        "ref_kind": "identity_or_organization_owner"
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
