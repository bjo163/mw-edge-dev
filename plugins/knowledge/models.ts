export default [
  {
    "name": "knowledge.article",
    "domain": "knowledge",
    "component": "mw.knowledge",
    "authority": "CANONICAL",
    "fields": {
      "article_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "title": {
        "type": "String",
        "required": true
      },
      "body": {
        "type": "Text",
        "required": true
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "draft",
        "enum": [
          "draft",
          "published",
          "archived"
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
