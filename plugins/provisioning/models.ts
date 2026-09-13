export default [
  {
    "name": "provisioning.reference",
    "domain": "provisioning",
    "component": "mw.provisioning",
    "authority": "CANONICAL",
    "fields": {
      "provisioning_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "allocation_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "cross_domain:entitlement.allocation"
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "operation_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "provider_operation"
      },
      "result_ref": {
        "type": "Reference",
        "ref_kind": "provider_result"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "requested",
        "enum": [
          "requested",
          "submitted",
          "executing",
          "succeeded",
          "failed",
          "cancelled",
          "rolled_back"
        ]
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  }
];
