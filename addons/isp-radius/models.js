export default [
  {
    "name": "isp.radius_profile",
    "domain": "isp",
    "component": "mw.isp.radius",
    "authority": "CANONICAL",
    "fields": {
      "radius_profile_ref": {
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
      "bandwidth_profile_ref": {
        "type": "Relation",
        "target": "isp.bandwidth_profile.bandwidth_profile_ref"
      },
      "ip_pool_ref": {
        "type": "Relation",
        "target": "isp.ip_pool.ip_pool_ref"
      },
      "attributes": {
        "type": "Json"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "active",
        "enum": [
          "active",
          "inactive",
          "retired"
        ]
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
