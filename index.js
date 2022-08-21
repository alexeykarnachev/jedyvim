const DIV = document.getElementById("text_editor");
const CANVAS = /** @type {HTMLCanvasElement} */ document.createElement("canvas");
const CONTEXT = CANVAS.getContext("2d");
const CELL_WIDTH = 15;
const CELL_HEIGHT = 30;
const FONT_SIZE = CELL_HEIGHT - 2;
const FONT_STYLE = FONT_SIZE + "px SourceCodePro"

var FONT = new FontFace('SourceCodePro', 'url(assets/fonts/Source_Code_Pro/static/SourceCodePro-Regular.ttf)');
FONT.load().then((font) => { document.fonts.add(font) });

CURSOR_COLOR = "#d5c4a1";
BACKGROUND_COLOR = "#282828";
TEXT_COLOR = "#ffffff";
CANVAS.style.backgroundColor = BACKGROUND_COLOR;
CANVAS.style.width = "100%";
CANVAS.style.height = "100%";
DIV.appendChild(CANVAS);

class Grid {
    constructor(width, height, cell_width, cell_height) {
        this.width = width;
        this.height = height;
        this.cell_width = cell_width;
        this.cell_height = cell_height;
        this.n_cols = 0;
        this.n_rows = 0;

        this.resize(width, height);
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.n_cols = Math.floor(width / this.cell_width);
        this.n_rows = Math.floor(height / this.cell_height);
    }

    get_cell(i_line, i_pos) {
        let x = i_pos * GRID.cell_width;
        let y = i_line * GRID.cell_height;
        let w = GRID.cell_width;
        let h = GRID.cell_height;

        return { x: x, y: y, w: w, h: h };
    }
}

class Cursor {
    constructor(doc) {
        this.i_line = 0;
        this.i_pos = 0;
        this.doc = doc;
    }

    move_horizontally(n_steps) {
        let line = this.doc.lines[this.i_line];
        n_steps = Math.min(n_steps, line.length - this.i_pos);
        this.i_pos = Math.max(0, this.i_pos + n_steps);
    }

    move_vertically(n_steps) {
        n_steps = Math.min(n_steps, this.doc.lines.length - this.i_pos - 1)
        this.i_line = Math.max(0, this.i_line + n_steps);
        this.i_pos = Math.max(0, Math.min(this.i_pos, this.doc.lines[this.i_line].length - 1));
    }

    insert_char(char) {
        if (this.i_line >= this.doc.lines.length) {
            throw (`Can't insert character at line:${this.i_line} because there are only ${this.doc.lines.length} lines in the document`);
        }

        let line = this.doc.lines[this.i_line];
        if (this.i_pos > line.length) {
            throw (`Can't insert character at line:${this.i_line} at pos:${this.i_pos} because the line has only ${line.length} characters`);
        }

        line.splice(this.i_pos, 0, char);
        CURSOR.move_horizontally(1);
    }

    insert_newline() {
        let line = this.doc.lines[this.i_line];
        let left = line.slice(0, this.i_pos);
        let right = line.slice(this.i_pos);
        this.doc.lines.splice(this.i_line, 1, left);
        this.doc.lines.splice(this.i_line + 1, 0, right);
        this.i_line += 1;
        this.i_pos = 0;
    }

    remove_char() {
        if (this.i_pos == 0) {
            if (this.i_line != 0) {
                let removed_line = this.doc.lines.splice(this.i_line, 1)[0];
                this.i_line -= 1;
                this.i_pos = this.doc.lines[this.i_line].length;
                this.doc.lines[this.i_line].push(...removed_line);
            }
            return;
        }

        if (this.i_line >= this.doc.lines.length) {
            throw (`Can't remove character at line:${this.i_line} because there are only ${this.doc.lines.length} lines in the document`);
        }

        let i_pos = this.i_pos - 1;
        let line = this.doc.lines[this.i_line];
        if (i_pos >= line.length) {
            throw (`Can't remove character at line:${this.i_line} at pos:${i_pos} because the line has only ${line.length} characters`);
        }
        this.move_horizontally(-1);
        line.splice(i_pos, 1);
    }
}

class Doc {
    constructor() {
        this.lines = [[]];
    }
}

var GRID = new Grid(CANVAS.width, CANVAS.height, CELL_WIDTH, CELL_HEIGHT);
var DOC = new Doc();
var CURSOR = new Cursor(DOC);

function on_window_resize() {
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
    GRID.resize(CANVAS.width, CANVAS.height);
}

function on_window_keydown(event) {
    let keycode = event.keyCode;
    let is_printable =
        (keycode == 32) || // spacebar key
        (keycode > 47 && keycode < 58) || // number keys
        (keycode > 64 && keycode < 91) || // letter keys
        (keycode > 95 && keycode < 112) || // numpad keys
        (keycode > 185 && keycode < 193) || // ;=,-./` (in order)
        (keycode > 218 && keycode < 223);   // [\]' (in order)

    let is_return = keycode == 13;
    let is_backspace = keycode == 8;
    let is_left_arrow = keycode == 37;
    let is_up_arrow = keycode == 38;
    let is_right_arrow = keycode == 39;
    let is_down_arrow = keycode == 40;

    if (is_printable) {
        let char = event.key;
        if (char.length != 1) {
            throw (`Can't render character: ${char}`);
        }
        CURSOR.insert_char(char);
    } else if (is_return) {
        CURSOR.insert_newline(); 
    } else if (is_backspace) {
        CURSOR.remove_char();
    } else if (is_left_arrow) {
        CURSOR.move_horizontally(-1);
    } else if (is_right_arrow) {
        CURSOR.move_horizontally(1);
    } else if (is_up_arrow) {
        CURSOR.move_vertically(-1);
    } else if (is_down_arrow) {
        CURSOR.move_vertically(1);
    }
}


on_window_resize();
window.onresize = on_window_resize;
window.onkeydown = on_window_keydown;

function draw() {
    let cell = GRID.get_cell(CURSOR.i_line, CURSOR.i_pos);
    CONTEXT.clearRect(0, 0, CANVAS.width, CANVAS.height);
    CONTEXT.fillStyle = CURSOR_COLOR;
    CONTEXT.fillRect(cell.x, cell.y, cell.w, cell.h);

    for (let i_line in DOC.lines) {
        let line = DOC.lines[i_line];
        for (let i_pos in line) {
            let char = line[i_pos];
            let cell = GRID.get_cell(i_line, i_pos);
            if (i_line == CURSOR.i_line && i_pos == CURSOR.i_pos) {
                CONTEXT.fillStyle = BACKGROUND_COLOR;
            } else {
                CONTEXT.fillStyle = TEXT_COLOR;
            }
            CONTEXT.font = FONT_STYLE;
            CONTEXT.textBaseline = "bottom";
            CONTEXT.fillText(char, cell.x, cell.y + cell.h);
        }
    }

    requestAnimationFrame(draw);
}

function main() {
    requestAnimationFrame(draw);
}

main();
