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
    }


    get head_abs_pos() {
        return this.doc_grid.n_cols * this.grid_cursor_pos.head_i_row + this.grid_cursor_pos.head_i_col;
    }

    get tail_abs_pos() {
        return this.doc_grid.n_cols * this.grid_cursor_pos.tail_i_row + this.grid_cursor_pos.tail_i_col;
    }

    update() {
        let grid_cursor_pos = {head_i_row: 0, head_i_col: 0, tail_i_row: 0, tail_i_col: 0};
        let lines = [];
        let line_numbers = [];

        let line = [];
        let line_number = 0;
        let i_row = 0;
        let i_col = 0;
        let i_char = 0;

        while (true) {
            let char = this.doc.buffer.get_element(i_char);
            if (char == null) {
                break;
            }

            if (char !== "\n") {
                line.push(char)
                i_col += 1;
            }

            if (i_col === this.doc_grid.n_cols || char === "\n") {
                line_numbers.push(line_number);
                lines.push(line);

                line_number += char === "\n";
                line = [];
                i_row += 1;
                i_col = 0;
            }


            if (i_char === this.doc.head.abs - 1) {
                grid_cursor_pos.head_i_row = i_row;
                grid_cursor_pos.head_i_col = i_col;
            }

            if (i_char === this.doc.tail.abs - 1) {
                grid_cursor_pos.tail_i_row = i_row;
                grid_cursor_pos.tail_i_col = i_col;
            }

            i_char += 1;
        }

        lines.push(line);
        line_numbers.push(line_number);

        if (grid_cursor_pos.head_i_row >= this.top_view_row + this.doc_grid.n_rows) {
            this.top_view_row = grid_cursor_pos.head_i_row - this.doc_grid.n_rows + 1;
        } else if (grid_cursor_pos.head_i_row < this.top_view_row) {
            this.top_view_row = grid_cursor_pos.head_i_row;
        }

        let row_bot = this.top_view_row + this.doc_grid.n_rows - 1;

        lines = lines.slice(this.top_view_row, row_bot + 1);
        line_numbers = line_numbers.slice(this.top_view_row, row_bot + 1);
        let info_i_row = line_numbers[grid_cursor_pos.head_i_row];
        let info_i_col = grid_cursor_pos.head_i_col;

        this.grid_cursor_pos = grid_cursor_pos;
        this.line_numbers = line_numbers;
        this.lines = lines;
        this.info_line = get_info_line(info_i_row, info_i_col, this.info_grid.n_cols, this.vim.mode, this.vim.command);
        this.row_number_lines = get_row_number_lines(line_numbers, this.doc_grid.n_rows);
    }

    is_in_cursor(i_row, i_col) {
        let left_pos = Math.min(this.head_abs_pos, this.tail_abs_pos);
        let right_pos = Math.max(this.head_abs_pos, this.tail_abs_pos);
        let cell_pos = this.doc_grid.n_cols * i_row + i_col;
        if (cell_pos < right_pos && cell_pos > left_pos) {
            return true;
        }
        return false;
    }

    is_at_cursor_head(i_row, i_col) {
        return (this.doc_grid.n_cols * i_row + i_col) == this.head_abs_pos;
    }

    is_at_cursor_tail(i_row, i_col) {
        return (this.doc_grid.n_cols * i_row + i_col) == this.tail_abs_pos;
    }
}

function get_info_line(i_row, i_col, n_total_cols, mode, command) {
    i_row += 1;
    i_col += 1;
    if (mode === MODES.insert) {
        var mode_str = "-- INSERT --";
        var command_str = "";
    } else if (mode === MODES.normal) {
        var mode_str = "";
        var command_str = command.join("");
    } else if (mode === MODES.visual) {
        var mode_str = "-- VISUAL --";
        var command_str = command.join("");
    } else if (mode === MODES.visual_line) {
        var mode_str = "-- VISUAL LINE --";
        var command_str = command.join("");
    } else {
        throw(`[ERROR] Unhandled mode: ${mode}. Please, implement the branch where error has occurred`)
    }

    let info = [
        mode_str,
        " ".repeat(n_total_cols - mode_str.length - 23),
        command_str,
        " ".repeat(10 - command_str.length),
        `${i_row},${i_col}`
    ].join("");

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
