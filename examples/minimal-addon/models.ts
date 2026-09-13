export default [
  {
    name: "example.note",
    domain: "example",
    component: "mw.example.note",
    authority: "CANONICAL",
    fields: {
      note_ref: { type: "String", required: true, unique: true },
      item_ref: {
        type: "Relation",
        required: true,
        target: "example.item.item_ref",
      },
      body: { type: "Text", required: true },
    },
  },
] as const;
