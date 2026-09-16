// tradfri-bridge/server.js

const http = require("http");

const HOST = "127.0.0.1";
const PORT = Number(process.env.TRADFRI_BRIDGE_PORT || 4310);

const bridgeState = {
  tradfriConnected: false,
};

/*
 * Testenheter.
 *
 * Dessa ersätts senare med riktiga enheter från TRÅDFRI Gateway.
 * Arrayen är medvetet ändringsbar så att vi redan nu kan testa
 * på/av och dimring genom hela systemet.
 */
const devices = [
  {
    id: "living-ceiling",
    roomId: "living-room",
    roomName: "Vardagsrum",
    name: "Taklampa",
    type: "light",
    online: true,
    isOn: true,
    brightness: 75,
  },
  {
    id: "living-window",
    roomId: "living-room",
    roomName: "Vardagsrum",
    name: "Fönsterlampa",
    type: "light",
    online: true,
    isOn: true,
    brightness: 55,
  },
  {
    id: "kitchen-ceiling",
    roomId: "kitchen",
    roomName: "Kök",
    name: "Taklampa",
    type: "light",
    online: true,
    isOn: true,
    brightness: 90,
  },
  {
    id: "bedroom-ceiling",
    roomId: "bedroom",
    roomName: "Sovrum",
    name: "Taklampa",
    type: "light",
    online: true,
    isOn: false,
    brightness: 40,
  },
  {
    id: "bedroom-bedside",
    roomId: "bedroom",
    roomName: "Sovrum",
    name: "Sänglampa",
    type: "light",
    online: true,
    isOn: false,
    brightness: 30,
  },
];

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });

  res.end(JSON.stringify(data, null, 2));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 10000) {
        reject(new Error("Request body är för stor."));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Ogiltig JSON."));
      }
    });

    req.on("error", reject);
  });
}

function getDeviceIdFromUrl(url) {
  const match = url.match(/^\/devices\/([^/?]+)$/);

  if (!match) {
    return null;
  }

  return decodeURIComponent(match[1]);
}

const server = http.createServer(async (req, res) => {
  /*
   * GET /health
   */
  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "family-dashboard-tradfri-bridge",
      status: "running",
      tradfriConnected: bridgeState.tradfriConnected,
      timestamp: new Date().toISOString(),
    });

    return;
  }

  /*
   * GET /devices
   */
  if (req.method === "GET" && req.url === "/devices") {
    sendJson(res, 200, {
      ok: true,
      mode: bridgeState.tradfriConnected ? "live" : "demo",
      devices,
      timestamp: new Date().toISOString(),
    });

    return;
  }

  /*
   * PATCH /devices/:id
   *
   * Exempel:
   *
   * {
   *   "isOn": false
   * }
   *
   * eller:
   *
   * {
   *   "brightness": 50
   * }
   */
  if (req.method === "PATCH") {
    const deviceId = getDeviceIdFromUrl(req.url);

    if (deviceId) {
      const device = devices.find((item) => item.id === deviceId);

      if (!device) {
        sendJson(res, 404, {
          ok: false,
          error: "Enheten kunde inte hittas.",
        });

        return;
      }

      if (!device.online) {
        sendJson(res, 409, {
          ok: false,
          error: "Enheten är offline.",
        });

        return;
      }

      try {
        const body = await readJsonBody(req);

        const hasIsOn = Object.prototype.hasOwnProperty.call(
          body,
          "isOn"
        );

        const hasBrightness = Object.prototype.hasOwnProperty.call(
          body,
          "brightness"
        );

        if (!hasIsOn && !hasBrightness) {
          sendJson(res, 400, {
            ok: false,
            error: "Ingen ändring angavs.",
          });

          return;
        }

        if (hasIsOn && typeof body.isOn !== "boolean") {
          sendJson(res, 400, {
            ok: false,
            error: "isOn måste vara true eller false.",
          });

          return;
        }

        if (hasBrightness) {
          if (
            typeof body.brightness !== "number" ||
            !Number.isFinite(body.brightness)
          ) {
            sendJson(res, 400, {
              ok: false,
              error: "brightness måste vara ett nummer.",
            });

            return;
          }

          if (body.brightness < 1 || body.brightness > 100) {
            sendJson(res, 400, {
              ok: false,
              error: "brightness måste vara mellan 1 och 100.",
            });

            return;
          }
        }

        if (hasIsOn) {
          device.isOn = body.isOn;
        }

        if (hasBrightness && device.type === "light") {
          device.brightness = Math.round(body.brightness);
        }

        sendJson(res, 200, {
          ok: true,
          mode: bridgeState.tradfriConnected ? "live" : "demo",
          device,
          timestamp: new Date().toISOString(),
        });

        return;
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Kunde inte läsa kommandot.",
        });

        return;
      }
    }
  }

  sendJson(res, 404, {
    ok: false,
    error: "Not found",
  });
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("🏠 Family Dashboard – TRÅDFRI Bridge");
  console.log("------------------------------------");
  console.log(`✓ Servern kör på http://${HOST}:${PORT}`);
  console.log(`✓ Health:  http://${HOST}:${PORT}/health`);
  console.log(`✓ Devices: http://${HOST}:${PORT}/devices`);
  console.log("✓ Styrning: PATCH /devices/:id");

  if (bridgeState.tradfriConnected) {
    console.log("✓ TRÅDFRI Gateway är ansluten");
  } else {
    console.log("○ TRÅDFRI Gateway är inte ansluten ännu");
    console.log("○ /devices använder testdata");
  }

  console.log("");
});