export default [
  {
    "name": "isp.usage_record",
    "domain": "isp",
    "component": "mw.isp.accounting",
    "authority": "OBSERVATION",
    "fields": {
      "usage_ref": {
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
      "session_ref": {
        "type": "Relation",
        "target": "isp.pppoe_session.session_ref"
      },
      "nas_ref": {
        "type": "Relation",
        "target": "isp.nas.nas_ref"
      },
      "bytes_in": {
        "type": "Integer",
        "required": true
      },
      "bytes_out": {
        "type": "Integer",
        "required": true
      },
      "started_at": {
        "type": "DateTime"
      },
      "ended_at": {
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
