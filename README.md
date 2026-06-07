# Minecraft Pocket Remote

A local Safari/PWA-style controller for playing Minecraft Java from a phone while your Windows PC runs the game.

## Run

```powershell
node server/index.js
```

Open `http://localhost:4173/host` on the PC, click `Start screen share`, and choose the screen that shows Minecraft. Open the phone link shown on the host page, enter the host pair code, and keep Minecraft focused on the PC.

## Controls

- Left stick maps to `W`, `A`, `S`, and `D`.
- Look pad and right Bluetooth-controller stick move the mouse.
- `Break` holds left click. `Place` holds right click.
- `Jump`, `Sneak`, `Sprint`, `Inv`, `Esc`, hotbar numbers, `Tab`, `Alt Tab`, and `Win` send the matching Windows/Minecraft inputs.
- `Desktop` mode turns the phone surface and controller stick into a mouse so you can click launchers, taskbar items, crash dialogs, or relaunch Minecraft.

## Bluetooth Controller

Pair the controller to the phone first, then open the phone page. The browser Gamepad API sends controller input through the phone to the PC.

## Notes

This runs on your local network and sends input to the foreground Windows app. Keep it on a trusted Wi-Fi network. Safari can add the phone page to the Home Screen; full service-worker behavior over a LAN IP may require HTTPS, but the controller itself runs over local HTTP.
