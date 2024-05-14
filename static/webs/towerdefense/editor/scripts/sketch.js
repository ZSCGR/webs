var cols;
var rows;
var ts = 24;            // tile size
var zoomDefault = ts;

var display;            // graphical display tiles
var displayDir;         // direction graphical display tiles are facing
                        // (0 = none, 1 = left, 2 = up, 3 = right, 4 = down)
var grid;               // (0 = empty, 1 = wall, 2 = path, 3 = tower,
                        //  4 = enemy-only pathing)
var metadata;           // tile metadata
var paths;              // direction to travel

var exit;
var spawnpoints = [];

var bg = [0, 0, 0];     // background color
var border = 255;       // fill color for tile borders
var borderAlpha = 31;   // tile border alpha

var autogen = true;     // automatically generate display layer
var deco = 'empty';     // decoration to draw
var dispMode = false;   // whether or not to show display tiles
var tile = 'empty';     // tile to draw


// Misc functions

// Draw an arrow
function arrow() {
    stroke(0);
    var length = 0.7 * ts;
    var back = 0.1 * ts;
    var width = 0.5 * ts;
    line(-length / 2, 0, length / 2, 0);
    line(-length / 2, 0, -back, -width / 2);
    line(-length / 2, 0, -back, width / 2);
}

// Return map string
function exportMap() {
    // Convert spawnpoints into a JSON-friendly format
    var spawns = [];
    for (var i = 0; i < spawnpoints.length; i++) {
        var s = spawnpoints[i];
        spawns.push([s.x, s.y]);
    }
    return LZString.compressToBase64(JSON.stringify({
        // Grids
        display: display,
        displayDir: displayDir,
        grid: grid,
        metadata: metadata,
        paths: paths,
        // Important tiles
        exit: [exit.x, exit.y],
        spawnpoints: spawns,
        // Colors
        bg: bg,
        border: border,
        borderAlpha: borderAlpha,
        // Misc
        cols: cols,
        rows: rows
    }));
}

// Generate display layer
function genDisplay() {
    display = replaceArray(
        grid, [0, 1, 2, 3, 4], ['empty', 'wall', 'empty', 'tower', 'empty']
    );
    displayDir = buildArray(cols, rows, 0);
    // Colors
    bg = [0, 0, 0];
    border = 255;
    borderAlpha = 31;
    // Misc
    metadata = buildArray(cols, rows, null);
}

// Return walkability map
function getWalkMap() {
    var walkMap = [];
    for (var x = 0; x < cols; x++) {
        walkMap[x] = [];
        for (var y = 0; y < rows; y++) {
            walkMap[x][y] = walkable(x, y);
        }
    }
    return walkMap;
}

// Load a map from a map string
function importMap(str) {
    try {
        var m = JSON.parse(LZString.decompressFromBase64(str));

        // Grids
        display = m.display;
        displayDir = m.displayDir;
        grid = m.grid;
        metadata = m.metadata;
        paths = m.paths;
        // Important tiles
        exit = createVector(m.exit[0], m.exit[1]);
        spawnpoints = [];
        for (var i = 0; i < m.spawnpoints.length; i++) {
            var s = m.spawnpoints[i];
            spawnpoints.push(createVector(s[0], s[1]));
        }
        // Colors
        bg = m.bg;
        border = m.border;
        borderAlpha = m.borderAlpha;
        // Misc
        cols = m.cols;
        rows = m.rows;

        resizeFit();
    } catch (err) {}
}

// Recalculate pathfinding maps
// Algorithm from https://www.redblobgames.com/pathfinding/tower-defense/
function recalculate() {
    if (!exit) return;
    walkMap = getWalkMap();
    var frontier = [];
    var target = vts(exit);
    frontier.push(target);
    var cameFrom = {};
    cameFrom[target] = null;

    // Fill cameFrom and distance for every tile
    while (frontier.length !== 0) {
        var current = frontier.shift();
        var t = stv(current);
        var adj = neighbors(walkMap, t.x, t.y, true);

        for (var i = 0; i < adj.length; i++) {
            var next = adj[i];
            if (next in cameFrom) continue;
            frontier.push(next);
            cameFrom[next] = current;
        }
    }

    // Generate usable maps
    var newPaths = buildArray(cols, rows, 0);
    var keys = Object.keys(cameFrom);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var current = stv(key);

        // Generate path direction for every tile
        var val = cameFrom[key];
        if (val !== null) {
            // Subtract vectors to determine direction
            var next = stv(val);
            var dir = next.sub(current);
            // Fill tile with direction
            if (dir.x < 0) newPaths[current.x][current.y] = 1;
            if (dir.y < 0) newPaths[current.x][current.y] = 2;
            if (dir.x > 0) newPaths[current.x][current.y] = 3;
            if (dir.y > 0) newPaths[current.x][current.y] = 4;
        }
    }

    // Preserve old paths on path tiles
    for (var x = 0; x < cols; x++) {
        for (var y = 0; y < rows; y++) {
            if (grid[x][y] === 2) newPaths[x][y] = paths[x][y];
        }
    }

    paths = newPaths;
}

// Clear grid
function resetMap(t) {
    dispMode = false;
    updateDivs();
    
    var d = ['empty', 'wall', 'empty', 'tower', 'empty'][t]
    display = buildArray(cols, rows, d);
    displayDir = buildArray(cols, rows, 0);
    grid = buildArray(cols, rows, t);
    metadata = buildArray(cols, rows, null);
    paths = buildArray(cols, rows, 0);

    exit = null;
    spawnpoints = [];
}

// Changes tile size to fit everything onscreen
function resizeFit() {
    var div = document.getElementById('sketch-holder');
    var ts1 = floor(div.offsetWidth / cols);
    var ts2 = floor(div.offsetHeight / rows);
    ts = Math.min(ts1, ts2);
    resizeCanvas(cols * ts, rows * ts, true);
    updateStatus();
}

// Resizes cols, rows, and canvas based on tile size
function resizeMax() {
    var div = document.getElementById('sketch-holder');
    cols = floor(div.offsetWidth / ts);
    rows = floor(div.offsetHeight / ts);
    resizeCanvas(cols * ts, rows * ts, true);
    updateStatus();
}

// Store selected tile in appropriate location
function selectTile(t, d) {
    if (typeof d === 'undefined') {
        dispMode ? deco = t : tile = t;
    } else {
        dispMode ? deco = d : tile = t;
    }
}

// Update tile- and decoration-selection divs
function updateDivs() {
    var t = document.getElementById('tile-picker').style;
    var d = document.getElementById('deco-picker').style;
    if (dispMode) {
        t.display = 'none';
        d.display = 'block';
    } else {
        t.display = 'block';
        d.display = 'none';
    }
}

// Update map status display
function updateStatus() {
    document.getElementById('dim').innerHTML = 'Dim: ' + cols + 'x' + rows;
}

// User drawing on map
function userDraw() {
    if (!mouseInMap()) return;
    var p = gridPos(mouseX, mouseY);
    var g = grid[p.x][p.y];
    if (dispMode) {
        var d = ['none', 'left', 'up', 'right', 'down'].indexOf(deco);
        if (d !== -1) {
            displayDir[p.x][p.y] = d;
            return;
        }
        display[p.x][p.y] = tiles.hasOwnProperty(deco) ? deco : 'empty';
    } else {
        var d = ['none', 'left', 'up', 'right', 'down'].indexOf(tile);
        if (d !== -1) {
            paths[p.x][p.y] = g !== 1 && g !== 3 ? d : 0;
            return;
        } else if (tile === 'exit') {
            exit = createVector(p.x, p.y);
            for (var i = 0; i < spawnpoints.length; i++) {
                if (exit.equals(spawnpoints[i])) {
                    spawnpoints.splice(i, 1);
                    break;
                }
            }
            grid[p.x][p.y] = 0;
            paths[p.x][p.y] = 0;
        } else if (tile === 'spawn') {
            var s = createVector(p.x, p.y);
            for (var i = 0; i < spawnpoints.length; i++) {
                if (s.equals(spawnpoints[i]) || s.equals(exit)) return;
            }
            spawnpoints.push(s);
            if (!walkable(p.x, p.y)) grid[p.x][p.y] = 0;
        } else {
            var t = ['empty', 'wall', 'path', 'tower', 'enemy'].indexOf(tile);
            if (t === -1) return;
            if (t === 1 || t === 3) {
                if (p.equals(exit)) return;
                for (var i = 0; i < spawnpoints.length; i++) {
                    if (p.equals(spawnpoints[i])) return;
                }
            }
            grid[p.x][p.y] = t;
            if (t === 1 || t === 3) paths[p.x][p.y] = 0;
            if (autogen) display[p.x][p.y] = [
                'empty', 'wall', 'empty', 'tower', 'empty'
            ][t];
        }
    }
}

// Filling tiles
function userFill() {
    var sel = dispMode ? deco : tile;
    var d = ['none', 'left', 'up', 'right', 'down'].indexOf(sel);
    if (dispMode) {
        if (d === -1) {
            display = buildArray(cols, rows, sel);
        } else {
            displayDir = buildArray(cols, rows, d);
        }
    } else {
        if (d === -1) {
            var t = [
                'empty', 'wall', 'path', 'tower', 'enemy'
            ].indexOf(sel);
            if (t === -1) return;
            grid = buildArray(cols, rows, t);
        } else {
            paths = buildArray(cols, rows, d);
        }
    }
}

// Return whether tile is walkable
function walkable(col, row) {
    // Check if empty or path tile
    return grid[col][row] !== 1 && grid[col][row] !== 3;
}


// Main p5 functions

function setup() {
    var div = document.getElementById('sketch-holder');
    var canvas = createCanvas(div.offsetWidth, div.offsetHeight);
    canvas.parent('sketch-holder');
    resizeMax();
    resetMap(0);
}

function draw() {
    background(dispMode ? bg : 255);
    
    // Update mouse coordinates
    if (mouseInMap()) {
        var t = gridPos(mouseX, mouseY);
        var coordText = 'Mouse: (' + t.x + ', ' + t.y + ')';
        document.getElementById('coord').innerHTML = coordText;
    }
    
    // Draw basic tiles
    for (var x = 0; x < cols; x++) {
        for (var y = 0; y < rows; y++) {
            if (dispMode) {
                var t = tiles[display[x][y]];
                if (typeof t === 'function') {
                    t(x, y, displayDir[x][y]);
                } else {
                    stroke(border, borderAlpha);
                    t ? fill(t) : noFill();
                    rect(x * ts, y * ts, ts, ts);
                }
            } else {
                stroke(0, 63);
                var t = grid[x][y];
                t === 0 ? noFill() : fill([
                    [108, 122, 137],
                    [191, 85, 236],
                    [25, 181, 254],
                    [233, 212, 96]
                ][t - 1]);
                rect(x * ts, y * ts, ts, ts);
            }
        }
    }

    // Draw spawnpoints
    for (var i = 0; i < spawnpoints.length; i++) {
        stroke(dispMode ? 255 : 0);
        fill(0, 230, 64);
        var s = spawnpoints[i];
        rect(s.x * ts, s.y * ts, ts, ts);
    }

    // Draw exit
    if (exit) {
        stroke(dispMode ? 255 : 0);
        fill(207, 0, 15);
        rect(exit.x * ts, exit.y * ts, ts, ts);
    }

    // Draw paths
    if (!dispMode) {
        for (var x = 0; x < cols; x++) {
            for (var y = 0; y < rows; y++) {
                if (!walkable(x, y) || (
                    exit && x === exit.x && y === exit.y
                )) {
                    paths[x][y] = 0;
                    continue;
                }
                var d = paths[x][y];
                if (d === 0) continue;
                push();
                var c = center(x, y);
                translate(c.x, c.y);
                rotate([0, PI / 2, PI, PI * 3 / 2][d - 1]);
                arrow();
                pop();
            }
        }
    }
}


// User input

function keyPressed() {
    switch (keyCode) {
        case 32:
            // Spacebar
            dispMode = !dispMode;
            updateDivs();
            break;
        case 37:
            // Left arrow
            selectTile('left');
            break;
        case 38:
            // Up arrow
            selectTile('up');
            break;
        case 39:
            // Right arrow
            selectTile('right');
            break;
        case 40:
            // Down arrow
            selectTile('down');
            break;
        case 48:
            // 0
            selectTile('none');
            break;
        case 49:
            // 1
            selectTile('empty');
            break;
        case 50:
            // 2
            selectTile('wall');
            break;
        case 51:
            // 3
            selectTile('path', 'tower');
            break;
        case 52:
            // 4
            selectTile('tower', 'grass');
            break;
        case 53:
            // 5
            selectTile('enemy', 'road');
            break;
        case 54:
            // 6
            selectTile('spawn', 'lCorner');
            break;
        case 55:
            // 7
            selectTile('exit', 'rCorner');
            break;
        case 56:
            // 8
            if (dispMode) deco = 'sidewalk';
            break;
        case 67:
            // C
            display = buildArray(cols, rows, 'empty');
            displayDir = buildArray(cols, rows, 0);
            break;
        case 68:
            // D
            autogen = !autogen;
            var state = autogen ? 'Off' : 'On';
            var a = document.getElementById('autogen');
            a.innerHTML = 'Turn Autogen ' + state + ' (D)';
            break;
        case 70:
            // F
            userFill();
            break;
        case 76:
            // L
            displayDir = copyArray(paths);
            break;
        case 77:
            // M
            importMap(prompt('Input map string:'));
            break;
        case 80:
            // P
            recalculate();
            break;
        case 81:
            // Q
            paths = buildArray(cols, rows, 0);
            break;
        case 82:
            // R
            resetMap(0);
            break;
        case 83:
            // S
            spawnpoints = [];
            break;
        case 85:
            // U
            genDisplay();
            break;
        case 88:
            // X
            copyToClipboard(exportMap());
            break;
        case 90:
            // Z
            ts = zoomDefault;
            resizeMax();
            resetMap(0);
            break;
        case 219:
            // Left bracket
            if (keyIsDown(SHIFT)) {
                if (rows > 1) {
                    rows--;
                    resizeFit();
                    resetMap(0);
                }
            } else {
                if (cols > 1) {
                    cols--;
                    resizeFit();
                    resetMap(0);
                }
            }
            break;
        case 221:
            // Right bracket
            if (keyIsDown(SHIFT)) {
                rows++;
            } else {
                cols++;
            }
            resizeFit();
            resetMap(0);
            break;
    }
}

function mouseDragged() {
    userDraw();
}

function mousePressed() {
    userDraw();
}
