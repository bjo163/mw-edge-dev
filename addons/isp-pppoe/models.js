export default [
  {
    "name": "isp.pppoe_account",
    "domain": "isp",
    "component": "mw.isp.pppoe",
    "authority": "CANONICAL",
    "fields": {
      "pppoe_account_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "subscriber_ref": {
        "type": "Relation",
        "required": true,
        "target": "isp.subscriber.subscriber_ref"
      },
      "username": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "credential_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "secret_or_identity_credential"
      },
      "radius_profile_ref": {
        "type": "Relation",
        "target": "isp.radius_profile.radius_profile_ref"
      },
      "nas_ref": {
        "type": "Relation",
        "target": "isp.nas.nas_ref"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "pending",
        "enum": [
          "pending",
          "active",
          "suspended",
          "revoked"
        ]
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  },
  {
    "name": "isp.pppoe_session",
    "domain": "isp",
    "component": "mw.isp.pppoe",
    "authority": "OBSERVATION",
    "fields": {
      "session_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "subscriber_ref": {
        "type": "Relation",
        "required": true,
        "target": "isp.subscriber.subscriber_ref"
      },
      "pppoe_account_ref": {
        "type": "Relation",
        "required": true,
        "target": "isp.pppoe_account.pppoe_account_ref"
      },
      "nas_ref": {
        "type": "Relation",
        "target": "isp.nas.nas_ref"
      },
      "framed_ip": {
        "type": "String"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "enum": [
          "starting",
          "active",
          "stopped",
          "failed"
        ]
      },
      "started_at": {
        "type": "DateTime"
      },
      "stopped_at": {
        "type": "DateTime"
      },
      "observed_at": {
        "type": "DateTime",
        "required": true
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
