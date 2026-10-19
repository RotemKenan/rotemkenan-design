# Event Studio · by Rotem Kenan
*See the event before the first guest walks in.*

A personal design tool for weddings and private events — mood board → floor plan → 3D → client presentation.
English / עברית switch in the top bar (Hebrew is fully right-to-left).

**Workflow:** create an event (top bar ＋, switch between events any time) → fill the event details →
build the mood (upload a PowerPoint or photos, or start from a mood template; edit the palette and choose where each colour goes;
*Apply mood*) → load the venue DXF → drag pieces from your inventory onto the plan or *Suggest a layout* →
fine-tune in **2D**, **3D** or side-by-side **2D + 3D** (moving in one moves the other) → **Presentation** → Print / save PDF for the client.

**Plan editing:** drag to move · ↻ knob or R to rotate · Shift+click / Shift+drag to select several · align & spread tools ·
Ctrl+D duplicate · Ctrl+C / Ctrl+V · Del · Ctrl+Z / Ctrl+Shift+Z · arrows nudge (Shift = 50 cm) · lock a piece · label tables ·
distance to the nearest wall while dragging · overlapping pieces turn red · seat count vs guests and stock warnings.
In 3D, click a piece to select it and drag it on the floor.

Events are saved automatically in the browser (IndexedDB). Use *⋯ → Export event file* to back up or move an event to another computer.

1. **Venue plan** – upload the venue drawing as **DXF** (or try the demo hall). Choose which layers to show.
   *DWG is a closed Autodesk format that browsers can't read directly — open it in AutoCAD / DWG TrueView /
   the free [ODA File Converter](https://www.opendesign.com/guestfiles/oda_file_converter) and save as DXF.*
2. **Mood board** – upload your PowerPoint (.pptx). The app pulls out the images and builds a colour palette;
   click a swatch, then a furniture colour, to apply it.
3. **Furniture selection** – add presets (round/banquet/knight tables, lounge, bar, stage, dance floor,
   chuppah, florals…) or custom items with your real dimensions (cm), seats and quantities.
4. **Suggest a layout** – auto-places stage, dance floor, head table, bar, lounges and all guest tables,
   avoiding walls and columns. Then drag, rotate (R), duplicate (Ctrl+D) or delete anything.
5. **Download new DXF plan** – a CAD file (cm units) with the venue + every item on its own layer, ready for
   the venue / suppliers.
6. **3D View** – walk-through of the design with the mood colours, lighting moods and one-click PNG renders
   from several angles.

Projects auto-save in the browser; use *Export project* to keep a file per event.

## Run it
It's a static site — no install. Serve the folder and open it:
```
python3 -m http.server 8000   # then open http://localhost:8000
```
Or enable GitHub Pages on this repository to use it from any device.

## Inventory, 3D models and DXF blocks
The **Inventory** tab lists every piece with its measurements (orange = estimate, still to measure).
Print the measuring sheet, measure with a tape, type the real sizes and tick *Measured*: the plan, DXF and 3D update.
Each piece has a textured 3D model (**GLB**, metres) and a top-view CAD block (**DXF**, cm, base point = centre,
seat backs toward +Y). Ready-made copies are in `assets/models/` (`3d/`, `dwg-dxf/`, `inventory.csv`);
"Download all models" rebuilds them with your latest measurements. The event plan export now places each piece
as a block, so in AutoCAD every item can be selected, moved and counted as one object.
