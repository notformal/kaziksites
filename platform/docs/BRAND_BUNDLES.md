# Autonomous brand bundles

The lobby has three independent production artifacts. Each artifact has a fixed
identity compiled into JavaScript and static HTML metadata; it does not require
the legacy `?brand=` query parameter.

| Brand | Output | HTML title |
| --- | --- | --- |
| Aurora | `apps/lobby/dist/aurora` | Aurora Play — Social Arcade |
| Ember | `apps/lobby/dist/ember` | Ember Rush — Social Arcade |
| Royale | `apps/lobby/dist/royale` | Royale House — Social Arcade |

Build and verify all artifacts from the repository root:

```powershell
npm run build:brands
npm run verify:brands
```

Serve one artifact locally (the optional second argument is the port):

```powershell
npm run serve:brand -- -Brand aurora -Port 8080
npm run serve:brand -- -Brand ember -Port 8082
npm run serve:brand -- -Brand royale -Port 8083
```

For production, publish each output directory as the document root of its own
domain. Configure `VITE_API_URL` and `VITE_GAME_ORIGIN` in the environment before
building when the API and game static origin use separate domains. The API must
allow each final lobby origin explicitly.
