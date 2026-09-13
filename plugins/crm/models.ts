export default [
  {
    "name": "crm.contact",
    "domain": "crm",
    "component": "mw.crm",
    "authority": "CANONICAL",
    "fields": {
      "contact_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "organization_ref": {
        "type": "Reference",
        "ref_kind": "cross_domain:business.organization"
      },
      "identity_ref": {
        "type": "Reference",
        "ref_kind": "mw_identity"
      },
      "display_name": {
        "type": "String",
        "required": true
      },
      "email": {
        "type": "String"
      },
      "phone": {
        "type": "String"
      },
      "lifecycle": {
        "type": "Enum",
        "required": true,
        "default": "active",
        "enum": [
          "active",
          "inactive",
          "archived"
        ]
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
