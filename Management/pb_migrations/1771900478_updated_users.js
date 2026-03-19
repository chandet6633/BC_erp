/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "branch_use31",
    "maxSelect": 1,
    "name": "branch",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "main",
      "suphan"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "branch_use31",
    "maxSelect": 1,
    "name": "branch",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "viriyah",
      "bcauto"
    ]
  }))

  return app.save(collection)
})
