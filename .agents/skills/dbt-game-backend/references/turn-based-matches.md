# Turn-based matches

## Implement the prototype flow

- Model the match lifecycle, participants, rules, and terminal result. Implement creation, joining, reading current state, submitting actions, and any resign, timeout, or scoring actions the game supports. Validate membership and role for every command and subscription. Treat room presence and the committed match state as distinct concerns.
- Let a client submit an action with a stable command ID and the state version it acted on. In a transaction or an equivalent serialized write, verify membership, lifecycle, current turn, and legality, then persist the new state and result. Deduplicate retries and return the committed result for the same command. Reject stale actions and conflicting reuse of a command ID. Use server time for clocks and timeouts when they affect outcomes.
- For a game with hidden information, project the authoritative state for each authorized role. Apply the same visibility rules to responses, broadcasts, reconnect snapshots, history, and spectators when present. Tailor public replay and postgame visibility to the game rules. Keep complete hidden state and unrevealed random inputs server-side.
- Use HTTP and polling when sufficient. Add a real-time transport when latency, presence, or clocks require it, and verify that the deployment runtime supports its connection lifecycle. Publish committed updates. On reconnect, load an authorized snapshot or resume from a version and recover missed updates. Use durable match state to recover after process restarts where the game promises ongoing matches.
- Keep slow engine or AI work outside the match transaction when used. Validate the resulting action against the current match version before applying it.

## Source examples

These paths are relative to their named local game repositories. Use them as examples of particular responsibilities within their own runtime and rules.

- **QuantumGo** uses a separately running backend. `backend/api/src/game_commands.rs`, `backend/api/src/game_engine.rs`, `backend/api/src/ws.rs`, and `backend/api/src/time_control.rs` are starting points for commands, rules, socket updates, and clocks.
- **FogChess** uses a separately running Node backend with Socket.IO. `backend/src/services/ChessService.ts`, `backend/src/services/RoomService.ts`, and `backend/src/server.ts` are starting points for fog-of-war rules, rooms, and transport.
