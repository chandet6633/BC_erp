/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3053063491")

  // update field
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "branch_pro2",
    "maxSelect": 1,
    "name": "branch",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "BC Auto Service",
      "suphanburi",
      "samchuk",
      ""
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3053063491")

  // update field
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "branch_pro2",
    "maxSelect": 1,
    "name": "branch",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "BC Auto Service",
      "suphanburi",
      ""
    ]
  }))

  return app.save(collection)
})
