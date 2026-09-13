export default [
  {
    "name": "isp.nas",
    "domain": "isp",
    "component": "mw.isp.network",
    "authority": "CANONICAL",
    "fields": {
      "nas_ref": {
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
      "host_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "network_host"
      },
      "vendor": {
        "type": "String"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "planned",
        "enum": [
          "planned",
          "active",
          "degraded",
          "retired"
        ]
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  },
  {
    "name": "isp.ip_pool",
    "domain": "isp",
    "component": "mw.isp.network",
    "authority": "CANONICAL",
    "fields": {
      "ip_pool_ref": {
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
      "cidr": {
        "type": "String",
        "required": true
      },
      "family": {
        "type": "Enum",
        "required": true,
        "enum": [
          "ipv4",
          "ipv6"
        ]
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
  },
  {
    "name": "isp.bandwidth_profile",
    "domain": "isp",
    "component": "mw.isp.network",
    "authority": "CANONICAL",
    "fields": {
      "bandwidth_profile_ref": {
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
      "download_bps": {
        "type": "Integer",
        "required": true
      },
      "upload_bps": {
        "type": "Integer",
        "required": true
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
