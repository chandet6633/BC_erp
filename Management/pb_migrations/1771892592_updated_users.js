/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "deleteRule": "",
    "listRule": "",
    "updateRule": "",
    "viewRule": ""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "deleteRule": "id = @request.auth.id",
    "listRule": "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.role = 'owner'",
    "updateRule": "id = @request.auth.id",
    "viewRule": "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.role = 'owner'"
  }, collection)

  return app.save(collection)
})
