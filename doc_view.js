import { MODES } from "./vim.js";

export class DocView {
    constructor() {
        this.top_view_row = 0;
        this.line_numbers = [];
        this.lines = [];
        this.info_line = "";
        this.row_number_lines = [];
        this.grid_cursor_pos = { i_row: 0, i_col: 0 };
    }

    update(vim, doc, doc_grid, info_grid) {
        let lines = [];
        let line_numbers = [];
        let head_i_row = 0;
        let head_i_col = 0;
        let tail_i_row = 0;
        let tail_i_col = 0;

        let line = [];
        let line_number = 1;
        let i_row = 0;
        let i_col = 0;
        let i_char = 0;

        while (true) {
            let char = doc.buffer.get_element(i_char);
            if (char == null) {
                break;
            }

            if (char !== "\n") {
                line.push(char)
                i_col += 1;
            }

            if (i_col === doc_grid.n_cols || char === "\n") {
                line_numbers.push(line_number);
                lines.push(line);

                line_number += char === "\n";
                line = [];
                i_row += 1;
                i_col = 0;
            }


            if (i_char === doc.head.abs - 1) {
                head_i_row = i_row;
                head_i_col = i_col;
            }

            if (i_char === doc.tail.abs - 1) {
                tail_i_row = i_row;
                tail_i_col = i_col;
            }

            i_char += 1;
        }

        lines.push(line);
        line_numbers.push(line_number);

        if (head_i_row >= this.top_view_row + doc_grid.n_rows) {
            this.top_view_row = head_i_row - doc_grid.n_rows + 1;
        } else if (head_i_row < this.top_view_row) {
            this.top_view_row = head_i_row;
        }

        let row_bot = this.top_view_row + doc_grid.n_rows - 1;
        let grid_cursor_pos = null;
        if (head_i_row >= this.top_view_row && head_i_row <= row_bot) {
            grid_cursor_pos = { i_row: head_i_row - this.top_view_row, i_col: head_i_col };
        }

        lines = lines.slice(this.top_view_row, row_bot + 1);
        line_numbers = line_numbers.slice(this.top_view_row, row_bot + 1);
        let info_i_row = line_numbers[this.grid_cursor_pos.i_row];
        let info_i_col = head_i_col;

        this.grid_cursor_pos = grid_cursor_pos;
        this.line_numbers = line_numbers;
        this.lines = lines;
        this.info_line = get_info_line(info_i_row, info_i_col, info_grid.n_cols, vim.mode, vim.command);
        this.row_number_lines = get_row_number_lines(line_numbers, doc_grid.n_rows);
    }
}

function get_info_line(i_row, i_col, n_total_cols, mode, command) {
    if (mode === MODES.insert) {
        var mode_str = "-- INSERT --";
        var command_str = "";
    } else if (mode === MODES.normal) {
        var mode_str = "";
        var command_str = command.join("");
    } else {
        throw (`Can't construct info line for '${mode}' mode. Please, implement this branch where this exception has occurred.`)
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
