import { Doc } from "./doc.js";
import { DocView } from "./doc_view.js";
import { Grid } from "./grid.js";
import { run_tests } from "./tests.js";
import { MODES, Vim } from "./vim.js";

const DIV = document.getElementById("text_editor");
const CANVAS = /** @type {HTMLCanvasElement} */ document.createElement("canvas");
const CONTEXT = /** @type {CanvasRenderingContext2D} */ CANVAS.getContext("2d");
var FONT = new FontFace('SourceCodePro', 'url(assets/fonts/Source_Code_Pro/static/SourceCodePro-Regular.ttf)');
FONT.load().then((font) => { document.fonts.add(font) });

const CELL_WIDTH = 15;
const CELL_HEIGHT = 30;
const FONT_SIZE = CELL_HEIGHT - 2;
const FONT_STYLE = FONT_SIZE + "px SourceCodePro"

const CURSOR_COLOR = "#e2d2aa";
const BACKGROUND_COLOR = "#202020";
const SPACE_CIRCLE_COLOR = "#404040";
const TEXT_COLOR = "#e2d2aa";
const ROW_NUMBER_COLOR = "#675d54";
const EDIT_CURSOR_WIDTH = CELL_WIDTH * 0.2;
CANVAS.style.backgroundColor = BACKGROUND_COLOR;
CANVAS.style.width = "98%";
CANVAS.style.height = "95%";
DIV.appendChild(CANVAS);

const DOC = new Doc();
const VIM = new Vim(DOC);
const DOC_GRID = new Grid(
    CANVAS.width - CELL_WIDTH * 2,
    CANVAS.height - CELL_HEIGHT,
    CELL_WIDTH,
    CELL_HEIGHT,
    4 * CELL_WIDTH,
    0
);
const INFO_GRID = new Grid(
    CANVAS.width,
    CELL_HEIGHT,
    CELL_WIDTH,
    CELL_HEIGHT,
    0,
    CANVAS.height - CELL_HEIGHT
);
const ROW_NUMBER_GRID = new Grid(
    CELL_WIDTH * 4,
    CANVAS.height - CELL_WIDTH,
    CELL_WIDTH,
    CELL_HEIGHT,
    0,
    0
)

const DOC_VIEW = new DocView(VIM, DOC, DOC_GRID, INFO_GRID);

function onresize() {
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
    DOC_GRID.resize(CANVAS.width, CANVAS.height - CELL_HEIGHT, 4 * CELL_WIDTH, 0);
    INFO_GRID.resize(CANVAS.width, CANVAS.height, 0, CANVAS.height - CELL_HEIGHT);
    ROW_NUMBER_GRID.resize(CELL_WIDTH * 4, CANVAS.height - CELL_HEIGHT, 0, 0);
}

onresize();
window.onresize = onresize;
window.onkeydown = event => { VIM.onkeydown(event) };

function draw() {
    CONTEXT.clearRect(0, 0, CANVAS.width, CANVAS.height);
    DOC_VIEW.update();

    for (let i_row = 0; i_row < DOC_VIEW.row_number_lines.length; ++i_row) {
        for (let i_col = 0; i_col < DOC_VIEW.row_number_lines[i_row].length; ++i_col) {
            let cell_pos = ROW_NUMBER_GRID.get_cell_pos(i_row, i_col);
            let char = DOC_VIEW.row_number_lines[i_row][i_col];
            let char_width = CONTEXT.measureText(char).width;
            let char_width_offset = (INFO_GRID.cell_width - char_width) / 2;
            CONTEXT.fillStyle = ROW_NUMBER_COLOR;
            CONTEXT.font = FONT_STYLE;
            CONTEXT.textBaseline = "bottom";
            CONTEXT.fillText(char, cell_pos.x + char_width_offset, cell_pos.y + cell_pos.h);
        }
    }

    for (let i_col = 0; i_col < DOC_VIEW.info_line.length; ++i_col) {
        let cell_pos = INFO_GRID.get_cell_pos(0, i_col);
        let char = DOC_VIEW.info_line[i_col];
        let char_width = CONTEXT.measureText(char).width;
        let char_width_offset = (INFO_GRID.cell_width - char_width) / 2;
        CONTEXT.fillStyle = TEXT_COLOR;
        CONTEXT.font = FONT_STYLE;
        CONTEXT.textBaseline = "bottom";
        CONTEXT.fillText(char, cell_pos.x + char_width_offset, cell_pos.y + cell_pos.h);
    }

    CONTEXT.fillStyle = CURSOR_COLOR;
    let head_cell = DOC_GRID.get_cell_pos(DOC_VIEW.grid_cursor_pos.head_i_row, DOC_VIEW.grid_cursor_pos.head_i_col);
    let tail_cell = DOC_GRID.get_cell_pos(DOC_VIEW.grid_cursor_pos.tail_i_row, DOC_VIEW.grid_cursor_pos.tail_i_col);
    if (VIM.is_insert_mode) {
        CONTEXT.fillRect(head_cell.x, head_cell.y, EDIT_CURSOR_WIDTH, head_cell.h);
        CONTEXT.fillRect(tail_cell.x, tail_cell.y, EDIT_CURSOR_WIDTH, tail_cell.h);
    } else {
        CONTEXT.fillRect(head_cell.x, head_cell.y, head_cell.w, head_cell.h);
        CONTEXT.fillRect(tail_cell.x, tail_cell.y, tail_cell.w, tail_cell.h);
    }

    for (let i_row = 0; i_row < DOC_VIEW.lines.length; ++i_row) {
        let n_cols = DOC_VIEW.lines[i_row].length;
        if (DOC_VIEW.is_in_cursor(i_row, n_cols)) {
            let cell_pos = DOC_GRID.get_cell_pos(i_row, n_cols);
            CONTEXT.fillStyle = CURSOR_COLOR;
            CONTEXT.fillRect(cell_pos.x, cell_pos.y, cell_pos.w, cell_pos.h);
        }

        for (let i_col = 0; i_col < n_cols; ++i_col) {
            let cell_pos = DOC_GRID.get_cell_pos(i_row, i_col);
            let char = DOC_VIEW.lines[i_row][i_col];
            let is_in_cursor = DOC_VIEW.is_in_cursor(i_row, i_col);
            let is_at_cursor_head = DOC_VIEW.is_at_cursor_head(i_row, i_col);
            let is_at_cursor_tail = DOC_VIEW.is_at_cursor_tail(i_row, i_col);

            if (is_in_cursor) {
                CONTEXT.fillStyle = CURSOR_COLOR;
                CONTEXT.fillRect(cell_pos.x, cell_pos.y, cell_pos.w, cell_pos.h);
                CONTEXT.fillStyle = BACKGROUND_COLOR;
            } else if ((is_at_cursor_head || is_at_cursor_tail) && (!VIM.is_insert_mode)) {
                CONTEXT.fillStyle = BACKGROUND_COLOR;
            } else {
                CONTEXT.fillStyle = TEXT_COLOR;
            }

            if (char === " ") {
                CONTEXT.fillStyle = SPACE_CIRCLE_COLOR;
                CONTEXT.beginPath();
                CONTEXT.arc(cell_pos.x + cell_pos.w * 0.5, cell_pos.y + cell_pos.h * 0.5, 2, 0, 2 * Math.PI);
                CONTEXT.fill();
            } else {
                let char_width = CONTEXT.measureText(char).width;
                let char_width_offset = (DOC_GRID.cell_width - char_width) / 2;
                CONTEXT.font = FONT_STYLE;
                CONTEXT.textBaseline = "bottom";
                CONTEXT.fillText(char, cell_pos.x + char_width_offset, cell_pos.y + cell_pos.h);
            }
        }
    }
    requestAnimationFrame(draw);
}

async function main() {
    await run_tests(false);
    requestAnimationFrame(draw);
}


main();
