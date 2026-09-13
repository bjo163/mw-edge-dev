export default [
  {
    "name": "business.project",
    "domain": "business",
    "component": "mw.business.project",
    "authority": "CANONICAL",
    "fields": {
      "project_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "name": {
        "type": "String",
        "required": true
      },
      "description": {
        "type": "Text"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "planned",
        "enum": [
          "planned",
          "active",
          "paused",
          "completed",
          "cancelled"
        ]
      },
      "owner_ref": {
        "type": "Reference",
        "ref_kind": "identity_or_team"
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
