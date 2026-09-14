export default [
  {
    "name": "foundation.country",
    "domain": "foundation",
    "component": "mw.foundation",
    "authority": "REFERENCE",
    "fields": {
      "country_ref": { "type": "String", "required": true, "unique": true },
      "alpha2": { "type": "String", "required": true, "unique": true },
      "alpha3": { "type": "String" },
      "numeric_code": { "type": "String" },
      "name": { "type": "String", "required": true },
      "active": { "type": "Boolean", "required": true, "default": true }
    }
  },
  {
    "name": "foundation.currency",
    "domain": "foundation",
    "component": "mw.foundation",
    "authority": "REFERENCE",
    "fields": {
      "currency_ref": { "type": "String", "required": true, "unique": true },
      "code": { "type": "String", "required": true, "unique": true },
      "numeric_code": { "type": "String" },
      "name": { "type": "String", "required": true },
      "minor_unit": { "type": "Integer" },
      "active": { "type": "Boolean", "required": true, "default": true }
    }
  },
  {
    "name": "foundation.language",
    "domain": "foundation",
    "component": "mw.foundation",
    "authority": "REFERENCE",
    "fields": {
      "language_ref": { "type": "String", "required": true, "unique": true },
      "code": { "type": "String", "required": true, "unique": true },
      "name": { "type": "String", "required": true },
      "native_name": { "type": "String" },
      "active": { "type": "Boolean", "required": true, "default": true }
    }
  },
  {
    "name": "foundation.timezone",
    "domain": "foundation",
    "component": "mw.foundation",
    "authority": "REFERENCE",
    "fields": {
      "timezone_ref": { "type": "String", "required": true, "unique": true },
      "name": { "type": "String", "required": true, "unique": true },
      "primary_country_ref": { "type": "Reference", "ref_kind": "foundation_country_optional" },
      "active": { "type": "Boolean", "required": true, "default": true }
    }
  },
  {
    "name": "foundation.locale",
    "domain": "foundation",
    "component": "mw.foundation",
    "authority": "REFERENCE",
    "fields": {
      "locale_ref": { "type": "String", "required": true, "unique": true },
      "language_ref": { "type": "Relation", "required": true, "target": "foundation.language.language_ref" },
      "country_ref": { "type": "Relation", "required": true, "target": "foundation.country.country_ref" },
      "currency_ref": { "type": "Relation", "required": true, "target": "foundation.currency.currency_ref" },
      "timezone_ref": { "type": "Relation", "required": true, "target": "foundation.timezone.timezone_ref" },
      "label": { "type": "String", "required": true },
      "active": { "type": "Boolean", "required": true, "default": true }
    }
  },
  {
    "name": "foundation.uom",
    "domain": "foundation",
    "component": "mw.foundation",
    "authority": "REFERENCE",
    "fields": {
      "uom_ref": { "type": "String", "required": true, "unique": true },
      "code": { "type": "String", "required": true, "unique": true },
      "name": { "type": "String", "required": true },
      "symbol": { "type": "String", "required": true },
      "category": { "type": "Enum", "required": true, "enum": ["count", "time", "length", "mass", "volume"] },
      "active": { "type": "Boolean", "required": true, "default": true }
    }
  }
];
