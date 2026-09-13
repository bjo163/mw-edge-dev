export default [
  {
    name: "example.item",
    domain: "example",
    component: "mw.example",
    authority: "CANONICAL",
    fields: {
      item_ref: { type: "String", required: true, unique: true },
      name: { type: "String", required: true },
      notes: { type: "Text" },
      rank: { type: "Integer", required: true, default: 0 },
      active: { type: "Boolean", required: true, default: true },
      state: {
        type: "Enum",
        required: true,
        default: "draft",
        enum: ["draft", "active", "archived"],
      },
      metadata: { type: "Json" },
      external_ref: { type: "Reference", ref_kind: "external_example" },
    },
  },
] as const;
