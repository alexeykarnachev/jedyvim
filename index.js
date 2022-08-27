import { Grid } from "./grid.js";
import { Doc } from "./doc.js";
import { Vim } from "./vim.js";

const DIV = document.getElementById("text_editor");
const CANVAS = /** @type {HTMLCanvasElement} */ document.createElement("canvas");
const CONTEXT = /** @type {CanvasRenderingContext2D} */ CANVAS.getContext("2d");
var FONT = new FontFace('SourceCodePro', 'url(assets/fonts/Source_Code_Pro/static/SourceCodePro-Regular.ttf)');
FONT.load().then((font) => { document.fonts.add(font) });

const CELL_WIDTH = 15;
const CELL_HEIGHT = 30;
const FONT_SIZE = CELL_HEIGHT - 2;
const FONT_STYLE = FONT_SIZE + "px SourceCodePro"

var CURSOR_COLOR = "#ffffff";
var BACKGROUND_COLOR = "#282828";
var SPACE_CIRCLE_COLOR = "#484848";
var TEXT_COLOR = "#ffffff";
var EDIT_CURSOR_WIDTH = CELL_WIDTH * 0.2;
CANVAS.style.backgroundColor = BACKGROUND_COLOR;
CANVAS.style.width = "98%";
CANVAS.style.height = "95%";
DIV.appendChild(CANVAS);

const DOC = new Doc();
const VIM = new Vim(DOC);
const GRID = new Grid(CANVAS.width, CANVAS.height, CELL_WIDTH, CELL_HEIGHT);

function onresize() {
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
    GRID.resize(CANVAS.width, CANVAS.height);
}

onresize();
window.onresize = onresize;
window.onkeydown = event => { VIM.onkeydown(event) };

function draw() {
    CONTEXT.clearRect(0, 0, CANVAS.width, CANVAS.height);
    let doc_on_grid = DOC.put_on_grid_with_word_warping(GRID.n_rows, GRID.n_cols);
    let lines = doc_on_grid.lines;
    let cursor_pos = doc_on_grid.cursor_pos;
    let cursor_cell = GRID.get_cell_pos(cursor_pos.i_row, cursor_pos.i_col);
    CONTEXT.fillStyle = CURSOR_COLOR;
    if (VIM.is_insert_mode()) {
        CONTEXT.fillRect(cursor_cell.x, cursor_cell.y, EDIT_CURSOR_WIDTH, cursor_cell.h);
    } else {
        CONTEXT.fillRect(cursor_cell.x, cursor_cell.y, cursor_cell.w, cursor_cell.h);
    }

    for (let i_row = 0; i_row < lines.length; ++i_row) {
        for (let i_col = 0; i_col < lines[i_row].length; ++i_col) {
            let cell_pos = GRID.get_cell_pos(i_row, i_col);
            let char = lines[i_row][i_col];

            if (char === " ") {
                CONTEXT.fillStyle = SPACE_CIRCLE_COLOR;
                CONTEXT.beginPath();
                CONTEXT.arc(cell_pos.x + cell_pos.w * 0.5, cell_pos.y + cell_pos.h * 0.5, 2, 0, 2 * Math.PI);
                CONTEXT.fill();
            } else {
                if (!VIM.is_insert_mode() && DOC.cursor_pos.i_row === i_row && DOC.cursor_pos.i_col === i_col) {
                    CONTEXT.fillStyle = BACKGROUND_COLOR;
                } else {
                    CONTEXT.fillStyle = TEXT_COLOR;
                }
                let char_width = CONTEXT.measureText(char).width;
                let char_width_offset = (GRID.cell_width - char_width) / 2;
                CONTEXT.font = FONT_STYLE;
                CONTEXT.textBaseline = "bottom";
                CONTEXT.fillText(char, cell_pos.x + char_width_offset, cell_pos.y + cell_pos.h);
            }

        }
    }
    requestAnimationFrame(draw);
}

function main() {
    requestAnimationFrame(draw);
}

main();