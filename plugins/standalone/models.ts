export default [
  {
    "name": "standalone.principal",
    "domain": "standalone",
    "component": "mw.standalone",
    "authority": "LOCAL_ONLY",
    "fields": {
      "principal_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "username": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "display_name": {
        "type": "String",
        "required": true
      },
      "principal_type": {
        "type": "Enum",
        "required": true,
        "enum": [
          "human",
          "system"
        ]
      },
      "password_hash": {
        "type": "Text",
        "sensitive": true
      },
      "is_superuser": {
        "type": "Boolean",
        "required": true,
        "default": false
      },
      "login_enabled": {
        "type": "Boolean",
        "required": true,
        "default": false
      },
      "must_rotate_password": {
        "type": "Boolean",
        "required": true,
        "default": false
      },
      "active": {
        "type": "Boolean",
        "required": true,
        "default": true
      }
    }
  },
  {
    "name": "standalone.session",
    "domain": "standalone",
    "component": "mw.standalone",
    "authority": "LOCAL_ONLY",
    "fields": {
      "session_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "principal_ref": {
        "type": "Relation",
        "required": true,
        "target": "standalone.principal.principal_ref"
      },
      "token_hash": {
        "type": "Text",
        "required": true,
        "sensitive": true
      },
      "created_at": {
        "type": "DateTime",
        "required": true
      },
      "expires_at": {
        "type": "DateTime",
        "required": true
      },
      "revoked_at": {
        "type": "DateTime"
      }
    }
  }
];
