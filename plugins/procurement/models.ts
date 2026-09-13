export default [
  {
    "name": "procurement.vendor",
    "domain": "procurement",
    "component": "mw.procurement",
    "authority": "CANONICAL",
    "fields": {
      "vendor_ref": {
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
      "name": {
        "type": "String",
        "required": true
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "draft",
        "enum": [
          "draft",
          "active",
          "suspended",
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
    "name": "procurement.purchase_order",
    "domain": "procurement",
    "component": "mw.procurement",
    "authority": "CANONICAL",
    "fields": {
      "purchase_order_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "vendor_ref": {
        "type": "Relation",
        "required": true,
        "target": "procurement.vendor.vendor_ref"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "draft",
        "enum": [
          "draft",
          "submitted",
          "approved",
          "rejected",
          "cancelled",
          "fulfilled"
        ]
      },
      "authorization_ref": {
        "type": "Reference",
        "ref_kind": "authorization_decision"
      },
      "policy_version": {
        "type": "String"
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  },
  {
    "name": "procurement.purchase_order_line",
    "domain": "procurement",
    "component": "mw.procurement",
    "authority": "CANONICAL",
    "fields": {
      "purchase_order_line_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "purchase_order_ref": {
        "type": "Relation",
        "required": true,
        "target": "procurement.purchase_order.purchase_order_ref"
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "item_ref": {
        "type": "Reference",
        "ref_kind": "cross_domain:inventory.item"
      },
      "description": {
        "type": "String",
        "required": true
      },
      "quantity": {
        "type": "Decimal",
        "required": true
      },
      "unit_amount": {
        "type": "Decimal"
      },
      "currency": {
        "type": "Reference",
        "ref_kind": "cross_domain:foundation.currency"
      }
    }
  }
];
