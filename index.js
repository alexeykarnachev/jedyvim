import { Grid } from "./grid.js";
import { Doc } from "./doc.js";
import { Vim, MODES } from "./vim.js";

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
var TOP_VIEW_ROW = 0;

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


function get_info_line(i_row, i_col, n_total_cols, mode) {
    if (mode === MODES.insert) {
        var mode_str = "-- INSERT --";
    } else {
        var mode_str = "";
    }

    let info = mode_str + " ".repeat(n_total_cols - mode_str.length - 13) + `${i_row},${i_col}`;

    return info;
}

function get_row_number_lines(line_numbers, grid_n_rows) {
    let lines = Array(grid_n_rows).fill("~    ");
    let prev_line_number = null;

    for (let i = 0; i < line_numbers.length; ++i) {

        if (line_numbers[i] !== prev_line_number) {
            let s = line_numbers[i].toString();
            if (s.length > 4) {
                throw ("Number of lines > 999 is not supported now")
            }
            lines[i] = " ".repeat(3 - s.length) + s + " ";
            prev_line_number = line_numbers[i];
        } else {
            lines[i] = "     ";
        }
    }

    return lines;
}

function get_doc_view(doc_on_grid, row_top, n_rows) {
    let row_bot = row_top + n_rows - 1;
    let doc_view = {
        lines: doc_on_grid.lines.slice(row_top, row_bot + 1),
        line_numbers: doc_on_grid.line_numbers.slice(row_top, row_bot + 1),
    };

    let cursor_pos = doc_on_grid.grid_cursor_pos;
    if (cursor_pos.i_row < row_top || cursor_pos.i_row > row_bot) {
        doc_view.grid_cursor_pos = null;
    } else {
        doc_view.grid_cursor_pos = { i_row: cursor_pos.i_row - row_top, i_col: cursor_pos.i_col };
    }

    return doc_view;
}


function draw() {
    CONTEXT.clearRect(0, 0, CANVAS.width, CANVAS.height);
    let doc_on_grid = DOC.put_on_grid_with_word_warping(DOC_GRID.n_cols);
    let grid_cursor_pos = doc_on_grid.grid_cursor_pos;
    if (grid_cursor_pos.i_row >= TOP_VIEW_ROW + DOC_GRID.n_rows) {
        TOP_VIEW_ROW = grid_cursor_pos.i_row - DOC_GRID.n_rows + 1;
    } else if (grid_cursor_pos.i_row < TOP_VIEW_ROW) {
        TOP_VIEW_ROW = grid_cursor_pos.i_row;
    }

    let line_number = doc_on_grid.line_numbers[grid_cursor_pos.i_row];
    let info_line = get_info_line(line_number, grid_cursor_pos.i_col + 1, INFO_GRID.n_cols, VIM.mode);
    let doc_view = get_doc_view(doc_on_grid, TOP_VIEW_ROW, DOC_GRID.n_rows);

    let lines = doc_view.lines;
    grid_cursor_pos = doc_view.grid_cursor_pos;
    let row_number_lines = get_row_number_lines(doc_view.line_numbers, DOC_GRID.n_rows);

    if (grid_cursor_pos !== null) {
        CONTEXT.fillStyle = CURSOR_COLOR;
        let cursor_cell = DOC_GRID.get_cell_pos(grid_cursor_pos.i_row, grid_cursor_pos.i_col);
        if (VIM.is_insert_mode()) {
            CONTEXT.fillRect(cursor_cell.x, cursor_cell.y, EDIT_CURSOR_WIDTH, cursor_cell.h);
        } else {
            CONTEXT.fillRect(cursor_cell.x, cursor_cell.y, cursor_cell.w, cursor_cell.h);
        }
    }

    for (let i_row = 0; i_row < row_number_lines.length; ++i_row) {
        for (let i_col = 0; i_col < row_number_lines[i_row].length; ++i_col) {
            let cell_pos = ROW_NUMBER_GRID.get_cell_pos(i_row, i_col);
            let char = row_number_lines[i_row][i_col];
            let char_width = CONTEXT.measureText(char).width;
            let char_width_offset = (INFO_GRID.cell_width - char_width) / 2;
            CONTEXT.fillStyle = ROW_NUMBER_COLOR;
            CONTEXT.font = FONT_STYLE;
            CONTEXT.textBaseline = "bottom";
            CONTEXT.fillText(char, cell_pos.x + char_width_offset, cell_pos.y + cell_pos.h);
        }
    }

    for (let i_col = 0; i_col < info_line.length; ++i_col) {
        let cell_pos = INFO_GRID.get_cell_pos(0, i_col);
        let char = info_line[i_col];
        let char_width = CONTEXT.measureText(char).width;
        let char_width_offset = (INFO_GRID.cell_width - char_width) / 2;
        CONTEXT.fillStyle = TEXT_COLOR;
        CONTEXT.font = FONT_STYLE;
        CONTEXT.textBaseline = "bottom";
        CONTEXT.fillText(char, cell_pos.x + char_width_offset, cell_pos.y + cell_pos.h);
    }

    for (let i_row = 0; i_row < lines.length; ++i_row) {
        for (let i_col = 0; i_col < lines[i_row].length; ++i_col) {
            let cell_pos = DOC_GRID.get_cell_pos(i_row, i_col);
            let char = lines[i_row][i_col];

            if (char === " ") {
                CONTEXT.fillStyle = SPACE_CIRCLE_COLOR;
                CONTEXT.beginPath();
                CONTEXT.arc(cell_pos.x + cell_pos.w * 0.5, cell_pos.y + cell_pos.h * 0.5, 2, 0, 2 * Math.PI);
                CONTEXT.fill();
            } else {
                if (!VIM.is_insert_mode() && grid_cursor_pos.i_row === i_row && grid_cursor_pos.i_col === i_col) {
                    CONTEXT.fillStyle = BACKGROUND_COLOR;
                } else {
                    CONTEXT.fillStyle = TEXT_COLOR;
                }
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

function main() {
    requestAnimationFrame(draw);
}

main();
