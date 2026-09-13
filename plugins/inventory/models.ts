export default [
  {
    "name": "inventory.item",
    "domain": "inventory",
    "component": "mw.inventory",
    "authority": "CANONICAL",
    "fields": {
      "item_ref": {
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
      "sku": {
        "type": "String",
        "unique": true
      },
      "item_kind": {
        "type": "Enum",
        "required": true,
        "enum": [
          "physical",
          "consumable",
          "asset",
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
    "name": "inventory.location",
    "domain": "inventory",
    "component": "mw.inventory",
    "authority": "CANONICAL",
    "fields": {
      "location_ref": {
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
      "location_kind": {
        "type": "Enum",
        "required": true,
        "enum": [
          "warehouse",
          "room",
          "rack",
          "vehicle",
          "virtual",
          "other"
        ]
      },
      "parent_location_ref": {
        "type": "Relation",
        "target": "inventory.location.location_ref"
      },
      "lifecycle": {
        "type": "Enum",
        "required": true,
        "default": "active",
        "enum": [
          "active",
          "inactive",
          "archived"
        ]
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  },
  {
    "name": "inventory.stock_movement",
    "domain": "inventory",
    "component": "mw.inventory",
    "authority": "CANONICAL",
    "fields": {
      "movement_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "item_ref": {
        "type": "Relation",
        "required": true,
        "target": "inventory.item.item_ref"
      },
      "source_location_ref": {
        "type": "Relation",
        "target": "inventory.location.location_ref"
      },
      "destination_location_ref": {
        "type": "Relation",
        "target": "inventory.location.location_ref"
      },
      "quantity": {
        "type": "Decimal",
        "required": true
      },
      "movement_kind": {
        "type": "Enum",
        "required": true,
        "enum": [
          "receipt",
          "transfer",
          "issue",
          "adjustment",
          "return"
        ]
      },
      "occurred_at": {
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
