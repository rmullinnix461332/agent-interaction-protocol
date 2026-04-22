# aip-engine

A file-system based Provider Engine for executing AIP workflows.

## Usage

```bash
# Start engine with defaults
aip-engine

# Start with custom config
aip-engine --config /path/to/config.yaml

# Start with flags
aip-engine --port 3000 --data-dir /var/lib/aip-engine

# Show version
aip-engine --version
```

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--config` | none | Path to config file |
| `--port` | 8080 | HTTP server port |
| `--host` | localhost | HTTP server host |
| `--data-dir` | ./data | Data storage directory |
| `--log-level` | info | Log level (debug, info, warn, error) |
| `--version` | - | Show version and exit |

## API Endpoints

The engine exposes two API surfaces:

### Admin API (`/api/v1/admin`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/info` | GET | Engine identity |
| `/capabilities` | GET | Supported features |
| `/flows` | GET, POST | List/connect flows |
| `/flows/{id}` | GET, DELETE | Inspect/disconnect flow |
| `/runs` | GET | List runs |
| `/runs/{id}` | GET | Inspect run |
| `/runs/{flowId}/start` | POST | Start run |
| `/runs/{id}/stop` | POST | Stop run |
| `/runs/{id}/resume` | POST | Resume await |
| `/participants` | GET | List participants |
| `/participants/{id}` | GET | Inspect participant |
| `/runs/{id}/artifacts` | GET | List artifacts |
| `/runs/{id}/artifacts/{ref}` | GET | Read artifact |
| `/diagnostics` | GET | Engine diagnostics |
| `/runs/{id}/events` | GET | Run event timeline |
| `/logs` | GET | Engine logs |

## Configuration

```yaml
# config.yaml
server:
  host: "localhost"
  port: 8080

engine:
  name: "local-engine"
  type: "local"
  dataDir: "./data"

logging:
  level: "info"
  format: "json"
```

## See Also

- [Implementation Plan](../../docs/changelog/2026-04-22-aip-engine-implementation-plan.md) - Detailed architecture and implementation phases
- [AIP Platform Overview](../../aip-platform.md) - Platform architecture
- [AIP Specification](../../aip-spec.md) - Protocol specification
