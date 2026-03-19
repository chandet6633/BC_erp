/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2706913755")

  // update collection data
  unmarshal({
    "createRule": "",
    "listRule": "",
    "viewRule": ""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2706913755")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != '' || @request.auth.role = 'employee'",
    "listRule": "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.role = 'owner'",
    "viewRule": "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.role = 'owner'"
  }, collection)

  return app.save(collection)
})
