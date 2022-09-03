import { GapBuffer } from "./gap_buffer.js";

export class Doc {
    constructor() {
        this.buffer = new GapBuffer(32);
        this.cursor = { i_row: 0, i_col: 0, abs: 0 };
        this.select = { top: { ...this.cursor }, bot: { ...this.cursor } };
        this.is_select_started = false;
    }

    reset_select() {
        this.select = { top: { ...this.cursor }, bot: { ...this.cursor } };
        this.is_select_started = false;
    }

    start_select() {
        this.select = { top: { ...this.cursor }, bot: { ...this.cursor } };
        this.is_select_started = true;
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

    move_cursor_left(n_steps = 1, stop_at_bol = true) {
        for (let i = 0; i < n_steps; ++i) {
            if (this.is_at_bol && (stop_at_bol || this.is_at_bod)) {
                break;
            }

            let select_name = null;
            if (this.is_select_started) {
                if (this.select.top.abs === this.select.bot.abs) {
                    select_name = "top";
                } else if (this.cursor.abs === this.select.bot.abs) {
                    select_name = "bot";
                } else if (this.cursor.abs === this.select.top.abs) {
                    select_name = "top";
                } else {
                    throw ("Can't move select when neither top bound nor bot bound doesn't stick to the cursor position. It's the doc engine bug")
                }
            }

            this.buffer.move_left();
            this.cursor.abs -= 1;
            if (this.is_at_eol) {
                this.cursor.i_col = this.current_line_length;
                this.cursor.i_row -= 1;
            } else {
                this.cursor.i_col -= 1;
            }

            if (select_name !== null) {
                this.select[select_name] = { ...this.cursor };
            }
        }
        if (this.cursor.abs !== this.buffer.gap_left) {
            throw (`Cursor pos is not equal to buffer pos (${this.cursor.abs} != ${this.buffer.gap_left}) after move_cursor_left select. It's the doc engine bug`)
        }
    }

    move_cursor_right(n_steps = 1, stop_at_eol = true) {
        for (let i = 0; i < n_steps; ++i) {
            if (this.is_at_eol && (stop_at_eol || this.is_at_eod)) {
                break;
            }

            let select_name = null;
            if (this.is_select_started) {
                if (this.select.top.abs === this.select.bot.abs) {
                    select_name = "bot";
                } else if (this.cursor.abs === this.select.bot.abs) {
                    select_name = "bot";
                } else if (this.cursor.abs === this.select.top.abs) {
                    select_name = "top";
                } else {
                    throw ("Can't move select when neither top bound nor bot bound doesn't stick to the cursor position. It's the doc engine bug")
                }
            }

            this.cursor.abs += 1;
            if (this.is_at_eol) {
                this.cursor.i_col = 0;
                this.cursor.i_row += 1;
            } else {
                this.cursor.i_col += 1;
            }
            this.buffer.move_right();

            if (select_name !== null) {
                this.select[select_name] = { ...this.cursor };
            }
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

    get_n_steps_to_end_of_line() {
        let n_steps = 0;
        for (let i = this.buffer.gap_right + 1; i < this.buffer.buffer.length; ++i) {
            if (is_newline(this.buffer.buffer[i])) {
                break;
            }
            n_steps += 1;
        }
        return n_steps;
    }

    get_n_steps_to_beginning_of_line() {
        let n_steps = 0;
        for (let i = this.buffer.gap_left - 1; i >= 0; --i) {
            if (this.buffer.buffer[i] === "\n") {
                break;
            }
            n_steps += 1
        }
        return n_steps;
    }

    move_cursor_to_end_of_line() {
        let n_steps = this.get_n_steps_to_end_of_line();
        this.move_cursor_right(n_steps);
    }

    move_cursor_to_beginning_of_line() {
        let n_steps = this.get_n_steps_to_beginning_of_line();
        this.move_cursor_left(n_steps);
    }

    move_select_to_end_of_line(which) {
        let n_steps = this.get_n_steps_to_end_of_line(this.select[which].abs);
        this.select[which].i_row = this.cursor.i_row;
        this.select[which].i_col += n_steps;
        this.select[which].abs += n_steps;
    }

    move_select_to_beginning_of_line(which) {
        let n_steps = this.get_n_steps_to_beginning_of_line(this.select[which].abs);
        this.select[which].i_row = this.cursor.i_row;
        this.select[which].i_col -= n_steps;
        this.select[which].abs -= n_steps;
        if (this.select[which].i_col !== 0 || this.select[which].abs < 0) {
            throw (`[ERROR] incorrect select position: ${this.select[which]}. It's the doc engine bug`)
        }
    }

    select_line() {
        if (this.cursor.i_row > this.select.top.i_row && this.cursor.i_row < this.select.bot.i_row) {
            return;
        } else if (this.cursor.i_row > this.select.bot.i_row) {
            this.move_select_to_end_of_line("bot");
        } else if (this.cursor.i_row < this.select.top.i_row) {
            this.move_select_to_beginning_of_line("top");
        } else {
            this.move_select_to_beginning_of_line("top");
            this.move_select_to_end_of_line("bot");
        }
    }

    select_word() {
        let left_n_steps = 0;
        let start_char = this.buffer.get_element_right_to_cursor();

        while (true) {
            let char = this.buffer.get_element_left_to_cursor(left_n_steps + 1);
            if (!is_same_type(start_char, char)) {
                break;
            }
            left_n_steps += 1
        }

        let right_n_steps = 0;
        while (true) {
            let char = this.buffer.get_element_right_to_cursor(right_n_steps + 1);
            if (!is_same_type(start_char, char)) {
                break;
            }
            right_n_steps += 1
        }
        if (left_n_steps + right_n_steps < 1) {
            return;
        }
        this.move_cursor_left(left_n_steps, false);
        this.start_select();
        this.move_cursor_right(right_n_steps + left_n_steps - 1, false);
    }

    delete_select() {
        if (this.cursor.abs < this.select.top.abs || this.cursor > this.select.bot.abs) {
            console.log("CURSOR", this.cursor.abs, "TOP", this.select.top.abs, "BOT", this.select.bot.abs);
            throw ("[ERROR] Can't remove select since cursor position is not in the select boundary. It's a bug in the doc engine")
        }
        if (!this.is_select_started) {
            return;
        }
        let left_n_steps = this.cursor.abs - this.select.top.abs;
        let right_n_steps = this.select.bot.abs - this.cursor.abs + 1;
        this.move_cursor_left(left_n_steps);
        this.buffer.delete_right(left_n_steps + right_n_steps);
        this.reset_select();
    }

    delete_char_left() {
        if (this.is_at_bod) {
            return;
        }

        this.buffer.delete_left();
        this.cursor.abs -= 1;
        if (this.is_at_eol) {
            this.cursor.i_col = this.current_line_length;
            this.cursor.i_row -= 1;
        } else {
            this.cursor.i_col -= 1;
        }
        this.reset_select();
    }

    delete_word() {
        this.reset_select();
        this.select_word();
        this.delete_select();
    }

    insert_text(text) {
        if (this.is_select_started) {
            this.delete_select();
        }

        for (let i = 0; i < text.length; ++i) {
            this.cursor.abs += 1;
            if (text[i] === "\n") {
                this.cursor.i_row += 1;
                this.cursor.i_col = 0;
            } else {
                this.cursor.i_col += 1;
            }
        }
        this.buffer.insert(text)
        if (this.cursor.abs !== this.buffer.gap_left) {
            throw (`Cursor pos is not equal to buffer pos (${this.cursor.abs} != ${this.buffer.gap_left}) after text insertion: "${text}". It's the doc engine bug`)
        }
    }

    insert_new_line_above_cursor() {
        this.move_cursor_to_beginning_of_line();
        this.insert_text("\n");
        this.move_cursor_left(1, false);
    }

    insert_new_line_below_cursor() {
        this.move_cursor_to_end_of_line();
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
