# Focus ambient audio

Focus sessions use layered **Web Audio** synthesis by default (`useFocusAmbientSound.js`):

- **Rain** — low/mid/high filtered noise layers plus random droplet hits
- **Café** — rumble + modulated murmur + occasional clink/chatter bursts
- **Space** — detuned low drones with slow filter movement and light delay
- **Brown / white / forest** — filtered noise beds

## Optional recorded loops

For even richer ambience, add seamless looping `.ogg` files (10–30s) with these exact names:

- `rain.ogg`
- `cafe.ogg`
- `space.ogg`

The hook tries these paths first and falls back to synthesis if a file is missing.

Phase transition chimes are synthesized in-session via the Web Audio API.
