/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_957739655")

  // add field
  collection.fields.addAt(11, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text774256125",
    "max": 0,
    "min": 0,
    "name": "created_by_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3725765462",
    "max": 0,
    "min": 0,
    "name": "created_by",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // update field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "branch_rev92",
    "maxSelect": 1,
    "name": "branch",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "viriyah",
      "bcauto",
      "main",
      "suphanburi"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_957739655")

  // remove field
  collection.fields.removeById("text774256125")

  // remove field
  collection.fields.removeById("text3725765462")

  // update field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "branch_rev92",
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
