/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_957739655")

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2908602461",
    "max": 0,
    "min": 0,
    "name": "payment_type",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "bool256245529",
    "name": "verified",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1624678591",
    "max": 0,
    "min": 0,
    "name": "verified_by",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "autodate894078913",
    "name": "verified_at",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_957739655")

  // remove field
  collection.fields.removeById("text2908602461")

  // remove field
  collection.fields.removeById("bool256245529")

  // remove field
  collection.fields.removeById("text1624678591")

  // remove field
  collection.fields.removeById("autodate894078913")

  return app.save(collection)
})
