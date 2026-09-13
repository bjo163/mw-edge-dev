export const COMPONENTS = {
  "mw.business": {
    "id": "mw.business",
    "kind": "domain_plugin",
    "domain": "business",
    "path": "plugins/business"
  },
  "mw.crm": {
    "id": "mw.crm",
    "kind": "domain_plugin",
    "domain": "crm",
    "path": "plugins/crm"
  },
  "mw.reseller": {
    "id": "mw.reseller",
    "kind": "domain_plugin",
    "domain": "reseller",
    "path": "plugins/reseller"
  },
  "mw.catalog": {
    "id": "mw.catalog",
    "kind": "domain_plugin",
    "domain": "catalog",
    "path": "plugins/catalog"
  },
  "mw.commerce": {
    "id": "mw.commerce",
    "kind": "domain_plugin",
    "domain": "commerce",
    "path": "plugins/commerce"
  },
  "mw.service": {
    "id": "mw.service",
    "kind": "domain_plugin",
    "domain": "service",
    "path": "plugins/service"
  },
  "mw.billing": {
    "id": "mw.billing",
    "kind": "domain_plugin",
    "domain": "billing",
    "path": "plugins/billing"
  },
  "mw.entitlement": {
    "id": "mw.entitlement",
    "kind": "domain_plugin",
    "domain": "entitlement",
    "path": "plugins/entitlement"
  },
  "mw.provisioning": {
    "id": "mw.provisioning",
    "kind": "domain_plugin",
    "domain": "provisioning",
    "path": "plugins/provisioning"
  },
  "mw.support": {
    "id": "mw.support",
    "kind": "domain_plugin",
    "domain": "support",
    "path": "plugins/support"
  },
  "mw.knowledge": {
    "id": "mw.knowledge",
    "kind": "domain_plugin",
    "domain": "knowledge",
    "path": "plugins/knowledge"
  },
  "mw.procurement": {
    "id": "mw.procurement",
    "kind": "domain_plugin",
    "domain": "procurement",
    "path": "plugins/procurement"
  },
  "mw.inventory": {
    "id": "mw.inventory",
    "kind": "domain_plugin",
    "domain": "inventory",
    "path": "plugins/inventory"
  },
  "mw.finance": {
    "id": "mw.finance",
    "kind": "domain_plugin",
    "domain": "finance",
    "path": "plugins/finance"
  },
  "mw.isp": {
    "id": "mw.isp",
    "kind": "domain_plugin",
    "domain": "isp",
    "path": "plugins/isp"
  },
  "mw.foundation": {
    "id": "mw.foundation",
    "kind": "domain_plugin",
    "domain": "foundation",
    "path": "plugins/foundation"
  },
  "mw.standalone": {
    "id": "mw.standalone",
    "kind": "domain_plugin",
    "domain": "standalone",
    "path": "plugins/standalone"
  },
  "mw.business.project": {
    "id": "mw.business.project",
    "kind": "addon",
    "domain": "business",
    "path": "addons/business-project"
  },
  "mw.crm.pipeline": {
    "id": "mw.crm.pipeline",
    "kind": "addon",
    "domain": "crm",
    "path": "addons/crm-pipeline"
  },
  "mw.reseller.commission": {
    "id": "mw.reseller.commission",
    "kind": "addon",
    "domain": "reseller",
    "path": "addons/reseller-commission"
  },
  "mw.billing.payment": {
    "id": "mw.billing.payment",
    "kind": "addon",
    "domain": "billing",
    "path": "addons/billing-payment"
  },
  "mw.support.escalation": {
    "id": "mw.support.escalation",
    "kind": "addon",
    "domain": "support",
    "path": "addons/support-escalation"
  },
  "mw.isp.network": {
    "id": "mw.isp.network",
    "kind": "addon",
    "domain": "isp",
    "path": "addons/isp-network"
  },
  "mw.isp.radius": {
    "id": "mw.isp.radius",
    "kind": "addon",
    "domain": "isp",
    "path": "addons/isp-radius"
  },
  "mw.isp.pppoe": {
    "id": "mw.isp.pppoe",
    "kind": "addon",
    "domain": "isp",
    "path": "addons/isp-pppoe"
  },
  "mw.isp.accounting": {
    "id": "mw.isp.accounting",
    "kind": "addon",
    "domain": "isp",
    "path": "addons/isp-accounting"
  }
};
export function componentEntry(id){ const c=COMPONENTS[id]; if(!c) throw new Error(`Unknown component ${id}`); return c; }
