import { Doc } from "./doc.js";
import { DocView } from "./doc_view.js";
import { Grid } from "./grid.js";
import { run_tests } from "./tests.js";
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

const CURSOR_COLOR = "#e2d2aa";
const SELECT_COLOR = "#d79921";
const BACKGROUND_COLOR = "#202020";
const SPACE_CIRCLE_COLOR = "#404040";
const TEXT_COLOR = "#e2d2aa";
const TEXT_IN_CURSOR_COLOR = "black";
const SELECTED_TEXT_COLOR = "#504945";
const ROW_NUMBER_COLOR = "#675d54";
const INSERT_CURSOR_WIDTH = CELL_WIDTH * 0.2;
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
let KEYDOWN_RES = null;

function onresize() {
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
    DOC_GRID.resize(CANVAS.width, CANVAS.height - CELL_HEIGHT, 4 * CELL_WIDTH, 0);
    INFO_GRID.resize(CANVAS.width, CANVAS.height, 0, CANVAS.height - CELL_HEIGHT);
    ROW_NUMBER_GRID.resize(CELL_WIDTH * 4, CANVAS.height - CELL_HEIGHT, 0, 0);
}

onresize();
window.onresize = onresize;
window.onkeydown = event => { KEYDOWN_RES = VIM.onkeydown(event) };

function draw_row_number_lines() {
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
}

function draw_info_line() {
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
}

function draw_cursor() {
    let cell_pos = DOC_GRID.get_cell_pos(DOC_VIEW.grid_cursor_pos.i_row, DOC_VIEW.grid_cursor_pos.i_col);
    CONTEXT.fillStyle = CURSOR_COLOR;
    if (VIM.is_insert_mode) {
        CONTEXT.fillRect(cell_pos.x, cell_pos.y, INSERT_CURSOR_WIDTH, cell_pos.h)
    } else {
        CONTEXT.fillRect(cell_pos.x, cell_pos.y, cell_pos.w, cell_pos.h);
    }

}

function draw_cells() {
    for (let i_row = 0; i_row < DOC_VIEW.lines.length; ++i_row) {
        for (let i_col = 0; i_col < DOC_VIEW.lines[i_row].length; ++i_col) {
            let char = DOC_VIEW.lines[i_row][i_col];

            let is_in_select = DOC.is_select_started && DOC_VIEW.is_in_select(i_row, i_col);
            let is_in_cursor = DOC_VIEW.is_in_cursor(i_row, i_col);
            let cell_pos = DOC_GRID.get_cell_pos(i_row, i_col);

            if (is_in_select) {
                CONTEXT.fillStyle = SELECT_COLOR;
                CONTEXT.fillRect(cell_pos.x, cell_pos.y, cell_pos.w, cell_pos.h);
            }

            if (is_in_cursor && !VIM.is_insert_mode) {
                CONTEXT.fillStyle = TEXT_IN_CURSOR_COLOR;
            } else if (is_in_select) {
                CONTEXT.fillStyle = SELECTED_TEXT_COLOR;
            } else {
                CONTEXT.fillStyle = TEXT_COLOR;
            }

            if (char === " " && !is_in_select) {
                CONTEXT.fillStyle = SPACE_CIRCLE_COLOR;
                CONTEXT.beginPath();
                CONTEXT.arc(cell_pos.x + cell_pos.w * 0.5, cell_pos.y + cell_pos.h * 0.5, 2, 0, 2 * Math.PI);
                CONTEXT.fill();
            } else if (char != null) {
                let char_width = CONTEXT.measureText(char).width;
                let char_width_offset = (DOC_GRID.cell_width - char_width) / 2;
                CONTEXT.font = FONT_STYLE;
                CONTEXT.textBaseline = "bottom";
                CONTEXT.fillText(char, cell_pos.x + char_width_offset, cell_pos.y + cell_pos.h);
            }
        }
    }
}

function draw() {
    CONTEXT.clearRect(0, 0, CANVAS.width, CANVAS.height);
    DOC_VIEW.update();
    draw_row_number_lines();
    draw_info_line();
    draw_cursor();
    draw_cells();
    requestAnimationFrame(draw);
}

async function main() {
    await run_tests(false);
    requestAnimationFrame(draw);
}


main();
