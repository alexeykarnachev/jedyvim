import { MODES } from "./vim.js";

export class DocView {
    constructor(vim, doc, doc_grid, info_grid) {
        this.vim = vim;
        this.doc = doc;
        this.doc_grid = doc_grid;
        this.info_grid = info_grid;
        this.top_view_row = 0;
        this.line_numbers = [];
        this.lines = [];
        this.info_line = "";
        this.row_number_lines = [];
        this.grid_cursor_pos = {};
        this.grid_select_pos = {};
    }

    update() {
        let doc_on_grid = put_on_grid_with_word_wrapping(this.doc, this.doc_grid.n_cols);
        let lines = doc_on_grid.lines;
        let line_numbers = doc_on_grid.line_numbers;
        let grid_cursor_pos = doc_on_grid.grid_cursor_pos;
        let grid_select_pos = doc_on_grid.grid_select_pos;

        if (grid_cursor_pos.i_row >= this.top_view_row + this.doc_grid.n_rows) {
            this.top_view_row = grid_cursor_pos.i_row - this.doc_grid.n_rows + 1;
        } else if (grid_cursor_pos.i_row < this.top_view_row) {
            this.top_view_row = grid_cursor_pos.i_row;
        }
        grid_cursor_pos.i_row -= this.top_view_row;
        grid_select_pos.top.i_row -= this.top_view_row;
        grid_select_pos.bot.i_row -= this.top_view_row;

        let row_bot = this.top_view_row + this.doc_grid.n_rows - 1;

        lines = lines.slice(this.top_view_row, row_bot + 1);
        line_numbers = line_numbers.slice(this.top_view_row, row_bot + 1);

        this.grid_cursor_pos = grid_cursor_pos;
        this.grid_select_pos = grid_select_pos;
        this.line_numbers = line_numbers;
        this.lines = lines;
        this.info_line = get_info_line(this.doc.cursor.i_row, this.doc.cursor.i_col, this.info_grid.n_cols, this.vim.mode, this.vim.command);
        this.row_number_lines = get_row_number_lines(line_numbers, this.doc_grid.n_rows);
    }

    is_in_select(i_row, i_col) {
        let pos = i_row * this.doc_grid.n_cols + i_col;
        let top_pos = this.grid_select_pos.top.i_row * this.doc_grid.n_cols + this.grid_select_pos.top.i_col;
        let bot_pos = this.grid_select_pos.bot.i_row * this.doc_grid.n_cols + this.grid_select_pos.bot.i_col;
        if (pos >= top_pos && pos <= bot_pos) {
            return true;
        }
        return false;
    }

    is_in_cursor(i_row, i_col) {
        if (i_row === this.grid_cursor_pos.i_row && i_col === this.grid_cursor_pos.i_col) {
            return true;
        }
        return false;
    }
}

function get_info_line(i_row, i_col, n_total_cols, mode, command) {
    i_row += 1;
    i_col += 1;
    if (mode === MODES.insert) {
        var mode_str = "-- INSERT --";
        var command_str = "";
    } else if (mode === MODES.normal) {
        var mode_str = "-- NORMAL --";
        var command_str = command.join("");
    } else if (mode === MODES.visual) {
        var mode_str = "-- VISUAL --";
        var command_str = command.join("");
    } else if (mode === MODES.visual_line) {
        var mode_str = "-- VISUAL LINE --";
        var command_str = command.join("");
    } else {
        throw (`[ERROR] Unhandled mode: ${mode}. Please, implement the branch where error has occurred`)
    }

    let info = [
        mode_str,
        " ".repeat(n_total_cols - mode_str.length - 13),
        command_str,
        " ".repeat(command_str.length),
        `${i_row},${i_col}`
    ].join("");
    // let info = [
    //     mode_str,
    //     " ".repeat(n_total_cols - mode_str.length - 23),
    //     command_str,
    //     " ".repeat(10 - command_str.length),
    //     `${i_row},${i_col}`
    // ].join("");

    return info;
}

function get_row_number_lines(line_numbers, grid_n_rows) {
    let lines = Array(grid_n_rows).fill("~    ");
    let prev_line_number = null;

    for (let i = 0; i < line_numbers.length; ++i) {
        if (line_numbers[i] !== prev_line_number) {
            let s = (line_numbers[i] + 1).toString();
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

export function put_on_grid_with_word_wrapping(doc, n_cols) {
    let grid_cursor_pos = { i_row: 0, i_col: 0 };
    let grid_select_pos = { top: { i_row: 0, i_col: 0 }, bot: { i_row: 0, i_col: 0 } };
    let lines = [];
    let line_numbers = [];

    let line = [];
    let line_number = 0;
    let i_row = 0;
    let i_col = 0;
    let i_char = 0;

    while (true) {
        let char = doc.buffer.get_element(i_char);

        if (char != null) {
            line.push(char)
        }

        if (i_char === doc.cursor.abs) {
            grid_cursor_pos.i_row = i_row;
            grid_cursor_pos.i_col = i_col;
        }

        if (doc.select != null && i_char === doc.select.top.abs) {
            grid_select_pos.top.i_row = i_row;
            grid_select_pos.top.i_col = i_col;
        }

        if (doc.select != null && i_char === doc.select.bot.abs) {
            grid_select_pos.bot.i_row = i_row;
            grid_select_pos.bot.i_col = i_col;
        }

        if (char == null) {
            break;
        }

        if (i_col === n_cols - 1 || char === "\n") {
            line_numbers.push(line_number);
            lines.push(line);

            line_number += char === "\n";
            line = [];
            i_row += 1;
            i_col = 0;
        } else {
            i_col += 1;
        }
        i_char += 1;
    }

    line.push(null);
    lines.push(line);
    line_numbers.push(line_number);
    return { lines: lines, line_numbers: line_numbers, grid_cursor_pos: grid_cursor_pos, grid_select_pos: grid_select_pos };
}
