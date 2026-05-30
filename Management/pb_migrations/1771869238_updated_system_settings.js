/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3806592213")

  // update collection data
  unmarshal({
    "createRule": "",
    "deleteRule": "",
    "listRule": "",
    "updateRule": "",
    "viewRule": ""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3806592213")

  // update collection data
  unmarshal({
    "createRule": null,
    "deleteRule": null,
    "listRule": "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.role = 'owner'",
    "updateRule": null,
    "viewRule": "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.role = 'owner'"
  }, collection)

  return app.save(collection)
})
