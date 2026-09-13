export default [
  {
    "name": "finance.account",
    "domain": "finance",
    "component": "mw.finance",
    "authority": "CANONICAL",
    "fields": {
      "account_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "code": {
        "type": "String",
        "required": true
      },
      "name": {
        "type": "String",
        "required": true
      },
      "account_type": {
        "type": "Enum",
        "required": true,
        "enum": [
          "asset",
          "liability",
          "equity",
          "income",
          "expense"
        ]
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
    "name": "finance.journal_entry",
    "domain": "finance",
    "component": "mw.finance",
    "authority": "CANONICAL",
    "fields": {
      "journal_entry_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "status": {
        "type": "Enum",
        "required": true,
        "default": "draft",
        "enum": [
          "draft",
          "posted",
          "reversed"
        ]
      },
      "occurred_at": {
        "type": "DateTime",
        "required": true
      },
      "source_ref": {
        "type": "Reference",
        "ref_kind": "business_source"
      },
      "provenance_ref": {
        "type": "Reference",
        "ref_kind": "provenance"
      }
    }
  },
  {
    "name": "finance.journal_line",
    "domain": "finance",
    "component": "mw.finance",
    "authority": "CANONICAL",
    "fields": {
      "journal_line_ref": {
        "type": "String",
        "required": true,
        "unique": true
      },
      "journal_entry_ref": {
        "type": "Relation",
        "required": true,
        "target": "finance.journal_entry.journal_entry_ref"
      },
      "account_ref": {
        "type": "Relation",
        "required": true,
        "target": "finance.account.account_ref"
      },
      "tenant_ref": {
        "type": "Reference",
        "required": true,
        "ref_kind": "tenant_scope"
      },
      "side": {
        "type": "Enum",
        "required": true,
        "enum": [
          "debit",
          "credit"
        ]
      },
      "amount": {
        "type": "Decimal",
        "required": true
      },
      "currency": {
        "type": "Reference",
        "required": true,
        "ref_kind": "cross_domain:foundation.currency"
      },
      "memo": {
        "type": "Text"
      }
    }
  }
];
