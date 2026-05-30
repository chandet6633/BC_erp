/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_362626831")

  // update collection data
  unmarshal({
    "listRule": "",
    "viewRule": ""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_362626831")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.role = 'owner'",
    "viewRule": "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.role = 'owner'"
  }, collection)

  return app.save(collection)
})
