# FireSight MCP server

Read-only, cited building intelligence over MCP (stdio). It serves the cached building files in
`web/public/buildings/` and never writes, never calls the network, and never invents a fact.

| Tool | Input | Returns |
|---|---|---|
| `resolve_address` | `address` ("50 Church St") | parcel matches and which alias matched |
| `get_building_intel` | `apn` ("0874003") | every public fact with claim label and source records, conflicts, unknowns, compliance rows, data limits |
| `get_size_up_brief` | `apn` | the validated brief, each line with its citations and claim label |

## Run

```bash
cd mcp && npm ci
npm run inspect        # MCP Inspector in the browser
```

## Claude Desktop (demo laptop only, with Vidyut's OK)

On the demo laptop, after `git pull` and `npm ci` in `mcp/`, add this to
`~/Library/Application Support/Claude/claude_desktop_config.json` (merge into an existing
`mcpServers` block; do not replace the file), then quit and reopen Claude Desktop:

```json
{
  "mcpServers": {
    "firesight": {
      "command": "npx",
      "args": ["tsx", "/ABSOLUTE/PATH/TO/FireSight/mcp/src/server.ts"]
    }
  }
}
```

Demo prompt: "Give me the size-up for 400 Duboce Ave in San Francisco." Claude should call
`resolve_address`, then `get_size_up_brief("0874003")`. Back up the config file first and
remove the `firesight` entry after the event.
