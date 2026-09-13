export default [
  {
    "name": "catalog.product",
    "domain": "catalog",
    "component": "mw.catalog",
    "authority": "CANONICAL",
    "fields": {
      "product_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "owner_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "identity_or_organization_owner"
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
      "product_kind": {
        "type": "Enum",
        "required": true,
        "enum": [
          "service",
          "digital",
          "physical",
          "bundle",
          "other"
        ]
      },
      "lifecycle": {
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
    "name": "catalog.offer",
    "domain": "catalog",
    "component": "mw.catalog",
    "authority": "CANONICAL",
    "fields": {
      "offer_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "product_ref": {
        "type": "Relation",
        "required": true,
        "target": "catalog.product.product_ref"
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "scope_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "commercial_scope"
      },
      "terms_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "terms"
      },
      "price_amount": {
        "type": "Decimal"
      },
      "price_currency": {
        "type": "Reference",
        "ref_kind": "cross_domain:foundation.currency"
      },
      "lifecycle": {
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
  }
];
