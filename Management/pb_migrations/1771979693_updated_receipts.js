/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1571142587")

  // update collection data
  unmarshal({
    "name": "image_storage"
  }, collection)

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text189152524",
    "max": 0,
    "min": 0,
    "name": "tool_reference",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1571142587")

  // update collection data
  unmarshal({
    "name": "receipts"
  }, collection)

  // remove field
  collection.fields.removeById("text189152524")

  return app.save(collection)
})
