import { GapBuffer } from "./gap_buffer.js";

export class Doc {
    constructor() {
        this.buffer = new GapBuffer(5);
        this.cursor_pos = { i_row: 0, i_col: 0 };
    }

    get is_at_eol() {
        let char = this.buffer.get_element_right_to_cursor();
        return (char == null || char === "\n");
    }

    get is_at_eod() {
        let char = this.buffer.get_element_right_to_cursor();
        return char == null;
    }

    get is_at_bol() {
        let char = this.buffer.get_element_left_to_cursor();
        return (char == null || char === "\n");
    }

    get is_at_bod() {
        let char = this.buffer.get_element_left_to_cursor();
        return char == null;
    }

    get current_line_length() {
        let length = 0;
        let i = this.buffer.gap_right + 1;
        while (
            i < this.buffer.buffer.length
            && ![null, "\n"].includes(this.buffer.buffer[i])
        ) {
            i += 1;
            length += 1;
        }

        i = this.buffer.gap_left - 1;
        while (
            i >= 0
            && ![null, "\n"].includes(this.buffer.buffer[i])
        ) {
            i -= 1;
            length += 1;
        }

        return length;
    }

    get is_at_nonblank_beginning() {
        let left = this.buffer.get_element_left_to_cursor();
        let right = this.buffer.get_element_right_to_cursor();
        return (
            (left == null && is_nonblank(right))
            || (!is_nonblank(left) && is_nonblank(right))
            || (is_newline(left) && is_newline(right))
        );
    }

    get is_at_keyword_beginning() {
        let left = this.buffer.get_element_left_to_cursor();
        let right = this.buffer.get_element_right_to_cursor();
        return (
            this.is_at_nonblank_beginning
            || (is_alnum(left) && !is_alnum(right) && is_nonblank(right))
            || (!is_alnum(left) && is_nonblank(left) && is_alnum(right))
        );
    }

    get is_at_nonblank_ending() {
        let right = this.buffer.get_element_right_to_cursor();
        let after_right = this.buffer.get_element_right_to_cursor(2);
        return (
            (after_right == null && is_nonblank(right))
            || (!is_nonblank(after_right) && is_nonblank(right))
        );
    }

    get is_at_keyword_ending() {
        let right = this.buffer.get_element_right_to_cursor();
        let after_right = this.buffer.get_element_right_to_cursor(2);
        return (
            this.is_at_nonblank_ending
            || (is_alnum(after_right) && !is_alnum(right) && is_nonblank(right))
            || (!is_alnum(after_right) && is_nonblank(after_right) && is_alnum(right))
        );
    }

    put_on_grid_with_word_warping(n_cols) {
        let line = [];
        let lines = [];
        let line_numbers = [];
        let line_number = 1;
        let i_row = 0;
        let i_col = 0;
        let i_char = 0;
        let grid_cursor_pos = { i_row: 0, i_col: 0 };

        while (true) {
            let char = this.buffer.get_element(i_char);
            if (char == null) {
                break;
            }

            if (char !== "\n") {
                line.push(char)
                i_col += 1;
            }

            if (i_col === n_cols || char === "\n") {
                line_numbers.push(line_number);
                line_number += char === "\n";

                lines.push(line);
                line = [];
                i_row += 1;
                i_col = 0;
            }


            if (i_char === this.buffer.gap_left - 1) {
                grid_cursor_pos.i_row = i_row;
                grid_cursor_pos.i_col = i_col;
            }

            i_char += 1;
        }

        lines.push(line);
        line_numbers.push(line_number);
        return { lines: lines, grid_cursor_pos: grid_cursor_pos, line_numbers: line_numbers };
    }

    move_cursor_left(n_steps = 1, stop_at_bol = true, with_delete = false) {
        for (let i = 0; i < n_steps; ++i) {
            if (this.is_at_bol && (stop_at_bol || this.is_at_bod)) {
                return;
            }

            if (with_delete) {
                let char_to_delete = this.buffer.get_element_left_to_cursor();
                if (char_to_delete === "\n") {
                    let prev_line_length = this.current_line_length;
                    this.buffer.delete();
                    this.cursor_pos.i_col = this.current_line_length - prev_line_length;
                    this.cursor_pos.i_row -= 1;
                } else {
                    this.buffer.delete();
                    this.cursor_pos.i_col -= 1;
                }
            } else {
                this.buffer.move_left();
                if (this.is_at_eol) {
                    this.cursor_pos.i_col = this.current_line_length;
                    this.cursor_pos.i_row -= 1;
                } else {
                    this.cursor_pos.i_col -= 1;
                }
            }
        }
    }

    move_cursor_right(n_steps = 1, stop_at_eol = true) {
        for (let i = 0; i < n_steps; ++i) {
            if (this.is_at_eol && (stop_at_eol || this.is_at_eod)) {
                return;
            }

            if (this.is_at_eol) {
                this.cursor_pos.i_col = 0;
                this.cursor_pos.i_row += 1;
            } else {
                this.cursor_pos.i_col += 1;
            }
            this.buffer.move_right();
        }
    }

    move_cursor_up(i_col_max) {
        this.move_cursor_to_beginning_of_line();
        this.move_cursor_left(1, false);
        this.move_cursor_to_beginning_of_line();
        this.move_cursor_right(i_col_max);
    }

    move_cursor_down(i_col_max) {
        this.move_cursor_to_end_of_line();
        this.move_cursor_right(1, false);
        this.move_cursor_to_beginning_of_line();
        this.move_cursor_right(i_col_max);
    }

    move_cursor_word_right(stop_at_eol, stop_at_keyword_char) {
        do {
            if (stop_at_eol && this.is_at_eol) {
                break;
            }
            this.move_cursor_right(1, false);
        } while (
            !this.is_at_eod
            && (
                (!stop_at_keyword_char && !this.is_at_nonblank_beginning)
                || (stop_at_keyword_char && !this.is_at_keyword_beginning)
            )
        );
    }

    move_cursor_word_left(stop_at_bol, stop_at_keyword_char) {
        do {
            if (stop_at_bol && this.is_at_bol) {
                break;
            }
            this.move_cursor_left(1, false);
        } while (
            !this.is_at_bod
            && (
                (!stop_at_keyword_char && !this.is_at_nonblank_beginning)
                || (stop_at_keyword_char && !this.is_at_keyword_beginning)
            )
        )
    }

    move_cursor_word_end_right(stop_at_eol, stop_at_keyword_char) {
        do {
            if (stop_at_eol && this.is_at_eol) {
                break;
            }
            this.move_cursor_right(1, false);
        } while (
            !this.is_at_eod
            && (
                (!stop_at_keyword_char && !this.is_at_nonblank_ending)
                || (stop_at_keyword_char && !this.is_at_keyword_ending)
            )
        );
    }

    move_cursor_to_first_nonblank_char_in_line() {
        this.move_cursor_to_beginning_of_line();
        if (!is_nonblank(this.buffer.get_element_right_to_cursor())) {
            this.move_cursor_word_right(true);
        }
    }

    move_cursor_to_char_right(target_char, stop_at_eol, stop_before_char) {
        let i = this.buffer.gap_right + 2;
        let n_steps = stop_before_char ? 0 : 1;
        while (true) {
            let char = this.buffer.buffer[i];
            if (char == null || (stop_at_eol && is_newline(char))) {
                return;
            } else if (char === target_char) {
                this.move_cursor_right(n_steps, false);
                return;
            } else {
                n_steps += 1;
                i += 1;
            }
        }
    }

    move_cursor_to_char_left(target_char, stop_at_bol, stop_before_char) {
        let i = this.buffer.gap_left - 1;
        let n_steps = stop_before_char ? 0 : 1;
        while (true) {
            let char = this.buffer.buffer[i];
            if (char == null || (stop_at_bol && is_newline(char))) {
                return;
            } else if (char === target_char) {
                this.move_cursor_left(n_steps, false);
                return;
            } else {
                n_steps += 1;
                i -= 1;
            }
        }
    }

    move_cursor_to_end_of_line() {
        let n_steps = 0;
        for (let i = this.buffer.gap_right + 1; i < this.buffer.buffer.length; ++i) {
            if (is_newline(this.buffer.buffer[i])) {
                break;
            }
            n_steps += 1;
        }
        this.move_cursor_right(n_steps);
    }

    move_cursor_to_beginning_of_line() {
        let n_steps = 0;
        for (let i = this.buffer.gap_left - 1; i >= 0; --i) {
            if (this.buffer.buffer[i] === "\n") {
                break;
            }
            n_steps += 1
        }
        this.move_cursor_left(n_steps);
    }

    insert_text(text) {
        for (let i = 0; i < text.length; ++i) {
            if (text[i] === "\n") {
                this.cursor_pos.i_row += 1;
                this.cursor_pos.i_col = 0;
            } else {
                this.cursor_pos.i_col += 1;
            }
        }
        this.buffer.insert(text)
    }

    insert_new_line_above_cursor() {
        this.move_cursor_to_beginning_of_line();
        this.insert_text("\n");
        this.move_cursor_left(1, false, false);
    }

    insert_new_line_below_cursor() {
        this.move_cursor_to_end_of_line();
        this.insert_text("\n");
    }


    delete_text(n = 1) {
        this.move_cursor_left(n, false, true);
    }
}

function is_newline(char) {
    return (char != null && char === "\n");
}

function is_nonblank(char) {
    return (char != null && !char.match(/\s/));
}

function is_alnum(char, or_underscore = true) {
    if (or_underscore) {
        var regexp = /\w|_/;
    } else {
        var regexp = /\w/;
    }
    return (char != null && char.match(regexp));
}
