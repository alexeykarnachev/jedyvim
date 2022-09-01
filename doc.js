import { GapBuffer } from "./gap_buffer.js";

export class Doc {
    constructor() {
        this._buffer = new GapBuffer(32);
        this.head = { i_row: 0, i_col: 0, abs: 0 };
        this.tail = { ...this.head };
        this._tail_is_fixed = false;
    }

    fix_tail() {
        this._tail_is_fixed = true;
    }

    free_tail() {
        this._tail_is_fixed = false;
    }

    move_tail_to_head() {
        this.tail = { ...this.head };
    }

    move_head_to_tail() {
        this.head = { ...this.tail };
    }

    get is_at_eol() {
        let char = this._buffer.get_element_right_to_cursor();
        return (char == null || char === "\n");
    }

    get is_at_eod() {
        let char = this._buffer.get_element_right_to_cursor();
        return char == null;
    }

    get is_at_bol() {
        let char = this._buffer.get_element_left_to_cursor();
        return (char == null || char === "\n");
    }

    get is_at_bod() {
        let char = this._buffer.get_element_left_to_cursor();
        return char == null;
    }

    get current_line_length() {
        let length = 0;
        let i = this._buffer.gap_right + 1;
        while (
            i < this._buffer.buffer.length
            && ![null, "\n"].includes(this._buffer.buffer[i])
        ) {
            i += 1;
            length += 1;
        }

        i = this._buffer.gap_left - 1;
        while (
            i >= 0
            && ![null, "\n"].includes(this._buffer.buffer[i])
        ) {
            i -= 1;
            length += 1;
        }

        return length;
    }

    get is_at_nonblank_beginning() {
        let left = this._buffer.get_element_left_to_cursor();
        let right = this._buffer.get_element_right_to_cursor();
        return (
            (left == null && is_nonblank(right))
            || (!is_nonblank(left) && is_nonblank(right))
            || (is_newline(left) && is_newline(right))
        );
    }

    get is_at_keyword_beginning() {
        let left = this._buffer.get_element_left_to_cursor();
        let right = this._buffer.get_element_right_to_cursor();
        return (
            this.is_at_nonblank_beginning
            || (is_alnum(left) && !is_alnum(right) && is_nonblank(right))
            || (!is_alnum(left) && is_nonblank(left) && is_alnum(right))
        );
    }

    get is_at_nonblank_ending() {
        let right = this._buffer.get_element_right_to_cursor();
        let after_right = this._buffer.get_element_right_to_cursor(2);
        return (
            (after_right == null && is_nonblank(right))
            || (!is_nonblank(after_right) && is_nonblank(right))
        );
    }

    get is_at_keyword_ending() {
        let right = this._buffer.get_element_right_to_cursor();
        let after_right = this._buffer.get_element_right_to_cursor(2);
        return (
            this.is_at_nonblank_ending
            || (is_alnum(after_right) && !is_alnum(right) && is_nonblank(right))
            || (!is_alnum(after_right) && is_nonblank(after_right) && is_alnum(right))
        );
    }

    put_on_grid_with_word_wrapping(n_cols) {
        let line = [];
        let lines = [];
        let line_numbers = [];
        let line_number = 0;
        let i_row = 0;
        let i_col = 0;
        let i_char = 0;
        let grid_head_pos = { i_row: 0, i_col: 0 };
        let grid_tail_pos = { i_row: 0, i_col: 0 };

        while (true) {
            let char = this._buffer.get_element(i_char);
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


            if (i_char === this.head.abs - 1) {
                grid_head_pos.i_row = i_row;
                grid_head_pos.i_col = i_col;
            }

            if (i_char === this.tail.abs - 1) {
                grid_tail_pos.i_row = i_row;
                grid_tail_pos.i_col = i_col;
            }

            i_char += 1;
        }

        lines.push(line);
        line_numbers.push(line_number);
        return { lines: lines, grid_head_pos: grid_head_pos, grid_tail_pos: grid_tail_pos, line_numbers: line_numbers };
    }

    move_head_left(n_steps = 1, stop_at_bol = true) {
        for (let i = 0; i < n_steps; ++i) {
            if (this.is_at_bol && (stop_at_bol || this.is_at_bod)) {
                break;
            }

            this._buffer.move_left();
            if (this.is_at_eol) {
                this.head.i_col = this.current_line_length;
                this.head.i_row -= 1;
            } else {
                this.head.i_col -= 1;
            }
        }

        this.head.abs = this._buffer.gap_left;
        if (!this._tail_is_fixed) {
            this.move_tail_to_head();
        }
    }

    move_head_right(n_steps = 1, stop_at_eol = true) {
        for (let i = 0; i < n_steps; ++i) {
            if (this.is_at_eol && (stop_at_eol || this.is_at_eod)) {
                break;
            }

            if (this.is_at_eol) {
                this.head.i_col = 0;
                this.head.i_row += 1;
            } else {
                this.head.i_col += 1;
            }
            this._buffer.move_right();
        }

        this.head.abs = this._buffer.gap_left;
        if (!this._tail_is_fixed) {
            this.move_tail_to_head();
        }
    }

    move_head_up(i_col_max) {
        this.move_head_to_beginning_of_line();
        this.move_head_left(1, false);
        this.move_head_to_beginning_of_line();
        this.move_head_right(i_col_max);
    }

    move_head_down(i_col_max) {
        this.move_head_to_end_of_line();
        this.move_head_right(1, false);
        this.move_head_to_beginning_of_line();
        this.move_head_right(i_col_max);
    }

    move_head_word_right(stop_at_eol, stop_at_keyword_char) {
        do {
            if (stop_at_eol && this.is_at_eol) {
                break;
            }
            this.move_head_right(1, false);
        } while (
            !this.is_at_eod
            && (
                (!stop_at_keyword_char && !this.is_at_nonblank_beginning)
                || (stop_at_keyword_char && !this.is_at_keyword_beginning)
            )
        );
    }

    move_head_word_left(stop_at_bol, stop_at_keyword_char) {
        do {
            if (stop_at_bol && this.is_at_bol) {
                break;
            }
            this.move_head_left(1, false);
        } while (
            !this.is_at_bod
            && (
                (!stop_at_keyword_char && !this.is_at_nonblank_beginning)
                || (stop_at_keyword_char && !this.is_at_keyword_beginning)
            )
        )
    }

    move_head_word_end_right(stop_at_eol, stop_at_keyword_char) {
        do {
            if (stop_at_eol && this.is_at_eol) {
                break;
            }
            this.move_head_right(1, false);
        } while (
            !this.is_at_eod
            && (
                (!stop_at_keyword_char && !this.is_at_nonblank_ending)
                || (stop_at_keyword_char && !this.is_at_keyword_ending)
            )
        );
    }

    move_head_to_first_nonblank_char_in_line() {
        this.move_head_to_beginning_of_line();
        if (!is_nonblank(this._buffer.get_element_right_to_cursor())) {
            this.move_head_word_right(true);
        }
    }

    move_head_to_char_right(target_char, stop_at_eol, stop_before_char) {
        let i = this._buffer.gap_right + 2;
        let n_steps = stop_before_char ? 0 : 1;
        while (true) {
            let char = this._buffer.buffer[i];
            if (char == null || (stop_at_eol && is_newline(char))) {
                return;
            } else if (char === target_char) {
                this.move_head_right(n_steps, false);
                return;
            } else {
                n_steps += 1;
                i += 1;
            }
        }
    }

    move_head_to_char_left(target_char, stop_at_bol, stop_before_char) {
        let i = this._buffer.gap_left - 1;
        let n_steps = stop_before_char ? 0 : 1;
        while (true) {
            let char = this._buffer.buffer[i];
            if (char == null || (stop_at_bol && is_newline(char))) {
                return;
            } else if (char === target_char) {
                this.move_head_left(n_steps, false);
                return;
            } else {
                n_steps += 1;
                i -= 1;
            }
        }
    }

    move_head_to_end_of_line() {
        let n_steps = 0;
        for (let i = this._buffer.gap_right + 1; i < this._buffer.buffer.length; ++i) {
            if (is_newline(this._buffer.buffer[i])) {
                break;
            }
            n_steps += 1;
        }
        this.move_head_right(n_steps);
    }

    move_head_to_beginning_of_line() {
        let n_steps = 0;
        for (let i = this._buffer.gap_left - 1; i >= 0; --i) {
            if (this._buffer.buffer[i] === "\n") {
                break;
            }
            n_steps += 1
        }
        this.move_head_left(n_steps);
    }

    select_word() {
        this.move_tail_to_head();
        let left_n_steps = 0;
        let start_char = this._buffer.get_element_right_to_cursor();
        while (true) {
            let char = this._buffer.get_element_left_to_cursor(left_n_steps + 1);
            if (!is_same_type(start_char, char)) {
                break;
            }
            left_n_steps += 1
        }

        let right_n_steps = 1;
        while (true) {
            let char = this._buffer.get_element_right_to_cursor(right_n_steps + 1);
            if (!is_same_type(start_char, char)) {
                break;
            }
            right_n_steps += 1
        }
        this.move_head_left(left_n_steps, false);
        this.fix_tail()
        this.move_head_right(right_n_steps + left_n_steps, false, true);
    }

    delete_between_head_and_tail() {
        if (this._tail_is_fixed) {
            let n_to_delete = this.head.abs - this.tail.abs;
            if (n_to_delete > 0) {
                this._buffer.delete_left(n_to_delete);
                this.move_head_to_tail();

            } else if (n_to_delete < 0) {
                this._buffer.delete_right(-n_to_delete);
                this.move_tail_to_head();
            }
            this.free_tail();
        }
    }

    delete_char_left() {
        this.move_tail_to_head();
        this.fix_tail();
        this.move_head_left(1, false);
        this.delete_between_head_and_tail();
    }

    delete_char_right() {
        this.move_tail_to_head();
        this.fix_tail();
        this.move_head_right(1, false);
        this.delete_between_head_and_tail();
    }

    delete_word() {
        this.select_word();
        this.delete_between_head_and_tail();
    }

    insert_text(text) {
        this.delete_between_head_and_tail();

        for (let i = 0; i < text.length; ++i) {
            if (text[i] === "\n") {
                this.head.i_row += 1;
                this.head.i_col = 0;
            } else {
                this.head.i_col += 1;
            }
        }
        this._buffer.insert(text)
        this.head.abs = this._buffer.gap_left;
    }

    insert_new_line_above_head() {
        this.move_head_to_beginning_of_line();
        this.insert_text("\n");
        this.move_head_left(1, false);
    }

    insert_new_line_below_head() {
        this.move_head_to_end_of_line();
        this.insert_text("\n");
    }


}

function is_newline(char) {
    return (char != null && char === "\n");
}

function is_nonblank(char) {
    return (char != null && !char.match(/\s/));
}

function is_same_type(char1, char2) {
    if (is_newline(char1) || is_newline(char2) || char1 == null || char2 == null) {
        return false;
    } else if (
        (!is_nonblank(char1) && !is_nonblank(char2))
        || (is_alnum(char1) && is_alnum(char2))
        || (!is_alnum(char1) && !is_alnum(char2) && is_nonblank(char1) && is_nonblank(char2))
    ) {
        return true;
    } else {
        return false;
    }
}

function is_alnum(char, or_underscore = true) {
    if (or_underscore) {
        var regexp = /\w|_/;
    } else {
        var regexp = /\w/;
    }
    return (char != null && char.match(regexp));
}
